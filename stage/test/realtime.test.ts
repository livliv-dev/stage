import assert from 'node:assert/strict'
import { test } from 'node:test'
import { offerRequest, RealtimeConnection, sessionOptions, type ModelEvent, type RealtimeOptions } from '../src/realtime/connection'

const options: RealtimeOptions = { provider: 'qwen', base: 'https://workspace.cn-beijing.maas.aliyuncs.com/compatible-mode/v1', key: 'fixture-key', model: 'qwen3.8-omni-flash-realtime', voice: 'Tina', instructions: 'Play Nana.', semantic: true, silence: 450 }

function fixture() {
  const messages: ModelEvent[] = [], errors: Error[] = [], sent: Record<string, unknown>[] = []
  let ready = 0, closed = 0, microphoneStops = 0, replacing: unknown = null
  const track = { enabled: true, onended: null, stop() { microphoneStops++ } }
  const microphone = { getTracks: () => [track], getAudioTracks: () => [track] }
  const channel = { readyState: 'open', label: 'txt', onmessage: null, onopen: null, onclose: null, onerror: null, close() { this.readyState = 'closed'; this.onclose?.() }, send(value: string) { sent.push(JSON.parse(value)) } }
  const listeners = new Map<string, () => void>()
  const peer = {
    connectionState: 'new', iceGatheringState: 'complete', localDescription: { sdp: 'v=0\r\nfixture' }, onconnectionstatechange: null,
    ondatachannel: null, ontrack: null,
    addTransceiver: () => ({ sender: { async replaceTrack(value: unknown) { replacing = value } } }),
    createDataChannel: () => channel,
    createOffer: async () => ({ type: 'offer', sdp: 'v=0\r\nfixture' }),
    setLocalDescription: async () => {}, setRemoteDescription: async () => {}, close() { this.connectionState = 'closed' },
    addEventListener: (name: string, listener: () => void) => listeners.set(name, listener), removeEventListener: (name: string) => listeners.delete(name),
  }
  let microphoneResult = Promise.resolve(microphone)
  let requests = 0, signal: AbortSignal | undefined
  const connection = new RealtimeConnection(options, { ready: () => ready++, audio: () => {}, event: (event) => messages.push(event), error: (error) => errors.push(error), closed: () => closed++ }, {
    peer: () => peer as unknown as RTCPeerConnection,
    microphone: () => microphoneResult as unknown as Promise<MediaStream>,
    exchange: async (_url, init) => { requests++; signal = init.signal as AbortSignal; return new Response('v=0\r\nfixture answer') },
  })
  const event = (value: ModelEvent) => channel.onmessage?.({ data: JSON.stringify(value) })
  const connect = () => { peer.connectionState = 'connected'; peer.onconnectionstatechange?.() }
  return { connection, event, connect, track, sent, messages, errors, peer, channel, setMicrophone: (result: typeof microphoneResult) => { microphoneResult = result }, microphone,
    state: () => ({ ready, closed, microphoneStops, replacing, requests, signal }) }
}

test('both providers negotiate bidirectional audio and the service-specific session schema', () => {
  const signal = new AbortController().signal
  const qwen = offerRequest(options, 'v=0', signal)
  assert.equal(qwen.url, 'https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/webrtc/realtime?model=qwen3.8-omni-flash-realtime')
  assert.equal(qwen.init.headers.get('Content-Type'), 'application/sdp')
  assert.equal(qwen.init.body, 'v=0')
  assert.equal(sessionOptions(options).turn_detection?.type, 'semantic_vad')
  const openai = offerRequest({ ...options, provider: 'openai', base: 'https://api.openai.com/v1', model: 'gpt-realtime-2.1', voice: 'marin' }, 'v=0', signal)
  assert.equal(openai.url, 'https://api.openai.com/v1/realtime/calls')
  assert.ok(openai.init.body instanceof FormData)
  assert.equal(openai.init.body.get('sdp'), 'v=0')
  const config = JSON.parse(String(openai.init.body.get('session')))
  assert.equal(config.audio.input.turn_detection.interrupt_response, true)
  assert.equal(config.audio.input.transcription.model, 'gpt-4o-mini-transcribe')
  assert.equal(config.audio.output.voice, 'marin')
})

