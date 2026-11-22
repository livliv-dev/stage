// What AIRI is told a character remembers (src/brains/airiMemory.ts): short ids in the order the memories were made,
// the index holding each up to 150 characters, the tool only when one is longer, a body cut to 600, two calls a turn.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BODY_CHARS, INDEX_CHARS, MAX_REQUESTS, memoryBody, memoryIndexOf } from '../src/brains/airiMemory'

const memory = (text: string, createdAt: number) => ({ id: `uuid-${createdAt}`, text, createdAt })

test('short ids in the order the memories were made: a new one goes at the end, the rest keep theirs', () => {
  const two = memoryIndexOf([memory('住在海边', 20), memory('喜欢猫', 10)])
  assert.equal(two.index, 'm1 喜欢猫\nm2 住在海边')
  assert.equal(two.records.get('m2')!.id, 'uuid-20')
  const three = memoryIndexOf([memory('养了一只橘猫', 30), memory('住在海边', 20), memory('喜欢猫', 10)])
  assert.ok(three.index.startsWith(two.index + '\n'), 'the index so far stays the same')
  assert.ok(!three.index.includes('uuid'), 'no long ids in what AIRI is given')
})

test('short memories whole and no tool; a longer one cut at 150 with …, and the tool to read the rest', () => {
  const short = memoryIndexOf([memory('喜欢猫', 1), memory('a\nb', 2)])
  assert.equal(short.longer, false)
  assert.equal(short.index, 'm1 喜欢猫\nm2 a b')
  const long = memoryIndexOf([memory('长'.repeat(INDEX_CHARS + 1), 1)])
  assert.equal(long.longer, true)
  assert.equal(long.index, 'm1 ' + '长'.repeat(INDEX_CHARS) + '…')
})

test('a body the tool gives is at most 600 characters; a turn makes at most two calls', () => {
  assert.equal(memoryBody('长'.repeat(2000)).length, BODY_CHARS)
  assert.equal(memoryBody('短'), '短')
  assert.equal(MAX_REQUESTS, 2)
})
