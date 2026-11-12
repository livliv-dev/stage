import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WebSocket } from 'ws'
import { startRelay } from '../server.mjs'
import { resourcePaths, resourceUrl } from '../../stage/src/collab/resources.ts'
import { decodeInvite, encodeInvite, MAX_MODEL_BYTES, personName, readManifest, safePath, serviceUrl } from '../../stage/src/collab/protocol.ts'

async function client(url, origin = 'http://localhost:5222', headers = {}) {
  const socket = new WebSocket(url, { origin, headers }), inbox = [], waiters = []
  socket.on('message', (bytes) => { const value = JSON.parse(bytes); inbox.push(value); for (const wake of waiters.splice(0)) wake() })
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
  return { socket, inbox, send: (message) => socket.send(JSON.stringify(message)), async next(type) {
    const until = Date.now() + 2500
    for (;;) {
      const index = inbox.findIndex((message) => message.t === type)
      if (index >= 0) return inbox.splice(index, 1)[0]
      if (Date.now() > until) throw new Error('No ' + type + ': ' + JSON.stringify(inbox))
      await new Promise((resolve) => { const timer = setTimeout(resolve, 50); waiters.push(() => { clearTimeout(timer); resolve() }) })
    }
  } }
}

test('invites and asset manifests reject malformed input and traversal', () => {
  const invite = { server: 'wss://stage.example/room', room: 'room_0123456789abcdef', token: 'token_0123456789abcdef0123456789' }
  assert.deepEqual(decodeInvite(encodeInvite(invite)), invite)
  assert.throws(() => decodeInvite('lls1.a'))
  assert.throws(() => serviceUrl('https://example.com'))
  assert.throws(() => serviceUrl('wss://user:password@example.com'))
  for (const url of ['ws://127.0.0.1:5234/room', 'ws://localhost:5234', 'ws://10.0.0.8/room', 'ws://172.16.4.1/room', 'ws://192.168.1.20:5234/room', 'ws://[::1]:5234/room', 'ws://[fd12:3456::1]/room', 'wss://stage.example/room']) assert.doesNotThrow(() => serviceUrl(url), url)
  for (const url of ['ws://stage.example/room', 'ws://8.8.8.8/room', 'ws://172.32.0.1/room', 'ws://100.64.0.1/room', 'ws://127.0.0.1.example/room', 'ws://[2001:db8::1]/room', 'ws://[fd::1]/room', 'not a url']) assert.throws(() => serviceUrl(url), url)
  assert.throws(() => decodeInvite(encodeInvite({ ...invite, server: 'ws://stage.example/room' })), /wss/)
  assert.equal(personName(' \u202eMi\u200bka\u200d\u2066\ufeff\u0085\n '), 'Mika')
  assert.equal(personName('\u200b\u200c'), '')
  for (const path of ['../secret', '/etc/passwd', 'a/../b', 'C:/foo', 'a\\b', './x', 'a//b', 'x\0y', 'textures/%2e%2e/%2e%2e/__ai?u=x', 'file.png?x=y', 'file.png#fragment', 'https:evil']) assert.equal(safePath(path), false, path)
  const manifest = { id: 'model-1', name: 'A', format: 'png', mirror: false, color: '#123abc', files: [{ path: 'closed.png', size: 128, type: 'image/png' }] }
  assert.equal(readManifest(manifest)?.files.length, 1)
  assert.equal(readManifest({ ...manifest, files: [manifest.files[0], manifest.files[0]] }), null)
  assert.equal(readManifest({ ...manifest, files: [{ ...manifest.files[0], size: MAX_MODEL_BYTES + 1 }] }), null)
  assert.equal(readManifest({ ...manifest, files: [{ ...manifest.files[0], size: -1 }] }), null)
})

