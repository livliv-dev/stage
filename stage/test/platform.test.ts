import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectFeatures, features } from '../src/core/platform'

const bridge = (offers: Record<string, unknown> = {}) => ({ version: '0.5.0', platform: 'darwin', hotkeys: {}, requests: {}, onCommand: () => () => {}, ...offers }) as never
const full = bridge({ vision: {}, airiGame: {}, neuro: {}, tracking: {}, onMotion: () => () => {} })

// Before this object, each place asked on its own: onSite (the site build), inApp() (the app's scheme or its bridge in
// the page), `desktop` (the bridge), desktop?.vision, inClient (the app's scheme). These are the answers they gave.
const old = (from: { siteBuild: boolean; appScheme: boolean; bridge: { vision?: unknown; airiGame?: unknown; tracking?: unknown; onMotion?: unknown } | undefined; hasBridge: boolean }) => {
  const onSite = from.siteBuild, inApp = from.appScheme || from.hasBridge, desktop = !!from.bridge
  return {
    // since then AIRI runs on livliv.ai/stage too (持续聊天 only); window capture has a flag of its own
    site: onSite, shell: inApp, bridgeChecks: desktop, points: onSite || inApp, collab: !onSite, desktopConsole: !!from.bridge?.vision, airi: !!from.bridge?.vision || onSite, vision: !!from.bridge?.vision,
    games: !!from.bridge?.airiGame, tracking: !!from.bridge?.tracking && !!from.bridge?.onMotion, globalHotkeys: desktop, appScheme: from.appScheme,
  }
}
const now = (f: ReturnType<typeof detectFeatures>) => ({
  site: f.host === 'site', shell: f.shell, bridgeChecks: f.shell, points: f.points, collab: f.collab, desktopConsole: f.desktopConsole, airi: f.airi, vision: f.vision,
  games: f.games, tracking: f.tracking, globalHotkeys: f.globalHotkeys, appScheme: f.appScheme,
})

const HOSTS = {
  'a copy hosted anywhere else (the dev server, your own)': { siteBuild: false, appScheme: false, bridge: undefined, hasBridge: false },
  'livliv.ai/stage in a browser': { siteBuild: true, appScheme: false, bridge: undefined, hasBridge: false },
  'livliv.ai/stage inside the desktop shell (its bridge without the editor\'s parts)': { siteBuild: true, appScheme: false, bridge: bridge(), hasBridge: true },
  'the desktop app\'s Stage, over its own scheme': { siteBuild: false, appScheme: true, bridge: full, hasBridge: true },
  'a page given the full bridge (the desktop checks)': { siteBuild: false, appScheme: false, bridge: full, hasBridge: true },
  'a desktop bridge without window capture': { siteBuild: false, appScheme: false, bridge: bridge(), hasBridge: true },
}

for (const [where, from] of Object.entries(HOSTS)) {
  test(`${where}: every check answers as it did`, () => {
    assert.deepEqual(now(detectFeatures(from)), old(from))
  })
}

test('the host each one is', () => {
  const host = (where: keyof typeof HOSTS) => detectFeatures(HOSTS[where]).host
  assert.equal(host('a copy hosted anywhere else (the dev server, your own)'), 'selfhosted')
  assert.equal(host('livliv.ai/stage in a browser'), 'site')
  assert.equal(host('livliv.ai/stage inside the desktop shell (its bridge without the editor\'s parts)'), 'site')
  assert.equal(host('the desktop app\'s Stage, over its own scheme'), 'desktop')
  assert.equal(host('a page given the full bridge (the desktop checks)'), 'desktop')
})

test('the site inside the desktop shell: the site\'s sign-in and services, the shell\'s contexts and output windows', () => {
  const f = detectFeatures(HOSTS['livliv.ai/stage inside the desktop shell (its bridge without the editor\'s parts)'])
  assert.equal(f.host, 'site'); assert.equal(f.shell, true); assert.equal(f.collab, false); assert.equal(f.points, true)
  assert.equal(f.desktopConsole, false); assert.equal(f.airi, true, 'AIRI for 持续聊天, as on the site'); assert.equal(f.vision, false); assert.equal(f.appScheme, false)
})

test('livliv.ai/stage in a browser: AIRI for 持续聊天, no window capture', () => {
  const f = detectFeatures(HOSTS['livliv.ai/stage in a browser'])
  assert.equal(f.airi, true); assert.equal(f.vision, false); assert.equal(f.games, false); assert.equal(f.desktopConsole, false)
})

test('a desktop bridge without window capture keeps the web console and AIRI off', () => {
  const f = detectFeatures(HOSTS['a desktop bridge without window capture'])
  assert.equal(f.desktopConsole, false); assert.equal(f.airi, false); assert.equal(f.vision, false); assert.equal(f.games, false)
  assert.equal(f.globalHotkeys, true); assert.equal(f.tracking, false, 'tracking needs both the settings and the motion feed')
})

test('outside a page (these tests), Stage reads as a copy hosted elsewhere', () => {
  assert.equal(features.host, 'selfhosted'); assert.equal(features.shell, false)
})
