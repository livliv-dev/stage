// Character cards from other apps read as a Stage character's persona (src/characterCard.ts), from sample cards: AIRI's
// V3 with its extensions.airi block, a plain V3, SillyTavern's V2, TavernAI's first format, the same inside a PNG, and
// files that are not cards or are broken.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CARD_BYTES, readCharacterCard } from '../src/characterCard'

const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const base64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64')
/** a PNG with these text chunks (a 1×1 picture; CRCs are not checked by the reader) */
function png(chunks: [string, string][], { broken = false } = {}) {
  const parts: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const chunk = (type: string, data: Uint8Array) => {
    parts.push((data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0)
  }
  chunk('IHDR', new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]))
  for (const [keyword, value] of chunks) chunk('tEXt', new Uint8Array([...Buffer.from(keyword, 'latin1'), 0, ...Buffer.from(value, 'latin1')]))
  chunk('IEND', new Uint8Array())
  const bytes = new Uint8Array(parts)
  return broken ? bytes.subarray(0, bytes.length - 20) : bytes
}

const airiCard = {
  spec: 'chara_card_v3', spec_version: '3.0',
  data: {
    name: 'Iru', nickname: '', character_version: '1.0.0', creator: 'someone',
    description: '{{char}} is a curious AI who lives in your computer and loves {{user}}\'s questions.',
    personality: 'cheerful, a little sarcastic, talks in short bursts',
    scenario: 'A late-night stream.',
    first_mes: '*waves at the camera* Hi {{user}}! I\'m {{char}}. Ready to start?',
    mes_example: '<START>\n{{user}}: What are you doing?\n{{char}}: *spins around* Reading your files, obviously.\nJust kidding.\n<START>\n{{user}}: Good night\n{{char}}: Night! Don\'t let the bugs bite.',
    alternate_greetings: ['Hey again.'], group_only_greetings: [], tags: ['ai'], creator_notes: '', system_prompt: '', post_history_instructions: '',
    character_book: { entries: [{ keys: ['stream'], content: 'Streams on Fridays.' }] },
    extensions: {
      airi: {
        contextWindow: -1, avatarModels: [{ id: 'm1', type: 'live2d', displayModelId: 'hiyori' }], defaultAvatarModelId: 'm1',
        modules: { consciousness: { provider: 'openrouter', model: 'some-model' }, vision: { provider: '', model: '' }, speech: { provider: 'elevenlabs', model: 'v3', voice_id: 'abc' } },
        agents: {},
      },
    },
  },
}

test('AIRI\'s V3 card: the persona comes over; the avatar model, voice and module settings stay behind', () => {
  const r = readCharacterCard(json(airiCard))
  assert.ok(r.ok)
  assert.equal(r.spec, 'v3')
  assert.equal(r.airi, true)
  assert.deepEqual(r.card, {
    name: 'Iru',
    persona: 'Iru is a curious AI who lives in your computer and loves your questions.',
    style: 'cheerful, a little sarcastic, talks in short bursts',
    greeting: 'Hi you! I\'m Iru. Ready to start?',
    examples: ['Reading your files, obviously. Just kidding.', 'Night! Don\'t let the bugs bite.'],
  })
  assert.deepEqual(r.left, ['avatar', 'voice', 'modules', 'scenario', 'lorebook', 'greetings'])
  assert.equal(r.trimmed, false)
})

test('a V3 card without extensions.airi, in Chinese: only what it has, {{user}} as 你', () => {
  const r = readCharacterCard(json({
    spec: 'chara_card_v3', spec_version: '3.0',
    data: { name: '小鸣', description: '', personality: '{{char}}是{{user}}的同桌，嘴硬心软。', first_mes: '{{user}}，又迟到了？', mes_example: '', extensions: { depth_prompt: { depth: 4, prompt: '', role: 'system' } } },
  }))
  assert.ok(r.ok)
  assert.equal(r.airi, false)
  assert.deepEqual(r.card, { name: '小鸣', persona: '小鸣是你的同桌，嘴硬心软。', greeting: '你，又迟到了？', examples: [] }, 'no description: the personality is who it is, and there is no separate style')
  assert.deepEqual(r.left, [])
})

test('SillyTavern\'s V2 card, and the nickname V3 puts in place of {{char}}', () => {
  const v2 = readCharacterCard(json({
    spec: 'chara_card_v2', spec_version: '2.0',
    data: { name: 'Aoi', description: 'A shrine maiden.', personality: 'calm', first_mes: 'Welcome.', mes_example: '<START>\nYou: hi\nAoi: Hello, traveller.', system_prompt: 'Stay in character.', extensions: {} },
  }))
  assert.ok(v2.ok)
  assert.equal(v2.spec, 'v2')
  assert.deepEqual(v2.card.examples, ['Hello, traveller.'], 'a line under its own name counts as the character\'s')
  assert.deepEqual(v2.left, ['system'])
  const nick = readCharacterCard(json({ spec: 'chara_card_v3', spec_version: '3.0', data: { name: 'Aoi Tanaka', nickname: 'Aoi', description: '{{char}} keeps the shrine.', first_mes: '' } }))
  assert.ok(nick.ok)
  assert.equal(nick.card.name, 'Aoi Tanaka')
  assert.equal(nick.card.persona, 'Aoi keeps the shrine.')
  assert.equal(nick.card.greeting, undefined)
})

