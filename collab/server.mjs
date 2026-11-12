import { createServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { pathToFileURL } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'
import { MAX_MEMBERS, ROOM_VERSION, object, personName, validSignal } from '../stage/src/collab/protocol.ts'

// IPv6 clients usually hold a whole /64, so the per-address caps count it as one address.
function addressKey(address = '') {
  const ip = address.replace(/%.*$/, '').replace(/^::ffff:(?=[\d.]+$)/i, '')
  if (isIP(ip) !== 6) return ip
  const [head, tail] = ip.toLowerCase().split('::'), left = head ? head.split(':') : [], right = tail ? tail.split(':') : []
  const groups = tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  return groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, '')).join(':') + '::/64'
}

export async function startRelay({ host = '127.0.0.1', port = 5234, origins = [], iceServers = [], relayOnly = false, maxConnections = 256, socketsPerAddress = 4, roomsPerAddress = 2, trustProxy = false, helloTimeout = 10_000, messageRate = 10, messageBurst = 100 } = {}) {
  const rooms = new Map(), sockets = new Map()
  const send = (peer, message) => { if (peer.ws.readyState === WebSocket.OPEN) peer.ws.send(JSON.stringify(message)) }
  const members = (room) => [...room.members.values()].map(({ id, name }) => ({ id, name, host: room.owner.id === id }))
  const pending = (room) => send(room.owner, { t: 'pending', people: [...room.pending.values()].map(({ id, name }) => ({ id, name, host: false })) })
  const announce = (room) => { for (const peer of room.members.values()) send(peer, { t: 'members', members: members(room) }) }
  const joined = (peer, room) => send(peer, { t: 'joined', id: peer.id, room: room.id, token: room.token, members: members(room), iceServers, relayOnly, version: ROOM_VERSION })
  function drop(peer) {
    const room = peer.room
    if (!room) return
    peer.room = null
    if (room.owner === peer) {
      rooms.delete(room.id)
      for (const other of [...room.members.values(), ...room.pending.values()]) if (other !== peer) { other.room = null; send(other, { t: 'ended', reason: '房主已结束联播' }); other.ws.close() }
    } else {
      room.members.delete(peer.id); room.pending.delete(peer.id); announce(room); pending(room)
    }
  }
  const allowed = (origin) => {
    if (origin === 'livliv-stage://app' || origins.includes(origin)) return true
    try { const url = new URL(origin); return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) } catch { return false }
  }
  const server = createServer((req, res) => {
    if (req.url === '/health') res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, version: ROOM_VERSION }))
    else res.writeHead(404).end()
  })
  // The last X-Forwarded-For hop is the one our own proxy added; earlier hops are whatever the client sent.
  const addressOf = (request) => {
    const forwarded = trustProxy ? String(request.headers['x-forwarded-for'] ?? '').split(',').pop().trim() : ''
    return addressKey(isIP(forwarded) ? forwarded : request.socket.remoteAddress)
  }
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false })
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/room' || !allowed(request.headers.origin)) { socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'); return }
    const address = addressOf(request)
    if (wss.clients.size >= maxConnections) { socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n'); return }
    if ((sockets.get(address) ?? 0) >= socketsPerAddress) { socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n'); return }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, address))
  })
  wss.on('connection', (ws, address) => {
    const peer = { ws, id: randomUUID(), name: '', room: null, alive: true, address, tokens: messageBurst, refilled: Date.now() }
    sockets.set(address, (sockets.get(address) ?? 0) + 1)
    const hello = setTimeout(() => { if (!peer.room) ws.close(1008, 'create or join first') }, helloTimeout)
    hello.unref()
    ws.on('pong', () => { peer.alive = true })
    ws.on('close', () => {
      drop(peer); clearTimeout(hello)
      const left = sockets.get(address) - 1
      if (left) sockets.set(address, left); else sockets.delete(address)
    })
    ws.on('error', () => ws.close())
    ws.on('message', (bytes, binary) => {
      // Token bucket: messages past the budget are ignored, and a socket that keeps going is closed.
      const now = Date.now()
      peer.tokens = Math.min(messageBurst, peer.tokens + (now - peer.refilled) * messageRate / 1000) - 1; peer.refilled = now
      if (peer.tokens < 0) { if (peer.tokens < -messageBurst) ws.close(1008, 'too many messages'); return }
      let message
      try { if (binary) throw new Error(); message = JSON.parse(bytes.toString()) } catch { ws.close(1003, 'invalid message'); return }
      if (!object(message)) { ws.close(1003); return }
      if (message.t === 'create' && !peer.room) {
        const name = personName(message.name)
        if (!name || rooms.size >= 128 || [...rooms.values()].filter((room) => room.owner.address === peer.address).length >= roomsPerAddress) { send(peer, { t: 'error', reason: '暂时无法创建联播' }); return }
        peer.name = name
        const room = { id: randomBytes(16).toString('base64url'), token: randomBytes(24).toString('base64url'), owner: peer, members: new Map([[peer.id, peer]]), pending: new Map() }
        peer.room = room; rooms.set(room.id, room); joined(peer, room)
      } else if (message.t === 'join' && !peer.room) {
        const room = rooms.get(message.room), name = personName(message.name)
        if (!room || message.token !== room.token || !name) { send(peer, { t: 'error', reason: '邀请码已失效' }); return }
        if (room.members.size >= MAX_MEMBERS || room.pending.size >= 8) { send(peer, { t: 'error', reason: '联播人数已满' }); return }
        peer.name = name; peer.room = room; room.pending.set(peer.id, peer); send(peer, { t: 'waiting' }); pending(room)
      } else if (message.t === 'admit' || message.t === 'remove') {
        const room = peer.room
        if (!room || room.owner !== peer || typeof message.id !== 'string' || message.id === peer.id) return
        if (message.t === 'admit') {
          const guest = room.pending.get(message.id)
          if (!guest || room.members.size >= MAX_MEMBERS) return
          room.pending.delete(guest.id); room.members.set(guest.id, guest); joined(guest, room); announce(room); pending(room)
        } else {
          const guest = room.members.get(message.id) ?? room.pending.get(message.id)
          if (guest) { send(guest, { t: 'ended', reason: '房主已移除你的联播连接' }); drop(guest); guest.ws.close() }
        }
      } else if (message.t === 'signal') {
        const room = peer.room, target = room?.members.get(message.to)
        if (room?.members.has(peer.id) && target && target !== peer && validSignal(message.signal)) send(target, { t: 'signal', from: peer.id, signal: message.signal })
      } else if (message.t === 'leave') { drop(peer); ws.close() }
    })
    const heartbeat = setInterval(() => { if (!peer.alive) { ws.terminate(); return } peer.alive = false; ws.ping() }, 30_000)
    heartbeat.unref(); ws.once('close', () => clearInterval(heartbeat))
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve) })
  return { server, address: server.address(), async close() { for (const ws of wss.clients) ws.terminate(); await new Promise((resolve) => wss.close(resolve)); await new Promise((resolve) => server.close(resolve)) } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const relay = await startRelay({
    host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT) || 5234, origins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean), iceServers: JSON.parse(process.env.ICE_SERVERS || '[]'), relayOnly: process.env.RELAY_ONLY === '1',
    maxConnections: Number(process.env.MAX_CONNECTIONS) || 256, socketsPerAddress: Number(process.env.MAX_SOCKETS_PER_IP) || 4, roomsPerAddress: Number(process.env.MAX_ROOMS_PER_IP) || 2, trustProxy: process.env.TRUST_PROXY === '1',
  })
  console.log(`LivLiv Stage signaling: ws://${relay.address.address}:${relay.address.port}/room`)
  const stop = () => { void relay.close().then(() => process.exit()) }
  process.once('SIGINT', stop); process.once('SIGTERM', stop)
}
