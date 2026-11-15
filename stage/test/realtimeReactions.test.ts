import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reactionTool, readReactionCall } from '../src/realtime/reactions'
import { sessionOptions, type RealtimeOptions } from '../src/realtime/connection'
const call = (value: unknown) => ({ type: 'response.function_call_arguments.done', response_id: 'r1', name: 'stage_reaction', call_id: 'c1', arguments: JSON.stringify(value) })
test('realtime directions use only bounded semantic cues, never model-specific executable output', () => {
  const value = readReactionCall(call({ who: 'Nana', when: 'listening', feeling: 'shy', action: 'tilt', strength: 1, duration: 8, expression: 'arbitrary' }))
  assert.deepEqual(value, { id: 'c1', response: 'r1', who: 'Nana', listening: true, cue: { at: 0, feeling: 'shy', action: 'tilt', strength: 0.8, duration: 3 } })
  assert.equal(readReactionCall(call({ who: 'Nana', when: 'listening', action: 'run_code' }))?.cue, null)
  assert.equal(readReactionCall({ ...call({}), arguments: '{unfinished' })?.cue, null)
  assert.equal(readReactionCall({ ...call({}), response_id: undefined }), null)
  assert.equal(readReactionCall({ ...call({}), name: 'delete_project' }), null)
})
test('both final-arguments and final-item events normalize into the same deduplicable call', () => {
  const event = call({ who: 'Nana', when: 'speaking', feeling: 'happy' })
  assert.deepEqual(readReactionCall(event), readReactionCall({ type: 'response.output_item.done', response_id: 'r1', item: { type: 'function_call', name: event.name, call_id: event.call_id, arguments: event.arguments } }))
})
test('provider tool schemas keep Qwen-only and OpenAI-only session fields separate', () => {
  const tool = reactionTool(['Nana', 'Kai'])
  const options: RealtimeOptions = { provider: 'openai', base: 'https://api.openai.com/v1', key: 'fixture', model: 'fixture', voice: 'marin', instructions: 'fixture', semantic: true, silence: 450, tools: [tool] }
  assert.deepEqual(sessionOptions(options).tools, [tool])
  const qwen = sessionOptions({ ...options, provider: 'qwen' })
  assert.equal('tool_choice' in qwen, false)
  assert.deepEqual(qwen.tools, [{ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }])
})
