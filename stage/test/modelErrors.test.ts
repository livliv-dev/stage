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

test('keys, models, limits and outages each say what to do; anything else stays as it was', () => {
  assert.match(shown(remote(401, { error: { message: 'Invalid API-key' } })), /密钥/)
  assert.match(shown(remote(404, { error: { message: 'model not found' } })), /模型名/)
  assert.match(shown(remote(429, { error: { message: 'Throttling' } })), /稍后再试/)
  assert.match(shown(remote(503, 'Service Unavailable')), /暂时出错（503）/)
  assert.match(shown(remote(400, { error: { message: 'Range of max_tokens should be [1, 8192]' } })), /拒绝了这次请求（400）：Range of max_tokens/)
  const other = new Error('Stage session changed')
  assert.equal(readableModelError(other), other)
})
