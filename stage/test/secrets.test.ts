// API keys in the desktop app (src/core/secrets.ts), against a stand-in for its encrypted store: a key saved the old way
// moves over once and its plain copy goes; saved and read back, the key never sits in the page's storage; without the
// store (a browser) nothing changes.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { readKeyed, setKeyVault, writeKeyed } from '../src/core/secrets'

afterEach(() => setKeyVault(undefined))

function page(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return { items, getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v) } }
}
function vault(initial: Record<string, string> = {}, works = true) {
  const kept = { ...initial }, writes: [string, string][] = []
  setKeyVault({ all: () => ({ ...kept }), set: (name, value) => { if (!works) return false; writes.push([name, value]); if (value) kept[name] = value; else delete kept[name]; return true } })
  return { kept, writes }
}
const brain = { kind: 'openai', provider: 'custom', base: 'https://api.example.test/v1', model: 'm' }

test('a key saved the old way moves to the encrypted store, once, and its plain copy goes', () => {
  const v = vault(), storage = page({ 'livliv-stage:brain': JSON.stringify({ ...brain, key: 'sk-old' }) })
  assert.equal(JSON.parse(readKeyed('livliv-stage:brain', storage)!).key, 'sk-old', 'the setting reads as before')
  assert.deepEqual(v.kept, { 'livliv-stage:brain': 'sk-old' })
  assert.deepEqual(JSON.parse(storage.items.get('livliv-stage:brain')!), brain, 'no key left in the page\'s storage')
  assert.equal(JSON.parse(readKeyed('livliv-stage:brain', storage)!).key, 'sk-old', 'read back from the store')
  assert.equal(v.writes.length, 1, 'moved once')
})

test('saved: the key to the store, the rest to the page; an empty key removed from the store', () => {
  const v = vault(), storage = page()
  writeKeyed('livliv-stage:speech', { provider: 'openai', key: 'speech-key', model: 'tts' }, storage)
  assert.deepEqual(JSON.parse(storage.items.get('livliv-stage:speech')!), { provider: 'openai', model: 'tts' })
  assert.equal(JSON.parse(readKeyed('livliv-stage:speech', storage)!).key, 'speech-key')
  writeKeyed('livliv-stage:speech', { provider: 'openai', key: '', model: 'tts' }, storage)
  assert.deepEqual(v.kept, {})
})

test('a store that fails to save, or none (a browser): keys stay in the page\'s storage as before', () => {
  vault({}, false)
  const failing = page()
  writeKeyed('livliv-stage:realtime', { provider: 'qwen', key: 'rt' }, failing)
  assert.equal(JSON.parse(failing.items.get('livliv-stage:realtime')!).key, 'rt')
  setKeyVault(null)
  const browser = page({ 'livliv-stage:brain': JSON.stringify({ ...brain, key: 'sk' }) })
  assert.equal(readKeyed('livliv-stage:brain', browser), browser.items.get('livliv-stage:brain'))
  writeKeyed('livliv-stage:brain', { ...brain, key: 'sk2' }, browser)
  assert.equal(JSON.parse(browser.items.get('livliv-stage:brain')!).key, 'sk2')
})

test('a store emptied (corrupted, lost): the setting reads with no key, nothing breaks', () => {
  vault({})
  const storage = page({ 'livliv-stage:brain': JSON.stringify(brain) })
  assert.deepEqual(JSON.parse(readKeyed('livliv-stage:brain', storage)!), brain)
})
