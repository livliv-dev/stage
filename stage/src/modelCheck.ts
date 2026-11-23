// Is a file a character? What is imported is checked before it goes on the stage (library.ts): a LivLiv model package
// (.livliv or zip) must be a ZIP holding a model.json the player reads (its format, a version it knows), a folder's
// model.json the same, a VRM a binary glTF 2.0 (the player's own test, and its JSON part), a Mesh Avatar Studio avatar
// (.mavatar) a ZIP with its avatar.json and rig.json, PNGTuber pictures PNG, WebP or GIF. What isn't is refused in words
// in the add card, and nothing is placed or kept. A player's refusal reads the same way on the canvas (actors.ts),
// worded for the character's format. Pure: test/modelCheck.test.ts and test/mavatar.test.ts.
import { unzipSync } from 'fflate'
import { FORMAT, FORMAT_VERSION, LEGACY_FORMAT, LivLivError } from '@livliv-dev/player'
import { checkMavatar as checkMeshAvatar } from '@livliv-dev/player/mavatar'
import { tr } from './i18n'

/** what a character is made from (bodies/index.ts Format) */
export type ModelFormat = 'livliv' | 'vrm' | 'png' | 'mavatar'

/** why a character can't be shown, in words for its format: never the player's own (English) message for a file that
 *  isn't right */
export function refused(e: unknown, format: ModelFormat = 'livliv') {
  if (!(e instanceof LivLivError)) return (e as Error).message
  if (e.code === 'newer-format' || e.code === 'missing-feature') return tr("这个模型需要更新版本的 Stage")
  if (e.code === 'no-webgl') return tr("这台电脑无法启动 WebGL2")
  if (e.code === 'context-lost') return tr("图形设备已重置，请重新加载角色")
  if (e.code === 'too-large') return tr("这个模型超出了播放器的大小限制")
  if (e.code === 'unreachable' || e.code === 'http') return tr("模型读取失败，请检查文件或网络")
  if (e.code === 'not-a-model' || e.code === 'invalid' || e.code === 'missing-file') {
    if (format === 'vrm') return e.code === 'not-a-model' ? tr("这不是 VRM 文件") : tr("VRM 文件已损坏，读不出来：请重新导出")
    if (format === 'mavatar') return e.code === 'not-a-model' ? tr("这不是 .mavatar 文件") : tr(".mavatar 文件已损坏或不完整：请在 Mesh Avatar Studio 里重新导出")
    if (format === 'png') return e.code === 'missing-file' ? tr("立绘缺少图片：至少要闭嘴和张嘴两张") : tr("立绘图片读不出来：请换成 PNG、WebP 或 GIF")
    if (e.code === 'not-a-model') return tr("这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹")
    if (e.code === 'invalid') return tr("模型文件已损坏：请重新从 LivLiv 导出")
    return tr("模型包缺少文件：请重新从 LivLiv 导出")
  }
  return tr("模型文件有问题：") + e.message
}

const refuse = (code: ConstructorParameters<typeof LivLivError>[0], why: string, format: ModelFormat = 'livliv', cause?: unknown) => {
  const e = new LivLivError(code, why, { cause })
  return new Error(refused(e, format), { cause: e })
}
/** the package's own model.json among its paths, picked as the player picks it: the shortest path */
export const modelJsonOf = (paths: Iterable<string>) => [...paths].filter((p) => p === 'model.json' || p.endsWith('/model.json')).sort((a, b) => a.length - b.length)[0]

/** a .livliv or zip: a ZIP whose own model.json (modelJsonOf) the player reads. Only that file is unpacked; names inside may
 *  hold any character the player's own loading takes (#, ?, :) */
export async function checkPackage(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer()), names: string[] = []
  let entries: Record<string, Uint8Array>
  try { entries = unzipSync(bytes, { filter: (entry) => { names.push(entry.name); return entry.name === 'model.json' || entry.name.endsWith('/model.json') } }) }
  catch (e) { throw refuse('not-a-model', 'not a ZIP', 'livliv', e) }
  const path = modelJsonOf(names)
  if (!path) throw refuse('missing-file', 'no model.json among the files')
  await checkModel(new Blob([entries[path] as BlobPart]))
}

/** a model.json (a package's, or a folder's: library.ts finds it with modelJsonOf): a JSON object in this player's format (or
 *  the earlier one), at a version it knows */
export async function checkModel(json: Blob) {
  let model: unknown
  try { model = JSON.parse(await json.text()) } catch (e) { throw refuse('invalid', 'model.json is not JSON', 'livliv', e) }
  if (!model || typeof model !== 'object' || Array.isArray(model)) throw refuse('invalid', 'model.json is not an object')
  const { format, version } = model as { format?: unknown; version?: unknown }
  if (format !== undefined && format !== FORMAT && format !== LEGACY_FORMAT) throw refuse('not-a-model', `format ${String(format)}`)
  if (typeof version === 'number' && version > FORMAT_VERSION) throw refuse('newer-format', `version ${version}`)
}

const head = async (file: Blob, n: number) => new Uint8Array(await file.slice(0, n).arrayBuffer())
const matches = (bytes: Uint8Array, at: number, ...want: (number | null)[]) => want.every((b, i) => b === null || bytes[at + i] === b)
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** a VRM: a binary glTF 2.0 (it starts with "glTF", version 2) whose first chunk is its JSON, as VRM files are */
export async function checkVrm(file: Blob) {
  const bytes = await head(file, 20)
  const glb = bytes.length === 20 && matches(bytes, 0, ...ascii('glTF')) && new DataView(bytes.buffer).getUint32(4, true) === 2 && matches(bytes, 16, ...ascii('JSON'))
  if (!glb) throw new Error(tr("这不是 VRM 文件"))
}

/** a Mesh Avatar Studio avatar (.mavatar): checked as the player loads it, before anything is decoded (a ZIP of stored
 *  files, 256 MB at most, with its rig.json; its pictures measured and its rig's cost counted against the player's
 *  limits, so a file from anyone cannot freeze the page). Its name, from avatar.json, when it gives one */
export async function checkMavatar(file: Blob): Promise<string | null> {
  try { return (await checkMeshAvatar(file)).name || null } catch (e) { throw new Error(refused(e, 'mavatar'), { cause: e }) }
}

/** a PNGTuber's picture: PNG, WebP or GIF (what the picture slots take), by the file's first bytes */
export async function checkPicture(file: Blob, name: string) {
  const bytes = await head(file, 12)
  const png = matches(bytes, 0, 0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a)
  const webp = matches(bytes, 0, ...ascii('RIFF')) && matches(bytes, 8, ...ascii('WEBP'))
  const gif = matches(bytes, 0, ...ascii('GIF8'))
  if (!png && !webp && !gif) throw new Error(tr("{0} 不是 PNG、WebP 或 GIF 图片", name))
}
