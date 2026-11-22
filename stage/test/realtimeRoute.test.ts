// Which way a realtime call goes (src/realtime/route.ts): Bailian with a standard key over a WebSocket the desktop app
// opens; a workspace or any other address over WebRTC; nothing that can't connect is called ready; failures say what
// to change.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { realtimeFailure, realtimeRoute } from '../src/realtime/route'

const MODEL = 'qwen3.8-omni-flash-realtime'

test('Bailian with a standard key: a WebSocket in the desktop app, nothing on the web', () => {
  assert.deepEqual(realtimeRoute('qwen', 'https://dashscope.aliyuncs.com', MODEL, true), {
    transport: 'websocket', base: 'https://dashscope.aliyuncs.com', socket: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3.8-omni-flash-realtime',
  })
  assert.equal(realtimeRoute('qwen', 'https://dashscope-intl.aliyuncs.com', 'qwen3-omni-flash-realtime', true)?.transport, 'websocket')
  assert.equal(realtimeRoute('qwen', 'https://dashscope.aliyuncs.com', MODEL, false), null, 'the web: not ready, the checklist says so')
})

test('a workspace address, any other address, and OpenAI: WebRTC as before', () => {
  assert.deepEqual(realtimeRoute('qwen', 'https://ws-1.cn-beijing.maas.aliyuncs.com', MODEL, false), { transport: 'webrtc', base: 'https://ws-1.cn-beijing.maas.aliyuncs.com' })
  assert.deepEqual(realtimeRoute('qwen', 'https://ws-1.cn-beijing.maas.aliyuncs.com', MODEL, true), { transport: 'webrtc', base: 'https://ws-1.cn-beijing.maas.aliyuncs.com' })
  assert.equal(realtimeRoute('qwen', 'http://127.0.0.1:5173/fixture-realtime', MODEL, false)?.transport, 'webrtc', 'a proxy or a test server')
  assert.equal(realtimeRoute('openai', 'https://api.openai.com/v1', 'gpt-realtime-2.1', true)?.transport, 'webrtc')
  assert.equal(realtimeRoute('qwen', '', MODEL, true), null)
  assert.equal(realtimeRoute('qwen', 'https://dashscope.aliyuncs.com', '', true), null)
})

test('a failure to connect says what to change', () => {
  assert.match(realtimeFailure('qwen', 401), /密钥/)
  assert.match(realtimeFailure('qwen', 404), /实时模型或地址/)
  assert.match(realtimeFailure('qwen', 0, 'Model not exist.'), /实时模型或地址/)
  assert.match(realtimeFailure('openai', 404), /实时模型（404）/)
  assert.match(realtimeFailure('qwen', 429), /稍后再试/)
  assert.match(realtimeFailure('qwen', 0), /检查网络/)
})
