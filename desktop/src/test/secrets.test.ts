import assert from 'node:assert/strict'
import { test } from 'node:test'
import { secretsStore, type Encryption } from '../secrets'

/** a reversible stand-in for the system's encryption (never the plain text on disk) */
const cipher = (available = true): Encryption => ({
  isEncryptionAvailable: () => available,
  encryptString: (text) => Buffer.from([...Buffer.from(text)].map((b) => b ^ 0x5a)),
  decryptString: (data) => { if (data[0] === 0x00) throw new Error('not ours'); return Buffer.from([...data].map((b) => b ^ 0x5a)).toString() },
})
function store(file: string | null = null, encryption = cipher()) {
  const disk = { file }
  return { disk, keys: secretsStore({ encryption, read: () => disk.file, write: (text) => { disk.file = text } }) }
}

test('keys kept encrypted: never the plain key on disk, read back as saved, an empty one removed', () => {
  const { disk, keys } = store()
  assert.deepEqual(keys.all(), {})
  assert.equal(keys.set('livliv-stage:brain', 'sk-secret-123'), true)
  assert.equal(keys.set('livliv-stage:speech', 'speech-key'), true)
  assert.ok(disk.file && !disk.file.includes('sk-secret-123') && !disk.file.includes('speech-key'))
  assert.deepEqual(store(disk.file).keys.all(), { 'livliv-stage:brain': 'sk-secret-123', 'livliv-stage:speech': 'speech-key' }, 'as saved, after a restart')
  keys.set('livliv-stage:speech', '')
  assert.deepEqual(store(disk.file).keys.all(), { 'livliv-stage:brain': 'sk-secret-123' })
})

test('only the settings that carry a key, and no oversized value', () => {
  const { keys } = store()
  assert.equal(keys.set('livliv-stage:scene', 'x'), false)
  assert.equal(keys.set('anything', 'x'), false)
  assert.equal(keys.set('livliv-stage:brain', 'x'.repeat(5000)), false)
  assert.equal(keys.set('livliv-stage:brain', 42), false)
  assert.deepEqual(keys.all(), {})
})

test('a missing or corrupted store is an empty one, written afresh on the next key; one entry that can\'t be read is dropped', () => {
  assert.deepEqual(store(null).keys.all(), {})
  const broken = store('{ not json')
  assert.deepEqual(broken.keys.all(), {})
  assert.equal(broken.keys.set('livliv-stage:realtime', 'rt-key'), true)
  assert.deepEqual(store(broken.disk.file).keys.all(), { 'livliv-stage:realtime': 'rt-key' })
  const mixed = JSON.stringify({ version: 1, values: { 'livliv-stage:brain': Buffer.from([0, 1, 2]).toString('base64'), 'livliv-stage:speech': Buffer.from([...Buffer.from('ok')].map((b) => b ^ 0x5a)).toString('base64'), 'livliv-stage:scene': 'x' } })
  assert.deepEqual(store(mixed).keys.all(), { 'livliv-stage:speech': 'ok' })
})

test('without system encryption there is no store: the page keeps its keys', () => {
  const { disk, keys } = store(null, cipher(false))
  assert.equal(keys.all(), null)
  assert.equal(keys.set('livliv-stage:brain', 'sk'), false)
  assert.equal(disk.file, null)
})
