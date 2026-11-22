// A model service's failure in readable words (src/brains/modelErrors.ts): never the raw `Remote sent … response`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readableModelError, remoteFailure } from '../src/brains/modelErrors'

const remote = (status: number, body: unknown) => new Error(`Remote sent ${status} response: ${typeof body === 'string' ? body : JSON.stringify(body)}`)
const shown = (error: unknown) => (readableModelError(error) as Error).message

test('the service\'s status and its own message are read from the raw failure', () => {
  assert.deepEqual(remoteFailure(remote(400, { error: { message: 'bad thing', type: 'invalid_request_error' } })), { status: 400, message: 'bad thing' })
  assert.deepEqual(remoteFailure(remote(502, 'Bad Gateway')), { status: 502, message: 'Bad Gateway' })
  assert.equal(remoteFailure(new Error('network down')), null)
})

test('a refused tool call ends the turn with a line saying so, never the raw 400', () => {
  const bailian = remote(400, { error: { message: '<400> InternalError.Algo.InvalidParameter: The "function.arguments" parameter of the code model must be in JSON format.', type: 'invalid_request_error', code: 'invalid_parameter_error' } })
  const text = shown(bailian)
  assert.match(text, /工具调用出错/)
  assert.doesNotMatch(text, /Remote sent|function\.arguments|\{/)
})

test('only a call\'s arguments refused as not JSON says to say it again; other tool refusals show the service\'s message', () => {
  assert.match(shown(remote(400, { error: { message: 'Failed to parse tool call arguments as JSON' } })), /工具调用出错/)
  assert.match(shown(remote(400, { error: { message: 'Invalid tool input: could not parse' } })), /工具调用出错/)
  const noTools = shown(remote(400, { error: { message: 'deepseek-reasoner does not support Function Calling' } }))
  assert.doesNotMatch(noTools, /工具调用出错|再说一次/)
  assert.match(noTools, /拒绝了这次请求（400）：deepseek-reasoner does not support Function Calling/)
  assert.match(shown(remote(400, { error: { message: "Invalid parameter: messages with role 'tool' must be a response to a preceding message with 'tool_calls'" } })), /拒绝了这次请求（400）：Invalid parameter/)
  assert.match(shown(remote(401, { error: { message: 'Incorrect API key provided for tool_call' } })), /密钥/, 'a key refused is about the key')
})

test('keys, models, limits and outages each say what to do; anything else stays as it was', () => {
  assert.match(shown(remote(401, { error: { message: 'Invalid API-key' } })), /密钥/)
  assert.match(shown(remote(404, { error: { message: 'model not found' } })), /模型名/)
  assert.match(shown(remote(429, { error: { message: 'Throttling' } })), /稍后再试/)
  assert.match(shown(remote(503, 'Service Unavailable')), /暂时出错（503）/)
  assert.match(shown(remote(400, { error: { message: 'Range of max_tokens should be [1, 8192]' } })), /拒绝了这次请求（400）：Range of max_tokens/)
  const other = new Error('Stage session changed')
  assert.equal(readableModelError(other), other)
})
