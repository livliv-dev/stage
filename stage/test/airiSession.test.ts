import assert from 'node:assert/strict'
import { test } from 'node:test'
import { acceptAiriReply, airiBinding } from '../src/airiSession.ts'

test('one character keeps one AIRI session while the turn number changes beside it', () => {
  assert.equal(airiBinding('sena'), 'livliv-stage:sena')
  assert.equal(airiBinding('sena'), airiBinding('sena'))
  assert.notEqual(airiBinding('sena'), airiBinding('mio'))
  assert.equal(airiBinding('  '), 'livliv-stage:stage')
  const current = { binding: airiBinding('sena'), turn: 2 }
  assert.equal(acceptAiriReply({ binding: current.binding, turn: 2 }, current), true)
  assert.equal(acceptAiriReply({ binding: current.binding, turn: 1 }, current), false)
  assert.equal(acceptAiriReply({ binding: airiBinding('mio'), turn: 2 }, current), false)
  assert.equal(acceptAiriReply({ text: 'typed in AIRI' } as { binding?: string }, current), true)
})
