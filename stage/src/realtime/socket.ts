// A realtime call over Alibaba Cloud Bailian's WebSocket (a standard key, in the desktop app: the app opens the socket
// with the key in its header, desktop/src/realtimeSocket.ts). The same events as the WebRTC call (connection.ts), with
// the audio carried in them: your microphone goes up as 16 kHz PCM16 (input_audio_buffer.append), the character's
// voice comes back as 24 kHz PCM16 deltas, played into a stream the stage takes as the WebRTC call's track. Played
// audio is dropped when a reply is cancelled or you start speaking. Audio capture and playback are given (audio.ts in
// the page), so this runs against fakes in test/realtimeSocket.test.ts.
import type { RealtimeSocketEvent } from '../../../protocol/src/realtime'
import { RealtimeRequests, sessionOptions, type ModelEvent, type RealtimeCall, type RealtimeHandlers, type RealtimeOptions } from './connection'
import { realtimeFailure } from './route'

export type SocketLink = { send(data: string): void; close(): void }
export type Player = { stream: MediaStream; play(pcm: Int16Array): void; flush(): void; close(): void }
export type SocketDeps = {
  /** the socket, opened by the app (null: it couldn't be) */
  open(url: string, key: string, on: (event: RealtimeSocketEvent) => void): Promise<SocketLink | null>
  microphone(): Promise<MediaStream>
  /** the microphone as 16 kHz PCM16, a chunk at a time */
  capture(stream: MediaStream, chunk: (pcm: Int16Array) => void): { close(): void }
  /** a player for 24 kHz PCM16 */
  player(): Player
}

export const pcmToBase64 = (pcm: Int16Array) => {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
export const base64ToPcm = (value: string) => {
  const text = atob(value), bytes = new Uint8Array(text.length & ~1)
  for (let i = 0; i < bytes.length; i++) bytes[i] = text.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

export class RealtimeSocket implements RealtimeCall {
  private link: SocketLink | null = null
  private microphone: MediaStream | null = null
  private capture: { close(): void } | null = null
  private player: Player | null = null
  private readonly requests = new RealtimeRequests()
  private configured = false
  private ready = false
  private paused = false
  private closed = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly options: RealtimeOptions & { socket: string }
  private readonly handlers: RealtimeHandlers
  private readonly deps: SocketDeps

  constructor(options: RealtimeOptions & { socket: string }, handlers: RealtimeHandlers, deps: SocketDeps) {
    this.options = options; this.handlers = handlers; this.deps = deps
  }

  async start() {
    if (this.link || this.closed) throw new Error('实时语音会话已启动或结束')
    try {
      this.player = this.deps.player()
      this.handlers.audio(this.player.stream)
      const microphone = await this.deps.microphone()
      if (this.closed) { microphone.getTracks().forEach((track) => track.stop()); return }
      this.microphone = microphone
      for (const track of microphone.getAudioTracks()) track.onended = () => this.fail(new Error('麦克风已断开，请重新开始'))
      this.timer = setTimeout(() => this.fail(new Error('实时通话连接超时，请检查网络')), 25_000)
      const link = await this.deps.open(this.options.socket, this.options.key, (event) => this.on(event))
      if (this.closed) { link?.close(); return }
      if (!link) throw new Error(realtimeFailure(this.options.provider, 0))
      this.link = link
    } catch (error) { if (!this.closed) this.fail(error instanceof Error ? error : new Error(String(error))) }
  }

  private on(event: RealtimeSocketEvent) {
    if (this.closed) return
    if (event.type === 'error') { this.fail(new Error(realtimeFailure(this.options.provider, event.status ?? 0))); return }
    if (event.type === 'close') { this.fail(new Error(this.ready ? '实时通话连接已断开，请重新开始' : realtimeFailure(this.options.provider, 0))); return }
    if (event.type !== 'message') return
    let value: unknown
    try { value = JSON.parse(event.data) } catch { this.fail(new Error('实时通话事件无效')); return }
    if (!value || typeof value !== 'object') { this.fail(new Error('实时通话事件无效')); return }
    // Bailian's own refusal (a model that doesn't exist): {code, message}, then the socket closes
    if (!('type' in value) || typeof value.type !== 'string') {
      const refusal = value as { code?: unknown; message?: unknown }
      this.fail(new Error(realtimeFailure(this.options.provider, 0, typeof refusal.message === 'string' ? refusal.message : String(refusal.code ?? ''))))
      return
    }
    this.receive(value as ModelEvent)
  }

  private receive(event: ModelEvent) {
    if (event.type === 'error') {
      const refused = this.requests.refused(event.error as { event_id?: unknown; code?: unknown; message?: unknown } | undefined)
      if (refused instanceof Error) this.fail(refused)
      else this.handlers.requestRejected?.(refused.id, refused.reason)
      return
    }
    if (event.type === 'response.audio.delta' || event.type === 'response.output_audio.delta') {
      if (typeof event.delta === 'string' && event.delta) this.player?.play(base64ToPcm(event.delta))
      return
    }
    if (event.type === 'input_audio_buffer.speech_started') this.player?.flush()
    if (event.type === 'session.created' && !this.configured) {
      this.configured = true
      this.send({ type: 'session.update', session: { ...sessionOptions(this.options), input_audio_format: 'pcm16', output_audio_format: 'pcm24' } })
    }
    if (event.type === 'session.updated' && this.configured && !this.ready) {
      this.ready = true; clearTimeout(this.timer)
      this.capture = this.deps.capture(this.microphone!, (pcm) => {
        if (!this.paused && !this.closed) this.send({ type: 'input_audio_buffer.append', audio: pcmToBase64(pcm) })
      })
      this.handlers.ready()
    }
    this.handlers.event(event)
  }

  send(event: Record<string, unknown>) {
    if (this.closed || !this.link) return false
    if (event.type === 'response.cancel') this.player?.flush()
    this.link.send(JSON.stringify(this.requests.mark(event))); return true
  }

  pause(paused: boolean) { this.paused = paused }

  stop() {
    if (this.closed) return
    this.closed = true; clearTimeout(this.timer)
    this.capture?.close(); this.capture = null
    this.microphone?.getTracks().forEach((track) => { track.onended = null; track.stop() }); this.microphone = null
    this.link?.close(); this.link = null
    this.player?.close(); this.player = null
    this.requests.clear(); this.handlers.closed()
  }

  private fail(error: Error) { if (!this.closed) { this.handlers.error(error); this.stop() } }
}
