import { tr } from './i18n'
// Ready-made scenes, built from the sample characters that come with Stage, and scenes as files (save / open).
import { samples, type Pick } from './library'
import { kept } from './vault'
import { controlSettings } from './workflow'
import { bubbleFor, captionBar, emptyScene, loadable, newCharacter, persistentScene, type CharacterItem, type Item, type Scene } from './scene'

export const TEMPLATES = [
  { id: 'solo', label: '面捕出镜', hint: '用自己的表情和声音直播' },
  { id: 'ai', label: 'AI 主播', hint: '让角色说话、回应观众' },
  { id: 'duo', label: '双人对谈', hint: '两个 AI 角色自由聊，各自的字幕气泡' },
  { id: 'cohost', label: '你和 AI 搭档', hint: '自己出镜，让 AI 接着聊' },
  { id: 'trio', label: '三人闲聊', hint: '一个主持人带两个嘉宾' },
  { id: 'blank', label: '空白舞台', hint: '什么都没有' },
] as const
export type TemplateId = (typeof TEMPLATES)[number]['id']

export async function buildTemplate(id: TemplateId): Promise<Scene> {
  const s = emptyScene()
  if (id === 'blank') return s
  // Nana uses the refined model and hosts the three-person scene in the middle.
  const all = samples(), want = id === 'trio' ? ['k01', 'd03ft', 'v04'] : id === 'cohost' ? ['d03ft', 'v04'] : ['k01', 'v04']
  const list = want.map((w, i) => all.find((p) => p.id === w) ?? all[i]).filter(Boolean)
  const spots = id === 'trio' ? [0.2, 0.5, 0.8] : [0.28, 0.72]
  if (list.length < spots.length) throw new Error(tr("精选角色不够 {0} 个", spots.length))
  const items: Item[] = []
  if (id === 'solo' || id === 'ai') {
    const p = all.find((p) => p.id === 'd03ft') ?? all[0]
    const c = newCharacter(s, p.name, p.model, p.persona, 0.5, p.card)
    Object.assign(c, controlSettings(id === 'solo' ? 'human' : 'ai'))
    return { ...s, name: id === 'solo' ? tr("面捕出镜") : tr("AI 主播"), background: 'transparent', items: [c, captionBar(s)] }
  }
  spots.forEach((at, i) => {
    const p: Pick = list[i]
    const c: CharacterItem = newCharacter({ ...s, items }, p.name, p.model, p.persona, at, p.card)
    // you: your face moves it and your voice is your own; the console line shows as its subtitle
    if (id === 'cohost' && i === 0) Object.assign(c, { driver: 'face', lines: 'me', readAloud: false })
    if (id === 'trio') { c.h = Math.round(s.height * 0.7); c.w = Math.round(c.h * 2 / 3); c.x = Math.round(at * s.width - c.w / 2); c.y = s.height - c.h }
    items.push(c)
    if (id !== 'cohost') items.push(bubbleFor(c))
  })
  if (id === 'cohost') items.push(captionBar(s))
  const host = id === 'trio' ? items.filter((i) => i.kind === 'character')[1].id : null  // the one in the middle
  return {
    ...s, name: tr(TEMPLATES.find((t) => t.id === id)!.label), items, topic: id === 'cohost' ? tr("今天玩点什么") : tr("周末去哪儿玩"),
    talk: { ...s.talk, order: id === 'trio' ? 'host' : 'free', host },
  }
}

const FORMAT = 'livliv-stage'

export function saveFile(s: Scene) {
  const blob = new Blob([JSON.stringify({ format: FORMAT, version: 1, scene: persistentScene(s) }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(s.name || tr("舞台")).replace(/[\\/:*?"<>|]/g, '_')}.livstage.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

/** a scene file; missing: characters imported from files that this browser doesn't keep (they need importing here) */
export async function openFile(f: File): Promise<{ scene: Scene; missing: number }> {
  let data: { format?: string; scene?: Partial<Scene> }
  try { data = JSON.parse(await f.text()) } catch { throw new Error(tr("这个文件读不出来")) }
  if (data.format !== FORMAT) throw new Error(tr("这不是 LivLiv Stage 的场景文件"))
  const scene = loadable(data.scene ?? null, false)
  if (!scene) throw new Error(tr("场景文件里没有内容"))
  const here = new Set((await kept()).map((k) => k.key))
  return { scene, missing: scene.items.filter((i) => i.kind === 'character' && i.model.type === 'files' && !here.has(i.model.key)).length }
}

/** characters imported from files: the scene file only names them (their files stay in this browser) */
export const unsaved = (s: Scene) => s.items.filter((i) => i.kind === 'character' && !i.remote && i.model.type === 'files').length
