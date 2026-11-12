import { tr } from '../i18n'
// A received character is checked from its file headers before the Player decodes anything: the wire limit says
// nothing about how large a ZIP unpacks or how many pixels its pictures decode to.
const MAX_UNPACKED_BYTES = 128 * 1024 * 1024
const MAX_ENTRIES = 2048
const MAX_SIDE = 8192
const MAX_TEXELS = 64 * 1024 * 1024
const MAX_TOTAL_TEXELS = 128 * 1024 * 1024
const HEAD = 1024 * 1024
class Refused extends Error {}
const unpacked = () => new Refused(tr("这个角色包太大，没有载入（解压后最多 128 MB、2048 个文件）"))
const large = () => new Refused(tr("这个角色的图片太大，没有载入"))
const unknown = () => new Refused(tr("这个角色里有无法检查的文件，没有载入"))
const le16 = (b: Uint8Array, at: number) => b[at] | b[at + 1] << 8
const le32 = (b: Uint8Array, at: number) => (b[at] | b[at + 1] << 8 | b[at + 2] << 16 | b[at + 3] << 24) >>> 0
const be16 = (b: Uint8Array, at: number) => b[at] << 8 | b[at + 1]
const be32 = (b: Uint8Array, at: number) => (b[at] << 24 | b[at + 1] << 16 | b[at + 2] << 8 | b[at + 3]) >>> 0
const tag = (b: Uint8Array, at: number, text: string) => [...text].every((char, index) => b[at + index] === char.charCodeAt(0))
const read = async (blob: Blob, start: number, end: number) => new Uint8Array(await blob.slice(start, end).arrayBuffer())

/** Width and height from a PNG, JPEG or WebP header; null for anything else or a header cut short. */
export function imageSize(b: Uint8Array): [number, number] | null {
  if (tag(b, 0, '\x89PNG\r\n\x1a\n')) return b.length >= 24 && tag(b, 12, 'IHDR') ? [be32(b, 16), be32(b, 20)] : null
  if (tag(b, 0, 'RIFF') && tag(b, 8, 'WEBP')) {
    if (tag(b, 12, 'VP8X') && b.length >= 30) return [1 + (b[24] | b[25] << 8 | b[26] << 16), 1 + (b[27] | b[28] << 8 | b[29] << 16)]
    if (tag(b, 12, 'VP8L') && b.length >= 25 && b[20] === 0x2f) return [1 + (b[21] | (b[22] & 0x3f) << 8), 1 + (b[22] >> 6 | b[23] << 2 | (b[24] & 0x0f) << 10)]
    if (tag(b, 12, 'VP8 ') && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return [le16(b, 26) & 0x3fff, le16(b, 28) & 0x3fff]
    return null
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null
  for (let at = 2; at + 9 <= b.length;) {
    if (b[at] !== 0xff) return null
    const marker = b[at + 1]
    if (marker === 0xff) at++
    else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) at += 2
    else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return [be16(b, at + 7), be16(b, at + 5)]
    else if (marker === 0xd9 || marker === 0xda) return null
    else at += 2 + be16(b, at + 2)
  }
  return null
}

// JSON and plain text pass. Anything else might decode to a picture: binary data, markup (SVG), and GIF or RIFF
// headers, which can be written in plain characters.
function plainText(b: Uint8Array) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(b, { stream: true })
    return !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) && !/^\s*(<|GIF8|RIFF)/.test(text)
  } catch { return false }
}

async function inflated(data: Blob, limit: number) {
  const reader = data.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(), parts: Uint8Array[] = []
  let size = 0
  try {
    while (size < limit) { const { done, value } = await reader.read(); if (done) break; parts.push(value); size += value.byteLength }
  } catch { throw unknown() } finally { void reader.cancel().catch(() => {}) }
  return new Uint8Array(await new Blob(parts as BlobPart[]).slice(0, limit).arrayBuffer())
}

