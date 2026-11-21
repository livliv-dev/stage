// API keys and the sign-in in the desktop app (src/core/secrets.ts), against a stand-in for its encrypted store: a key
// leaves the page's storage only once its encrypted copy is written, never on a write that fails; keys saved the old way
// move in one pass as the app starts; the sign-in is kept whole; a key the app can't decrypt any more is reported;
// without the store (a browser) nothing changes.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { lostKey, migrateKeys, readKeyed, readSecret, setKeyVault, writeKeyed, writeSecret } from '../src/core/secrets'

afterEach(() => setKeyVault(undefined))

function page(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return { items, getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v) }, removeItem: (k: string) => { items.delete(k) } }
}
/** the app's store: `writes` succeed until `failing` is set; `lost` the keys it couldn't decrypt */
function vault(initial: Record<string, string> = {}, lost: string[] = []) {
  const kept = { ...initial }, state = { failing: false, writes: 0, release: null as null | (() => void), hold: false }
  setKeyVault({
    all: () => ({ keys: { ...kept }, lost }),
    set: async (name, value) => {
      if (state.hold) await new Promise<void>((resolve) => { state.release = resolve })
      if (state.failing) return false
      state.writes++
      if (value) kept[name] = value; else delete kept[name]
      return true
    },
  })
  return { kept, state }
}
const brain = { kind: 'openai', provider: 'custom', base: 'https://api.example.test/v1', model: 'm' }

test('saved: the key stays in the page\'s storage until its encrypted copy is written, then goes', async () => {
  const v = vault(), storage = page()
  v.state.hold = true
  const saved = writeKeyed('livliv-stage:speech', { provider: 'openai', key: 'speech-key', model: 'tts' }, storage)
  assert.equal(JSON.parse(storage.items.get('livliv-stage:speech')!).key, 'speech-key', 'not yet written: the plain copy stays')
  assert.equal(JSON.parse(readKeyed('livliv-stage:speech', storage)!).key, 'speech-key')
  v.state.hold = false; v.state.release!()
  assert.equal(await saved, true)
  assert.deepEqual(JSON.parse(storage.items.get('livliv-stage:speech')!), { provider: 'openai', model: 'tts' }, 'written: no key in the page\'s storage')
  assert.equal(JSON.parse(readKeyed('livliv-stage:speech', storage)!).key, 'speech-key', 'read back from the store')
  assert.equal(await writeKeyed('livliv-stage:speech', { provider: 'openai', key: '', model: 'tts' }, storage), false)
  assert.deepEqual(v.kept, {}, 'an empty key removed from the store')
})

test('a write that fails: the plain copy stays, so nothing is lost after a restart', async () => {
  const v = vault(), storage = page()
  v.state.failing = true
  assert.equal(await writeKeyed('livliv-stage:brain', { ...brain, key: 'sk-new' }, storage), false)
  assert.equal(JSON.parse(storage.items.get('livliv-stage:brain')!).key, 'sk-new')
  assert.deepEqual(v.kept, {})
  // after a restart: the store as it was on disk, the page's copy still there, moved on the next start
  v.state.failing = false
  setKeyVault(undefined); vault({}, [])
  assert.equal(JSON.parse(readKeyed('livliv-stage:brain', storage)!).key, 'sk-new')
})

test('a later save wins: an earlier one confirmed late doesn\'t remove the newer copy', async () => {
  const v = vault(), storage = page()
  v.state.hold = true
  const first = writeKeyed('livliv-stage:brain', { ...brain, key: 'sk-1' }, storage)
  const release = v.state.release!
  v.state.hold = false
  storage.setItem('livliv-stage:brain', JSON.stringify({ ...brain, key: 'sk-2', model: 'changed meanwhile' }))
  release()
  await first
  assert.equal(JSON.parse(storage.items.get('livliv-stage:brain')!).key, 'sk-2', 'what was saved meanwhile stays as it is')
})

test('as the app starts: every key saved the old way moves in one pass, the sign-in too, each removed once written', async () => {
  const v = vault(), storage = page({
    'livliv-stage:brain': JSON.stringify({ ...brain, key: 'sk-old' }),
    'livliv-stage:speech': JSON.stringify({ provider: 'openai', key: 'speech-old', model: 'tts' }),
    'livliv-stage:realtime': JSON.stringify({ provider: 'qwen', model: 'x' }),
    'livliv-stage:session': 'app.token-123',
  })
  const moved = await migrateKeys(storage)
  assert.deepEqual(moved.sort(), ['livliv-stage:brain', 'livliv-stage:session', 'livliv-stage:speech'])
  assert.deepEqual(v.kept, { 'livliv-stage:brain': 'sk-old', 'livliv-stage:speech': 'speech-old', 'livliv-stage:session': 'app.token-123' })
  assert.deepEqual(JSON.parse(storage.items.get('livliv-stage:brain')!), brain)
  assert.equal(storage.items.has('livliv-stage:session'), false)
  assert.equal(readSecret('livliv-stage:session', storage), 'app.token-123')
  assert.equal(JSON.parse(readKeyed('livliv-stage:speech', storage)!).key, 'speech-old')
  assert.equal(v.state.writes, 3)
  assert.deepEqual(await migrateKeys(storage), [], 'nothing left to move')
})

