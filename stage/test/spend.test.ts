// What a session may spend is settled when it starts (src/sessions/spend.ts): something it used going away never moves
// it onto LivLiv's points.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hearingNow, voiceNow, type Spend } from '../src/sessions/spend'

const free: Spend = { hearing: 'own', voices: { nana: 'api', kai: 'system' } }
const paid: Spend = { hearing: 'points', voices: { nana: 'livliv' } }

test('hearing: your own recognition while it is there; started on it, it stops rather than turning to points', () => {
  assert.equal(hearingNow(true, free), 'own')
  assert.equal(hearingNow(false, free), 'stop', 'Voicebox quit mid-session: no LivLiv recognition')
  assert.equal(hearingNow(true, paid), 'own', 'your own, when it comes, before points')
  assert.equal(hearingNow(false, paid), 'points', 'started on LivLiv\'s (from a button): as it started')
  assert.equal(hearingNow(false, null), 'points', 'no session: as before')
})

test('voices: a character that started off LivLiv\'s voices is not voiced for points when its own goes away', () => {
  assert.equal(voiceNow('nana', 'livliv', false, free), 'none', 'its API (Voicebox) went away: subtitles')
  assert.equal(voiceNow('newcomer', 'livliv', false, free), 'none', 'one added mid-session was on none of them')
  assert.equal(voiceNow('nana', 'livliv', true, free), 'livliv', 'you set it to a LivLiv voice yourself')
  assert.equal(voiceNow('nana', 'livliv', false, paid), 'livliv', 'it started on LivLiv\'s')
  assert.equal(voiceNow('nana', 'api', false, free), 'api')
  assert.equal(voiceNow('kai', 'system', false, free), 'system')
  assert.equal(voiceNow('nana', 'livliv', false, null), 'livliv', 'no session: as before')
})