test('room admission, signaling isolation, capacity, removal and owner cleanup', async () => {
  const relay = await startRelay({ port: 0, socketsPerAddress: 16 }), url = `ws://127.0.0.1:${relay.address.port}/room`, clients = []
  const connect = async () => { const value = await client(url); clients.push(value); return value }
  try {
    const host = await connect(); host.send({ t: 'create', name: 'Host' }); const created = await host.next('joined')
    const wrong = await connect(); wrong.send({ t: 'join', room: created.room, token: 'wrong', name: 'Wrong' }); assert.equal((await wrong.next('error')).reason, '邀请码已失效')
    const guests = []
    for (let index = 0; index < 3; index++) {
      const guest = await connect(); guest.send({ t: 'join', room: created.room, token: created.token, name: 'Guest ' + index }); await guest.next('waiting')
      let pending; do { pending = await host.next('pending') } while (!pending.people.some((person) => person.name === 'Guest ' + index))
      const id = pending.people.find((person) => person.name === 'Guest ' + index).id
      if (index === 0) {
        guest.send({ t: 'signal', to: created.id, signal: { description: { type: 'offer', sdp: 'unapproved' } } })
        guest.send({ t: 'admit', id }); await new Promise((resolve) => setTimeout(resolve, 40)); assert.equal(host.inbox.some((message) => message.t === 'signal'), false)
      }
      host.send({ t: 'admit', id }); const joined = await guest.next('joined'); assert.equal(joined.members.length, index + 2); guests.push({ ...guest, id: joined.id })
    }
    const overflow = await connect(); overflow.send({ t: 'join', room: created.room, token: created.token, name: 'Overflow' }); assert.equal((await overflow.next('error')).reason, '联播人数已满')
    guests[0].send({ t: 'signal', to: guests[1].id, signal: { description: { type: 'offer', sdp: 'approved' } } }); const signal = await guests[1].next('signal'); assert.equal(signal.from, guests[0].id); assert.equal(signal.signal.description.sdp, 'approved')
    host.send({ t: 'remove', id: guests[0].id }); assert.equal((await guests[0].next('ended')).reason, '房主已移除你的联播连接')
    host.socket.close(); assert.equal((await guests[1].next('ended')).reason, '房主已结束联播')
    const stale = await connect(); stale.send({ t: 'join', room: created.room, token: created.token, name: 'Stale' }); assert.equal((await stale.next('error')).reason, '邀请码已失效')
    await assert.rejects(client(url, 'https://untrusted.example'), /403/)
  } finally { clients.forEach(({ socket }) => socket.terminate()); await relay.close() }
})

test('sockets and rooms are capped per address, with the last forwarded hop as the address behind a proxy', async () => {
  const relay = await startRelay({ port: 0, trustProxy: true, maxConnections: 10 }), url = `ws://127.0.0.1:${relay.address.port}/room`, clients = []
  const connect = async (address) => { const value = await client(url, undefined, { 'x-forwarded-for': '198.51.100.7, ' + address }); clients.push(value); return value }
  try {
    const own = []
    for (let index = 0; index < 4; index++) own.push(await connect('203.0.113.1'))
    await assert.rejects(connect('203.0.113.1'), /429/)
    own[0].send({ t: 'create', name: 'A' }); await own[0].next('joined')
    own[1].send({ t: 'create', name: 'B' }); await own[1].next('joined')
    own[2].send({ t: 'create', name: 'C' }); assert.equal((await own[2].next('error')).reason, '暂时无法创建联播')
    const other = await connect('203.0.113.2'); other.send({ t: 'create', name: 'D' }); await other.next('joined')
    for (let index = 1; index <= 4; index++) await connect('2001:db8:0:1::' + index)
    await assert.rejects(connect('2001:db8:0:1:ffff::9'), /429/)
    await connect('2001:db8:0:2::1')
    await assert.rejects(connect('203.0.113.3'), /503/)
  } finally { clients.forEach(({ socket }) => socket.terminate()); await relay.close() }
})

test('idle sockets time out, forwarded addresses are ignored without a proxy, and floods are dropped', async () => {
  const relay = await startRelay({ port: 0, helloTimeout: 300, messageRate: 1, messageBurst: 10 }), url = `ws://127.0.0.1:${relay.address.port}/room`, clients = []
  const connect = async (address = '203.0.113.1') => { const value = await client(url, undefined, { 'x-forwarded-for': address }); clients.push(value); return { ...value, closed: new Promise((resolve) => value.socket.once('close', resolve)) } }
  try {
    const host = await connect(); host.send({ t: 'create', name: 'Host' }); await host.next('joined')
    const idle = []
    for (let index = 2; index <= 4; index++) idle.push(await connect('203.0.113.' + index))
    await assert.rejects(connect('203.0.113.5'), /429/)
    for (const value of idle) assert.equal(await value.closed, 1008)
    assert.equal(host.socket.readyState, WebSocket.OPEN)
    for (let index = 0; index < 8; index++) host.send({ t: 'signal', to: 'nobody', signal: {} })
    await new Promise((resolve) => setTimeout(resolve, 50)); assert.equal(host.socket.readyState, WebSocket.OPEN)
    for (let index = 0; index < 40; index++) host.send({ t: 'signal', to: 'nobody', signal: {} })
    assert.equal(await host.closed, 1008)
  } finally { clients.forEach(({ socket }) => socket.terminate()); await relay.close() }
})

test('only declared model resources stay within the model directory', () => {
  const attack = 'textures/%2e%2e/%2e%2e/__ai?u=http://127.0.0.1/private'
  const model = { layers: [{ texture: 'textures/body.webp', mask: 'textures/mask.png', frames: ['textures/eye.webp'] }], files: { keyforms: 'keyforms.json', 'x-ignored': attack }, profile: { arbitrary: attack } }
  assert.deepEqual(resourcePaths(model), ['textures/body.webp', 'textures/mask.png', 'textures/eye.webp', 'keyforms.json'])
  const base = new URL('livliv-stage://app/characters/sample/')
  assert.equal(resourceUrl('textures/body.webp', base).href, 'livliv-stage://app/characters/sample/textures/body.webp')
  assert.throws(() => resourceUrl(attack, base))
  assert.throws(() => resourcePaths({ layers: [{ texture: attack }] }))
})
