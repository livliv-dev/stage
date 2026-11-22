// What a session may spend is settled when it starts (src/sessions/spend.ts): a session that started free stays free, and
// livliv.ai turned off is free from the next line.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { brainNow, hearingNow, voiceNow, type Spend } from '../src/sessions/spend'

const free: Spend = { text: false, hearing: 'own', voices: { nana: 'api', kai: 'system' } }
const paid: Spend = { text: true, hearing: 'points', voices: { nana: 'livliv' } }

test('lines: livliv.ai\'s text only in a session that started on it', () => {
  const livliv = { kind: 'livliv' }, own = { kind: 'openai' }
  assert.equal(brainNow(livliv, own, free), own, 'livliv.ai turned on mid-session: still your own model')
  assert.equal(brainNow(livliv, own, paid), livliv)
  assert.equal(brainNow(own, livliv, paid), own, 'livliv.ai turned off mid-session: your own model from the next line')
  assert.equal(brainNow(livliv, own, null), livliv, 'no session: as set up')
})

test('hearing: livliv.ai\'s while its voices are on, else your own; started on your own, never points', () => {
  assert.equal(hearingNow(false, true, free), 'own')
  assert.equal(hearingNow(false, false, free), 'stop', 'Voicebox quit mid-session: no livliv.ai recognition')
  assert.equal(hearingNow(true, true, free), 'own', 'livliv.ai turned on mid-session: still your own')
  assert.equal(hearingNow(true, false, free), 'stop', '...and when yours goes, it stops rather than turning to points')
  assert.equal(hearingNow(true, true, paid), 'points', 'livliv.ai\'s voices on: its recognition, saved keys unused')
  assert.equal(hearingNow(false, true, paid), 'own', 'livliv.ai turned off mid-session: your own')
  assert.equal(hearingNow(false, false, paid), 'stop', '...or none: never points while off')
  assert.equal(hearingNow(true, false, null), 'points', 'no session: as set up')
  assert.equal(hearingNow(false, false, null), 'stop')
})

test('voices: a character that started off livliv.ai\'s voices is not voiced for points mid-session', () => {
  assert.equal(voiceNow('nana', 'livliv', false, free), 'none', 'livliv.ai turned on mid-session: subtitles')
  assert.equal(voiceNow('newcomer', 'livliv', false, free), 'none', 'one added mid-session was on none of them')
  assert.equal(voiceNow('nana', 'livliv', true, free), 'livliv', 'you set it to livliv.ai in its card yourself')
  assert.equal(voiceNow('nana', 'livliv', false, paid), 'livliv', 'it started on livliv.ai\'s')
  assert.equal(voiceNow('nana', 'api', false, free), 'api')
  assert.equal(voiceNow('kai', 'system', false, free), 'system')
  assert.equal(voiceNow('nana', 'livliv', false, null), 'livliv', 'no session: as set up')
})
