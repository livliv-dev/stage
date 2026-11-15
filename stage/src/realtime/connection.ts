export type RealtimeProvider = 'qwen' | 'openai'
export type RealtimeTool = { type: 'function'; name: string; description: string; parameters: Record<string, unknown> }
export type RealtimeOptions = {
  provider: RealtimeProvider; base: string; key: string; model: string; voice: string
  instructions: string; semantic: boolean; silence: number
  tools?: RealtimeTool[]
}
export type ModelEvent = { type: string; [key: string]: unknown }
export type RealtimeHandlers = {
  ready(): void; audio(stream: MediaStream): void; event(event: ModelEvent): void
  error(error: Error): void; closed(): void
  requestRejected?(id: string, reason: 'inactive' | 'busy'): void
}
type Dependencies = {
  peer(): RTCPeerConnection
  microphone(): Promise<MediaStream>
  exchange(url: string, init: RequestInit): Promise<Response>
}
export class RealtimeHttpError extends Error {
  readonly status: number
  constructor(status: number) { super('Realtime SDP exchange failed'); this.status = status }
}

export function sessionOptions(options: RealtimeOptions) {
  const turn = options.semantic
    ? { type: 'semantic_vad', ...(options.provider === 'openai' ? { eagerness: 'auto' } : {}) }
    : { type: 'server_vad', threshold: .5, silence_duration_ms: options.silence }
  if (options.provider === 'openai') return {
    type: 'realtime', model: options.model, instructions: options.instructions,
    ...(options.tools?.length ? { tools: options.tools, tool_choice: 'auto' } : {}),
    output_modalities: ['audio'],
    audio: {
      input: { transcription: { model: 'gpt-4o-mini-transcribe' }, turn_detection: { ...turn, create_response: true, interrupt_response: true } },
      output: { voice: options.voice || 'marin' },
    },
  }
  return {
    modalities: ['text', 'audio'], instructions: options.instructions,
    ...(options.tools?.length ? { tools: options.tools.map(({ type, ...definition }) => ({ type, function: definition })) } : {}),
    voice: options.voice || 'Tina', turn_detection: turn,
    input_audio_transcription: { model: 'qwen3-asr-flash-realtime' },
  }
}

export function offerRequest(options: RealtimeOptions, sdp: string, signal: AbortSignal) {
  const base = options.base.replace(/\/+$/, '')
  const headers = new Headers({ Authorization: `Bearer ${options.key}` })
  let url: string, body: BodyInit
  if (options.provider === 'openai') {
    url = `${base}/realtime/calls`
    const form = new FormData()
    form.set('sdp', sdp); form.set('session', JSON.stringify(sessionOptions(options))); body = form
  } else {
    const root = base.replace(/\/(?:compatible-mode\/v1|api\/v1)$/, '')
    url = `${root}/api/v1/webrtc/realtime?model=${encodeURIComponent(options.model)}`
    headers.set('Content-Type', 'application/sdp'); body = sdp
  }
  const target = new URL(url)
  if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) throw new Error('实时语音接口地址无效')
  return { url, init: { method: 'POST', headers, body, signal } satisfies RequestInit }
}

/** Audio travels in both directions on media tracks. No recorded-file upload or per-sentence TTS is involved. */
export class RealtimeConnection {
  private readonly controller = new AbortController()
  private pc: RTCPeerConnection | null = null
  private sender: RTCRtpSender | null = null
  private microphone: MediaStream | null = null
  private remote = new Set<MediaStreamTrack>()
  private channels = new Set<RTCDataChannel>()
  private cancellations = new Set<string>()
  private creations = new Set<string>()
  private channel: RTCDataChannel | null = null
  private created = false
  private configured = false
  private ready = false
  private paused = false
  private closed = false
  private timer: ReturnType<typeof setTimeout> | undefined
  private readonly options: RealtimeOptions
  private readonly handlers: RealtimeHandlers
  private readonly deps: Dependencies

  constructor(options: RealtimeOptions, handlers: RealtimeHandlers, deps: Dependencies) {
    this.options = options; this.handlers = handlers; this.deps = deps
  }

