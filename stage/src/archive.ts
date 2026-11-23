import { Inflate, Zip, ZipPassThrough } from 'fflate'
import { tr } from './i18n'

export const PROJECT_LIMIT = 512 * 2 ** 20
const ENTRIES = 8192
export const archivePath = (name: string) => !!name && name.length <= 1024 && !/[\\:\0]/.test(name) && !name.startsWith('/') && !name.split('/').some((p) => !p || p === '.' || p === '..')
const tooLarge = () => new Error(tr('项目超过 512 MB 或文件数量过多'))

/** an entry as the central directory gives it: its sizes, check, compression and where its local header is */
type Entry = { size: number; crc: number; compression: number; packed: number; local: number }
const damaged = () => new Error(tr('项目文件已损坏'))
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let value = n
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  crcTable[n] = value >>> 0
}
function crcChunk(crc: number, data: Uint8Array) {
  for (const value of data) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8)
  return crc
}

async function directory(blob: Blob, signal?: AbortSignal): Promise<{ entries: Map<string, Entry>; start: number }> {
  signal?.throwIfAborted()
  const tail = new DataView(await blob.slice(Math.max(0, blob.size - 65557)).arrayBuffer())
  let end = -1
  for (let n = tail.byteLength - 22; n >= 0; n--) if (tail.getUint32(n, true) === 0x06054b50 && n + 22 + tail.getUint16(n + 20, true) === tail.byteLength) { end = n; break }
  if (end < 0) throw damaged()
  const count = tail.getUint16(end + 10, true), size = tail.getUint32(end + 12, true), start = tail.getUint32(end + 16, true)
  if (tail.getUint16(end + 4, true) || tail.getUint16(end + 6, true) || tail.getUint16(end + 8, true) !== count || count > ENTRIES || size > 16 * 2 ** 20 || start + size !== blob.size - tail.byteLength + end) throw damaged()
  const view = new DataView(await blob.slice(start, start + size).arrayBuffer()), utf8 = new TextDecoder('utf-8', { fatal: true })
  const entries = new Map<string, Entry>(), seen = new Set<string>()
  let offset = 0, bytes = 0
  for (let n = 0; n < count; n++) {
    signal?.throwIfAborted()
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw damaged()
    const flags = view.getUint16(offset + 8, true), compression = view.getUint16(offset + 10, true), crc = view.getUint32(offset + 16, true)
    const compressed = view.getUint32(offset + 20, true), original = view.getUint32(offset + 24, true), length = view.getUint16(offset + 28, true)
    const end = offset + 46 + length + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true), local = view.getUint32(offset + 42, true)
    if (end > view.byteLength || flags & 1 || ![0, 8].includes(compression) || local + 30 + compressed > start) throw damaged()
    const name = utf8.decode(new Uint8Array(view.buffer, view.byteOffset + offset + 46, length)), folder = name.endsWith('/')
    if (!archivePath(folder ? name.slice(0, -1) : name) || seen.has(name)) throw damaged()
    seen.add(name); bytes += original
    if (bytes > PROJECT_LIMIT) throw tooLarge()
    if (folder) { if (original) throw damaged() }
    else entries.set(name, { size: original, crc, compression, packed: compressed, local })
    offset = end
  }
  if (offset !== view.byteLength) throw damaged()
  return { entries, start }
}

