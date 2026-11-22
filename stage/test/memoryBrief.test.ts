// What Stage's own brain is told it remembers (src/brains/memoryBrief.ts): the text alone, the most recent first, at
// most MEMORY_CHARS in all, a long one cut to the room left.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MEMORY_CHARS, memoryBrief } from '../src/brains/memoryBrief'

const record = (text: string, i = 0) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, profileId: 'nana', scope: 'private', text, createdAt: i, updatedAt: i })

test('the text alone: no ids, owners or times; spaces and line breaks made single spaces', () => {
  const brief = memoryBrief([record('喜欢猫'), record('  住在\n海边  ', 1)])
  assert.deepEqual(brief, ['喜欢猫', '住在 海边'])
  assert.ok(!JSON.stringify(brief).includes('00000000'))
})

test('at most MEMORY_CHARS in all, the first (most recent) kept, a long one cut to the room left', () => {
  const many = Array.from({ length: 500 }, (_, i) => record(`记忆${i}：` + '内容'.repeat(20), i))
  const brief = memoryBrief(many)
  assert.ok(brief.join('').length <= MEMORY_CHARS, String(brief.join('').length))
  assert.ok(brief.join('').length > MEMORY_CHARS - 50, 'the room is used')
  assert.equal(brief[0].startsWith('记忆0：'), true, 'in the order given (memory.ts: most recent first)')
  assert.ok(brief.at(-1)!.endsWith('…'), 'the last one cut to fit')
  const long = memoryBrief([record('长'.repeat(5000))])
  assert.equal(long.length, 1)
  assert.equal(long[0].length, MEMORY_CHARS)
  assert.deepEqual(memoryBrief(undefined), [])
  assert.deepEqual(memoryBrief([record('   ')]), [], 'an empty one is left out')
})
