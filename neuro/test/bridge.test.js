import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import WebSocket from 'ws'
import { createNeuroServer } from '../index.js'

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
async function until(read, timeout = 1500) {
  const end = Date.now() + timeout
  for (;;) {
    const value = read()
    if (value) return value
    if (Date.now() >= end) throw new Error('Timed out waiting for bridge event')
    await delay(5)
  }
}
async function setup(t, options = {}) {
  const events = [], errors = []
  const server = createNeuroServer({
    character: { id: 'stage-test', name: 'Stage test' },
    onError(error) { errors.push(error) },
    ...options,
    onEvent(event, session) { events.push({ ...event, sessionId: session.id }); return options.onEvent?.(event, session) },
  })
  t.after(() => server.close())
  const address = await server.listen()
  const client = new WebSocket(address.url)
  const messages = []
  client.on('message', raw => messages.push(JSON.parse(raw.toString())))
  await once(client, 'open')
  const send = (command, data, game = 'Test game') => client.send(JSON.stringify({ command, game, ...(data === undefined ? {} : { data }) }))
  send('startup')
  const startup = await until(() => messages.find(message => message.command === 'startup'))
  await until(() => events.find(event => event.type === 'startup'))
  return { server, client, events, errors, messages, send, address, startup, session: server.sessions()[0] }
}
const move = { name: 'move', description: 'Choose a direction', schema: { type: 'object', required: ['direction'], additionalProperties: false, properties: { direction: { type: 'string', enum: ['left', 'right'] } } } }
async function register(value, actions = [move]) {
  value.send('actions/register', { actions })
  await until(() => value.session.actions.length === actions.length)
}

test('startup has a custom stable character identity and malformed messages never mutate context', async t => {
  const value = await setup(t)
  assert.equal(value.startup.data.session.characterId, 'stage-test')
  value.client.send('{broken')
  value.send('unknown/command', { message: 'ignored' })
  value.send('context', { message: 'wrong game', silent: false }, 'Other game')
  value.send('context', { message: 'seen, without requesting speech', silent: true })
  value.send('context', { message: 'may comment', silent: false })
  await until(() => value.events.filter(event => event.type === 'context').length === 2)
  assert.deepEqual(value.events.filter(event => event.type === 'context').map(({ message, silent }) => ({ message, silent })), [
    { message: 'seen, without requesting speech', silent: true }, { message: 'may comment', silent: false },
  ])
  assert.equal(value.events.filter(event => event.type === 'reply').length, 0)
})

test('registered schemas validate decisions, results correlate once, and unregistering permits the in-flight result', async t => {
  const value = await setup(t)
  await register(value)
  await assert.rejects(value.session.perform('move', { direction: 'up' }), /enum/)
  await assert.rejects(value.session.perform('move', { direction: 'left', extra: true }), /not allowed/)
  assert.equal(value.messages.filter(message => message.command === 'action').length, 0)
  const result = value.session.perform('move', { direction: 'left' })
  const message = await until(() => value.messages.find(message => message.command === 'action'))
  assert.equal(message.data.data, '{"direction":"left"}')
  value.send('actions/unregister', { action_names: ['move'] })
  value.send('action/result', { id: 'unrelated', success: true })
  value.send('action/result', { id: message.data.id, success: true, message: 'accepted' })
  value.send('action/result', { id: message.data.id, success: false })
  assert.deepEqual(await result, { id: message.data.id, name: 'move', success: true, message: 'accepted' })
  await until(() => value.session.actions.length === 0)
  await assert.rejects(value.session.perform('move', { direction: 'left' }), /not registered/)
})

test('invalid schema registration is atomic and reports unsupported constraints to the host', async t => {
  const value = await setup(t)
  await register(value)
  value.send('actions/register', { actions: [{ name: 'other', description: 'valid' }, { name: 'pattern', description: 'unsupported', schema: { type: 'object', properties: { x: { type: 'string', pattern: '.*' } } } }] })
  await until(() => value.errors.length)
  assert.deepEqual(value.session.actions.map(action => action.name), ['move'])
  assert.match(value.errors[0].message, /Unsupported/)
})

