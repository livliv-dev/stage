// Mock AIRI socket. It speaks the handshake checked in moeru-ai/airi @ 473112a, not server-runtime and not a model.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { test } from 'node:test'
import type { AddressInfo } from 'node:net'
import { AiriClient } from '../src/airiClient.ts'
import { AIRI_SENT_EVENTS, airiReply, airiServerUrl, parseAiriEvent, type AiriEvent } from '../src/airiProtocol.ts'
import { acceptAiriReply } from '../src/airiSession.ts'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

function sendFrame(socket: import('node:net').Socket, text: string) {
  const payload = Buffer.from(text)
  const head = payload.length < 126 ? Buffer.from([0x81, payload.length]) : Buffer.concat([Buffer.from([0x81, 126]), Buffer.from([(payload.length >> 8) & 255, payload.length & 255])])
  socket.write(Buffer.concat([head, payload]))
}

function frames(buffer: Buffer) {
  const messages: string[] = []
  let rest = buffer
  while (rest.length >= 2) {
    const opcode = rest[0] & 0x0f
    const masked = (rest[1] & 0x80) !== 0
    let length = rest[1] & 0x7f
    let offset = 2
    if (length === 126) {
      if (rest.length < 4) break
      length = rest.readUInt16BE(2)
      offset = 4
    } else if (length === 127) break
    if (rest.length < offset + (masked ? 4 : 0) + length) break
    let payload = rest.subarray(offset + (masked ? 4 : 0), offset + (masked ? 4 : 0) + length)
    if (masked) {
      const mask = rest.subarray(offset, offset + 4)
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]!))
    }
    rest = rest.subarray(offset + (masked ? 4 : 0) + length)
    if (opcode === 0x1) messages.push(payload.toString('utf8'))
    if (opcode === 0x8) break
  }
  return { rest, messages }
}

async function mockAiri() {
  const received: AiriEvent[] = []
  const sockets = new Set<import('node:net').Socket>()
  let reply!: (event: unknown) => void
  const server: Server = createServer()
  server.on('connection', (socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  server.on('upgrade', (request, socket) => {
    const key = request.headers['sec-websocket-key']
    const accept = createHash('sha1').update(String(key) + GUID).digest('base64')
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
    let pending = Buffer.alloc(0)
    reply = (event) => sendFrame(socket, JSON.stringify(event))
    socket.on('data', (chunk: Buffer) => {
      const read = frames(Buffer.concat([pending, chunk]))
      pending = read.rest
      for (const text of read.messages) {
        const event = parseAiriEvent(text)
        if (!event) continue
        received.push(event)
        if (event.type === 'module:authenticate') reply({ type: 'module:authenticated', data: { authenticated: event.data.token === 'test-token' } })
        if (event.type === 'extension:module:announce') {
          // The real runtime also emits module:authenticated when no token was sent. A second announce must not follow.
          reply({ type: 'module:authenticated', data: { authenticated: true } })
          reply({ type: 'extension:module:announced', data: { name: event.data.name, identity: event.data.identity } })
        }
      }
    })
  })
  const port = (server.address() as AddressInfo).port
  return {
    url: `ws://127.0.0.1:${port}/ws`, received, send: (event: unknown) => reply(event),
    close: () => { for (const socket of sockets) socket.destroy(); return new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) },
  }
}

test('the mock AIRI handshake delivers a completed reply and does not register Stage as the chat consumer', async () => {
  const server = await mockAiri()
  const replies: string[] = []
  const client = new AiriClient({ url: server.url, onReply: (reply) => replies.push(reply.text) })
  try {
    await client.connect()
    assert.equal(server.received[0]?.type, 'extension:module:announce')
    assert.equal(server.received.filter((event) => event.type === 'extension:module:announce').length, 1)
    assert.deepEqual(server.received[0]?.data.possibleEvents, [...AIRI_SENT_EVENTS])
    assert.equal(server.received.some((event) => event.type === 'module:consumer:register'), false)
    const arrived = async (type: string) => {
      for (let i = 0; i < 20 && !server.received.some((event) => event.type === type); i++) await new Promise((resolve) => setTimeout(resolve, 15))
    }
    server.send({
      json: {
        type: 'output:gen-ai:chat:complete',
        data: {
          message: { role: 'assistant', content: [{ type: 'text', text: 'hello from the mock' }] },
          toolCalls: [],
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, source: 'estimate-based' },
          'gen-ai:chat': { input: { type: 'input:text', data: { text: 'hi', overrides: { binding: 'someone-else' } } } },
        },
        metadata: { event: { id: 'evt_1' } },
      },
    })
    for (let i = 0; i < 20 && replies.length === 0; i++) await new Promise((resolve) => setTimeout(resolve, 15))
    assert.deepEqual(replies, ['hello from the mock'])
    assert.equal(client.sendText('from stage', 'sena'), true)
    assert.equal(client.sendText('again', 'sena'), true)
    await arrived('input:text')
    const sent = server.received.filter((event) => event.type === 'input:text')
    assert.equal((sent[0]?.data.overrides as { binding?: string }).binding, 'livliv-stage:sena')
    assert.equal((sent[1]?.data.overrides as { binding?: string }).binding, 'livliv-stage:sena')
    assert.equal(sent[0]?.data.livlivTurn, 1)
    assert.equal(sent[1]?.data.livlivTurn, 2)
    assert.equal(acceptAiriReply({ binding: 'livliv-stage:sena', turn: 2 }, { binding: client.currentBinding, turn: client.turn }), true)
    assert.equal(acceptAiriReply({ binding: 'livliv-stage:sena', turn: 1 }, { binding: client.currentBinding, turn: client.turn }), false)
    server.send({ type: 'transport:connection:heartbeat', data: { kind: 'ping', message: '🩵', at: 1 } })
    await arrived('transport:connection:heartbeat')
    assert.equal(server.received.some((event) => event.type === 'transport:connection:heartbeat' && event.data.kind === 'pong'), true)
  } finally { client.close(); await server.close() }
})