export async function packFiles(files: Map<string, Blob>, signal?: AbortSignal, progress?: (value: number) => void): Promise<Blob> {
  const total = [...files.values()].reduce((n, b) => n + b.size, 0)
  if (files.size > ENTRIES || total > PROJECT_LIMIT) throw tooLarge()
  const parts: Uint8Array<ArrayBuffer>[] = []; let outputBytes = 0
  const zip = new Zip((error, data) => { if (error) throw error; outputBytes += data.byteLength; if (outputBytes > PROJECT_LIMIT) throw tooLarge(); parts.push(new Uint8Array(data)) })
  let done = 0
  try {
    for (const [name, blob] of files) {
      if (!archivePath(name)) throw new Error(tr('项目中的文件路径无效'))
      signal?.throwIfAborted()
      const file = new ZipPassThrough(name); zip.add(file)
      const reader = blob.stream().getReader()
      try {
        for (;;) {
          signal?.throwIfAborted()
          const { done: end, value } = await reader.read()
          if (end) { file.push(new Uint8Array(), true); break }
          file.push(value); done += value.byteLength; progress?.(done / Math.max(1, total))
        }
      } catch (error) { await reader.cancel(error); throw error }
      await new Promise((r) => setTimeout(r))
    }
    zip.end()
    return new Blob(parts, { type: 'application/vnd.livliv.stage+zip' })
  } catch (error) { zip.terminate(); throw error }
}

/** the project's files, each read where the central directory says it is. Not by reading the archive through: a file
 *  that is itself a ZIP (an imported .livliv or .mavatar, stored as it is) holds headers of its own, which a reader
 *  looking through the stream for the next entry takes for the project's */
export async function unpackFiles(blob: Blob, signal?: AbortSignal): Promise<Map<string, Blob>> {
  if (blob.size > PROJECT_LIMIT) throw tooLarge()
  const { entries, start: end } = await directory(blob, signal)
  const files = new Map<string, Blob>(), utf8 = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  for (const [name, entry] of entries) {
    signal?.throwIfAborted()
    const head = new DataView(await blob.slice(entry.local, entry.local + 30).arrayBuffer())
    if (head.byteLength < 30 || head.getUint32(0, true) !== 0x04034b50 || head.getUint16(6, true) & 1 || head.getUint16(8, true) !== entry.compression) throw damaged()
    // a local header with its sizes (no data descriptor after the data) says what the directory says
    if (!(head.getUint16(6, true) & 8) && (head.getUint32(14, true) !== entry.crc || head.getUint32(18, true) !== entry.packed || head.getUint32(22, true) !== entry.size)) throw damaged()
    const length = head.getUint16(26, true), from = entry.local + 30 + length + head.getUint16(28, true)
    if (from + entry.packed > end) throw damaged()
    let local: string
    try { local = utf8.decode(await blob.slice(entry.local + 30, entry.local + 30 + length).arrayBuffer()) } catch { throw damaged() }
    if (local !== name || (entry.compression === 0 && entry.packed !== entry.size)) throw damaged()
    if ((bytes += entry.size) > PROJECT_LIMIT) throw tooLarge()
    // its bytes, checked against the directory's size and CRC; compressed ones inflated a bounded piece at a time
    const data = blob.slice(from, from + entry.packed), parts: Uint8Array<ArrayBuffer>[] = []
    let crc = 0xffffffff, size = 0
    const take = (chunk: Uint8Array) => {
      if ((size += chunk.byteLength) > entry.size) throw damaged()
      crc = crcChunk(crc, chunk)
      if (entry.compression) parts.push(new Uint8Array(chunk))
    }
    const inflate = entry.compression ? new Inflate((chunk) => take(chunk)) : null
    const reader = data.stream().getReader()
    try {
      for (;;) {
        signal?.throwIfAborted()
        const { done, value } = await reader.read()
        if (done) { inflate?.push(new Uint8Array(), true); break }
        if (!inflate) take(value)
        else for (let i = 0; i < value.byteLength; i += 8192) inflate.push(value.subarray(i, i + 8192))
      }
    } catch (error) {
      await reader.cancel(error).catch(() => {})
      throw signal?.aborted ? signal.reason : error instanceof Error && error.message === damaged().message ? error : damaged()
    }
    if (size !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw damaged()
    files.set(name, entry.compression ? new Blob(parts) : data)
    await new Promise((r) => setTimeout(r))
  }
  if (!files.size || files.size !== entries.size) throw new Error(tr('这个项目文件不完整'))
  return files
}
