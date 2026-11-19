import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectFeatures, features } from '../src/core/platform'

const bridge = (offers: Record<string, unknown> = {}) => ({ version: '0.5.0', platform: 'darwin', hotkeys: {}, requests: {}, onCommand: () => () => {}, ...offers }) as never
const full = bridge({ vision: {}, airiGame: {}, neuro: {}, tracking: {}, onMotion: () => () => {} })

test('livliv.ai/stage: the site build, LivLiv points, no 联播 and nothing of the desktop app', () => {
  assert.deepEqual(detectFeatures({ siteBuild: true, appScheme: false, bridge: undefined, hasBridge: false }), {
    host: 'site', desktopConsole: false, airi: false, vision: false, games: false, collab: false, neuro: false, points: true, globalHotkeys: false, tracking: false, appScheme: false,
  })
})

test('the desktop app, served over its own scheme: everything its bridge offers, model APIs through the app', () => {
  assert.deepEqual(detectFeatures({ siteBuild: false, appScheme: true, bridge: full, hasBridge: true }), {
    host: 'desktop', desktopConsole: true, airi: true, vision: true, games: true, collab: true, neuro: true, points: true, globalHotkeys: true, tracking: true, appScheme: true,
  })
})

test('a page given the desktop bridge (the desktop checks): the desktop app, requests straight', () => {
  const f = detectFeatures({ siteBuild: false, appScheme: false, bridge: full, hasBridge: true })
  assert.equal(f.host, 'desktop'); assert.equal(f.appScheme, false); assert.equal(f.points, true); assert.equal(f.airi, true)
})

test('a desktop bridge without window capture keeps the web console and AIRI off', () => {
  const f = detectFeatures({ siteBuild: false, appScheme: false, bridge: bridge(), hasBridge: true })
  assert.equal(f.host, 'desktop'); assert.equal(f.desktopConsole, false); assert.equal(f.airi, false); assert.equal(f.games, false)
  assert.equal(f.globalHotkeys, true); assert.equal(f.tracking, false, 'tracking needs both the settings and the motion feed')
})

test('a copy hosted anywhere else: all the web, no LivLiv account, no desktop', () => {
  assert.deepEqual(detectFeatures({ siteBuild: false, appScheme: false, bridge: undefined, hasBridge: false }), {
    host: 'selfhosted', desktopConsole: false, airi: false, vision: false, games: false, collab: true, neuro: false, points: false, globalHotkeys: false, tracking: false, appScheme: false,
  })
})

test('outside a page (these tests), Stage reads as a copy hosted elsewhere', () => {
  assert.equal(features.host, 'selfhosted')
})
