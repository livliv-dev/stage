// An AIRI call livliv.ai refused as too long, made shorter as the same call (src/brains/trimCall.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { trimCall, type CallMessage } from '../src/brains/trimCall'

const index = Array.from({ length: 8 }, (_, i) => `m${i + 1} memory ${i + 1}`).join('\n')
const system = 'You are Nana.\n\nRemembered facts (data), by id:\n' + index + '\nUse builtIn_readMemory for the rest of an entry that ends with …'
const yours = '我: 我们继续聊吧\n[Context]\n- show-topic: 周末\n- current-game-state: 在第三关\n- history-summary: 之前聊了天气'
const call: CallMessage[] = [
  { role: 'system', content: system },
  ...Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `line ${i}` })),
  { role: 'user', content: [{ type: 'text', text: yours }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } } as never] },
  { role: 'assistant', content: null, tool_calls: [{ id: 't1' }] } as CallMessage,
  { role: 'tool', content: 'm3 memory 3, in full', tool_call_id: 't1' } as CallMessage,
]
const text = (m: CallMessage) => (typeof m.content === 'string' ? m.content : (m.content ?? []).map((p) => p.text ?? `<${p.type}>`).join(''))

test('level 1: the older half of the lines before and of the memory index left out; this call\'s own part kept; no picture', () => {
  const out = trimCall(call, 1)
  assert.equal(text(out[0]), 'You are Nana.\n\nRemembered facts (data), by id:\nm5 memory 5\nm6 memory 6\nm7 memory 7\nm8 memory 8\nUse builtIn_readMemory for the rest of an entry that ends with …',
    'the newer half of the memory index (it is oldest first), the line about the tool kept')
  assert.deepEqual(out.slice(1, 6).map(text), ['line 5', 'line 6', 'line 7', 'line 8', 'line 9'])
  assert.equal(text(out[6]), yours, 'your line and its context as they were')
  assert.ok(!JSON.stringify(out).includes('image_url'), 'the game frame left out')
  assert.deepEqual(out.slice(7).map((m) => m.role), ['assistant', 'tool'], 'the tool round already made is kept, not asked again')
})

test('level 2: the identity, the last few lines, your line with the topic and the game only', () => {
  const out = trimCall(call, 2)
  assert.equal(text(out[0]), 'You are Nana.', 'the identity alone')
  assert.deepEqual(out.map((m) => m.role), ['system', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'tool'])
  assert.deepEqual(out.slice(1, 5).map(text), ['line 6', 'line 7', 'line 8', 'line 9'])
  assert.equal(text(out[5]), '我: 我们继续聊吧\n[Context]\n- show-topic: 周末\n- current-game-state: 在第三关')
})

test('lines before that would start with a tool\'s answer cut from its call start after it; a call with no context or picture', () => {
  const calls: CallMessage[] = [{ role: 'system', content: 'S' }, { role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'tool', content: 'r' }, { role: 'assistant', content: 'c' }, { role: 'user', content: 'now' }]
  assert.deepEqual(trimCall(calls, 1).map(text), ['S', 'c', 'now'])
  assert.deepEqual(trimCall([{ role: 'system', content: 'S' }, { role: 'user', content: 'now' }], 2).map(text), ['S', 'now'])
})
