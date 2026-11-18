import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { startLocalApi, type LocalApi } from '../../desktop/src/localApi.ts'
import { SpeechBridge, type SpeechJob } from '../../desktop/src/speechBridge.ts'

const token = 'speech-test-token'
const jobs: SpeechJob[] = []
const bridge = new SpeechBridge({
  available: (character) => character === 'missing' ? { ok: false, status: 404, error: 'Avatar not found' } : { ok: true, character: character || 'avatar-1' },
  start(job) { jobs.push(job); return { cancel() {} } },
})
let api: LocalApi
before(async () => {
  api = await startLocalApi(46000 + Math.floor(Math.random() * 8000), {
    token: () => token, deliver: () => 0, keyOk: () => true, stages: () => 1, version: 'test', origins: new Set(['livliv-stage://app']),
    stage: { state: async () => ({}), command: async () => ({ ok: true }), speech: bridge },
  })
})
after(() => api.close())
const call = (path: string, init: RequestInit = {}) => fetch(`http://127.0.0.1:${api.port}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } })

test('speech stays on the app token and never fetches a URL', async () => {
  assert.equal((await fetch(`http://127.0.0.1:${api.port}/api/stage/speech`, { method: 'POST', headers: { 'x-livliv-token': 'nope' }, body: JSON.stringify({ text: 'no' }) })).status, 403)
  assert.equal((await fetch(`http://127.0.0.1:${api.port}/api/stage/speech?m=avatar&k=character-key`, { method: 'POST', body: JSON.stringify({ text: 'no' }) })).status, 403)
  const beforeCount = jobs.length
  const refused = await call('/api/stage/speech', { method: 'POST', body: JSON.stringify({ text: 'hello', url: 'http://127.0.0.1/secret.wav' }) })
  assert.equal(refused.status, 400)
  assert.match(JSON.stringify(await refused.json()), /URL/)
  assert.equal(jobs.length, beforeCount)
  const audioUrl = await call('/api/stage/speech', { method: 'POST', body: JSON.stringify({ audioUrl: 'file:///tmp/line.wav', text: 'x' }) })
  assert.equal(audioUrl.status, 400)
})

test('an inline utterance is accepted and can be polled and cancelled', async () => {
  const created = await call('/api/stage/speech', { method: 'POST', body: JSON.stringify({ utteranceId: 'api-line', text: 'hello', emotion: 'shy', audio: Buffer.from([1, 2, 3, 4]).toString('base64'), mime: 'audio/wav' }) })
  assert.equal(created.status, 202)
  const accepted = await created.json()
  assert.equal(accepted.phase, 'accepted')
  assert.deepEqual(jobs.at(-1)?.audio, Uint8Array.of(1, 2, 3, 4))
  assert.equal(jobs.at(-1)?.emotion, 'shy')
  const status = await call('/api/stage/speech?id=api-line')
  assert.equal(status.status, 200)
  assert.equal((await status.json()).utteranceId, 'api-line')
  const cancelled = await call('/api/stage/speech/cancel', { method: 'POST', body: JSON.stringify({ utteranceId: 'api-line' }) })
  assert.equal(cancelled.status, 200)
  assert.equal((await cancelled.json()).phase, 'cancelled')
})

test('a second chunk after cancel is dropped and a missing character is not spoken', async () => {
  await call('/api/stage/speech', { method: 'POST', body: JSON.stringify({ utteranceId: 'api-chunks', text: 'part', final: false }) })
  const count = jobs.length
  await call('/api/stage/speech/cancel', { method: 'POST', body: JSON.stringify({ utteranceId: 'api-chunks' }) })
  const late = await call('/api/stage/speech', { method: 'POST', body: JSON.stringify({ utteranceId: 'api-chunks', seq: 1, audio: Buffer.from([9]).toString('base64'), mime: 'audio/mpeg', final: true }) })
  assert.equal(late.status, 409)
  assert.equal((await late.json()).dropped, true)
  assert.equal(jobs.length, count)
  const missing = await call('/api/stage/speech', { method: 'POST', body: JSON.stringify({ text: 'where', character: 'missing' }) })
  assert.equal(missing.status, 404)
})
