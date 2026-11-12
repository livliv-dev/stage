import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'
import { checkPackage, imageSize } from '../src/collab/headers'

const bytes = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap((part) => typeof part === 'string' ? [...part].map((char) => char.charCodeAt(0)) : part))
const be32 = (n: number) => [n >>> 24, n >>> 16 & 255, n >>> 8 & 255, n & 255], le32 = (n: number) => be32(n).reverse(), le24 = (n: number) => le32(n).slice(0, 3)
const png = (width: number, height: number) => bytes('\x89PNG\r\n\x1a\n', [0, 0, 0, 13], 'IHDR', be32(width), be32(height), [8, 6, 0, 0, 0])
// APP0, one fill byte, then a progressive frame header.
const jpeg = (width: number, height: number) => bytes([0xff, 0xd8, 0xff, 0xe0, 0, 16], 'JFIF\0', [1, 1, 0, 0, 1, 0, 1, 0, 0], [0xff, 0xff, 0xc2, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0])
const webp = (kind: 'VP8X' | 'VP8L' | 'VP8 ', width: number, height: number) => bytes('RIFF', [64, 0, 0, 0], 'WEBP', kind, [10, 0, 0, 0],
  kind === 'VP8X' ? [16, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)] : kind === 'VP8L' ? [0x2f, ...le32((width - 1) | (height - 1) << 14)] : [0x50, 0x02, 0x00, 0x9d, 0x01, 0x2a, width & 255, width >> 8, height & 255, height >> 8])
const files = (entries: Record<string, Uint8Array | string>) => new Map(Object.entries(entries).map(([path, value]) => [path, new Blob([value as BlobPart])]))
function glb(json: object, binary: Uint8Array) {
  const text = bytes(JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length / 4) * 4, ' ')), data = bytes([...binary], Array((4 - binary.length % 4) % 4).fill(0))
  return bytes('glTF', le32(2), le32(28 + text.length + data.length), le32(text.length), 'JSON', [...text], le32(data.length), 'BIN\0', [...data])
}
function vrm(...pictures: Uint8Array[]) {
  const offsets = pictures.map((_, index) => pictures.slice(0, index).reduce((size, picture) => size + picture.length, 0))
  return glb({ asset: { version: '2.0' }, buffers: [{ byteLength: offsets.at(-1)! + pictures.at(-1)!.length }], bufferViews: pictures.map((picture, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: picture.length })), images: pictures.map((_, index) => ({ bufferView: index, mimeType: 'image/png' })) }, bytes(...pictures.map((picture) => [...picture])))
}
const refused = (pattern: RegExp) => (error: Error) => pattern.test(error.message)

test('picture headers give width and height for PNG, JPEG and the three WebP kinds', () => {
  assert.deepEqual(imageSize(png(640, 480)), [640, 480])
  assert.deepEqual(imageSize(jpeg(1920, 1080)), [1920, 1080])
  assert.deepEqual(imageSize(webp('VP8X', 8192, 300)), [8192, 300])
  assert.deepEqual(imageSize(webp('VP8L', 16383, 2)), [16383, 2])
  assert.deepEqual(imageSize(webp('VP8 ', 1024, 1536)), [1024, 1536])
  assert.equal(imageSize(png(640, 480).slice(0, 20)), null)
  assert.equal(imageSize(bytes([0xff, 0xd8, 0xff, 0xda, 0, 2])), null)
  assert.equal(imageSize(bytes('GIF89a', [1, 0, 1, 0])), null)
  assert.equal(imageSize(bytes('{"layers":[]}')), null)
})