test('microphone starts only after model configuration, stays active during output, and stops on hangup', async () => {
  const f = fixture()
  await f.connection.start()
  assert.equal(f.state().replacing, null)
  f.event({ type: 'session.created' }); assert.equal(f.sent.length, 0)
  f.connect(); assert.equal(f.sent[0].type, 'session.update')
  f.event({ type: 'session.updated' }); await Promise.resolve()
  assert.equal(f.state().replacing, f.track); assert.equal(f.state().ready, 1)
  f.event({ type: 'response.created', response: { id: 'reply1' } })
  assert.equal(f.track.enabled, true, 'full duplex keeps microphone enabled while receiving a reply')
  f.event({ type: 'response.audio_transcript.delta', delta: '第一段' })
  assert.equal(f.messages.at(-1)?.delta, '第一段', 'transcripts arrive before the whole response is complete')
  f.connection.pause(true); assert.equal(f.track.enabled, false)
  f.connection.pause(false); assert.equal(f.track.enabled, true)
  f.connection.stop(); assert.equal(f.state().microphoneStops, 1); assert.equal(f.state().closed, 1)
  assert.equal(f.state().signal?.aborted, true)
  f.event({ type: 'response.audio_transcript.delta', delta: 'stale' })
  assert.equal(f.messages.at(-1)?.delta, '第一段')
  f.connection.stop(); assert.equal(f.state().closed, 1)
})

test('hangup while microphone permission is pending stops the late stream without starting a billable session', async () => {
  const f = fixture()
  let grant!: (stream: typeof f.microphone) => void
  f.setMicrophone(new Promise((resolve) => { grant = resolve }))
  const opening = f.connection.start()
  f.connection.stop(); grant(f.microphone); await opening
  assert.equal(f.state().microphoneStops, 1); assert.equal(f.state().requests, 0)
})

test('service errors close the call without exposing provider payloads or retrying', async () => {
  const f = fixture()
  await f.connection.start(); f.connect(); f.event({ type: 'session.created' })
  f.event({ type: 'error', error: { message: 'a secret should never appear here: fixture-key' } })
  assert.equal(f.errors.length, 1); assert.ok(!f.errors[0].message.includes('fixture-key'))
  assert.equal(f.state().closed, 1); assert.equal(f.state().requests, 1)
})

test('a provider inference error reports a temporary service failure and releases the microphone without retrying', async () => {
  const f = fixture()
  await f.connection.start(); f.connect(); f.event({ type: 'session.created' })
  f.event({ type: 'error', error: { code: 'COMMON_ERROR', message: '<50002> InternalError.Algo.ModelServingError: fixture-key' } })
  assert.equal(f.errors[0]?.message, '实时通话服务暂时出错，请稍后重新开始')
  assert.equal(f.state().closed, 1); assert.equal(f.state().microphoneStops, 1); assert.equal(f.state().requests, 1)
})

test('a cancellation crossing response completion does not hang up the call, but unrelated errors still do', async () => {
  const f = fixture()
  await f.connection.start(); f.connect(); f.event({ type: 'session.created' }); f.event({ type: 'session.updated' }); await Promise.resolve()
  f.connection.send({ type: 'response.cancel' })
  const eventId = f.sent.at(-1)?.event_id
  assert.equal(typeof eventId, 'string')
  f.event({ type: 'error', error: { event_id: eventId, code: 'response_cancel_not_active', message: 'No active response found.' } })
  assert.equal(f.errors.length, 0); assert.equal(f.state().closed, 0)
  f.event({ type: 'error', error: { code: 'response_cancel_not_active', message: 'Unrelated request' } })
  assert.equal(f.errors.length, 1); assert.equal(f.state().closed, 1)
})
