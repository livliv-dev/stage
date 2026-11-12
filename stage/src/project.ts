import { modelFiles } from '@livliv-dev/player'
import { archivePath, packFiles, PROJECT_LIMIT, unpackFiles } from './archive'
import { backgroundUrl, cacheAsset, imageBackground, inspectPicture } from './assets'
import { formatOf, sourceOf, type Format } from './bodies'
import { getAsset, importAssets, kept, type StoredAsset, type StoredModel } from './vault'
import { emptyScene, loadable, localModels, persistentScene, uid, type Scene } from './scene'
import { shareCast, type Project } from './shots'
import { modelId } from './livliv'
import { sampleAt } from './samples'
import { tr } from './i18n'
import { readAudienceRules } from './triggers'
import { readAttachment } from './attachments'

type Model = { id: string; name: string; format: Format; files: { path: string; entry: string; type: string }[] }
type Picture = { id: string; name: string; type: string; entry: string }
type Manifest = Project & { format: 'livliv-stage-project'; version: 1; models: Model[]; pictures: Picture[] }
const bad = () => new Error(tr('项目内容无效或缺少素材'))
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max = 160): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
const formats: Format[] = ['livliv', 'vrm', 'png']
function plainBackground(value: string) {
  if (value === 'transparent' || /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value)) return true
  if (!/^(?:linear|radial)-gradient\([a-z\d\s#%.,+\-()/]*\)$/i.test(value)) return false
  if ([...value.matchAll(/([a-z-]+)\s*\(/gi)].some((m) => !['linear-gradient', 'radial-gradient', 'rgb', 'rgba', 'hsl', 'hsla'].includes(m[1].toLowerCase()))) return false
  let depth = 0
  for (let n = 0; n < value.length; n++) {
    if (value[n] === '(') depth++
    if (value[n] === ')' && (--depth < 0 || (depth === 0 && n !== value.length - 1))) return false
  }
  return depth === 0
}

/** where an old project file's picture may come from. Anything else (a relative address reaches the app's own routes,
 *  plain http the local network) is dropped */
function pictureUrl(url: string) {
  try { return ['picture:', 'blob:', 'https:'].includes(new URL(url).protocol) } catch { return false }
}

async function readJSON(file: Blob): Promise<unknown> {
  try { return JSON.parse(await file.text()) }
  catch (error) { throw new Error(tr('这个文件读不出来'), { cause: error }) }
}


export async function projectFile(project: Project, signal?: AbortSignal, progress?: (value: number) => void): Promise<Blob> {
  const scenes = project.scenes.map((scene) => structuredClone(persistentScene(scene))), archive = new Map<string, Blob>()
  const models: Model[] = [], pictures: Picture[] = [], modelKeys = new Map<string, string>(), pictureKeys = new Map<string, string>()
  let bytes = 0
  const add = (name: string, blob: Blob) => { bytes += blob.size; if (bytes > PROJECT_LIMIT) throw new Error(tr('项目超过 512 MB 或文件数量过多')); archive.set(name, blob) }
  const picture = async (key: string | undefined, url: string, name: string) => {
    const source = key ? 'asset:' + key : url
    let id = pictureKeys.get(source)
    if (id) return id
    signal?.throwIfAborted()
    let blob: Blob
    if (key) { const asset = await getAsset(key); if (!asset) throw bad(); blob = asset.blob; name = asset.name }
    else {
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(tr('图片读取失败：{0}', name))
      const reader = response.body?.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []
      if (!reader) blob = await response.blob()
      else {
        let size = 0
        try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 64 * 2 ** 20) throw bad(); signal?.throwIfAborted(); chunks.push(value) } }
        catch (error) { await reader.cancel(error); throw error }
        blob = new Blob(chunks, { type: response.headers.get('content-type') ?? '' })
      }
    }
    if (blob.size > 64 * 2 ** 20) throw bad()
    id = 'p' + pictures.length
    const entry = 'pictures/' + id
    pictures.push({ id, name, type: blob.type || 'application/octet-stream', entry })
    pictureKeys.set(source, id); add(entry, blob); return id
  }
  for (const scene of scenes) {
    signal?.throwIfAborted()
    const bg = backgroundUrl(scene.background)
    if (scene.backgroundAsset || bg) {
      const id = await picture(scene.backgroundAsset, bg ?? '', tr('背景'))
      scene.backgroundAsset = id; scene.background = imageBackground('picture:' + id)
    } else if (!plainBackground(scene.background)) throw bad()
    for (const item of scene.items) {
      if (item.kind === 'character') {
        const signature = JSON.stringify(item.model)
        let id = modelKeys.get(signature)
        if (!id) {
          id = 'm' + models.length
          const format = formatOf(item.model), source = await sourceOf(item.model)
          const files = format === 'livliv' ? await modelFiles(source, { signal }) : source
          if (typeof files === 'string') throw bad()
          const entries: Model['files'] = []
          for (const [path, blob] of files) {
            if (!archivePath(path)) throw bad()
            const entry = 'models/' + id + '/' + path
            entries.push({ path, entry, type: blob.type })
            add(entry, blob)
          }
          models.push({ id, name: item.name, format, files: entries }); modelKeys.set(signature, id)
        }
        const sampleId = item.model.type === 'files' ? item.model.sampleId : sampleAt(item.model.url)?.id
        item.model = { type: 'files', key: id, format: formatOf(item.model), ...(modelId(item) ? { livlivId: modelId(item)! } : {}), ...(sampleId ? { sampleId } : {}) }
      } else if (item.kind === 'image') {
        const id = await picture(item.asset, item.url, item.name)
        item.asset = id; item.url = 'picture:' + id
      }
    }
  }
  signal?.throwIfAborted()
  const data: Manifest = { format: 'livliv-stage-project', version: 1, active: project.active, scenes, models, pictures }
  archive.set('project.json', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  return packFiles(archive, signal, progress)
}

function validateAttachments(value: Record<string, unknown>) {
  const items = Array.isArray(value.items) ? value.items : []
  for (const item of items) if (record(item) && item.kind === 'image') {
    if (item.rotation !== undefined && (typeof item.rotation !== 'number' || !Number.isFinite(item.rotation) || Math.abs(item.rotation) > 1e6)) throw bad()
    if (item.flip !== undefined && typeof item.flip !== 'boolean') throw bad()
    if (item.attachment !== undefined) {
      const attachment = readAttachment(item.attachment)
      if (!attachment || !items.some((c) => record(c) && c.kind === 'character' && c.id === attachment.of)) throw bad()
    }
  }
}

function validateAudience(value: Record<string, unknown>) {
  if (value.talk === undefined) return
  if (!record(value.talk) || (value.talk.triggersOn !== undefined && typeof value.talk.triggersOn !== 'boolean')) throw bad()
  const rules = readAudienceRules(value.talk.triggers ?? []), items = Array.isArray(value.items) ? value.items : []
  if (!rules || rules.some((r) => !items.some((item: unknown) => record(item) && item.kind === 'character' && item.id === r.character && !item.remote))) throw bad()
}

function sceneFrom(value: unknown, packed: boolean): Scene {
  if (!record(value) || !text(value.id) || (typeof value.name !== 'string' || value.name.length > 256) || !Number.isInteger(value.width) || !Number.isInteger(value.height) || (value.width as number) < 64 || (value.height as number) < 64 || (value.width as number) > 8192 || (value.height as number) > 8192 || !Array.isArray(value.items) || typeof value.background !== 'string') throw bad()
  const ids = new Set<string>()
  for (const item of value.items) {
    if (!record(item) || !text(item.id) || ids.has(item.id)) throw bad()
    ids.add(item.id)
    for (const name of ['x', 'y', 'w', 'h']) if (typeof item[name] !== 'number' || !Number.isFinite(item[name]) || Math.abs(item[name] as number) > 1e6 || ((name === 'w' || name === 'h') && ((item[name] as number) <= 0 || (item[name] as number) > 16384))) throw bad()
    if (item.kind === 'character') {
      if ((typeof item.name !== 'string' || item.name.length > 256) || typeof item.persona !== 'string' || !record(item.model) || !record(item.voice)) throw bad()
      const ref = item.model
      if (packed ? ref.type !== 'files' || !text(ref.key) || !formats.includes(ref.format as Format) : ref.type === 'files' ? !text(ref.key) : ref.type !== 'url' || !text(ref.url, 8192)) throw bad()
      if (ref.livlivId !== undefined && !text(ref.livlivId)) throw bad()
      if (ref.sampleId !== undefined && !text(ref.sampleId)) throw bad()
      if (item.remote || !['auto', 'face', 'replay', 'mic', 'pointer', 'gamepad', 'network'].includes(String(item.driver)) || !['ai', 'me', 'none'].includes(String(item.lines))) throw bad()
      for (const field of ['smooth', 'micGain', 'chatty', 'talk']) if (typeof item[field] !== 'number' || !Number.isFinite(item[field])) throw bad()
      for (const field of ['mirror', 'shadow', 'muted', 'readAloud']) if (typeof item[field] !== 'boolean') throw bad()
      if (!['auto', 'livliv', 'api', 'system'].includes(String(item.voice.source)) || typeof item.voice.name !== 'string' || typeof item.voice.api !== 'string' || typeof item.voice.livliv !== 'string' || !Number.isFinite(item.voice.pitch) || !Number.isFinite(item.voice.rate)) throw bad()
    } else if (item.kind === 'image') { if (typeof item.url !== 'string' || typeof item.name !== 'string' || (packed && !text(item.asset))) throw bad() }
    else if (item.kind === 'text') { if (typeof item.text !== 'string' || !Number.isFinite(item.size)) throw bad() }
    else if (item.kind === 'subtitle') { if (typeof item.of !== 'string' || !Number.isFinite(item.size)) throw bad() }
    else throw bad()
  }
  validateAttachments(value)
  validateAudience(value)
  const scene = loadable(value as Partial<Scene>, false)
  if (!scene) throw bad()
  return scene
}

export async function openProject(file: File, signal?: AbortSignal): Promise<{ project: Project; missing: number; dropped: number }> {
  if (file.size > PROJECT_LIMIT) throw new Error(tr('项目超过 512 MB 或文件数量过多'))
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    if (file.size > 8 * 2 ** 20) throw bad()
    const raw = await readJSON(file)
    if (!record(raw) || raw.format !== 'livliv-stage' || !record(raw.scene)) throw new Error(tr('这不是 LivLiv Stage 的项目文件'))
    validateAttachments(raw.scene)
    validateAudience(raw.scene)
    const legacy = loadable(raw.scene as Partial<Scene>, false)
    if (!legacy) throw bad()
    const scene = sceneFrom(legacy, false), here = new Set((await kept()).map((k) => k.key))
    const items = scene.items.filter((i) => i.kind !== 'image' || pictureUrl(i.url)), bg = backgroundUrl(scene.background)
    const background = plainBackground(scene.background) || (bg && pictureUrl(bg) && scene.background === imageBackground(bg)) ? scene.background : emptyScene().background
    const left = [...scene.items.filter((i) => !items.includes(i)).map((i) => i.kind === 'image' && i.url), ...(background === scene.background ? [] : [scene.background])]
    if (left.length) console.warn('Pictures left out of the opened file:', left)
    signal?.throwIfAborted()
    return { project: { active: scene.id, scenes: [{ ...scene, background, items }] }, missing: scene.items.filter((i) => i.kind === 'character' && i.model.type === 'files' && !here.has(i.model.key)).length, dropped: left.length }
  }
  const archive = await unpackFiles(file, signal), manifest = archive.get('project.json')
  if (!manifest || manifest.size > 8 * 2 ** 20) throw bad()
  const raw = await readJSON(manifest)
  if (!record(raw) || raw.format !== 'livliv-stage-project' || raw.version !== 1 || !text(raw.active) || !Array.isArray(raw.scenes) || !raw.scenes.length || !Array.isArray(raw.models) || !Array.isArray(raw.pictures)) throw bad()
  const scenes = raw.scenes.map((s) => sceneFrom(s, true)), ids = new Set(scenes.map((s) => s.id))
  if (ids.size !== scenes.length || !ids.has(raw.active) || scenes.some((s) => s.width !== scenes[0].width || s.height !== scenes[0].height)) throw bad()
  const models: StoredModel[] = [], assets: StoredAsset[] = [], modelKeys = new Map<string, { key: string; format: Format }>(), pictureKeys = new Map<string, string>(), used = new Set(['project.json'])
  for (const model of raw.models) {
    if (!record(model) || !text(model.id) || modelKeys.has(model.id) || (typeof model.name !== 'string' || model.name.length > 256) || !formats.includes(model.format as Format) || !Array.isArray(model.files) || !model.files.length) throw bad()
    const entries: [string, Blob][] = [], paths = new Set<string>(); let bytes = 0
    for (const f of model.files) {
      if (!record(f) || !text(f.path, 1024) || !archivePath(f.path) || !text(f.entry, 1200) || f.entry !== 'models/' + model.id + '/' + f.path || typeof f.type !== 'string' || !archive.has(f.entry) || used.has(f.entry) || paths.has(f.path)) throw bad()
      const blob = archive.get(f.entry)!.slice(0, undefined, f.type)
      bytes += blob.size; if (bytes > 256 * 2 ** 20) throw bad()
      entries.push([f.path, blob]); paths.add(f.path); used.add(f.entry)
    }
    const key = uid(), format = model.format as Format
    models.push({ key, name: model.name, format, at: Date.now(), files: entries }); modelKeys.set(model.id, { key, format })
  }
  for (const picture of raw.pictures) {
    if (!record(picture) || !text(picture.id) || pictureKeys.has(picture.id) || !text(picture.name, 1024) || typeof picture.type !== 'string' || picture.entry !== 'pictures/' + picture.id || !archive.has(picture.entry) || used.has(picture.entry)) throw bad()
    const blob = archive.get(picture.entry)!.slice(0, undefined, picture.type)
    if (blob.size > 64 * 2 ** 20) throw bad()
    const key = uid(); assets.push({ key, name: picture.name, blob }); pictureKeys.set(picture.id, key); used.add(picture.entry)
  }
  if (used.size !== archive.size) throw bad()
  const kinds = new Map<string, string>()
  for (const scene of scenes) {
    if (scene.backgroundAsset) {
      const key = pictureKeys.get(scene.backgroundAsset)
      if (!key) throw bad()
      scene.backgroundAsset = key; scene.background = imageBackground('picture:' + key)
    } else if (!plainBackground(scene.background)) throw bad()
    for (const item of scene.items) {
      if (kinds.has(item.id) && kinds.get(item.id) !== item.kind) throw bad()
      kinds.set(item.id, item.kind)
      if (item.kind === 'character') {
        const model = item.model.type === 'files' && modelKeys.get(item.model.key)
        if (!model || item.model.type !== 'files' || model.format !== item.model.format) throw bad()
        item.model = { ...item.model, key: model.key }
        const stored = models.find((m) => m.key === model.key)!
        stored.livlivId = item.model.livlivId; stored.sampleId = item.model.sampleId
      } else if (item.kind === 'image') {
        const key = pictureKeys.get(item.asset!)
        if (!key) throw bad()
        item.asset = key; item.url = 'picture:' + key
      }
    }
  }
  for (const asset of assets) { signal?.throwIfAborted(); await inspectPicture(asset.blob) }
  signal?.throwIfAborted()
  await importAssets(models, assets, signal)
  for (const model of models) localModels.set(model.key, new Map(model.files))
  const imageUrls = new Map(assets.map((asset) => [asset.key, cacheAsset(asset)]))
  for (const scene of scenes) {
    if (scene.backgroundAsset) scene.background = imageBackground(imageUrls.get(scene.backgroundAsset)!)
    for (const item of scene.items) if (item.kind === 'image' && item.asset) item.url = imageUrls.get(item.asset)!
  }
  const active = scenes.find((s) => s.id === raw.active)!
  return { project: { active: active.id, scenes: shareCast(scenes, active) }, missing: 0, dropped: 0 }
}

export function downloadProject(blob: Blob, name: string) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob)
  link.download = (name || tr('舞台')).replace(/[\\/:*?"<>|]/g, '_') + '.livstage'
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 10000)
}