test('received packages pass within the limits, including a real sample character', async () => {
  await checkPackage(files({ 'closed.png': png(512, 512), 'open.png': jpeg(512, 512), 'name.txt': 'Mika' }))
  await checkPackage(files({ 'model.json': '{"layers":[]}', 'textures/a.webp': webp('VP8X', 8192, 8192), 'textures/b.webp': webp('VP8L', 8192, 8192) }))
  await checkPackage(files({ 'model.vrm': vrm(png(1024, 1024), jpeg(2048, 2048)) }))
  await checkPackage(files({ 'model.vrm': new Uint8Array(await readFile(new URL('fixtures/avatar.vrm', import.meta.url))) }))
  const zip = zipSync({ 'model.json': [bytes('{"layers":[]}'), { level: 6 }], 'textures/a.png': [png(4096, 4096), { level: 0 }], 'textures/b.webp': [webp('VP8 ', 4096, 4096), { level: 9 }], '__MACOSX/textures/._a.png': [bytes([0, 5, 22, 7, 0, 2, 0, 0]), { level: 0 }] })
  await checkPackage(files({ 'character.livliv': zip }))
  const root = fileURLToPath(new URL('../public/characters/k01/', import.meta.url)), sample = new Map<string, Blob>()
  for (const path of await readdir(root, { recursive: true, withFileTypes: true })) if (path.isFile()) sample.set(relative(root, join(path.parentPath, path.name)), new Blob([await readFile(join(path.parentPath, path.name))]))
  assert.ok(sample.size > 2); await checkPackage(sample)
})

test('received packages are refused when pictures are too large or cannot be sized', async () => {
  const large = refused(/图片太大/), unknown = refused(/无法检查/)
  await assert.rejects(checkPackage(files({ 'closed.png': png(8193, 1) })), large)
  await assert.rejects(checkPackage(files({ 'a.png': png(8192, 8192), 'b.png': png(8192, 8192), 'c.png': png(1, 1) })), large)
  await assert.rejects(checkPackage(files({ 'model.vrm': vrm(png(16, 16), png(9000, 10)) })), large)
  // three.js reads the last BIN chunk, so a small picture in an earlier one must not hide a large one.
  const late = bytes([...png(9000, 10)], [0, 0, 0]), hidden = bytes([...vrm(png(16, 16))], le32(late.length), 'BIN\0', [...late])
  hidden.set(le32(hidden.length), 8); await assert.rejects(checkPackage(files({ 'model.vrm': hidden })), large)
  await assert.rejects(checkPackage(files({ 'character.livliv': zipSync({ 'model.json': bytes('{}'), 'big.png': [png(9000, 9000), { level: 9 }] }) })), large)
  for (const value of [bytes('GIF89a', [1, 0, 1, 0]), '<svg xmlns="http://www.w3.org/2000/svg" width="99999" height="99999"/>', bytes([0, 0, 1, 0, 1, 0]), png(1, 1).slice(0, 20), bytes([0xff, 0xd8, 0xff, 0xda, 0, 2])]) await assert.rejects(checkPackage(files({ 'closed.png': value })), unknown)
  await assert.rejects(checkPackage(files({ 'character.livliv': zipSync({ 'model.json': bytes('{}'), 'a.gif': [bytes('GIF89a', [1, 0, 1, 0]), { level: 6 }] }) })), unknown)
  await assert.rejects(checkPackage(files({ 'model.vrm': vrm(bytes('GIF89a', [1, 0, 1, 0])) })), unknown)
  await assert.rejects(checkPackage(files({ 'model.vrm': glb({ images: [{ uri: 'data:image/png;base64,AAAA' }] }, new Uint8Array()) })), unknown)
  await assert.rejects(checkPackage(files({ 'model.vrm': bytes('glTF', le32(2), le32(40), le32(9999), 'JSON') })), unknown)
})

test('a ZIP is refused when its central directory declares more than the unpacked limit', async () => {
  const zip = zipSync({ 'model.json': bytes('{}'), 'keyforms.json': bytes('{}') })
  const directory = zip.findIndex((_, at) => zip[at] === 0x50 && zip[at + 1] === 0x4b && zip[at + 2] === 1 && zip[at + 3] === 2)
  zip.set(le32(129 * 1024 * 1024), directory + 24)
  await assert.rejects(checkPackage(files({ 'character.livliv': zip })), refused(/解压后最多 128 MB/))
})