  async start() {
    if (this.pc || this.closed) throw new Error('实时语音会话已启动或结束')
    try {
      const pc = this.pc = this.deps.peer()
      this.sender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender
      pc.ondatachannel = ({ channel }) => this.bind(channel)
      this.bind(pc.createDataChannel('oai-events'))
      pc.ontrack = ({ track, streams }) => {
        if (this.closed) { track.stop(); return }
        if (track.kind !== 'audio') return
        this.remote.add(track)
        this.handlers.audio(streams[0] ?? new MediaStream([track]))
      }
      pc.onconnectionstatechange = () => {
        if (this.closed) return
        if (pc.connectionState === 'connected') this.configure()
        else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) this.fail(new Error('实时语音连接已断开，请重新开始'))
      }
      const microphone = await this.deps.microphone()
      if (this.closed) { microphone.getTracks().forEach((track) => track.stop()); return }
      this.microphone = microphone
      for (const track of microphone.getAudioTracks()) track.onended = () => this.fail(new Error('麦克风已断开，请重新开始'))
      this.timer = setTimeout(() => this.fail(new Error('实时语音连接超时，请检查接口地址和网络')), 25_000)
      await pc.setLocalDescription(await pc.createOffer())
      if (this.closed) return
      await this.gatherIce(pc)
      if (this.closed) return
      const request = offerRequest(this.options, pc.localDescription!.sdp, this.controller.signal)
      const response = await this.deps.exchange(request.url, request.init)
      if (this.closed) return
      if (!response.ok) {
        // Provider error messages can contain request details. Keep credentials and SDP out of UI/logs.
        await response.body?.cancel()
        throw new RealtimeHttpError(response.status)
      }
      const sdp = (await response.text()).trim().replace(/\r?\n/g, '\r\n') + '\r\n'
      if (this.closed) return
      if (!sdp.startsWith('v=0\r\n')) throw new Error('实时语音接口没有返回有效连接信息')
      await pc.setRemoteDescription({ type: 'answer', sdp })
    } catch (error) { if (!this.closed) this.fail(error instanceof Error ? error : new Error(String(error))) }
  }

  private gatherIce(pc: RTCPeerConnection) {
    return new Promise<void>((resolve, reject) => {
      const signal = this.controller.signal
      const finish = (error?: unknown) => {
        pc.removeEventListener('icegatheringstatechange', check); signal.removeEventListener('abort', abort)
        error ? reject(error) : resolve()
      }
      const check = () => { if (pc.iceGatheringState === 'complete') finish() }
      const abort = () => finish(signal.reason)
      pc.addEventListener('icegatheringstatechange', check); signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort(); else check()
    })
  }

  private bind(channel: RTCDataChannel) {
    if (this.closed) { channel.close(); return }
    this.channels.add(channel)
    channel.onopen = () => this.configure()
    channel.onmessage = ({ data }) => {
      if (this.closed) return
      try {
        const event: unknown = JSON.parse(data)
        if (!event || typeof event !== 'object' || !('type' in event) || typeof event.type !== 'string') throw new Error('实时语音事件无效')
        this.receive(event as ModelEvent, channel)
      } catch (error) { this.fail(error instanceof Error ? error : new Error('实时语音事件无效')) }
    }
    channel.onclose = () => { this.channels.delete(channel); if (!this.closed && channel === this.channel) this.fail(new Error('实时语音连接已断开，请重新开始')) }
    channel.onerror = () => { if (!this.closed) this.fail(new Error('实时语音连接已断开，请重新开始')) }
  }

  private receive(event: ModelEvent, channel: RTCDataChannel) {
    if (event.type === 'error') {
      const error = event.error as { event_id?: unknown; code?: unknown; message?: unknown } | undefined
      const cancelling = typeof error?.event_id === 'string' && this.cancellations.delete(error.event_id)
      // Completion and a local cancellation can cross in flight. Ignore only this cancellation's no-active-response error.
      if (cancelling && (error?.code === 'response_cancel_not_active' || (typeof error?.message === 'string' && /no active response|no response (?:is )?in progress|response.*(?:not active|already (?:completed|finished))/i.test(error.message)))) {
        this.handlers.requestRejected?.(error!.event_id as string, 'inactive'); return
      }
      const creating = typeof error?.event_id === 'string' && this.creations.delete(error.event_id)
      if (creating && (error?.code === 'conversation_already_has_active_response' || (typeof error?.message === 'string' && /already.*(?:active response|response.*in progress)/i.test(error.message)))) {
        this.handlers.requestRejected?.(error!.event_id as string, 'busy'); return
      }
      if (error?.code === 'COMMON_ERROR' && typeof error.message === 'string' && /\bInternalError\./.test(error.message)) {
        this.fail(new Error('实时语音服务暂时出错，请稍后重新开始')); return
      }
      this.fail(new Error('实时语音服务拒绝了请求，请检查模型、音色和权限')); return
    }
    if (event.type === 'session.created') { this.created = true; this.channel = channel; this.configure() }
    if (event.type === 'session.updated' && this.configured && !this.ready) {
      this.ready = true; clearTimeout(this.timer)
      const track = this.microphone?.getAudioTracks()[0]
      if (track) track.enabled = !this.paused
      void this.sender!.replaceTrack(track ?? null).then(() => { if (!this.closed) this.handlers.ready() }, (error: Error) => this.fail(error))
    }
    this.handlers.event(event)
  }

  private configure() {
    if (this.closed || this.configured || !this.created || this.pc?.connectionState !== 'connected' || this.channel?.readyState !== 'open') return
    this.configured = true
    this.send({ type: 'session.update', session: sessionOptions(this.options) })
  }

  send(event: Record<string, unknown>) {
    if (this.closed || this.channel?.readyState !== 'open') return false
    if (event.type === 'response.cancel') {
      const id = typeof event.event_id === 'string' ? event.event_id : 'cancel_' + crypto.randomUUID()
      event = { ...event, event_id: id }; this.cancellations.add(id)
      if (this.cancellations.size > 32) this.cancellations.delete(this.cancellations.values().next().value!)
    }
    if (event.type === 'response.create') {
      const id = typeof event.event_id === 'string' ? event.event_id : 'create_' + crypto.randomUUID()
      event = { ...event, event_id: id }; this.creations.add(id)
      if (this.creations.size > 32) this.creations.delete(this.creations.values().next().value!)
    }
    this.channel.send(JSON.stringify(event)); return true
  }

  pause(paused: boolean) {
    this.paused = paused
    this.microphone?.getAudioTracks().forEach((track) => { track.enabled = !paused })
  }

  stop() {
    if (this.closed) return
    this.closed = true; clearTimeout(this.timer); this.controller.abort()
    this.microphone?.getTracks().forEach((track) => { track.onended = null; track.stop() }); this.microphone = null
    for (const channel of this.channels) channel.close()
    this.channels.clear(); this.cancellations.clear(); this.creations.clear(); this.channel = null
    this.pc?.close(); this.pc = null
    for (const track of this.remote) track.stop()
    this.remote.clear(); this.handlers.closed()
  }

  private fail(error: Error) { if (!this.closed) { this.handlers.error(error); this.stop() } }
}
