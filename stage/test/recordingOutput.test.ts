// A recording is an output the session hears however the modules load: a listener added before the recording
// registers hears it, one added after does too, and a recording registered again replaces the one before.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { onRecordingOutput, recordingOn, registerRecording, type Output } from '../src/sessions/recordingOutput'

function fakeRecording() {
  let on = false
  const subs = new Set<() => void>()
  const output: Output = { on: () => on, subscribe: (f) => { subs.add(f); return () => { subs.delete(f) } } }
  return { output, set(value: boolean) { on = value; subs.forEach((f) => f()) }, get subscribers() { return subs.size } }
}

test('a recording is heard from when it registers, by listeners added before and after', () => {
  let early = 0, late = 0
  const offEarly = onRecordingOutput(() => early++)
  assert.equal(recordingOn(), false, 'nothing registered: no recording on')
  const first = fakeRecording(); registerRecording(first.output)
  first.set(true)
  assert.equal(early, 1, 'the listener added before the recording registered hears it start')
  assert.equal(recordingOn(), true)
  const offLate = onRecordingOutput(() => late++)
  first.set(false)
  assert.deepEqual([early, late, recordingOn()], [2, 1, false])
  // registered again (a reload of its module): the first one is no longer listened to
  const second = fakeRecording(); registerRecording(second.output)
  assert.equal(first.subscribers, 0)
  first.set(true); assert.deepEqual([early, late, recordingOn()], [2, 1, false])
  second.set(true); assert.deepEqual([early, late, recordingOn()], [3, 2, true])
  offEarly(); offLate(); second.set(false)
  assert.deepEqual([early, late], [3, 2])
})
