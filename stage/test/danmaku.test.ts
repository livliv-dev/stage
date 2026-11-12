import assert from 'node:assert/strict'
import { test } from 'node:test'
const kept = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value) } })
class Socket {
  static all: Socket[] = []
  onopen?: () => void; onclose?: () => void; onerror?: () => void; onmessage?: (event: { data: string }) => void
  sent: string[] = []
  url: string
  constructor(url: string) { this.url = url; Socket.all.push(this) }
  send(text: string) { this.sent.push(text) }
  close() { this.onclose?.() }
  message(text: string) { this.onmessage?.({ data: text }) }
}
Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket })
const { clean, connectTwitch, disconnect, chatState, blockUser, simulate, onAudienceMessage, onChat } = await import('../src/danmaku')
test('links, bot commands and empty text are ignored; text truncates by Unicode characters', () => {
  for (const text of ['', ' !command', ' ！ＣＯＭＭＡＮＤ', 'https://example.org', 'www.example.org', 'example.com']) assert.equal(clean(text), null)
  assert.equal(clean(' hello\n  world '), 'hello world')
  assert.equal([...clean('😀'.repeat(100))!].length, 80)
})
test('failed Twitch connections retry 2/4/8 seconds, then stop; manual disconnect cancels a pending retry', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  connectTwitch('https://twitch.tv/test_channel')
  assert.equal(chatState().channel, 'test_channel')
  for (const delay of [2000, 4000, 8000]) {
    Socket.all.at(-1)!.close()
    const count = Socket.all.length
    t.mock.timers.tick(delay - 1); assert.equal(Socket.all.length, count)
    t.mock.timers.tick(1); assert.equal(Socket.all.length, count + 1)
  }
  Socket.all.at(-1)!.close(); assert.equal(chatState().status, 'error')
  connectTwitch('another'); Socket.all.at(-1)!.close(); disconnect()
  const count = Socket.all.length; t.mock.timers.tick(30_000)
  assert.equal(Socket.all.length, count); assert.equal(chatState().status, 'off')
})
test('a stale socket cannot change the new connection, and the IRC id deduplicates messages', () => {
  connectTwitch('first'); const old = Socket.all.at(-1)!
  connectTwitch('second'); const current = Socket.all.at(-1)!
  old.message(':old!old JOIN #first'); assert.equal(chatState().status, 'connecting')
  current.onopen?.(); assert.ok(current.sent.includes('JOIN #second'))
  current.message(':ok!ok JOIN #second'); assert.equal(chatState().status, 'on')
  const line = '@display-name=Viewer;id=unique-id :viewer!viewer PRIVMSG #second :Hello stage'
  const count = chatState().recent.length
  current.message(line); current.message(line)
  assert.equal(chatState().recent.length, count + 1)
  blockUser('Viewer'); assert.ok(chatState().blocked.includes('viewer'))
  simulate('VIEWER', 'hidden'); assert.ok(!chatState().recent.some((m) => m.text === 'hidden'))
  blockUser('Viewer'); disconnect()
})

test('commands reach actions once per IRC id, while AI keeps its text and command filters', () => {
  disconnect()
  const actions: string[] = [], ai: string[] = []
  const off = onAudienceMessage((c) => actions.push(c.text)), offAi = onChat((c) => ai.push(c.text))
  connectTwitch('actions')
  const socket = Socket.all.at(-1)!
  const command = '@display-name=Viewer;id=command-1 :viewer!viewer PRIVMSG #actions :!hi'
  socket.message(command); socket.message(command)
  socket.message(command.replace('command-1', 'command-2'))
  assert.deepEqual(actions, ['!hi', '!hi']); assert.deepEqual(ai, [])
  socket.message('@id=normal-1 :viewer!viewer PRIVMSG #actions :hello')
  socket.message('@id=normal-2 :viewer!viewer PRIVMSG #actions :hello')
  assert.deepEqual(actions, ['!hi', '!hi', 'hello', 'hello']); assert.deepEqual(ai, ['hello'])
  blockUser('Viewer'); simulate('Viewer', '!hi'); assert.equal(actions.length, 4)
  blockUser('Viewer'); simulate('Viewer', 'https://example.org'); assert.equal(actions.length, 4)
  off(); offAi(); disconnect()
})
