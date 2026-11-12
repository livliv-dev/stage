import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultMixer, readMixer } from '../src/mixer'
import { microphoneGain } from '../src/microphone'

test('persisted mixer settings keep independent bus defaults and supported gain ranges', () => {
  assert.deepEqual(readMixer(null), defaultMixer())
  const settings = readMixer({ microphone: { volume: 5, muted: true }, characters: { volume: -1 }, friends: { volume: NaN } })
  assert.deepEqual(settings, { microphone: { volume: 2, muted: true }, characters: { volume: 0, muted: false }, friends: { volume: 1, muted: false } })
})

test('microphone calibration uses normal speech above the room noise and keeps gain within usable bounds', () => {
  assert.ok(Math.abs(microphoneGain([.002, .003, .002], [.1, .1, .1]) * .1 - .18) < 1e-6)
  assert.equal(microphoneGain([.001], [.02, .02]), 2)
  assert.equal(microphoneGain([.001], [1]), .2)
  assert.throws(() => microphoneGain([.02, .02], [.03, .03]))
  assert.throws(() => microphoneGain([], []))
})
