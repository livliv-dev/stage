import assert from 'node:assert/strict'
import { test } from 'node:test'
import { secretsStore, type Encryption } from '../secrets'

/** a reversible stand-in for the system's encryption (never the plain text on disk); `rotated`: what it decrypts
 *  should be encrypted again (the system's key changed); `backend`: Linux's password store */
const cipher = ({ available = true, failing = false, rotated = false, backend = '' } = {}): Encryption => {
  const flip = (data: Buffer) => Buffer.from([...data].map((b) => b ^ 0x5a))
  return {
    isAsyncEncryptionAvailable: async () => available,
    encryptStringAsync: async (text: string) => { if (failing) throw new Error('keychain refused'); return flip(Buffer.from(text)) },
    decryptStringAsync: async (data: Buffer) => { if (data[0] === 0x00) throw new Error('not ours'); return { result: flip(data).toString(), shouldReEncrypt: rotated } },
    ...(backend ? { getSelectedStorageBackend: () => backend } : {}),
  }
}
async function store(file: string | null = null, encryption: Encryption = cipher(), { platform = 'darwin', failing = false } = {}) {
  const disk = { file, writes: 0, failing }
  const keys = secretsStore({ encryption, platform, read: () => disk.file, write: (text) => { if (disk.failing) throw Object.assign(new Error('EPERM: rename'), { name: 'EPERM' }); disk.file = text; disk.writes++ } })
  const open = await keys.open()
  return { disk, keys, open }
}
const keysOf = (keys: { all(): { keys: Record<string, string> } | null }) => keys.all()?.keys

test('keys kept encrypted: a save answers once written, never the plain key on disk, an empty one removed', async () => {
  const { disk, keys, open } = await store()
  assert.equal(open, true)
  assert.deepEqual(keys.all(), { keys: {}, lost: [] })
  const saving = keys.set('livliv-stage:brain', 'sk-secret-123')
  assert.equal(keys.pending(), true, 'being written')
  assert.equal(await saving, true)
  assert.equal(await keys.set('livliv-stage:session', 'app.token'), true, 'the sign-in too')
  assert.equal(keys.pending(), false)
  assert.ok(disk.file && !disk.file.includes('sk-secret-123') && !disk.file.includes('app.token'))
  assert.deepEqual(keysOf((await store(disk.file)).keys), { 'livliv-stage:brain': 'sk-secret-123', 'livliv-stage:session': 'app.token' }, 'as saved, after a restart')
  assert.equal(await keys.set('livliv-stage:session', ''), true)
  assert.deepEqual(keysOf((await store(disk.file)).keys), { 'livliv-stage:brain': 'sk-secret-123' })
})

test('a write that fails answers false (the page keeps its copy), and the same key saved again is written', async () => {
  const { disk, keys } = await store()
  disk.failing = true
  assert.equal(await keys.set('livliv-stage:brain', 'sk-new'), false, 'EPERM, a full disk: not confirmed')
  assert.equal(disk.file, null)
  assert.deepEqual(keysOf((await store(disk.file)).keys), {}, 'after a restart the file never had it')
  disk.failing = false
  assert.equal(await keys.set('livliv-stage:brain', 'sk-new'), true, 'the same key again: written, not taken as already there')
  assert.deepEqual(keysOf((await store(disk.file)).keys), { 'livliv-stage:brain': 'sk-new' })
})

test('saved one after another, the file ends as the last save left it', async () => {
  const { disk, keys } = await store()
  const saves = ['a', 'b', 'c'].map((key) => keys.set('livliv-stage:brain', key))
  assert.deepEqual(await Promise.all(saves), [true, true, true])
  assert.equal(disk.writes, 3)
  assert.deepEqual(keysOf((await store(disk.file)).keys), { 'livliv-stage:brain': 'c' })
})

test('only the settings that carry a key, and no oversized value', async () => {
  const { keys } = await store()
  assert.equal(await keys.set('livliv-stage:scene', 'x'), false)
  assert.equal(await keys.set('anything', 'x'), false)
  assert.equal(await keys.set('livliv-stage:brain', 'x'.repeat(5000)), false)
  assert.equal(await keys.set('livliv-stage:brain', 42), false)
  assert.deepEqual(keysOf(keys), {})
})

test('a missing or corrupted store is an empty one; a key that can\'t be decrypted is reported, and kept on disk', async () => {
  assert.deepEqual(keysOf((await store(null)).keys), {})
  const broken = await store('{ not json')
  assert.deepEqual(broken.keys.all(), { keys: {}, lost: [] })
  assert.equal(await broken.keys.set('livliv-stage:realtime', 'rt-key'), true)
  assert.deepEqual(keysOf((await store(broken.disk.file)).keys), { 'livliv-stage:realtime': 'rt-key' })
  const mixed = JSON.stringify({ version: 1, values: { 'livliv-stage:brain': Buffer.from([0, 1, 2]).toString('base64'), 'livliv-stage:speech': Buffer.from([...Buffer.from('ok')].map((b) => b ^ 0x5a)).toString('base64'), 'livliv-stage:scene': 'x' } })
  const opened = await store(mixed)
  assert.deepEqual(opened.keys.all(), { keys: { 'livliv-stage:speech': 'ok' }, lost: ['livliv-stage:brain'] }, 'the page asks for it again')
  assert.equal(opened.disk.writes, 0, 'not rewritten as it opens: a keychain back next time still reads it')
  await opened.keys.set('livliv-stage:brain', 'sk-again')
  assert.deepEqual(opened.keys.all()?.lost, [], 'saved again: no longer lost')
})

test('the system\'s key changed: the keys are written again with the new one', async () => {
  const first = await store()
  await first.keys.set('livliv-stage:brain', 'sk')
  const again = await store(first.disk.file, cipher({ rotated: true }))
  await again.keys.flush()
  assert.equal(again.disk.writes, 1, 'written once more')
  assert.deepEqual(keysOf(again.keys), { 'livliv-stage:brain': 'sk' })
})

test('no store without real system encryption: none at all, failing as the app starts, or Linux\'s fixed-password one', async () => {
  for (const [encryption, platform] of [[cipher({ available: false }), 'darwin'], [cipher({ failing: true }), 'win32'], [cipher({ backend: 'basic_text' }), 'linux']] as const) {
    const { disk, keys, open } = await store(null, encryption, { platform })
    assert.equal(open, false, platform)
    assert.equal(keys.all(), null)
    assert.equal(await keys.set('livliv-stage:brain', 'sk'), false)
    assert.equal(disk.file, null)
  }
  assert.equal((await store(null, cipher({ backend: 'gnome_libsecret' }), { platform: 'linux' })).open, true, 'a real keyring on Linux')
  const unopened = secretsStore({ encryption: cipher(), platform: 'darwin', read: () => null, write: () => {} })
  assert.equal(unopened.all(), null, 'not yet open: none')
  assert.equal(await unopened.set('livliv-stage:brain', 'sk'), false)
})