test('a token is authenticated before the module announces itself', async () => {
  const server = await mockAiri()
  const client = new AiriClient({ url: server.url, token: 'test-token', onReply: () => {} })
  try {
    await client.connect()
    assert.deepEqual(server.received.map((event) => event.type).slice(0, 2), ['module:authenticate', 'extension:module:announce'])
    assert.equal(server.received[0]?.data.token, 'test-token')
  } finally { client.close(); await server.close() }
  const rejected = await mockAiri()
  const bad = new AiriClient({ url: rejected.url, token: 'nope', onReply: () => {} })
  await assert.rejects(bad.connect(), /did not accept/)
  bad.close()
  await rejected.close()
})

test('completed text is read from the verified event and addresses stay websocket URLs', () => {
  const event = parseAiriEvent(JSON.stringify({ type: 'output:gen-ai:chat:complete', data: { message: { content: '  plain  ' } }, metadata: { event: { id: 'evt-2' } } }))
  assert.equal(airiReply(event!)?.text, 'plain')
  const marked = airiReply(parseAiriEvent(JSON.stringify({ type: 'output:gen-ai:chat:complete', data: { message: { content: 'Hi.' }, outputText: '<|ACT {"emotion":"happy"}|>Hi.', livlivTurn: 4, overrides: { binding: 'livliv-stage:sena' } } }))!)
  assert.equal(marked?.raw?.includes('<|ACT'), true)
  assert.equal(marked?.turn, 4)
  assert.equal(marked?.binding, 'livliv-stage:sena')
  assert.equal(airiReply(parseAiriEvent(JSON.stringify({ type: 'output:gen-ai:chat:message', data: { message: { content: 'partial' } } }))!), null)
  assert.equal(airiServerUrl('ws://127.0.0.1:6121/ws'), 'ws://127.0.0.1:6121/ws')
  assert.equal(airiServerUrl('http://127.0.0.1/audio.wav'), null)
  assert.equal(airiServerUrl('ws://user:secret@127.0.0.1/ws'), null)
})