test('the sign-in kept whole: saved, read back, signed out everywhere', async () => {
  const v = vault(), storage = page()
  assert.equal(await writeSecret('livliv-stage:session', 'app.abc', storage), true)
  assert.equal(storage.items.has('livliv-stage:session'), false)
  assert.equal(readSecret('livliv-stage:session', storage), 'app.abc')
  await writeSecret('livliv-stage:session', '', storage)
  assert.equal(readSecret('livliv-stage:session', storage), '')
  assert.deepEqual(v.kept, {})
})

test('a key the app could no longer decrypt is reported until it is saved again', async () => {
  vault({ 'livliv-stage:speech': 'ok' }, ['livliv-stage:brain'])
  const storage = page({ 'livliv-stage:brain': JSON.stringify(brain) })
  assert.equal(lostKey('livliv-stage:brain'), true)
  assert.equal(lostKey('livliv-stage:speech'), false)
  assert.deepEqual(JSON.parse(readKeyed('livliv-stage:brain', storage)!), brain, 'the setting reads with no key')
  await writeKeyed('livliv-stage:brain', { ...brain, key: 'sk-again' }, storage)
  assert.equal(lostKey('livliv-stage:brain'), false)
})

test('no store (a browser, or no system encryption): everything stays in the page\'s storage as before', async () => {
  setKeyVault(null)
  const storage = page({ 'livliv-stage:brain': JSON.stringify({ ...brain, key: 'sk' }) })
  assert.equal(readKeyed('livliv-stage:brain', storage), storage.items.get('livliv-stage:brain'))
  assert.deepEqual(await migrateKeys(storage), [])
  await writeKeyed('livliv-stage:brain', { ...brain, key: 'sk2' }, storage)
  assert.equal(JSON.parse(storage.items.get('livliv-stage:brain')!).key, 'sk2')
  await writeSecret('livliv-stage:session', 'app.t', storage)
  assert.equal(storage.items.get('livliv-stage:session'), 'app.t')
  assert.equal(lostKey('livliv-stage:brain'), false)
})

test('signed out while the delete fails to write: not signed in again after a restart, and the delete is tried again', async () => {
  const v = vault({ 'livliv-stage:session': 'tok-1' }), storage = page()
  assert.equal(readSecret('livliv-stage:session', storage), 'tok-1')
  v.state.failing = true
  await writeSecret('livliv-stage:session', '', storage)
  assert.equal(v.kept['livliv-stage:session'], 'tok-1', 'the app\'s file still has it')
  assert.equal(readSecret('livliv-stage:session', storage), '')
  // a restart: the store read afresh from the file, which still holds the old sign-in
  setKeyVault(undefined)
  const again = vault({ ...v.kept }); again.state.failing = true
  assert.equal(readSecret('livliv-stage:session', storage), '', 'cleared here: the old one is never read back')
  await migrateKeys(storage)
  assert.equal(readSecret('livliv-stage:session', storage), '', 'the delete failed again: still cleared')
  again.state.failing = false
  await migrateKeys(storage)
  assert.deepEqual(again.kept, {}, 'deleted on a start where writing works')
  assert.equal(storage.items.has('livliv-stage:keys-cleared'), false, 'and the mark is gone')
})

test('an API key cleared while the delete fails stays cleared; a new key saved after it counts', async () => {
  const v = vault({ 'livliv-stage:brain': 'sk-old' }), storage = page({ 'livliv-stage:brain': JSON.stringify(brain) })
  v.state.failing = true
  await writeKeyed('livliv-stage:brain', { ...brain, key: '' }, storage)
  setKeyVault(undefined)
  const again = vault({ ...v.kept }); again.state.failing = true
  assert.deepEqual(JSON.parse(readKeyed('livliv-stage:brain', storage)!), brain, 'no key comes back from the file')
  assert.equal(await writeKeyed('livliv-stage:brain', { ...brain, key: 'sk-new' }, storage), false, 'the new one isn\'t written either')
  assert.equal(JSON.parse(readKeyed('livliv-stage:brain', storage)!).key, 'sk-new', 'the page\'s copy counts')
  assert.equal(storage.items.has('livliv-stage:keys-cleared'), false, 'the clear no longer applies')
  again.state.failing = false
  await migrateKeys(storage)
  assert.equal(again.kept['livliv-stage:brain'], 'sk-new')
  assert.deepEqual(JSON.parse(storage.items.get('livliv-stage:brain')!), brain)
})

test('a clear that is written takes its mark off at once', async () => {
  const v = vault({ 'livliv-stage:speech': 'speech-old' }), storage = page({ 'livliv-stage:speech': JSON.stringify({ provider: 'openai', model: 'tts' }) })
  await writeKeyed('livliv-stage:speech', { provider: 'openai', key: '', model: 'tts' }, storage)
  assert.deepEqual(v.kept, {})
  assert.equal(storage.items.has('livliv-stage:keys-cleared'), false)
})
