// An AIRI call livliv.ai refused as too long, made shorter as the same call (src/brains/trimCall.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { trimCall, type CallMessage } from '../src/brains/trimCall'

const index = 'Use builtIn_readMemory for full entries when needed. Entries are remembered data.\n' + Array.from({ length: 8 }, (_, i) => `m${i} memory ${i}`).join('\n')
const yours = '我: 我们继续聊吧\n[Context]\n- show-topic: 周末\n- current-game-state: 在第三关\n- history-summary: 之前聊了天气\n- character-memory-index: ' + index
const call: CallMessage[] = [
  { role: 'system', content: 'You are Nana.' },
  ...Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `line ${i}` })),
  { role: 'user', content: [{ type: 'text', text: yours }, { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } } as never] },
  { role: 'assistant', content: null, tool_calls: [{ id: 't1' }] } as CallMessage,
  { role: 'tool', content: 'm3 memory 3, in full', tool_call_id: 't1' } as CallMessage,
]
const text = (m: CallMessage) => (typeof m.content === 'string' ? m.content : (m.content ?? []).map((p) => p.text ?? `<${p.type}>`).join(''))

test('level 1: the older half of the lines before and of the memory index left out; this call\'s own part kept; no picture', () => {
  const out = trimCall(call, 1)
  assert.equal(text(out[0]), 'You are Nana.')
  assert.deepEqual(out.slice(1, 6).map(text), ['line 5', 'line 6', 'line 7', 'line 8', 'line 9'])
  const mine = text(out[6])
  assert.match(mine, /^我: 我们继续聊吧\n\[Context\]\n- show-topic: 周末\n- current-game-state: 在第三关\n- history-summary: 之前聊了天气\n- character-memory-index: Use builtIn_readMemory/)
  assert.match(mine, /m0 memory 0\nm1 memory 1\nm2 memory 2\nm3 memory 3$/)
  assert.doesNotMatch(mine, /m4 memory/)
  assert.ok(!JSON.stringify(out).includes('image_url'), 'the game frame left out')
  assert.deepEqual(out.slice(7).map((m) => m.role), ['assistant', 'tool'], 'the tool round already made is kept, not asked again')
})

test('level 2: the identity, the last few lines, your line with the topic and the game only', () => {
  const out = trimCall(call, 2)
  assert.deepEqual(out.map((m) => m.role), ['system', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'tool'])
  assert.deepEqual(out.slice(1, 5).map(text), ['line 6', 'line 7', 'line 8', 'line 9'])
  assert.equal(text(out[5]), '我: 我们继续聊吧\n[Context]\n- show-topic: 周末\n- current-game-state: 在第三关')
})

test('lines before that would start with a tool\'s answer cut from its call start after it; a call with no context or picture', () => {
  const calls: CallMessage[] = [{ role: 'system', content: 'S' }, { role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'tool', content: 'r' }, { role: 'assistant', content: 'c' }, { role: 'user', content: 'now' }]
  assert.deepEqual(trimCall(calls, 1).map(text), ['S', 'c', 'now'])
  assert.deepEqual(trimCall([{ role: 'system', content: 'S' }, { role: 'user', content: 'now' }], 2).map(text), ['S', 'now'])
})
