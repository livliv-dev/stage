// AIRI's history kept the same from one call to the next (src/brains/airiHistory.ts): a window of 18 to 30 lines whose
// start moves twelve lines at a time, a time per line that stays as first seen, an event line cut short.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EVENT_CHARS, firstSeen, HISTORY_LINES, HISTORY_STEP, historyText, windowStart } from '../src/brains/airiHistory'

test('the window grows to 30 lines, then is trimmed 12 at a time: never fewer than 18', () => {
  assert.deepEqual([0, 10, 30].map(windowStart), [0, 0, 0], 'whole until full')
  const starts = Array.from({ length: 60 }, (_, i) => windowStart(i + 31))
  for (const [i, start] of starts.entries()) {
    const count = i + 31
    assert.equal(start % HISTORY_STEP, 0)
    assert.ok(count - start <= HISTORY_LINES && count - start >= 18, `${count}: ${count - start} lines`)
  }
  assert.equal(new Set(starts.slice(0, 12)).size, 1, 'twelve turns in a row with the same start')
})

test('a line keeps the time it was first passed on; a new one gets the time it is first seen', () => {
  assert.equal(firstSeen('line-a', 1_000), 1_000)
  assert.equal(firstSeen('line-a', 90_000), 1_000, 'not restamped a turn later')
  assert.equal(firstSeen('line-b', 90_000), 90_000)
})

test("an event line is cut to 500 characters; a person's line is not", () => {
  const event = historyText({ who: 'external:Minecraft', text: '事'.repeat(4000) })
  assert.equal(event.length, EVENT_CHARS)
  assert.ok(event.endsWith('…'))
  assert.equal(historyText({ who: 'external:Minecraft', text: '短' }), '短')
  assert.equal(historyText({ who: 'owner', text: '长'.repeat(800) }).length, 800)
})
