// A realtime call over Bailian's WebSocket (src/realtime/socket.ts), against a stand-in socket, microphone and player:
// set up as Bailian expects (PCM16 in, PCM16 24 kHz out), the microphone sent once ready and not while paused, the
// voice played and dropped on a cancel or when you speak, refusals and failures in words that say what to change.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RealtimeSocketEvent } from '../../protocol/src/realtime'
import { base64ToPcm, pcmToBase64, RealtimeSocket } from '../src/realtime/socket'

const options = { provider: 'qwen' as const, base: 'https://dashscope.aliyuncs.com', key: 'sk-test', model: 'qwen3.8-omni-flash-realtime', voice: 'Tina', instructions: 'Be Nana.', semantic: false, silence: 700, socket: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3.8-omni-flash-realtime' }
const track = () => ({ stop() {}, onended: null as null | (() => void) })
function call(open = true) {
  const sent: Record<string, unknown>[] = [], played: Int16Array[] = [], log: string[] = []
  let deliver: (event: RealtimeSocketEvent) => void = () => {}, chunk: (pcm: Int16Array) => void = () => {}
  let opened: { url: string; key: string } | null = null, flushes = 0, closed = 0
  const handlers = {
    ready: () => log.push('ready'), audio: () => log.push('audio'), event: (e: { type: string }) => log.push('event:' + e.type),
    error: (e: Error) => log.push('error:' + e.message), closed: () => log.push('closed'),
    requestRejected: (id: string, reason: string) => log.push(`rejected:${id}:${reason}`),
  }
  const socket = new RealtimeSocket(options, handlers as never, {
    open: async (url, key, on) => { opened = { url, key }; deliver = on; return open ? { send: (d) => { sent.push(JSON.parse(d)) }, close: () => { closed++ } } : null },
    microphone: async () => ({ getAudioTracks: () => [track()], getTracks: () => [track()] }) as unknown as MediaStream,
    capture: (_s, onChunk) => { chunk = onChunk; return { close() {} } },
    player: () => ({ stream: {} as MediaStream, play: (pcm) => { played.push(pcm) }, flush: () => { flushes++ }, close() {} }),
  })
  const message = (event: object) => deliver({ type: 'message', data: JSON.stringify(event) })
  return { socket, sent, played, log, message, deliver: (e: RealtimeSocketEvent) => deliver(e), chunk: (p: Int16Array) => chunk(p), opened: () => opened, flushes: () => flushes, closed: () => closed }
}

test('PCM16 to base64 and back', () => {
  const pcm = new Int16Array([0, 1, -1, 32767, -32768, 1234])
  assert.deepEqual([...base64ToPcm(pcmToBase64(pcm))], [...pcm])
})

test('set up as Bailian expects; the microphone goes up once ready, and not while paused', async () => {
  const c = call()
  await c.socket.start()
  assert.deepEqual(c.opened(), { url: options.socket, key: 'sk-test' })
  c.message({ type: 'session.created', session: {} })
  const update = c.sent[0] as { type: string; session: Record<string, unknown> }
  assert.equal(update.type, 'session.update')
  assert.equal(update.session.input_audio_format, 'pcm16')
  assert.equal(update.session.output_audio_format, 'pcm24')
  assert.equal(update.session.voice, 'Tina')
  c.chunk(new Int16Array([1, 2, 3]))
  assert.equal(c.sent.length, 1, 'nothing sent before the session is ready')
  c.message({ type: 'session.updated', session: {} })
  assert.ok(c.log.includes('ready'))
  c.chunk(new Int16Array([5, -5]))
  assert.deepEqual(c.sent.at(-1), { type: 'input_audio_buffer.append', audio: pcmToBase64(new Int16Array([5, -5])) })
  c.socket.pause(true); c.chunk(new Int16Array([9]))
  assert.equal((c.sent.at(-1) as { audio: string }).audio, pcmToBase64(new Int16Array([5, -5])), 'paused: not sent')
  c.socket.stop()
  assert.equal(c.closed(), 1)
  assert.ok(c.log.includes('closed'))
})

test('the voice is played, and dropped on a cancel or when you start speaking; other events go on to the call', async () => {
  const c = call()
  await c.socket.start()
  c.message({ type: 'session.created' }); c.message({ type: 'session.updated' })
  c.message({ type: 'response.audio.delta', delta: pcmToBase64(new Int16Array([100, 200])) })
  assert.deepEqual([...c.played[0]], [100, 200])
  assert.ok(!c.log.includes('event:response.audio.delta'), 'audio stays here')
  c.message({ type: 'response.audio_transcript.delta', delta: '你好' })
  assert.ok(c.log.includes('event:response.audio_transcript.delta'))
  c.socket.send({ type: 'response.cancel' })
  assert.equal(c.flushes(), 1)
  assert.match(String((c.sent.at(-1) as { event_id: string }).event_id), /^cancel_/)
  c.message({ type: 'input_audio_buffer.speech_started' })
  assert.equal(c.flushes(), 2)
})

test('refusals and failures say what to change', async () => {
  const badModel = call()
  await badModel.socket.start()
  badModel.message({ code: 'InvalidParameter', message: 'Model not exist.' })
  assert.match(badModel.log.find((l) => l.startsWith('error:'))!, /模型名/)
  const badKey = call()
  await badKey.socket.start()
  badKey.deliver({ type: 'error', message: 'handshake refused', status: 401 })
  assert.match(badKey.log.find((l) => l.startsWith('error:'))!, /密钥/)
  const noApp = call(false)
  await noApp.socket.start()
  assert.match(noApp.log.find((l) => l.startsWith('error:'))!, /连接失败/)
  const busy = call()
  await busy.socket.start()
  busy.message({ type: 'session.created' }); busy.message({ type: 'session.updated' })
  busy.socket.send({ type: 'response.create', event_id: 'create_1' })
  busy.message({ type: 'error', error: { event_id: 'create_1', code: 'conversation_already_has_active_response' } })
  assert.ok(busy.log.includes('rejected:create_1:busy'), 'a refused create: the call goes on')
  busy.deliver({ type: 'close', code: 1006 })
  assert.match(busy.log.find((l) => l.startsWith('error:'))!, /断开/)
})
