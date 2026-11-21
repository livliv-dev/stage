import assert from 'node:assert/strict'
import { test } from 'node:test'
import { airiFits, chooseEngine, engineReason, type Show } from '../src/brains/select'
import type { BrainConfig } from '../src/brain'

const model: BrainConfig = { kind: 'openai', provider: 'custom', base: 'http://model.test/v1', key: 'k', model: 'm' }
const desktop = { airi: true }, web = { airi: false }
const nana = { id: 'nana', remote: false, muted: false }, kai = { id: 'kai', remote: false, muted: false }
const chat: Show = { kind: 'chat', voice: 'api' }
const choose = (over: { brain?: BrainConfig; cast?: { id: string; remote?: boolean; muted: boolean }[]; show?: Show; features?: { airi: boolean } } = {}) =>
  chooseEngine(over.brain ?? model, over.cast ?? [nana], over.show ?? chat, over.features ?? desktop)

test('AIRI: the desktop app, a model of one\'s own, one local AI character, AIRI on, not a LivLiv voice', () => {
  assert.deepEqual(choose(), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ show: { kind: 'live', voice: 'system' } }), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ show: { kind: 'test' } }), { engine: 'airi', reason: 'airi' }, 'the model card\'s test asks no voice')
})

test('not the desktop app: the standard engine', () => {
  assert.deepEqual(choose({ features: web }), { engine: 'standard', reason: 'web' })
})

test('not a model of one\'s own (OpenAI-compatible): the standard engine', () => {
  assert.deepEqual(choose({ brain: { kind: 'livliv' } }), { engine: 'standard', reason: 'model' })
  assert.deepEqual(choose({ brain: { kind: 'demo' } }), { engine: 'standard', reason: 'model' })
})

test('more than one AI character, or none: the standard engine', () => {
  assert.deepEqual(choose({ cast: [nana, kai] }), { engine: 'standard', reason: 'cast' })
  assert.deepEqual(choose({ cast: [] }), { engine: 'standard', reason: 'none' })
})

test('a friend\'s character (好友联播): the standard engine', () => {
  assert.deepEqual(choose({ cast: [{ ...nana, remote: true }] }), { engine: 'standard', reason: 'remote' })
})

test('AIRI switched off: the standard engine, unless a game or a window asks for AIRI', () => {
  const off: BrainConfig = { ...model, airi: false } as BrainConfig
  assert.deepEqual(choose({ brain: off }), { engine: 'standard', reason: 'off' })
  assert.deepEqual(choose({ brain: off, show: { kind: 'test' } }), { engine: 'standard', reason: 'off' })
  assert.deepEqual(choose({ brain: off, show: { kind: 'live', voice: 'api' } }), { engine: 'standard', reason: 'off' })
  assert.deepEqual(choose({ brain: off, show: { kind: 'live', voice: 'api', needsAiri: true } }), { engine: 'airi', reason: 'airi' })
})

test('a LivLiv voice on the character: the standard engine (each /say is charged), unless muted or subtitles only', () => {
  assert.deepEqual(choose({ show: { kind: 'chat', voice: 'livliv' } }), { engine: 'standard', reason: 'livliv-voice' })
  assert.deepEqual(choose({ show: { kind: 'live', voice: 'livliv', needsAiri: true } }), { engine: 'standard', reason: 'livliv-voice' })
  assert.deepEqual(choose({ cast: [{ ...nana, muted: true }], show: { kind: 'chat', voice: 'livliv' } }), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ show: { kind: 'live', voice: 'livliv', textOnly: true } }), { engine: 'airi', reason: 'airi' })
})

test('持续聊天 asked of another character: the standard engine', () => {
  assert.deepEqual(choose({ show: { kind: 'chat', voice: 'api', target: 'kai' } }), { engine: 'standard', reason: 'target' })
  assert.deepEqual(choose({ show: { kind: 'chat', voice: 'api', target: 'nana' } }), { engine: 'airi', reason: 'airi' })
})

test('whether AIRI could run the cast and model at all, whatever the switch or the voice', () => {
  assert.equal(airiFits(choose()), true)
  assert.equal(airiFits(choose({ show: { kind: 'chat', voice: 'livliv' } })), true)
  assert.equal(airiFits(choose({ brain: { ...model, airi: false } as BrainConfig })), true)
  for (const over of [{ features: web }, { brain: { kind: 'livliv' } as BrainConfig }, { cast: [nana, kai] }, { cast: [] }, { cast: [{ ...nana, remote: true }] }]) assert.equal(airiFits(choose(over)), false)
})

test('every reason has words for the status line', () => {
  for (const reason of ['airi', 'web', 'model', 'none', 'cast', 'remote', 'off', 'target', 'livliv-voice'] as const) {
    const text = engineReason({ engine: reason === 'airi' ? 'airi' : 'standard', reason }, 2)
    assert.ok(text && !text.includes('{0}'), reason)
  }
  assert.equal(engineReason({ engine: 'airi', reason: 'airi' }, 1), '由 Project AIRI 驱动')
  assert.equal(engineReason({ engine: 'standard', reason: 'cast' }, 2), '2 个 AI 角色')
})
