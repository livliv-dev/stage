import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SpeechBridge, readSpeechResult, type SpeechJob, type SpeechPlayer } from '../../desktop/src/speechBridge.ts'

function player() {
  const jobs: SpeechJob[] = []
  const cancelled: string[] = []
  let available: SpeechPlayer['available'] = () => ({ ok: true, character: 'avatar-1' })
  const bridge = new SpeechBridge({
    available: (character) => available(character),
    start(job, report) {
      jobs.push(job)
      return { cancel() { cancelled.push(job.utteranceId) }, report }
    },
  })
  return { bridge, jobs, cancelled, setAvailable(next: SpeechPlayer['available']) { available = next } }
}

test('one owner plays text, and a new line cancels it before late audio can start', () => {
  const { bridge, jobs, cancelled } = player()
  const first = bridge.submit({ utteranceId: 'line-a', text: 'hello', emotion: 'happy', raw: '<|ACT {"emotion":"happy"}|>hello' })
  assert.equal(first.status, 202)
  assert.equal(first.phase, 'accepted')
  assert.equal(jobs[0]?.emotion, 'happy')
  assert.match(jobs[0]?.raw ?? '', /<\|ACT/)
  const second = bridge.submit({ utteranceId: 'line-b', text: 'next' })
  assert.equal(second.utteranceId, 'line-b')
  assert.deepEqual(cancelled, ['line-a'])
  assert.equal(bridge.status('line-a').phase, 'cancelled')
  const late = bridge.submit({ utteranceId: 'line-a', seq: 1, audio: Uint8Array.of(1, 2, 3), final: true })
  assert.equal(late.dropped, true)
  assert.equal(late.phase, 'cancelled')
  assert.deepEqual(jobs.map((job) => job.utteranceId), ['line-a', 'line-b'])
  assert.equal(jobs[1]?.audio, undefined)
})

test('audio stays buffered until the final chunk, and an interrupt drops what has not played', () => {
  const { bridge, jobs } = player()
  assert.equal(bridge.submit({ utteranceId: 'wave', audio: Uint8Array.of(1, 2), mime: 'audio/wav', final: false }).phase, 'accepted')
  assert.equal(jobs.length, 0)
  const replaced = bridge.submit({ utteranceId: 'other', text: 'cut', interrupt: true })
  assert.equal(replaced.phase, 'accepted')
  const late = bridge.submit({ utteranceId: 'wave', seq: 1, audio: Uint8Array.of(9), final: true })
  assert.equal(late.dropped, true)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0]?.utteranceId, 'other')
})

test('ordered chunks become one clip and a gap is not played', () => {
  const { bridge, jobs } = player()
  bridge.submit({ utteranceId: 'wave', seq: 0, audio: Uint8Array.of(1, 2), final: false })
  const skipped = bridge.submit({ utteranceId: 'wave', seq: 2, audio: Uint8Array.of(9), final: false })
  assert.equal(skipped.dropped, true)
  assert.equal(jobs.length, 0)
  bridge.submit({ utteranceId: 'wave', seq: 1, audio: Uint8Array.of(3, 4), mime: 'audio/wav', final: true })
  assert.deepEqual(jobs[0]?.audio, Uint8Array.of(1, 2, 3, 4))
  assert.equal(jobs.length, 1)
})

test('a busy owner rejects a non-interrupting line and a missing character does not cut the current one', () => {
  const fixture = player()
  fixture.bridge.submit({ utteranceId: 'line-a', text: 'stay' })
  const busy = fixture.bridge.submit({ utteranceId: 'line-b', text: 'wait', interrupt: false })
  assert.equal(busy.status, 409)
  assert.equal(fixture.jobs.length, 1)
  fixture.setAvailable(() => ({ ok: false, status: 404, error: 'Avatar not found' }))
  const missing = fixture.bridge.submit({ utteranceId: 'line-c', text: 'nope', character: 'missing' })
  assert.equal(missing.status, 404)
  assert.equal(fixture.bridge.status('line-a').phase, 'accepted')
  assert.equal(fixture.cancelled.length, 0)
})

test('playback reports audible start and end, and a late report cannot revive a cancelled line', () => {
  const reports: Array<(phase: 'audible-start' | 'ended' | 'failed', error?: string) => void> = []
  const bridge = new SpeechBridge({
    available: () => ({ ok: true, character: 'avatar-1' }),
    start(_job, report) { reports.push(report); return { cancel() {} } },
  })
  bridge.submit({ utteranceId: 'line-a', text: 'hello' })
  reports[0]?.('audible-start')
  assert.equal(bridge.status('line-a').phase, 'audible-start')
  assert.equal(bridge.status('line-a').heard, true)
  reports[0]?.('ended')
  assert.equal(bridge.status('line-a').phase, 'ended')
  bridge.submit({ utteranceId: 'line-b', text: 'second' })
  reports[0]?.('ended')
  assert.equal(bridge.status('line-b').phase, 'accepted')
  assert.equal(readSpeechResult({ ok: true, status: 202, utteranceId: 'line-b', phase: 'accepted', url: 'http://evil' }).ok, true)
  assert.equal('url' in readSpeechResult({ ok: true, status: 202, phase: 'accepted' }), false)
  assert.equal(readSpeechResult({ ok: true, phase: 'accepted' }).status, 503)
})
