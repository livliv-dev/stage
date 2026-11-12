import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Zip, ZipPassThrough, zipSync } from 'fflate'
import { archivePath, packFiles, PROJECT_LIMIT, unpackFiles } from '../src/archive'

test('project archives round trip Unicode paths and binary assets without changing their bytes', async () => {
  const original = new Map([['project.json', new Blob(['{"name":"開場"}'])], ['models/m0/表情.webp', new Blob([new Uint8Array([0, 1, 255])])]])
  const blob = await packFiles(original), files = await unpackFiles(blob)
  assert.deepEqual([...files.keys()], [...original.keys()])
  for (const [name, value] of original) assert.deepEqual(new Uint8Array(await files.get(name)!.arrayBuffer()), new Uint8Array(await value.arrayBuffer()))
})

test('archive boundaries refuse traversal, duplicate entries, truncated data and oversized declarations', async () => {
  for (const path of ['../file', '/file', 'a/../file', 'C:/file', 'a\\file', 'a//file']) assert.equal(archivePath(path), false)
  await assert.rejects(packFiles(new Map([['../file', new Blob(['x'])]])))
  const parts: Uint8Array<ArrayBuffer>[] = [], zip = new Zip((error, data) => { assert.ifError(error); parts.push(new Uint8Array(data)) })
  for (let n = 0; n < 2; n++) { const file = new ZipPassThrough('same'); zip.add(file); file.push(new Uint8Array([1]), true) }
  zip.end(); await assert.rejects(unpackFiles(new Blob(parts)))
  const large = zipSync({ 'large.bin': new Uint8Array([1]) }, { level: 0 }); new DataView(large.buffer, large.byteOffset, large.byteLength).setUint32(22, PROJECT_LIMIT + 1, true)
  await assert.rejects(unpackFiles(new Blob([new Uint8Array(large)])))
  await assert.rejects(unpackFiles(new Blob(['PK damaged'])))
})

test('cancelled project reads and writes preserve the caller abort reason', async () => {
  const source = new Map([['project.json', new Blob(['{}'])]]), blob = await packFiles(source)
  for (const run of [(signal: AbortSignal) => packFiles(source, signal), (signal: AbortSignal) => unpackFiles(blob, signal)]) {
    const controller = new AbortController(), reason = new DOMException('Cancelled', 'AbortError')
    const pending = run(controller.signal); controller.abort(reason)
    await assert.rejects(pending, (error) => error === reason)
  }
})


test('valid ZIPs that lose their end record or have altered payload bytes are refused', async () => {
  const packed = await packFiles(new Map([['project.json', new Blob(['{"name":"A"}'])]]))
  const bytes = new Uint8Array(await packed.arrayBuffer())
  await assert.rejects(unpackFiles(new Blob([bytes.slice(0, -22)])))
  const changed = bytes.slice(), index = Buffer.from(changed).indexOf('{"name":"A"}')
  assert.ok(index >= 0); changed[index + 9] = 66
  await assert.rejects(unpackFiles(new Blob([changed])))
})
