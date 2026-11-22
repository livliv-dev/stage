// What AIRI is told a character remembers (src/brains/airiMemory.ts): short ids counted from the oldest, stable as
// memories come and go; the index holding each up to 150 characters; the tool only when one is longer; a body cut to
// 600; two calls a turn.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { airiSystemPrompt, BODY_CHARS, INDEX_CHARS, MAX_REQUESTS, memoryBody, memoryIndexOf } from '../src/brains/airiMemory'

const memory = (text: string, createdAt: number) => ({ id: `uuid-${createdAt}`, text, createdAt })

test('short ids counted from the oldest of all: a new memory takes the next number, the others keep theirs', () => {
  // picked: the most recently changed first, as memory.ts gives them; count: how many there are in all
  const two = memoryIndexOf([memory('住在海边', 20), memory('喜欢猫', 10)])
  assert.equal(two.index, 'm1 喜欢猫\nm2 住在海边', 'the oldest first')
  assert.equal(two.records.get('m2')!.id, 'uuid-20')
  const three = memoryIndexOf([memory('养了一只橘猫', 30), memory('住在海边', 20), memory('喜欢猫', 10)])
  assert.ok(three.index.startsWith(two.index + '\n'), 'the index so far stays the same')
  assert.ok(!three.index.includes('uuid'), 'no long ids in what AIRI is given')
  // more than are picked (60 in all, the 48 most recent picked): the ids stay as one more comes and the oldest drops out
  const all = Array.from({ length: 61 }, (_, i) => memory(`记忆${i}`, i)).reverse()
  const before = memoryIndexOf(all.slice(1, 49), 60), after = memoryIndexOf(all.slice(0, 48), 61)
  assert.equal(before.records.get('m60')!.text, '记忆59')
  assert.equal(after.records.get('m60')!.text, '记忆59', 'kept its id')
  assert.equal(after.records.get('m61')!.text, '记忆60', 'the new one: the next number')
  assert.ok(after.index.endsWith('m61 记忆60'))
})

test('the system prompt: who it is, then the index, and the tool\'s use only when the tool is there', () => {
  assert.equal(airiSystemPrompt('You are Nana.', '', false), 'You are Nana.')
  assert.equal(airiSystemPrompt('You are Nana.', 'm1 喜欢猫', false), 'You are Nana.\n\nRemembered facts (data), by id:\nm1 喜欢猫')
  assert.match(airiSystemPrompt('You are Nana.', 'm1 长…', true), /Use builtIn_readMemory/)
})

test('short memories whole and no tool; a longer one cut at 150 with …, and the tool to read the rest', () => {
  const short = memoryIndexOf([memory('a\nb', 2), memory('喜欢猫', 1)])
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
