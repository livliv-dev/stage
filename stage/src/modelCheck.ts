// Is a file a character? What is imported is checked before it goes on the stage (library.ts): a LivLiv model package
// (.livliv or zip, or a folder) opens as the player opens it (its modelFiles) and has a model.json the player reads (its
// format, a version it knows), a VRM must be a binary glTF (the player's own test), PNGTuber pictures must be PNG, WebP
// or GIF. What isn't is refused in words in the add card, and nothing is placed or kept. A player's refusal reads the
// same way on the canvas (actors.ts). Pure: test/modelCheck.test.ts.
import { FORMAT, FORMAT_VERSION, LEGACY_FORMAT, LivLivError, modelFiles, type ModelSource } from '@livliv-dev/player'
import { tr } from './i18n'

/** why a character can't be shown, in words: never the player's own (English) message for a file that isn't right */
export function refused(e: unknown) {
  if (!(e instanceof LivLivError)) return (e as Error).message
  if (e.code === 'newer-format' || e.code === 'missing-feature') return tr("这个模型需要更新版本的 Stage")
  if (e.code === 'no-webgl') return tr("这台电脑无法启动 WebGL2")
  if (e.code === 'context-lost') return tr("图形设备已重置，请重新加载角色")
  if (e.code === 'too-large') return tr("这个模型超出了播放器的大小限制")
  if (e.code === 'unreachable' || e.code === 'http') return tr("模型读取失败，请检查文件或网络")
  if (e.code === 'not-a-model') return tr("这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹")
  if (e.code === 'invalid') return tr("模型文件已损坏：请重新从 LivLiv 导出")
  if (e.code === 'missing-file') return tr("模型包缺少文件：请重新从 LivLiv 导出")
  return tr("模型文件有问题：") + e.message
}

const refuse = (code: ConstructorParameters<typeof LivLivError>[0], why: string, cause?: unknown) => {
  const e = new LivLivError(code, why, { cause })
  return new Error(refused(e), { cause: e })
}

/** a model package the player can read, or the reason it can't, in words: it opens (a ZIP, or the files of a folder),
 *  its shallowest model.json is a JSON object in this player's format (or the earlier one), at a version it knows */
export async function checkPackage(source: ModelSource) {
  let files: Map<string, Blob>
  try { files = await modelFiles(source) } catch (e) { throw new Error(refused(e), { cause: e }) }
  const path = [...files.keys()].filter((p) => p === 'model.json' || p.endsWith('/model.json')).sort((a, b) => a.length - b.length)[0]
  if (!path) throw refuse('missing-file', 'no model.json among the files')
  let model: unknown
  try { model = JSON.parse(await files.get(path)!.text()) } catch (e) { throw refuse('invalid', 'model.json is not JSON', e) }
  if (!model || typeof model !== 'object' || Array.isArray(model)) throw refuse('invalid', 'model.json is not an object')
  const { format, version } = model as { format?: unknown; version?: unknown }
  if (format !== undefined && format !== FORMAT && format !== LEGACY_FORMAT) throw refuse('not-a-model', `format ${String(format)}`)
  if (typeof version === 'number' && version > FORMAT_VERSION) throw refuse('newer-format', `version ${version}`)
}

const starts = async (file: Blob, ...bytes: (number | null)[]) => {
  const head = new Uint8Array(await file.slice(0, bytes.length).arrayBuffer())
  return head.length === bytes.length && bytes.every((b, i) => b === null || head[i] === b)
}
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** a VRM: a binary glTF (it starts with "glTF"), as the player tells one */
export async function checkVrm(file: Blob) {
  if (!(await starts(file, ...ascii('glTF')))) throw new Error(tr("这不是 VRM 文件"))
}

/** a PNGTuber's picture: PNG, WebP or GIF (what the picture slots take), by the file's first bytes */
export async function checkPicture(file: Blob, name: string) {
  const png = await starts(file, 0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a)
  const webp = await starts(file, ...ascii('RIFF'), null, null, null, null, ...ascii('WEBP'))
  const gif = await starts(file, ...ascii('GIF8'))
  if (!png && !webp && !gif) throw new Error(tr("{0} 不是 PNG、WebP 或 GIF 图片", name))
}
