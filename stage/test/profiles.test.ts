import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parameterRule } from '@livliv-dev/player/tracking'
import { BUILTIN_PROFILES, readTrackingSettings, trackingPatch } from '../src/profiles'
import { defaultTuning } from '../src/tuning'
import type { CharacterItem } from '../src/scene'

test('applying a shared motion preset preserves avatar voice, camera, framing and identity', () => {
  const character = { id: 'avatar', name: 'Name', tuning: { ...defaultTuning(), volume: .3, expressionStrength: .6, view: { x: .2, y: 0, zoom: 1.2, head: false } } } as CharacterItem
  const settings = readTrackingSettings({ profile: { angleX: { ...parameterRule('angleX'), input: [-15, 15] } }, follow: .8, fps: 15, smooth: .4 })
  const next = { ...character, ...trackingPatch(character, settings) }
  assert.equal(next.id, character.id); assert.equal(next.name, character.name)
  assert.equal(next.tuning.volume, .3); assert.equal(next.tuning.expressionStrength, .6); assert.deepEqual(next.tuning.view, character.tuning.view)
  assert.deepEqual(next.tuning.tracking.angleX?.input, [-15, 15]); assert.equal(next.tuning.faceFps, character.tuning.faceFps); assert.equal(next.tuning.faceFollow, character.tuning.faceFollow)
})

test('built-in presets are independent and imported settings normalize only supported inputs', () => {
  const preset = BUILTIN_PROFILES[1].settings(); preset.profile.angleX!.input[0] = 0
  assert.equal(BUILTIN_PROFILES[1].settings().profile.angleX?.input[0], -18)
  assert.deepEqual(readTrackingSettings({ smooth: -2, follow: 100, fps: 60, profile: { unsupported: {} } }), { smooth: 0, follow: 2, fps: 'auto', profile: {} })
})
