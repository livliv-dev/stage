import { tr } from '../i18n'
import { type CharacterItem } from '../scene'
import { formatOf, sourceOf } from '../bodies'
import { desktopFetch } from '../request'
import { resourcePaths, resourceUrl } from './resources'
import { CHUNK_BYTES, MAX_FILES, MAX_MODEL_BYTES, readManifest, type ModelManifest } from './protocol'
export type Package = { manifest: ModelManifest; files: Map<string, Blob> }
const WIRE_TEXT = 64 * 1024
async function fetchFile(url: string, signal: AbortSignal, limit: number) {
  const response = await desktopFetch(url, { signal })
  if (!response.ok) throw new Error(tr("角色文件读取失败（") + response.status + '）')
  const reader = response.body!.getReader(), parts: Uint8Array[] = []
  let size = 0
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error(tr("联播角色不能超过 64 MB")) } parts.push(value) }
  } finally { reader.releaseLock() }
  return new Blob(parts as BlobPart[], { type: response.headers.get('content-type') || '' })
}
export async function packageFor(character: CharacterItem, signal: AbortSignal): Promise<Package> {
  const source = await sourceOf(character.model)
  let files: Map<string, Blob>
  if (typeof source !== 'string') files = new Map([...source].filter(([path, blob]) => blob.size > 0 && /\.(json|png|webp|jpe?g|vrm|livliv|zip|txt)$/i.test(path)))
  else {
    const url = new URL(source, location.href)
    if (/\.(livliv|zip)$/i.test(url.pathname)) files = new Map([['character.livliv', await fetchFile(url.href, signal, MAX_MODEL_BYTES)]])
    else {
      if (!url.pathname.endsWith('.json')) url.pathname = url.pathname.replace(/\/?$/, '/') + 'model.json'
      const json = await fetchFile(url.href, signal, Math.min(4 * 1024 * 1024, MAX_MODEL_BYTES)), raw: unknown = JSON.parse(await json.text())
      const paths = resourcePaths(raw), base = new URL('.', url)
      files = new Map([['model.json', json]])
      let size = json.size
      if (paths.length >= MAX_FILES) throw new Error(tr("这个角色的文件数量超出联播限制"))
      for (const path of paths) {
        const target = resourceUrl(path, base); target.search = url.search
        const blob = await fetchFile(target.href, signal, MAX_MODEL_BYTES - size)
        size += blob.size; if (blob.size) files.set(path, blob)
      }
    }
  }
  const manifest: ModelManifest = { id: crypto.randomUUID(), name: character.name, format: formatOf(character.model), mirror: character.mirror, color: character.color, files: [...files].map(([path, blob]) => ({ path, size: blob.size, type: blob.type })) }
  if (!readManifest(manifest) || new TextEncoder().encode(JSON.stringify(manifest)).length > WIRE_TEXT) throw new Error(tr("这个角色超出联播限制（64 MB、512 个文件）"))
  return { manifest, files }
}
function drained(channel: RTCDataChannel, signal: AbortSignal) {
  if (channel.bufferedAmount < 512 * 1024) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const clean = () => { channel.removeEventListener('bufferedamountlow', ready); channel.removeEventListener('close', closed); signal.removeEventListener('abort', aborted) }
    const ready = () => { clean(); resolve() }, closed = () => { clean(); reject(new Error(tr("联播连接已关闭"))) }, aborted = () => { clean(); reject(signal.reason) }
    channel.addEventListener('bufferedamountlow', ready, { once: true }); channel.addEventListener('close', closed, { once: true }); signal.addEventListener('abort', aborted, { once: true })
  })
}
export async function sendPackage(channel: RTCDataChannel, value: Package, signal: AbortSignal) {
  channel.bufferedAmountLowThreshold = 128 * 1024
  signal.throwIfAborted(); channel.send(JSON.stringify({ t: 'model', model: value.manifest }))
  for (const [, blob] of value.files) for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
    await drained(channel, signal)
    const bytes = await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer()
    signal.throwIfAborted(); channel.send(bytes)
  }
  signal.throwIfAborted(); channel.send(JSON.stringify({ t: 'model-end', id: value.manifest.id }))
}
export class PackageReceiver {
  manifest: ModelManifest | null = null
  files = new Map<string, Blob>()
  received = 0
  private index = 0
  private bytes = 0
  private parts: ArrayBuffer[] = []
  begin(raw: unknown) {
    if (this.manifest) throw new Error(tr("朋友已经分享了一个角色"))
    const manifest = readManifest(raw)
    if (!manifest) throw new Error(tr("收到的角色文件清单有问题"))
    this.manifest = manifest; this.files = new Map(); this.received = 0; this.index = 0; this.bytes = 0; this.parts = []
  }
  chunk(data: ArrayBuffer) {
    const file = this.manifest?.files[this.index]
    if (!file || !data.byteLength || data.byteLength > CHUNK_BYTES || this.bytes + data.byteLength > file.size) throw new Error(tr("收到的角色数据有问题"))
    this.parts.push(data); this.bytes += data.byteLength; this.received += data.byteLength
    if (this.bytes === file.size) { this.files.set(file.path, new Blob(this.parts, { type: file.type })); this.index++; this.bytes = 0; this.parts = [] }
  }
  end(id: unknown): Package {
    if (!this.manifest || id !== this.manifest.id || this.index !== this.manifest.files.length || this.bytes) throw new Error(tr("角色文件没有传完"))
    return { manifest: this.manifest, files: this.files }
  }
  get progress() { const total = this.manifest?.files.reduce((size, file) => size + file.size, 0) || 1; return this.received / total }
}
