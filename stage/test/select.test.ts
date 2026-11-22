import assert from 'node:assert/strict'
import { test } from 'node:test'
import { airiFits, chooseEngine, engineReason, type Show } from '../src/brains/select'
import type { BrainConfig } from '../src/brain'

const model: BrainConfig = { kind: 'openai', provider: 'custom', base: 'http://model.test/v1', key: 'k', model: 'm' }
const desktop = { airi: true, vision: true }, site = { airi: true, vision: false }, web = { airi: false, vision: false }
const nana = { id: 'nana', remote: false, muted: false }, kai = { id: 'kai', remote: false, muted: false }
const chat: Show = { kind: 'chat' }
const choose = (over: { brain?: BrainConfig; cast?: { id: string; remote?: boolean; muted: boolean }[]; show?: Show; features?: { airi: boolean; vision: boolean } } = {}) =>
  chooseEngine(over.brain ?? model, over.cast ?? [nana], over.show ?? chat, over.features ?? desktop)

test('AIRI wherever it fits: the desktop app, a model of one\'s own or livliv.ai\'s text, one local AI character, AIRI on', () => {
  assert.deepEqual(choose(), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ brain: { kind: 'livliv' } }), { engine: 'airi', reason: 'airi' }, 'livliv.ai\'s text is a model like one\'s own')
  assert.deepEqual(choose({ show: { kind: 'live' } }), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ show: { kind: 'test' } }), { engine: 'airi', reason: 'airi' }, 'the model card\'s test asks no voice')
})

test('a page without AIRI (a desktop bridge without window capture): the standard engine', () => {
  assert.deepEqual(choose({ features: web }), { engine: 'standard', reason: 'web' })
})

test('a web page (livliv.ai/stage, a copy hosted elsewhere): AIRI for 持续聊天 (no window, no game); AI 直播 on the standard engine', () => {
  assert.deepEqual(choose({ features: site }), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ features: site, brain: { kind: 'livliv' } }), { engine: 'airi', reason: 'airi' })
  assert.deepEqual(choose({ features: site, show: { kind: 'live' } }), { engine: 'standard', reason: 'web' })
  assert.deepEqual(choose({ features: site, show: { kind: 'live', needsAiri: true } }), { engine: 'standard', reason: 'web' })
  assert.equal(engineReason(choose({ features: site, show: { kind: 'live' } }), 1), '网页版')
})

test('the demo (no model): the standard engine', () => {
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
  assert.deepEqual(choose({ brain: off, show: { kind: 'live' } }), { engine: 'standard', reason: 'off' })
  assert.deepEqual(choose({ brain: off, show: { kind: 'live', needsAiri: true } }), { engine: 'airi', reason: 'airi' })
})

test('持续聊天 asked of another character: the standard engine', () => {
  assert.deepEqual(choose({ show: { kind: 'chat', target: 'kai' } }), { engine: 'standard', reason: 'target' })
  assert.deepEqual(choose({ show: { kind: 'chat', target: 'nana' } }), { engine: 'airi', reason: 'airi' })
})

test('whether AIRI could run the cast and model at all, whatever the switch or the voice', () => {
  assert.equal(airiFits(choose()), true)
  assert.equal(airiFits(choose({ brain: { ...model, airi: false } as BrainConfig })), true)
  assert.equal(airiFits(choose({ brain: { kind: 'livliv' } })), true)
  for (const over of [{ features: web }, { brain: { kind: 'demo' } as BrainConfig }, { cast: [nana, kai] }, { cast: [] }, { cast: [{ ...nana, remote: true }] }]) assert.equal(airiFits(choose(over)), false)
})

test('every reason has words for the status line', () => {
  for (const reason of ['airi', 'web', 'model', 'none', 'cast', 'remote', 'off', 'target'] as const) {
    const text = engineReason({ engine: reason === 'airi' ? 'airi' : 'standard', reason }, 2)
    assert.ok(text && !text.includes('{0}'), reason)
  }
  assert.equal(engineReason({ engine: 'airi', reason: 'airi' }, 1), '由 Project AIRI 驱动')
  assert.equal(engineReason({ engine: 'standard', reason: 'cast' }, 2), '2 个 AI 角色')
})
