// A livliv.ai voice is paid by the line (its sentences share one line id), so a chat says any reply sentence by
// sentence, the first heard sooner (test:say-once pins the calls a session makes).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bySentence } from '../src/sessions/voicing'

test('a chat says a whole reply sentence by sentence; the rest say it whole', () => {
  assert.equal(bySentence('chat'), true)
  for (const mode of ['conversation', 'live', 'realtime'] as const) assert.equal(bySentence(mode), false, mode)
})
