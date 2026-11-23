import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

test('a project holding ZIPs of its own (an imported .livliv) opens again, each file as it was', async () => {
  // a .livliv as exported (deflated entries) and a ZIP of stored entries: both hold local headers of their own
  const livliv = zipSync({ 'model.json': new TextEncoder().encode('{"format":"livliv-model"}'), 'textures/a.webp': new Uint8Array(4000).fill(7) }, { level: 6 })
  const stored = zipSync({ 'a.json': new TextEncoder().encode('{"a":1}'), 'b.png': new Uint8Array(3000).fill(5) }, { level: 0 })
  const original = new Map([['project.json', new Blob(['{}'])], ['models/m0/Nana.livliv', new Blob([livliv])], ['models/m1/files.zip', new Blob([stored])], ['pictures/p0', new Blob([new Uint8Array([9, 8, 7])])]])
  const files = await unpackFiles(await packFiles(original))
  assert.deepEqual([...files.keys()], [...original.keys()])
  for (const [name, value] of original) assert.ok(Buffer.from(await files.get(name)!.arrayBuffer()).equals(Buffer.from(await value.arrayBuffer())), name)
})

test('a project written by another tool, its entries deflated and its sizes in the headers, opens too', async () => {
  const bytes = zipSync({ 'project.json': new TextEncoder().encode('{"name":"x"}'.repeat(200)), 'models/m0/model.json': [new TextEncoder().encode('{}'), { level: 0 }] }, { level: 9 })
  const files = await unpackFiles(new Blob([bytes]))
  assert.equal(await files.get('project.json')!.text(), '{"name":"x"}'.repeat(200))
  assert.equal(await files.get('models/m0/model.json')!.text(), '{}')
})

test('a project holding a .mavatar opens again with it as it was', async () => {
  const mavatar = new Uint8Array(readFileSync(new URL('./fixtures/nana.mavatar', import.meta.url)))
  const files = await unpackFiles(await packFiles(new Map([['project.json', new Blob(['{}'])], ['models/m0/model.mavatar', new Blob([mavatar])]])))
  assert.ok(Buffer.from(await files.get('models/m0/model.mavatar')!.arrayBuffer()).equals(Buffer.from(mavatar)))
})

