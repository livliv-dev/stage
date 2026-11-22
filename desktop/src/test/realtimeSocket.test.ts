import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { readRealtimeSocketUrl } from '#protocol/realtime'
import { realtimeSockets, type Socket } from '../realtimeSocket'

class FakeSocket extends EventEmitter {
  readyState = 0; sent: string[] = []; closed = false
  send(data: string) { this.sent.push(data) }
  close() { this.closed = true; this.readyState = 3; this.emit('close', 1000) }
  terminate() { this.close() }
}
function owner() {
  const events: unknown[][] = [], gone = new EventEmitter()
  return { events, gone, owner: { send: (...args: unknown[]) => { events.push(args) }, isDestroyed: () => false, once: (_e: 'destroyed', f: () => void) => { gone.once('destroyed', f) } } }
}
function host() {
  const made: { url: string; headers: Record<string, string>; socket: FakeSocket }[] = []
  const sockets = realtimeSockets({ connect: (url, headers) => { const socket = new FakeSocket(); made.push({ url, headers, socket }); return socket as unknown as Socket } })
  return { made, sockets }
}
const URL_OK = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3.8-omni-flash-realtime'

test('only Bailian\'s realtime address opens, for one model', () => {
  assert.equal(readRealtimeSocketUrl(URL_OK), URL_OK)
  assert.ok(readRealtimeSocketUrl('wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-omni-flash-realtime'))
  for (const bad of [
    'ws://dashscope.aliyuncs.com/api-ws/v1/realtime?model=m', 'wss://evil.example/api-ws/v1/realtime?model=m',
    'wss://dashscope.aliyuncs.com.evil.example/api-ws/v1/realtime?model=m', 'wss://dashscope.aliyuncs.com/api-ws/v1/other?model=m',
    'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=m&x=1', 'wss://dashscope.aliyuncs.com:8443/api-ws/v1/realtime?model=m',
    'wss://user@dashscope.aliyuncs.com/api-ws/v1/realtime?model=m', 42,
  ]) assert.equal(readRealtimeSocketUrl(bad), null, String(bad))
})

test('a socket opens with the key in its header, and its events reach the page that opened it', () => {
  const { made, sockets } = host(), page = owner()
  assert.equal(sockets.open(page.owner, 'rt-1', URL_OK, 'sk-test'), true)
  assert.deepEqual(made[0].headers, { Authorization: 'Bearer sk-test' })
  assert.equal(made[0].url, URL_OK)
  const socket = made[0].socket
  socket.readyState = 1; socket.emit('open')
  socket.emit('message', Buffer.from('{"type":"session.created"}'), false)
  socket.emit('message', Buffer.from([1, 2]), true)
  assert.deepEqual(page.events, [['livliv:realtime-socket-event', 'rt-1', { type: 'open' }], ['livliv:realtime-socket-event', 'rt-1', { type: 'message', data: '{"type":"session.created"}' }]], 'text only')
  assert.equal(sockets.send('rt-1', '{"type":"session.update"}'), true)
  assert.deepEqual(socket.sent, ['{"type":"session.update"}'])
  assert.equal(sockets.send('rt-1', 'x'.repeat(1_000_001)), false, 'no oversized message')
  assert.equal(sockets.send('nope', '{}'), false)
  sockets.close('rt-1')
  assert.equal(socket.closed, true)
  assert.equal(sockets.count(), 0)
})

test('a refused handshake says its status; the page going away closes its sockets; at most two at a time', () => {
  const { made, sockets } = host(), page = owner()
  sockets.open(page.owner, 'a', URL_OK, 'sk')
  made[0].socket.emit('unexpected-response', {}, { statusCode: 401 })
  assert.deepEqual(page.events[0], ['livliv:realtime-socket-event', 'a', { type: 'error', message: 'handshake refused', status: 401 }])
  assert.equal(made[0].socket.closed, true)
  assert.equal(sockets.open(page.owner, 'b', URL_OK, 'sk'), true)
  assert.equal(sockets.open(page.owner, 'c', URL_OK, 'sk'), true)
  assert.equal(sockets.open(page.owner, 'd', URL_OK, 'sk'), false, 'two at most')
  assert.equal(sockets.open(page.owner, 'b', URL_OK, 'sk'), false, 'an id once')
  page.gone.emit('destroyed')
  assert.equal(sockets.count(), 0)
  assert.equal(sockets.open(page.owner, 'e', 'wss://evil.example/api-ws/v1/realtime?model=m', 'sk'), false)
  assert.equal(sockets.open(page.owner, 'f', URL_OK, ''), false, 'no key, no socket')
})
