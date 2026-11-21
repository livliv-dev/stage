import { tr } from './i18n'
// Ready-made scenes, built from the sample characters that come with Stage.
import { samples, type Pick } from './library'
import { controlSettings } from './workflow'
import { bubbleFor, captionBar, emptyScene, newCharacter, type CharacterItem, type Item, type Scene, type StartKind, type Talk } from './scene'

/** start: what the console's main button starts on the stage the template makes (none without an AI character) */
export const TEMPLATES = [
  { id: 'solo', label: '面捕出镜', hint: '用自己的表情和声音直播' },
  { id: 'ai', label: 'AI 来开播', hint: '让角色说话、回应观众', start: 'live' },
  { id: 'duo', label: '双人聊天', hint: '两个 AI 角色自由聊，各自的字幕气泡', start: 'conversation' },
  { id: 'cohost', label: '你和 AI 搭档', hint: '自己出镜，让 AI 接着聊', start: 'chat' },
  { id: 'trio', label: '三人闲聊', hint: '一个主持人带两个嘉宾', start: 'conversation' },
  { id: 'blank', label: '空白舞台', hint: '什么都没有' },
] as const satisfies readonly { id: string; label: string; hint: string; start?: StartKind }[]
export type TemplateId = (typeof TEMPLATES)[number]['id']
const withStart = (talk: Talk, id: TemplateId): Talk => {
  const start = (TEMPLATES.find((t) => t.id === id) as { start?: StartKind } | undefined)?.start
  return start ? { ...talk, start } : talk
}

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
    Object.assign(c, controlSettings(id === 'solo' ? 'me' : 'ai'))
    return { ...s, name: id === 'solo' ? tr("面捕出镜") : tr("AI 来开播"), background: 'transparent', items: [c, captionBar(s)], talk: withStart(s.talk, id) }
  }
  spots.forEach((at, i) => {
    const p: Pick = list[i]
    const c: CharacterItem = newCharacter({ ...s, items }, p.name, p.model, p.persona, at, p.card)
    // you: your face moves it and your voice is your own; the console line shows as its subtitle
    if (id === 'cohost' && i === 0) Object.assign(c, { driver: 'face', lines: 'me', readAloud: false })
    if (id === 'trio') { c.h = Math.round(s.height * 0.7); c.w = Math.round(c.h * 2 / 3); c.x = Math.round(at * s.width - c.w / 2); c.y = s.height - c.h + Math.round(s.height * 0.022) }
    items.push(c)
    if (id !== 'cohost') items.push(bubbleFor(c))
  })
  if (id === 'cohost') items.push(captionBar(s))
  const host = id === 'trio' ? items.filter((i) => i.kind === 'character')[1].id : null  // the one in the middle
  return {
    ...s, name: tr(TEMPLATES.find((t) => t.id === id)!.label), items, topic: id === 'cohost' ? tr("今天玩点什么") : tr("周末去哪儿玩"),
    talk: withStart({ ...s.talk, order: id === 'trio' ? 'host' : 'free', host }, id),
  }
}
