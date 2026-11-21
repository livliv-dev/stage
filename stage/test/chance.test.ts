// The session's chance draws come from Math.random as it is at each draw, unless a test pins them: a page that swaps
// Math.random after the session loaded (test:points takes a waiting viewer that way) is heard.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chance, setChance } from '../src/sessions/chance'

test('draws follow Math.random swapped after load; a pinned source wins until it is let go', () => {
  const real = Math.random
  try {
    Math.random = () => 0.25
    assert.equal(chance(), 0.25, 'Math.random as it is now, not as it was when the module loaded')
    setChance(() => 0)
    assert.equal(chance(), 0)
    setChance()
    assert.equal(chance(), 0.25)
  } finally { Math.random = real; setChance() }
})
