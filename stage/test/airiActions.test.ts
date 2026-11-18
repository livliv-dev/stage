import assert from 'node:assert/strict'
import { test } from 'node:test'
import { interpretSparkCommand, sparkEmit } from '../src/airiActions.ts'

test('spark commands map expression, motion and pause, and leave plans unplayed', () => {
  const nod = interpretSparkCommand({ id: 's1', intent: 'action', interrupt: 'force', guidance: { type: 'instruction', options: [{ label: 'nod', steps: ['nod to the viewer'] }] } })
  assert.equal(nod?.motion, 'nod')
  assert.equal(nod?.interrupt, true)
  assert.equal(nod?.perform, true)
  const face = interpretSparkCommand({ id: 's2', intent: 'action', guidance: { type: 'instruction', options: [{ label: 'smile', steps: ['look happy'] }] } })
  assert.equal(face?.feeling, 'happy')
  const pause = interpretSparkCommand({ id: 's3', intent: 'pause', ack: 'wait' })
  assert.equal(pause?.pause, true)
  assert.equal(pause?.perform, true)
  const plan = interpretSparkCommand({ id: 's4', intent: 'plan', guidance: { type: 'proposal', options: [{ label: 'nod', steps: ['nod later'] }] } })
  assert.equal(plan?.perform, false)
  assert.equal(interpretSparkCommand({ intent: 'action' }), null)
  assert.deepEqual(sparkEmit('s1', 'done', 'Played on the LivLiv character'), { id: 's1', state: 'done', note: 'Played on the LivLiv character', destinations: ['livliv-stage'] })
  assert.equal(sparkEmit('s4', 'dropped', 'Nothing on stage matched this command').state, 'dropped')
})
