// A livliv.ai voice is paid per /say call: a line in it is voiced whole, one call, however its reply comes (pinned here
// for the decision; test:say-once pins the calls a session makes).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bySentence, streamable } from '../src/sessions/voicing'

test('a line in a livliv.ai voice is never split; other chats are said sentence by sentence', () => {
  assert.equal(bySentence('chat', 'livliv'), false)
  assert.equal(bySentence('chat', 'api'), true)
  assert.equal(bySentence('chat', 'system'), true)
  assert.equal(bySentence('chat', 'none'), true)
  for (const mode of ['conversation', 'live', 'realtime'] as const) assert.equal(bySentence(mode, 'api'), false, mode)
})

test('a streamed reply (AIRI) is never voiced in a livliv.ai voice', () => {
  assert.equal(streamable('livliv'), false)
  for (const voice of ['api', 'system', 'none'] as const) assert.equal(streamable(voice), true)
})
