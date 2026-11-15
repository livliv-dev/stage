import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import type { ForceRequest, NeuroServer, NeuroServerOptions, NeuroSession } from '@livliv-dev/neuro-bridge'
import { NeuroHost } from '../neuroHost'
import { readNeuroAnswer, readNeuroConfig, type NeuroMessage, type NeuroState } from '../neuroProtocol'

class Editor extends EventEmitter {
  id = 1
  destroyed = false
  loading = false
  messages: { channel: string; value: unknown }[] = []
  isDestroyed() { return this.destroyed }
  isLoadingMainFrame() { return this.loading }
  send(channel: string, value: unknown) { this.messages.push({ channel, value }) }
  events(): NeuroMessage[] { return this.messages.filter((message) => message.channel === 'livliv:neuro-message').map((message) => message.value as NeuroMessage) }
  states(): NeuroState[] { return this.messages.filter((message) => message.channel === 'livliv:neuro-state').map((message) => message.value as NeuroState) }
}
function setup(timeout = 200) {
  const editor = new Editor()
  let current: Editor | null = editor, options: NeuroServerOptions | undefined, created = 0, closes = 0
  const speech: unknown[] = []
  const session: NeuroSession = { id: 'connection-1', game: 'Game', actions: [{ name: 'choose', description: 'Choose' }], speaking: false,
    perform: async (name) => ({ id: 'action-1', name, success: true }), speechFinished: (value) => { speech.push(value) } }
  const fake: NeuroServer = { listen: async (port) => ({ host: '127.0.0.1', port: port || 43001, url: `ws://127.0.0.1:${port || 43001}` }), sessions: () => [session], close: async () => { closes++ } }
  const host = new NeuroHost({ editor: () => current, decisionTimeoutMs: timeout, server: (value) => { options = value; created++; return fake } })
  return { host, editor, session, speech, options: () => { assert.ok(options); return options }, counts: () => ({ created, closes }), current: (value: Editor | null) => { current = value } }
}
const CONFIG = { enabled: true as const, port: 0, character: { id: 'actor-1', name: 'Nana', profileId: 'profile-1' } }
const request: ForceRequest = { id: 'force-1', state: 'The board is ready', query: 'Choose', actionNames: ['choose'], availableActions: [{ name: 'choose', description: 'Choose' }], ephemeralContext: true, priority: 'high', silent: true, attempt: 1 }

test('the integration starts disabled and binds only to the supplied character when explicitly configured', async () => {
  const s = setup()
  assert.equal(s.host.state().enabled, false)
  assert.equal(s.counts().created, 0)
  const state = await s.host.configure(CONFIG)
  assert.equal(state.url, 'ws://127.0.0.1:43001')
  assert.deepEqual(s.options().character, { id: 'stage:profile-1', name: 'Nana' })
  await s.host.close()
  assert.equal(s.host.state().enabled, false)
  assert.equal(s.editor.states().at(-1)?.enabled, false)
  assert.equal(s.counts().closes, 1)
})

test('protocol events become plain conversation inputs with namespaced dialogue IDs', async () => {
  const s = setup(); await s.host.configure(CONFIG)
  await s.options().onEvent?.({ type: 'context', message: 'A door opened', silent: true }, s.session)
  await s.options().onEvent?.({ type: 'dialogue', speaking: true, line: { id: 'line-1', speaker: 'NPC', text: 'Welcome', reply: 'always' } }, s.session)
  await s.options().onEvent?.({ type: 'dialogue', speaking: false, line: { id: 'line-1', speaker: 'NPC', reply: 'always' } }, s.session)
  const events = s.editor.events()
  assert.equal(events[0]?.kind, 'context')
  assert.equal(events[0]?.kind === 'context' && events[0].reply, 'never')
  assert.deepEqual(events.filter((event) => event.kind === 'dialogue'), [
    { kind: 'dialogue', id: 'connection-1:line-1', connection: 'connection-1', started: true },
    { kind: 'dialogue', id: 'connection-1:line-1', connection: 'connection-1', started: false },
  ])
  await s.host.close()
})

