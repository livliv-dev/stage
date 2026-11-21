import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import type { ExternalDecision, NeuroAnswer, NeuroConfig, NeuroMessage, NeuroSpeech, NeuroState } from '../../protocol/src/neuro'

const messages = new Set<(message: NeuroMessage) => void>(), states = new Set<(state: NeuroState) => void>()
const answers: { id: string; value: NeuroAnswer }[] = [], speech: NeuroSpeech[] = [], settings: NeuroConfig[] = []
const OFF: NeuroState = { enabled: false, port: null, url: null, character: null, connections: [], error: null }
const neuro = {
  get: async () => OFF,
  set: async (config: NeuroConfig) => { settings.push(config); return OFF },
  answer: (id: string, value: NeuroAnswer) => { answers.push({ id, value }) },
  speech: async (value: NeuroSpeech) => { speech.push(value) },
  onMessage: (callback: (value: NeuroMessage) => void) => { messages.add(callback); return () => { messages.delete(callback) } },
  onState: (callback: (value: NeuroState) => void) => { states.add(callback); return () => { states.delete(callback) } },
}
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
Object.defineProperty(globalThis, 'window', { configurable: true, value: { livlivDesktop: { neuro } } })
const { connectNeuro } = await import('../src/neuroBridge')
after(() => { if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window') })
const emit = (message: NeuroMessage) => messages.forEach((callback) => callback(message))
const tick = () => new Promise<void>((resolve) => setImmediate(resolve))
const request: ExternalDecision = { character: 'actor-1', source: 'Game', query: 'Choose', actions: [{ name: 'choose', description: 'Choose' }], priority: 'low', silent: false }

test('game events translate into core inputs without carrying protocol fields', () => {
  const inputs: unknown[] = [], dialogue: unknown[] = []
  const stop = connectNeuro({ event: (event) => { inputs.push(event); return true }, dialogue: (event) => { dialogue.push(event) }, decide: async () => null })
  emit({ kind: 'context', id: 'context-1', connection: 'connection-1', character: 'actor-1', source: 'Game', message: 'Opened the door', reply: 'never' })
  emit({ kind: 'dialogue', id: 'line-1', connection: 'connection-1', character: 'actor-1', started: true })
  emit({ kind: 'disconnect', connection: 'connection-1' })
  assert.deepEqual(inputs, [{ id: 'context-1', character: 'actor-1', source: 'Game', message: 'Opened the door', reply: 'never' }])
  assert.deepEqual(dialogue, [{ id: 'line-1', character: 'actor-1', started: true }, { id: 'line-1', started: false }])
  stop()
})

test('decision results return to the owning request; cancellation suppresses late results', async () => {
  let finish: ((value: { name: string }) => void) | undefined, signal: AbortSignal | undefined
  const before = answers.length
  const stop = connectNeuro({ event: () => true, dialogue: () => {}, decide: async (_request, inputSignal) => { signal = inputSignal; return new Promise((resolve) => { finish = resolve }) } })
  emit({ kind: 'decision', id: 'decision-1', expires: Date.now() + 1000, connection: 'connection-1', request })
  emit({ kind: 'cancel', id: 'decision-1' })
  assert.equal(signal?.aborted, true)
  finish?.({ name: 'choose' }); await tick()
  assert.equal(answers.length, before)
  stop()
})

test('ordinary results and failures preserve their outcome rather than pretending to decline', async () => {
  const before = answers.length
  let fail = false
  const stop = connectNeuro({ event: () => true, dialogue: () => {}, decide: async () => { if (fail) throw new Error('Model unavailable'); return { name: 'choose', data: { slot: 1 } } } })
  emit({ kind: 'decision', id: 'decision-2', expires: Date.now() + 1000, connection: 'connection-1', request }); await tick()
  fail = true
  emit({ kind: 'decision', id: 'decision-3', expires: Date.now() + 1000, connection: 'connection-1', request }); await tick()
  assert.deepEqual(answers.slice(before), [
    { id: 'decision-2', value: { ok: true, action: { name: 'choose', data: { slot: 1 } } } },
    { id: 'decision-3', value: { ok: false, error: 'Model unavailable' } },
  ])
  stop()
})

test('disconnect releases dialogue holds and speech reports follow the selected character in public', async () => {
  const dialogue: unknown[] = []
  let speechListener: ((event: { character: string; scope: 'public' | 'private'; speaking: boolean; final?: boolean; cancelled?: boolean }) => void) | undefined
  const before = speech.length
  const stop = connectNeuro({ event: () => true, dialogue: (event) => { dialogue.push(event) }, decide: async () => null,
    subscribeSpeech: (callback) => { speechListener = callback; return () => { speechListener = undefined } } })
  await tick()
  states.forEach((callback) => callback({ ...OFF, enabled: true, character: { id: 'actor-1', name: 'Nana' } }))
  speechListener?.({ character: 'other', scope: 'public', speaking: false })
  speechListener?.({ character: 'actor-1', scope: 'private', speaking: false })
  speechListener?.({ character: 'actor-1', scope: 'public', speaking: true })
  speechListener?.({ character: 'actor-1', scope: 'public', speaking: false, final: false })
  speechListener?.({ character: 'actor-1', scope: 'public', speaking: false, final: true, cancelled: true })
  assert.deepEqual(speech.slice(before), [{ character: 'actor-1', isFinal: false }, { character: 'actor-1', isFinal: true, cancelled: true }], 'nothing when a line starts')
  emit({ kind: 'dialogue', id: 'line-2', connection: 'connection-1', character: 'actor-1', started: true })
  states.forEach((callback) => callback(OFF))
  assert.deepEqual(dialogue, [{ id: 'line-2', character: 'actor-1', started: true }, { id: 'line-2', started: false }])
  stop(); assert.equal(speechListener, undefined)
  assert.deepEqual(settings.at(-1), { enabled: false })
})
