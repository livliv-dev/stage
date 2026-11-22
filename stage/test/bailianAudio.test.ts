// Bailian's speech answer as a stream: the line is read from its events, never from the file link its last event gives
// (an http address livliv.ai/stage's page may not fetch). test:journey plays such an answer in the page.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bailianAudio } from '../src/bailianAudio'

const event = (id: number, output: object, nl = '\n') => [`id:${id}`, 'event:result', ':HTTP_STATUS/200', 'data:' + JSON.stringify({ output, request_id: 'r' })].join(nl) + nl + nl
const audio = (bytes: number[], extra = {}) => ({ audio: { data: Buffer.from(bytes).toString('base64'), id: 'a', ...extra }, finish_reason: 'null' })

test('the pieces of audio, in order, from the events that carry some; the storage link is left alone', () => {
  const answer = event(1, { audio: { data: '', id: 'a' }, type: 'sentence-begin' })
    + event(2, audio([82, 73, 70, 70, 1, 2])) + event(3, audio([3, 4, 5])) + event(4, { audio: { data: '' }, type: 'sentence-end' })
    + event(5, { audio: { data: '', url: 'http://result.oss.example/line.wav' }, finish_reason: 'stop' })
  assert.deepEqual(bailianAudio(answer).map((p) => [...p]), [[82, 73, 70, 70, 1, 2], [3, 4, 5]])
  assert.deepEqual(bailianAudio(event(1, audio([7]), '\r\n') + event(2, audio([8]), '\r\n')).map((p) => [...p]), [[7], [8]], 'CRLF events too')
})

test('an error event says what went wrong; an answer with no events has no audio', () => {
  const error = 'id:1\nevent:error\n:HTTP_STATUS/400\ndata:{"code":"InvalidParameter","message":"voice not found","request_id":"r"}\n\n'
  assert.throws(() => bailianAudio(event(1, audio([1])) + error), /voice not found/)
  assert.deepEqual(bailianAudio(JSON.stringify({ output: { audio: { url: 'http://result.oss.example/line.wav' } } })), [])
  assert.deepEqual(bailianAudio(''), [])
})
