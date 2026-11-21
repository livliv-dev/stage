import assert from 'node:assert/strict'
import { test } from 'node:test'
import { secretsStore, type Encryption } from '../secrets'

/** a reversible stand-in for the system's encryption (never the plain text on disk); `rotated`: what it decrypts
 *  should be encrypted again (the system's key changed) */
const cipher = ({ available = true, failing = false, rotated = false } = {}): Encryption & { calls: number } => {
  const flip = (data: Buffer) => Buffer.from([...data].map((b) => b ^ 0x5a))
  const self = {
    calls: 0,
    isAsyncEncryptionAvailable: async () => available,
    encryptStringAsync: async (text: string) => { self.calls++; if (failing) throw new Error('keychain refused'); return flip(Buffer.from(text)) },
    decryptStringAsync: async (data: Buffer) => { if (data[0] === 0x00) throw new Error('not ours'); return { result: flip(data).toString(), shouldReEncrypt: rotated } },
  }
  return self
}
async function store(file: string | null = null, encryption: Encryption = cipher()) {
  const disk = { file, writes: 0 }
  const keys = secretsStore({ encryption, read: () => disk.file, write: (text) => { disk.file = text; disk.writes++ } })
  const open = await keys.open()
  return { disk, keys, open }
}

test('keys kept encrypted: never the plain key on disk, read back as saved, an empty one removed', async () => {
  const { disk, keys, open } = await store()
  assert.equal(open, true)
  assert.deepEqual(keys.all(), {})
  assert.equal(keys.set('livliv-stage:brain', 'sk-secret-123'), true)
  assert.equal(keys.set('livliv-stage:speech', 'speech-key'), true)
  assert.equal(keys.pending(), true, 'being written')
  await keys.flush()
  assert.equal(keys.pending(), false)
  assert.ok(disk.file && !disk.file.includes('sk-secret-123') && !disk.file.includes('speech-key'))
  assert.deepEqual((await store(disk.file)).keys.all(), { 'livliv-stage:brain': 'sk-secret-123', 'livliv-stage:speech': 'speech-key' }, 'as saved, after a restart')
  keys.set('livliv-stage:speech', '')
  await keys.flush()
  assert.deepEqual((await store(disk.file)).keys.all(), { 'livliv-stage:brain': 'sk-secret-123' })
})

test('saved one after another, the file ends as the last save left it', async () => {
  const { disk, keys } = await store()
  for (const key of ['a', 'b', 'c']) keys.set('livliv-stage:brain', key)
  await keys.flush()
  assert.equal(disk.writes, 3)
  assert.deepEqual((await store(disk.file)).keys.all(), { 'livliv-stage:brain': 'c' })
})

test('only the settings that carry a key, and no oversized value', async () => {
  const { keys } = await store()
  assert.equal(keys.set('livliv-stage:scene', 'x'), false)
  assert.equal(keys.set('anything', 'x'), false)
  assert.equal(keys.set('livliv-stage:brain', 'x'.repeat(5000)), false)
  assert.equal(keys.set('livliv-stage:brain', 42), false)
  assert.deepEqual(keys.all(), {})
})

test('a missing or corrupted store is an empty one, written afresh on the next key; one entry that can\'t be read is dropped', async () => {
  assert.deepEqual((await store(null)).keys.all(), {})
  const broken = await store('{ not json')
  assert.deepEqual(broken.keys.all(), {})
  assert.equal(broken.keys.set('livliv-stage:realtime', 'rt-key'), true)
  await broken.keys.flush()
  assert.deepEqual((await store(broken.disk.file)).keys.all(), { 'livliv-stage:realtime': 'rt-key' })
  const mixed = JSON.stringify({ version: 1, values: { 'livliv-stage:brain': Buffer.from([0, 1, 2]).toString('base64'), 'livliv-stage:speech': Buffer.from([...Buffer.from('ok')].map((b) => b ^ 0x5a)).toString('base64'), 'livliv-stage:scene': 'x' } })
  assert.deepEqual((await store(mixed)).keys.all(), { 'livliv-stage:speech': 'ok' })
})

test('the system\'s key changed: the keys are written again with the new one', async () => {
  const first = await store()
  first.keys.set('livliv-stage:brain', 'sk')
  await first.keys.flush()
  const before = first.disk.writes
  const again = await store(first.disk.file, cipher({ rotated: true }))
  await again.keys.flush()
  assert.equal(again.disk.writes, 1, 'written once more')
  assert.equal(before, 1)
  assert.deepEqual(again.keys.all(), { 'livliv-stage:brain': 'sk' })
})

test('without system encryption, or when it fails as the app starts, there is no store: the page keeps its keys', async () => {
  for (const encryption of [cipher({ available: false }), cipher({ failing: true })]) {
    const { disk, keys, open } = await store(null, encryption)
    assert.equal(open, false)
    assert.equal(keys.all(), null)
    assert.equal(keys.set('livliv-stage:brain', 'sk'), false)
    assert.equal(disk.file, null)
  }
  const unopened = secretsStore({ encryption: cipher(), read: () => null, write: () => {} })
  assert.equal(unopened.all(), null, 'not yet open: none')
  assert.equal(unopened.set('livliv-stage:brain', 'sk'), false)
})