/** The first bytes of each file in a ZIP, once its central directory declares no more than the unpacked limit. */
async function* zipEntries(blob: Blob) {
  const tail = await read(blob, Math.max(0, blob.size - 65557), blob.size)
  let end = tail.length - 22
  while (end >= 0 && le32(tail, end) !== 0x06054b50) end--
  if (end < 0) throw unknown()
  const count = le16(tail, end + 10), length = le32(tail, end + 12), offset = le32(tail, end + 16)
  if (count > MAX_ENTRIES || length === 0xffffffff || offset === 0xffffffff) throw unpacked()
  const directory = await read(blob, offset, offset + length), entries: { flags: number; method: number; packed: number; size: number; at: number }[] = []
  let total = 0
  for (let at = 0, index = 0; index < count; index++) {
    if (at + 46 > directory.length || le32(directory, at) !== 0x02014b50) throw unknown()
    const name = new TextDecoder().decode(directory.subarray(at + 46, at + 46 + le16(directory, at + 28))).replace(/\\/g, '/'), base = name.slice(name.lastIndexOf('/') + 1)
    const entry = { flags: le16(directory, at + 8), method: le16(directory, at + 10), packed: le32(directory, at + 20), size: le32(directory, at + 24), at: le32(directory, at + 42) }
    at += 46 + le16(directory, at + 28) + le16(directory, at + 30) + le16(directory, at + 32)
    if ((total += entry.size) > MAX_UNPACKED_BYTES) throw unpacked()
    // The Player skips these as well; macOS adds them when it compresses a folder.
    if (!name.endsWith('/') && !name.startsWith('__MACOSX/') && !base.startsWith('._') && base !== '.DS_Store' && base !== 'Thumbs.db') entries.push(entry)
  }
  for (const entry of entries) {
    const local = await read(blob, entry.at, entry.at + 30)
    if (local.length < 30 || le32(local, 0) !== 0x04034b50 || entry.flags & 1) throw unknown()
    const start = entry.at + 30 + le16(local, 26) + le16(local, 28), data = blob.slice(start, start + entry.packed)
    if (entry.method === 0) yield await read(data, 0, HEAD)
    else if (entry.method === 8) yield await inflated(data, Math.min(HEAD, entry.size))
    else throw unknown()
  }
}

type Gltf = { images?: { bufferView?: number }[]; bufferViews?: { buffer?: number; byteOffset?: number; byteLength?: number }[]; buffers?: { uri?: string }[] }
/** The first bytes of each picture in a binary glTF (a VRM). Chunks are read as three.js reads them: the last JSON and BIN count. */
async function* glbImages(blob: Blob) {
  const data = await read(blob, 0, blob.size), end = Math.min(le32(data, 8), data.length)
  let json: Uint8Array | null = null, binary: Uint8Array | null = null
  for (let at = 12; at + 8 <= end; at += 8 + le32(data, at)) {
    const chunk = data.subarray(at + 8, at + 8 + le32(data, at)), type = le32(data, at + 4)
    if (type === 0x4e4f534a) json = chunk
    else if (type === 0x004e4942) binary = chunk
  }
  if (!json) throw unknown()
  const gltf = JSON.parse(new TextDecoder().decode(json)) as Gltf
  for (const image of gltf.images ?? []) {
    const view = gltf.bufferViews?.[image.bufferView!], offset = view?.byteOffset ?? 0, length = view?.byteLength ?? 0
    // Only pictures stored in the file's own BIN chunk can be sized here.
    if (!binary || view?.buffer !== 0 || gltf.buffers?.[0]?.uri !== undefined || !Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length <= 0 || offset + length > binary.length) throw unknown()
    yield binary.subarray(offset, offset + Math.min(length, HEAD))
  }
}

/** Throws a message for the person receiving the character when its files could unpack or decode past the limits. */
export async function checkPackage(files: Map<string, Blob>) {
  let texels = 0
  const check = (head: Uint8Array, picture: boolean) => {
    const size = imageSize(head)
    if (!size) { if (picture || !plainText(head)) throw unknown(); return }
    const [width, height] = size
    if (!width || !height) throw unknown()
    if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_TEXELS || (texels += width * height) > MAX_TOTAL_TEXELS) throw large()
  }
  try {
    for (const blob of files.values()) {
      const head = await read(blob, 0, HEAD)
      if (tag(head, 0, 'PK\x03\x04') || tag(head, 0, 'PK\x05\x06')) for await (const entry of zipEntries(blob)) check(entry, false)
      else if (tag(head, 0, 'glTF')) for await (const image of glbImages(blob)) check(image, true)
      else check(head, false)
    }
  } catch (error) { throw error instanceof Refused ? error : unknown() }
}