test('force preserves priority/silent/ephemeral flags and failure does not retry by default', async t => {
  const decisions = []
  const value = await setup(t, { decideAction(request) { decisions.push(request); return { name: 'move', data: { direction: 'right' } } } })
  await register(value)
  value.send('speech/started', { id: 'npc', speaker: 'NPC', reply: 'never' })
  value.send('actions/force', { state: 'choose now', query: 'Where?', action_names: ['move'], priority: 'critical', silent: true, ephemeral_context: true })
  const action = await until(() => value.messages.find(message => message.command === 'action'))
  assert.equal(decisions[0].priority, 'critical')
  assert.equal(decisions[0].silent, true)
  assert.equal(decisions[0].ephemeralContext, true)
  assert.equal(value.session.speaking, true)
  value.send('action/result', { id: action.data.id, success: false, message: 'cannot move' })
  await until(() => value.events.find(event => event.type === 'force-complete'))
  assert.equal(decisions.length, 1)
  assert.equal(value.events.find(event => event.type === 'force-complete').status, 'failed')
})

test('force retries are explicitly bounded and receive a fresh action catalog', async t => {
  let attempts = 0
  const value = await setup(t, { maxForceAttempts: 2, decideAction() { attempts++; return { name: 'move', data: { direction: 'left' } } } })
  await register(value)
  value.send('actions/force', { query: 'try', action_names: ['move'] })
  for (let n = 1; n <= 2; n++) {
    const action = await until(() => value.messages.filter(message => message.command === 'action')[n - 1])
    value.send('action/result', { id: action.data.id, success: false })
  }
  await until(() => value.events.find(event => event.type === 'force-complete'))
  assert.equal(attempts, 2)
  assert.equal(value.events.find(event => event.type === 'force-complete').status, 'failed')
})

test('unregister aborts a force even if its decision callback ignores AbortSignal; stale decision cannot dispatch', async t => {
  let finish
  const value = await setup(t, { decideAction() { return new Promise(resolve => { finish = resolve }) } })
  await register(value)
  value.send('actions/force', { query: 'wait', action_names: ['move'] })
  await until(() => finish)
  value.send('actions/unregister', { action_names: ['move'] })
  await until(() => value.events.find(event => event.type === 'force-complete'))
  finish({ name: 'move', data: { direction: 'left' } })
  await delay(15)
  assert.equal(value.events.find(event => event.type === 'force-complete').status, 'cancelled')
  assert.equal(value.messages.some(message => message.command === 'action'), false)
})

test('overlapping force does not duplicate the action, and restart rejects stale pending results', async t => {
  const value = await setup(t, { decideAction: () => ({ name: 'move', data: { direction: 'left' } }) })
  await register(value)
  value.send('actions/force', { query: 'first', action_names: ['move'] })
  await until(() => value.messages.find(message => message.command === 'action'))
  value.send('actions/force', { query: 'second', action_names: ['move'] })
  await until(() => value.errors.length)
  value.send('startup')
  await until(() => value.events.filter(event => event.type === 'startup').length === 2)
  assert.equal(value.messages.filter(message => message.command === 'action').length, 1)
  assert.equal(value.session.actions.length, 0)
  assert.equal(value.events.find(event => event.type === 'force-complete').status, 'cancelled')
})

test('timeout and AbortSignal settle actions without a late result starting a retry', async t => {
  const value = await setup(t, { actionTimeoutMs: 20 })
  await register(value)
  await assert.rejects(value.session.perform('move', { direction: 'left' }), /timed out/)
  const controller = new AbortController()
  const aborted = value.session.perform('move', { direction: 'right' }, { signal: controller.signal })
  controller.abort(new Error('cancelled by host'))
  await assert.rejects(aborted, /cancelled by host/)
  await until(() => value.messages.filter(message => message.command === 'action').length === 2)
  value.send('action/result', { id: value.messages.find(message => message.command === 'action').data.id, success: true })
  await delay(15)
  assert.equal(value.messages.filter(message => message.command === 'action').length, 2)
})

