import { tr } from './i18n'
// Where characters come from: the samples that come with Stage (LivLiv's showcase, samples.ts), one of LivLiv's by its
// id (the site's /api/models/<id> and /models/<id>/, here through the dev server's proxy), or a model package exported
// from LivLiv: its folder, or the zip as downloaded, kept in this browser afterwards (vault.ts) and placed again from
// there.
import { localModels, readExprModes, uid, type ExprMode, type ModelRef } from './scene'
import { cardOf, local, sampleUrl, SAMPLES, type Card as SampleCard } from './samples'
import { api, signedIn } from './livliv'
import { keep, type Kept } from './vault'
import type { PngSlot } from './bodies/png'

/** label: how the picker names it (when two share a name); live: how it goes live, as its page on the site sets it */
export type Pick = { name: string; persona: string; model: ModelRef; thumb?: string; label?: string; id?: string; card?: SampleCard; live?: Live }

type Card = { id: string; name: string; tagline?: string; tags?: string[]; v?: number; live?: unknown }

/** a character's live settings on the site (its meta.live, set on its page: the site's lib/live.ts), read only:
 *  face smoothing 0..1, how far the body's movement carries it 0..2, how much the voice moves the head 0..2, hops on
 *  syllables, seconds without a face before it dozes off (0 never), and how each expression's key shows it */
export type Live = { smooth?: number; follow?: number; talk?: number; bounce?: boolean; autoAway?: number; expr?: Record<string, ExprMode> }
export function readLive(value: unknown): Live | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const v = value as Record<string, unknown>, out: Live = {}
  const num = (k: 'smooth' | 'follow' | 'talk' | 'autoAway', max: number) => { const n = v[k]; if (typeof n === 'number' && Number.isFinite(n)) out[k] = Math.max(0, Math.min(max, n)) }
  num('smooth', 1); num('follow', 2); num('talk', 2); num('autoAway', 600)
  if (typeof v.bounce === 'boolean') out.bounce = v.bounce
  const expr = readExprModes(v.expr)
  if (expr) out.expr = expr
  return out
}

/** the live settings of a character the site has, by its card (a featured one, which comes with Stage, is otherwise
 *  never asked for); none when the site doesn't answer */
export async function liveOf(id: string): Promise<Live | undefined> {
  try {
    const r = await api(`/api/models/${encodeURIComponent(id)}`)
    return r.ok ? readLive((await r.json() as Card).live) : undefined
  } catch { return undefined }
}

const persona = (c: { tagline?: string; tags?: string[] }) => [c.tagline, c.tags?.length ? tr("标签：{0}", c.tags.join('、')) : ''].filter(Boolean).join('；')

const FEATURED: Record<string, number> = { d03ft: 0, k01: 1, v04: 2 }
/** Featured characters first; keep the rest of the bundled library available. */
export const samples = (): Pick[] => [...SAMPLES].sort((a, b) => (FEATURED[a.id] ?? 3) - (FEATURED[b.id] ?? 3)).map((s) => ({
  id: s.id, name: s.name, persona: s.persona || persona(s), card: cardOf(s), model: { type: 'url', url: sampleUrl(s.id) }, thumb: `${sampleUrl(s.id)}avatar.webp`,
  label: s.refined ? tr("{0} · 精修", s.name) : s.name,
}))

/** one character by id: a showcase one the gallery doesn't list, your own, or anyone's the site lets you use. Someone
 *  else's that you may only watch (the site promises its author that others can't stream or record it) is refused; a
 *  missing one may be your own private one while signed out */
export async function byId(id: string): Promise<Pick> {
  const r = await api(`/api/models/${encodeURIComponent(id)}`)
  if (!r.ok) throw new Error(r.status === 404 ? (signedIn() ? tr("没有 {0} 这个角色", id) : tr("找不到 {0}。如果是你自己的角色，登录后再打开", id)) : tr("拿不到 {0}（{1}）", id, r.status))
  const card = await r.json() as Card & { access?: { can_use?: boolean } }
  if (card.access?.can_use === false) throw new Error(tr("{0} 只有作者能在 Stage 里用", card.name || id))
  return fromCard(card)
}