test('a game decision waits for its owning editor and rejects another window answer', async () => {
  const s = setup(); await s.host.configure(CONFIG)
  const answer = s.options().decideAction!(request, s.session, new AbortController().signal)
  const message = s.editor.events().find((event) => event.kind === 'decision')
  assert.ok(message && message.kind === 'decision')
  assert.equal(message.request.priority, 'high'); assert.equal(message.request.silent, true)
  assert.equal(s.host.answer(2, message.id, { ok: true, action: { name: 'choose' } }), false)
  assert.equal(s.host.answer(1, message.id, { ok: true, action: { name: 'choose', data: { slot: 2 } } }), true)
  assert.deepEqual(await answer, { name: 'choose', data: { slot: 2 } })
  await s.host.close()
})

test('aborting a game decision cancels the renderer request and ignores late answers', async () => {
  const s = setup(); await s.host.configure(CONFIG)
  const controller = new AbortController()
  const answer = Promise.resolve(s.options().decideAction!(request, s.session, controller.signal))
  const message = s.editor.events().find((event) => event.kind === 'decision')
  assert.ok(message && message.kind === 'decision')
  controller.abort(new Error('Game disconnected'))
  await assert.rejects(answer, /Game disconnected/)
  assert.ok(s.editor.events().some((event) => event.kind === 'cancel' && event.id === message.id))
  assert.equal(s.host.answer(1, message.id, { ok: true, action: null }), false)
  await s.host.close()
})

test('editor reload closes the game interface and cancels active decisions', async () => {
  const s = setup(); await s.host.configure(CONFIG)
  const answer = Promise.resolve(s.options().decideAction!(request, s.session, new AbortController().signal))
  s.editor.loading = true; s.editor.emit('did-start-loading')
  await assert.rejects(answer, /integration stopped/)
  await s.host.close()
  assert.equal(s.host.state().enabled, false)
})

test('decision timeouts surface a failure and do not turn into a declined or successful action', async () => {
  const s = setup(10); await s.host.configure(CONFIG)
  await assert.rejects(Promise.resolve(s.options().decideAction!(request, s.session, new AbortController().signal)), /timed out/)
  assert.ok(s.editor.events().some((event) => event.kind === 'cancel'))
  await s.host.close()
})

test('persistent force context is recorded but ephemeral force context stays out of chat inputs', async () => {
  const s = setup(); await s.host.configure(CONFIG)
  const controller = new AbortController()
  const ephemeral = Promise.resolve(s.options().decideAction!(request, s.session, controller.signal))
  assert.equal(s.editor.events().filter((event) => event.kind === 'context').length, 0)
  controller.abort(new Error('finished')); await assert.rejects(ephemeral)
  const next = new AbortController()
  const persistent = Promise.resolve(s.options().decideAction!({ ...request, ephemeralContext: false }, s.session, next.signal))
  assert.equal(s.editor.events().filter((event) => event.kind === 'context').length, 1)
  next.abort(new Error('finished')); await assert.rejects(persistent)
  await s.host.close()
})

test('speech completion is sent only for the bound character', async () => {
  const s = setup(); await s.host.configure(CONFIG)
  s.host.speech({ character: 'other', isFinal: true })
  assert.equal(s.speech.length, 0)
  s.host.speech({ character: 'actor-1', isFinal: false })
  s.host.speech({ character: 'actor-1', isFinal: true, cancelled: true })
  assert.deepEqual(s.speech, [{ isFinal: false }, { isFinal: true, cancelled: true, reason: 'interrupted' }])
  await s.host.close()
})

test('configuration and IPC answers reject malformed external values', () => {
  for (const value of [null, {}, { enabled: true, port: -1, character: CONFIG.character }, { ...CONFIG, port: NaN }, { ...CONFIG, character: { id: '', name: 'Nana' } }]) assert.equal(readNeuroConfig(value), null)
  assert.deepEqual(readNeuroConfig(CONFIG), CONFIG)
  assert.deepEqual(readNeuroConfig({ enabled: false }), { enabled: false })
  assert.equal(readNeuroAnswer({ ok: true, action: { name: 'choose', data: { number: Infinity } } }), null)
  assert.equal(readNeuroAnswer({ ok: true, action: { name: 'choose', data: [] } }), null)
  assert.deepEqual(readNeuroAnswer({ ok: true, action: null }), { ok: true, action: null })
})