test('dialogue groups consecutive lines, suppresses duplicate ids, and only prompts for the last reply policy', async t => {
  const value = await setup(t, { dialogueGraceMs: 25 })
  value.send('speech/started', { id: 'one', speaker: 'NPC', text: 'hello', reply: 'always' })
  value.send('speech/ended', { id: 'one' })
  value.send('speech/started', { id: 'two', speaker: 'NPC', reply: 'never' })
  value.send('speech/ended', { id: 'two' })
  value.send('speech/started', { id: 'one', speaker: 'NPC', reply: 'always' })
  await until(() => value.events.filter(event => event.type === 'dialogue').length === 4)
  await delay(40)
  assert.equal(value.events.some(event => event.type === 'reply'), false)
  value.send('speech/started', { id: 'three', speaker: 'NPC', reply: 'always', responder: 'stage-test' })
  value.send('speech/ended', { id: 'three' })
  const reply = await until(() => value.events.find(event => event.type === 'reply'))
  assert.equal(reply.reply, 'always')
  assert.equal(reply.line.id, 'three')
  value.session.speechFinished({ isFinal: true, cancelled: true, reason: 'interrupted' })
  assert.deepEqual((await until(() => value.messages.find(message => message.command === 'speech_finished'))).data, { isFinal: true, cancelled: true, reason: 'interrupted' })
})

test('disconnect clears open dialogue without prompting and rejects outstanding actions', async t => {
  const value = await setup(t, { dialogueGraceMs: 1 })
  await register(value)
  value.send('speech/started', { id: 'one', speaker: 'NPC', reply: 'always' })
  await until(() => value.session.speaking)
  const result = value.session.perform('move', { direction: 'left' })
  const rejected = assert.rejects(result, /disconnected/)
  value.client.close()
  await rejected
  await until(() => value.events.find(event => event.type === 'disconnect'))
  assert.equal(value.server.sessions().length, 0)
  assert.equal(value.events.some(event => event.type === 'reply'), false)
})

test('untrusted browser origins and extra connections are rejected; an explicitly allowed origin works', async t => {
  const value = await setup(t, { allowedOrigins: ['http://localhost:1234'] })
  async function rejected(origin) {
    const client = new WebSocket(value.address.url, { origin })
    await assert.rejects(once(client, 'open'), /403/)
  }
  await rejected('https://example.com')
  await rejected('http://localhost:1234')
  value.client.close(); await once(value.client, 'close')
  const client = new WebSocket(value.address.url, { origin: 'http://localhost:1234' })
  await once(client, 'open'); client.close(); await once(client, 'close')
})

test('multiple connections reporting the same dialogue trigger one reaction', async t => {
  const value = await setup(t, { maxConnections: 2, dialogueGraceMs: 1 })
  const second = new WebSocket(value.address.url)
  await once(second, 'open')
  const sendSecond = (command, data) => second.send(JSON.stringify({ command, game: 'Test game', data }))
  sendSecond('startup')
  await until(() => value.events.filter(event => event.type === 'startup').length === 2)
  const line = { id: 'shared', speaker: 'NPC', reply: 'always' }
  value.send('speech/started', line); sendSecond('speech/started', line)
  await until(() => value.events.find(event => event.type === 'dialogue'))
  value.send('speech/ended', { id: 'shared' }); sendSecond('speech/ended', { id: 'shared' })
  await until(() => value.events.find(event => event.type === 'reply'))
  assert.equal(value.events.filter(event => event.type === 'dialogue').length, 2)
  assert.equal(value.events.filter(event => event.type === 'reply').length, 1)
})

test('closing during startup releases the port and close is safe before listen', async () => {
  const unused = createNeuroServer({ character: { id: 'local', name: 'Local' } })
  await unused.close()
  const server = createNeuroServer({ character: { id: 'local', name: 'Local' } })
  const starting = server.listen()
  const closing = server.close()
  const address = await starting
  await closing
  assert.equal(server.close(), closing)
  const client = new WebSocket(address.url)
  await assert.rejects(once(client, 'open'), /ECONNREFUSED/)
})

test('a stalled host cannot accumulate an unbounded event queue', async t => {
  let release
  const value = await setup(t, { onEvent(event) { if (event.type === 'context') return new Promise(resolve => { release ??= resolve }) } })
  value.client.on('error', () => {})
  for (let i = 0; i < 600; i++) value.send('context', { message: `context ${i}`, silent: true })  // past the 512 a host may hold
  const [code] = await once(value.client, 'close')
  release?.()
  assert.equal(code, 1008)
  assert.match(value.errors[0].message, /queue is full/)
})
