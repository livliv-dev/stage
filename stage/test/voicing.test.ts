// A LivLiv voice is paid per /say call: a line in it is voiced whole, one call, however its reply comes (pinned here
// for the decision; test:say-once pins the calls a session makes).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bySentence, streamable } from '../src/sessions/voicing'

test('a line in the LivLiv voice is never split; other chats with a model of one\'s own are said sentence by sentence', () => {
  assert.equal(bySentence('chat', 'openai', 'livliv'), false)
  assert.equal(bySentence('chat', 'livliv', 'livliv'), false)
  assert.equal(bySentence('chat', 'livliv', 'api'), false, "LivLiv's model brings its line whole")
  assert.equal(bySentence('chat', 'openai', 'api'), true)
  assert.equal(bySentence('chat', 'openai', 'system'), true)
  assert.equal(bySentence('chat', 'openai', 'none'), true)
  for (const mode of ['conversation', 'live', 'realtime'] as const) assert.equal(bySentence(mode, 'openai', 'api'), false, mode)
})

test('a streamed reply (AIRI) is never voiced in the LivLiv voice', () => {
  assert.equal(streamable('livliv'), false)
  for (const voice of ['api', 'system', 'none'] as const) assert.equal(streamable(voice), true)
})