test('TavernAI\'s first format, with <BOT> and <USER>', () => {
  const r = readCharacterCard(json({ name: 'Kai', description: '<BOT> fixes bikes for <USER>.', personality: '', first_mes: 'Flat tyre again?', mes_example: '<USER>: help\n<BOT>: On it.' }))
  assert.ok(r.ok)
  assert.equal(r.spec, 'v1')
  assert.deepEqual(r.card, { name: 'Kai', persona: 'Kai fixes bikes for you.', greeting: 'Flat tyre again?', examples: ['On it.'] })
})

test('a card in a PNG: its ccv3 chunk before its chara chunk; a V2-only PNG; a picture with no card; a broken file', () => {
  const v2 = { spec: 'chara_card_v2', spec_version: '2.0', data: { name: 'Old', description: 'from the V2 chunk' } }
  const both = readCharacterCard(png([['chara', base64(v2)], ['ccv3', base64(airiCard)]]))
  assert.ok(both.ok)
  assert.equal(both.card.name, 'Iru')
  assert.equal(both.airi, true)
  const only = readCharacterCard(png([['chara', base64(v2)]]))
  assert.ok(only.ok)
  assert.equal(only.card.persona, 'from the V2 chunk')
  assert.deepEqual(readCharacterCard(png([['Comment', 'just a picture']])), { ok: false, error: 'not-a-card' })
  assert.deepEqual(readCharacterCard(png([['ccv3', base64(airiCard)]], { broken: true })), { ok: false, error: 'unreadable' })
  assert.deepEqual(readCharacterCard(png([['ccv3', '%%% not base64 %%%']])), { ok: false, error: 'unreadable' })
})

test('malformed: not JSON, not a card, no name, too big, a CHARX archive', () => {
  const bad = (value: Uint8Array) => { const r = readCharacterCard(value); return r.ok ? 'ok' : r.error }
  assert.equal(bad(new TextEncoder().encode('{ name: Iru')), 'not-a-card')
  assert.equal(bad(new Uint8Array([0xff, 0xfe, 0x00, 0xd8])), 'not-a-card')
  assert.equal(bad(json([airiCard])), 'not-a-card')
  assert.equal(bad(json({ spec: 'chara_card_v3', spec_version: '3.0' })), 'not-a-card', 'no data')
  assert.equal(bad(json({ spec: 'something_else', data: airiCard.data })), 'not-a-card')
  assert.equal(bad(json({ title: 'a settings file', name: 'x' })), 'not-a-card', 'a name alone is not a card')
  assert.equal(bad(json({ spec: 'chara_card_v3', spec_version: '3.0', data: { ...airiCard.data, name: '  ' } })), 'no-name')
  assert.equal(bad(json({ spec: 'chara_card_v2', spec_version: '2.0', data: { name: 42 } })), 'no-name')
  assert.equal(bad(new Uint8Array(CARD_BYTES + 1)), 'too-big')
  assert.equal(bad(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])), 'charx')
  assert.equal(bad(new TextEncoder().encode('﻿' + JSON.stringify(airiCard))), 'ok', 'a byte-order mark is fine')
})

test('long cards are cut at a sentence end, and the result says so', () => {
  const long = Array.from({ length: 300 }, (_, i) => `Sentence ${i} about the character.`).join(' ')
  const r = readCharacterCard(json({
    spec: 'chara_card_v3', spec_version: '3.0',
    data: { name: 'Long', description: long, mes_example: Array.from({ length: 20 }, (_, i) => `{{char}}: line ${i}`).join('\n') },
  }))
  assert.ok(r.ok)
  assert.equal(r.trimmed, true)
  assert.ok(r.card.persona.length <= 4000 && r.card.persona.endsWith('character.'))
  assert.equal(r.card.examples.length, 12)
})

test('a crafted card reads quickly: long fields are cut before anything reads them', () => {
  const huge = 'a'.repeat(1_000_000)
  const card = {
    spec: 'chara_card_v3', spec_version: '3.0',
    data: {
      name: 'Slow', description: `(OOC: ${huge}`, personality: `*${huge}`,
      first_mes: `((OOC: ${huge}`, mes_example: Array.from({ length: 2000 }, () => `{{char}}: (OOC: ${'b'.repeat(500)}`).join('\n'),
    },
  }
  const started = performance.now()
  const r = readCharacterCard(json(card))
  const took = performance.now() - started
  assert.ok(r.ok)
  assert.equal(r.trimmed, true)
  assert.ok(took < 1000, `read in ${Math.round(took)} ms`)
})