/** the characters of the account signed in on livliv.ai (on livliv.ai/stage, by the site's cookie), newest first */
export async function mine(): Promise<Pick[]> {
  const r = await api('/api/models?mine=1')
  if (!r.ok) throw new Error(tr("拿不到你的角色（{0}）", r.status))
  return (await r.json() as Card[]).map(fromCard)
}

function fromCard(c: Card): Pick {
  const url = local(`/models/${c.id}/`), live = readLive(c.live)
  return { id: c.id, name: c.name, persona: persona(c), model: { type: 'url', url }, ...(live ? { live } : {}), thumb: url === `/models/${c.id}/` ? `${url}avatar.webp${c.v ? `?v=${c.v}` : ''}` : `${url}avatar.webp` }
}

/** a model package from files: a picked folder, or a .livliv (or .zip) file; a .vrm file is a VRM */
export async function fromFiles(files: FileList | File[]): Promise<Pick> {
  const list = [...files]
  if (list.length === 1 && /\.vrm$/i.test(list[0].name)) return fromVrm(list[0])
  const map = new Map<string, Blob>()
  if (list.length === 1 && /\.(livliv|zip)$/i.test(list[0].name)) {
    const file = list[0], key = uid(), name = file.name.replace(/\.(livliv|zip)$/i, '') || tr("角色")
    map.set(file.name, file)
    localModels.set(key, map)
    await keep({ key, name, at: Date.now() }, map)
    return { name, persona: '', model: { type: 'files', key } }
  } else {
    for (const f of list) map.set(f.webkitRelativePath || f.name, f)
  }
  // the shallowest model.json: the package's (a zip may hold one folder, or the files at its top)
  const json = [...map.keys()].filter((p) => p.split('/').pop() === 'model.json').sort((a, b) => a.split('/').length - b.split('/').length)[0]
  if (!json) throw new Error(tr("里面没有 model.json：选 LivLiv 导出的模型包（.livliv、zip 或文件夹）"))
  let name = tr("角色")
  try { name = JSON.parse(await map.get(json)!.text()).name || name } catch { /* the player says what is wrong */ }
  const key = uid()
  localModels.set(key, map)
  await keep({ key, name, at: Date.now() }, map)
  return { name, persona: '', model: { type: 'files', key } }
}

/** a VRM (VRoid and others): the file, kept in this browser like a package */
export async function fromVrm(file: File): Promise<Pick> {
  const name = file.name.replace(/\.vrm$/i, '') || 'VRM', key = uid(), map = new Map<string, Blob>([['model.vrm', file]])
  localModels.set(key, map)
  await keep({ key, name, at: Date.now(), format: 'vrm' }, map)
  return { name, persona: '', model: { type: 'files', key, format: 'vrm' } }
}

/** a PNGTuber: its pictures by slot (bodies/png.ts: closed and open needed, blink and blink-open if there) */
export async function fromPngs(pics: Partial<Record<PngSlot, File>>, name: string): Promise<Pick> {
  const key = uid(), map = new Map<string, Blob>([['name.txt', new Blob([name])]])
  for (const [slot, f] of Object.entries(pics)) if (f) map.set(`${slot}.png`, f)
  localModels.set(key, map)
  await keep({ key, name, at: Date.now(), format: 'png' }, map)
  return { name, persona: '', model: { type: 'files', key, format: 'png' } }
}

/** a package kept from an earlier import */
export const fromKept = (k: Kept): Pick => ({ name: k.name, persona: '', model: { type: 'files', key: k.key, ...(k.livlivId ? { livlivId: k.livlivId } : {}), ...(k.sampleId ? { sampleId: k.sampleId } : {}), ...(k.format && k.format !== 'livliv' ? { format: k.format } : {}) } })
