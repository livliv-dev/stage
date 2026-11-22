import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { readRealtimeSocketUrl } from '#protocol/realtime'
import { MAX_INBOUND, realtimeSockets, type Socket } from '../realtimeSocket'

class FakeSocket extends EventEmitter {
  readyState = 0; sent: string[] = []; closed = false
  send(data: string) { this.sent.push(data) }
  close() { this.closed = true; this.readyState = 3; this.emit('close', 1000) }
  terminate() { this.close() }
}
function owner() {
  const events: unknown[][] = [], page = new EventEmitter()
  return { events, page, owner: { send: (...args: unknown[]) => { events.push(args) }, isDestroyed: () => false, on: (e: 'destroyed' | 'did-start-loading' | 'render-process-gone', f: () => void) => { page.on(e, f) } } }
}
function host() {
  const made: { url: string; headers: Record<string, string>; maxPayload: number; socket: FakeSocket }[] = []
  const sockets = realtimeSockets({ connect: (url, { headers, maxPayload }) => { const socket = new FakeSocket(); made.push({ url, headers, maxPayload, socket }); return socket as unknown as Socket } })
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
  assert.equal(made[0].maxPayload, MAX_INBOUND, 'what comes in is capped')
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
  page.page.emit('destroyed')
  assert.equal(sockets.count(), 0)
  assert.equal(sockets.open(page.owner, 'e', 'wss://evil.example/api-ws/v1/realtime?model=m', 'sk'), false)
  assert.equal(sockets.open(page.owner, 'f', URL_OK, ''), false, 'no key, no socket')
})

test('a page reloading or crashing mid-call closes its sockets, says nothing more to it, and leaves room for the next call', () => {
  for (const gone of ['did-start-loading', 'render-process-gone', 'destroyed'] as const) {
    const { made, sockets } = host(), page = owner(), other = owner()
    sockets.open(page.owner, 'a', URL_OK, 'sk'); sockets.open(other.owner, 'b', URL_OK, 'sk')
    made[0].socket.readyState = 1; made[0].socket.emit('open')
    page.events.length = 0
    page.page.emit(gone)
    assert.equal(made[0].socket.closed, true, gone)
    assert.equal(made[1].socket.closed, false, `${gone}: another page's socket stays`)
    assert.deepEqual(page.events, [], `${gone}: nothing is sent to the page that went away`)
    assert.equal(sockets.count(), 1)
    assert.equal(sockets.open(page.owner, 'c', URL_OK, 'sk'), true, `${gone}: the reloaded page can call again`)
    made[0].socket.emit('message', Buffer.from('{"type":"late"}'), false)
    assert.deepEqual(page.events, [], `${gone}: a late message from the old socket goes nowhere`)
  }
})

test('a socket opened before its page reloaded (still connecting) closes too; an id used again belongs to the new socket', () => {
  const { made, sockets } = host(), page = owner()
  sockets.open(page.owner, 'rt-1', URL_OK, 'sk')
  page.page.emit('did-start-loading')
  assert.equal(made[0].socket.closed, true)
  assert.equal(sockets.open(page.owner, 'rt-1', URL_OK, 'sk'), true)
  made[0].socket.emit('close', 1006)
  assert.equal(sockets.count(), 1, 'the old socket closing late leaves the new one')
  made[1].socket.readyState = 1; made[1].socket.emit('open')
  assert.deepEqual(page.events, [['livliv:realtime-socket-event', 'rt-1', { type: 'open' }]])
})

test('a page is watched once, however many calls it makes', () => {
  const { sockets } = host(), page = owner()
  for (let i = 0; i < 20; i++) { assert.equal(sockets.open(page.owner, `rt-${i}`, URL_OK, 'sk'), true); sockets.close(`rt-${i}`) }
  assert.deepEqual(['destroyed', 'did-start-loading', 'render-process-gone'].map((e) => page.page.listenerCount(e)), [1, 1, 1])
})
