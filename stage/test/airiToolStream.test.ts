// A streamed tool call that a provider ends with a null arguments delta (as Alibaba Cloud Bailian does), through the
// bundled AIRI core (vendor/airi-core/core.mjs, with Stage's fixes from patches.mjs): the tool gets its input, and the
// next request repeats the call with arguments that are still JSON.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as core from '../../vendor/airi-core/core.mjs'
import { PATCHES, patch } from '../../vendor/airi-core/patches.mjs'

const sse = (events: unknown[]) => new Response(events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })
const delta = (d: object, finish: string | null = null) => ({ choices: [{ index: 0, delta: d, finish_reason: finish }] })

test('a tool call ended by a null arguments delta keeps its arguments as JSON', async () => {
  const requests: { messages: { role: string; content?: unknown; tool_calls?: { function: { name: string; arguments: string } }[] }[] }[] = []
  const fetch = (async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)))
    if (requests.length === 1) return sse([
      delta({ role: 'assistant', tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'builtIn_readMemory', arguments: '{"ids": ["m1"]}' } }] }),
      delta({ tool_calls: [{ index: 0, function: { arguments: null } }] }),
      delta({}, 'tool_calls'),
      '[DONE]',
    ])
    return sse([delta({ role: 'assistant', content: '记得，是芒果。' }), delta({}, 'stop'), '[DONE]'])
  }) as typeof globalThis.fetch
  const chatProvider = { generation: (model: string) => ({ protocol: 'chat-completions' as const, config: { baseURL: new URL('https://model.example.test/v1/'), apiKey: 'test', model, fetch } }) }
  let input: unknown = null
  const readMemory = core.rawTool({
    name: 'builtIn_readMemory', description: 'Read remembered entries',
    parameters: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] },
    execute: async (value: unknown) => { input = value; return '我最喜欢的水果是芒果。' },
  })
  let text = ''
  await core.streamFrom({
    model: 'qwen-flash', chatProvider,
    conversation: { turns: [{ id: 'u1', type: 'user', content: [{ type: 'text', text: '你还记得我最喜欢什么水果吗？' }] }] },
    options: { tools: [readMemory], waitForTools: true, onStreamEvent: (event) => { if (event.type === 'text-delta') text += event.text } },
  })
  assert.deepEqual(input, { ids: ['m1'] }, 'the tool read its input')
  assert.equal(requests.length, 2)
  const call = requests[1].messages.find((m) => m.tool_calls)?.tool_calls?.[0]
  assert.equal(call?.function.arguments, '{"ids": ["m1"]}', 'the call repeated with its arguments as sent, not followed by "null"')
  assert.doesNotThrow(() => JSON.parse(call!.function.arguments))
  assert.ok(requests[1].messages.some((m) => m.role === 'tool' && String(m.content).includes('芒果')), 'the tool\'s answer went back')
  assert.equal(text, '记得，是芒果。')
})

test('the build\'s patch step: applied once, left alone when already in, and loud when the code moved', () => {
  // the three pieces of upstream code Stage fixes (patches.mjs), as the bundle has them before the fixes
  const nullDelta = 'tool_calls[index].function.arguments += toolCall.function.arguments;\n\t\tpushEvent({\n\t\t\tdelta: toolCall.function.arguments,\n\t\t\ttype: "tool-call.delta"\n\t\t});'
  const readIds = 'const readParameters = (0, import_dist.strictObject)({ ids: (0, import_dist.pipe)((0, import_dist.array)(idSchema), (0, import_dist.minLength)(1), (0, import_dist.description)("Every entry that the reply needs, so one call reads them all.")) });'
  const readEach = 'return parsed.output.ids.map((id) => {'
  const upstream = ['a();', nullDelta, readIds, readEach, 'b();'].join('\n')
  const fixed = patch(upstream)
  assert.ok(fixed.includes('toolCall.function.arguments != null && toolCall.function.arguments !== ""'))
  assert.ok(fixed.includes('"Up to four entries that the reply needs'))
  assert.ok(fixed.includes('parsed.output.ids.slice(0, 4).map('))
  assert.equal(patch(fixed), fixed, 'already patched: unchanged')
  assert.throws(() => patch('nothing of it here'), new RegExp(PATCHES[0].name.split(':')[0]))
  assert.throws(() => patch(upstream + upstream), /found it 2 times/)
})

test('the memory read tool says it takes up to four ids, and reads the first four of a call that gives more', async () => {
  const tools = await core.createMemoryTools({ read: (id: string) => ({ id, body: `body of ${id}`, persona: 'nana' }), write: async () => undefined, forget: async () => false })
  const read = tools.find((tool) => tool.function.name === 'builtIn_readMemory')!
  assert.match(JSON.stringify(read.function.parameters), /Up to four entries/, 'the model is told')
  assert.match(String(await read.execute({ ids: ['m1', 'm2'] }, {} as never)), /m1 \(yours\): body of m1\nm2/)
  const five = String(await read.execute({ ids: ['m1', 'm2', 'm3', 'm4', 'm5'] }, {} as never))
  assert.equal(five.split('\n').length, 4, 'four read, no refusal (which would take another call)')
  assert.ok(!five.includes('m5'))
})
