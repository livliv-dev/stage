import { tr } from './i18n'
// The scene: one canvas (the stage) and what is on it. Every item has a place on the stage (stage pixels, top left
// origin). A character has two separate choices: what moves it (its driver: by itself, a face, the microphone, the
// mouse) and who gives it its lines (AI, you, or nobody). Kept in a small store the components read with useScene(),
// with undo / redo; saved in localStorage; imported model files are kept in IndexedDB.
import { shareCast, type Project } from './shots'
import { readAttachment, type PropAttachment } from './attachments'
import { readAudienceRules, type AudienceRule } from './triggers'
import { useSyncExternalStore } from 'react'
import { defaultTuning, readTuning, type CharacterTuning } from './tuning'
import { isOutput, onMsg, outputOpen, post } from './link'
import { cardOf, local, sampleAt, type Card } from './samples'

/** what moves a character. auto: by itself (breathes, blinks, looks around, looks at whoever speaks); face: a webcam
 *  (replay: the built-in face replay, for trying without one); mic: the microphone moves the mouth; pointer: it
 *  looks at the mouse */
export type DriverKind = 'auto' | 'face' | 'replay' | 'mic' | 'pointer' | 'gamepad' | 'network'
export const DRIVERS: { kind: DriverKind; label: string; hint: string }[] = [
  { kind: 'auto', label: '自动', hint: '自己呼吸、眨眼、看来看去，看着说话的人' },
  { kind: 'face', label: '面捕', hint: '摄像头里的你' },
  { kind: 'replay', label: '面捕回放', hint: '内置的一段面捕，没有摄像头时试用' },
  { kind: 'mic', label: '麦克风', hint: '你说话时张嘴' },
  { kind: 'pointer', label: '跟随鼠标', hint: '头和眼睛跟着鼠标看' },
  { kind: 'network', label: '手机 / OSC', hint: '接收手机或追踪软件的动作' },
  { kind: 'gamepad', label: '手柄', hint: '摇杆控制头部，按键触发表情和动作' },
]
/** who gives a character its lines: AI thinks them up; you type them (the character says them in its own voice,
 *  unless you speak for real); none: it only listens */
export type LinesBy = 'ai' | 'me' | 'none'
export const LINES: { id: LinesBy; label: string; hint: string }[] = [
  { id: 'ai', label: 'AI', hint: 'AI 按人设想台词，自己接话' },
  { id: 'me', label: '我来说', hint: '你在底部控制台替它说话' },
  { id: 'none', label: '不说话', hint: '只在旁边听、做反应' },
]

/** how much a character moves by itself (runtime/idle.ts IdleStyle). natural is the home page's calmer idle: the head
 *  turns about 7° toward what it looks at, the eyes the rest of the way */
export type Motion = 'calm' | 'natural' | 'lively'
// 'attend' (看你): the eyes say where it looks, the head turns a little against the shoulders (soft limit
// 13°), as everywhere on the site; `look` scales the head's share (listeners: about 4 / 5.5 / 8° toward the speaker,
// the eyes the rest). No idle smile: AI lines bring their own expressions
export const MOTIONS: { id: Motion; label: string }[] = [{ id: 'calm', label: '安静' }, { id: 'natural', label: '自然' }, { id: 'lively', label: '活泼' }]
/** where a character looks: at whoever speaks (and, speaking, at whom it talks to), into the camera, or around */
export type Gaze = 'people' | 'camera' | 'free'
export const GAZES: { id: Gaze; label: string }[] = [{ id: 'people', label: '看说话的人' }, { id: 'camera', label: '看镜头' }, { id: 'free', label: '随意' }]
/** how long an AI character's lines run */
export type Length = 'short' | 'normal' | 'long'
export const LENGTHS: { id: Length; label: string; chars: number }[] = [{ id: 'short', label: '话少', chars: 40 }, { id: 'normal', label: '适中', chars: 60 }, { id: 'long', label: '话多', chars: 100 }]

/** a LivLiv model by its address, or files imported (kept in this browser, vault.ts): a LivLiv package, a VRM, a
 *  PNGTuber's pictures (bodies/) */
export type ModelRef = { type: 'url'; url: string } | { type: 'files'; key: string; format?: 'livliv' | 'vrm' | 'png'; livlivId?: string; sampleId?: string }
/** source: where its voice comes from: 'auto' (your speech API, else its LivLiv voice, else the system's), its
 *  LivLiv voice (`livliv`: one of the site's voices by id, '' its own; needs a LivLiv account), your own API (`api`: a
 *  voice name of it, '' its default; voiceApi.ts), or the system's (name, pitch and rate). One that can't be had falls
 *  back the same way (voiceRoute) */
export type Voice = { source: 'auto' | 'livliv' | 'api' | 'system'; livliv: string; api: string; name: string; pitch: number; rate: number }

/** hidden: off the stage; devices and conversation keep running. locked: can't be moved or resized */
type Box = { id: string; x: number; y: number; w: number; h: number; hidden?: boolean; locked?: boolean }
export type CharacterItem = Box & {
  kind: 'character'; name: string; model: ModelRef; persona: string; voice: Voice
  /** from a sample's card: how it talks, example lines (the prompt's, Chinese only), a line about it for the others'
   *  prompts, the name the card was written with (a rename shows through), its gender for picking a voice */
  style?: string; examples?: string[]; tagline?: string; cardName?: string; gender?: 'f' | 'm'
  driver: DriverKind
  lines: LinesBy
  /** a line you type is said in the character's voice (off: you speak for real, it only shows the words) */
  readAloud: boolean
  /** how often AI picks it to speak (free order): 0.3 .. 2 */
  chatty: number
  length: Length
  /** the colour of its name in the subtitles */
  color: string
  motion: Motion
  /** how much the head moves with its voice, 0..1.5 (TalkMotion amount) */
  talk: number
  gaze: Gaze
  /** drawn facing the other way */
  mirror: boolean
  /** a soft shadow behind it */
  shadow: boolean
  /** face tracking smoothing, 0..1; microphone sensitivity, 0.3..3 */
  smooth: number
  micGain: number
  muted: boolean
  tuning: CharacterTuning
  remote?: { peer: string; person: string }
  /** the face driver also opens the mouth from the microphone (the site's live window had both on) */
  faceMic?: boolean
  /** seconds without a face before it dozes off by itself (away), 0 never; unset: AUTO_AWAY */
  autoAway?: number
  /** how its number keys show each expression, by id (live.ts); one not here goes on and off */
  exprModes?: Record<string, ExprMode>
}
/** how a number key shows an expression live: on and off (toggle), while held (hold), or for `secs` seconds (timed).
 *  The site sets these on a character's 表情 tab (meta.live.expr) */
export type ExprMode = { mode: 'toggle' | 'hold' | 'timed'; secs?: number }
/** the site's default: a minute without a face */
export const AUTO_AWAY = 60

/** expression modes as saved, or as a site's card has them: the known modes only, timed 1..30 s (3 unless said) */
export function readExprModes(value: unknown): Record<string, ExprMode> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const out: Record<string, ExprMode> = {}
  for (const [id, m] of Object.entries(value as Record<string, unknown>).slice(0, 256)) {
    const mode = (m as ExprMode | null)?.mode, secs = Number((m as ExprMode | null)?.secs)
    if (!id || id.length > 64 || id === '__proto__' || (mode !== 'toggle' && mode !== 'hold' && mode !== 'timed')) continue
    out[id] = mode === 'timed' ? { mode, secs: Number.isFinite(secs) ? Math.max(1, Math.min(30, secs)) : 3 } : { mode }
  }
  return Object.keys(out).length ? out : undefined
}
export type TextItem = Box & { kind: 'text'; text: string; size: number; color: string; bg: string }
export type ImageItem = Box & { kind: 'image'; url: string; name: string; asset?: string; rotation?: number; flip?: boolean; attachment?: PropAttachment }
/** what a character says, where it is put: `of` one character's id, or 'all' (whoever speaks). bubble: a speech
 *  bubble; bar: a caption strip; pop: variety-show lettering; plain: words with a soft shadow */
export type SubStyle = 'bubble' | 'bar' | 'pop' | 'plain'
export const SUB_STYLES: { id: SubStyle; label: string }[] = [{ id: 'bubble', label: '气泡' }, { id: 'bar', label: '字幕条' }, { id: 'pop', label: '综艺' }, { id: 'plain', label: '极简' }]
export type SubtitleItem = Box & {
  kind: 'subtitle'; of: string; style: SubStyle; size: number
  /** the speaker's name before the words */
  showName: boolean
  /** the words appear one by one, at the voice's pace */
  typewriter: boolean
  /** seconds a line stays after it was said */
  linger: number
}
export type Item = CharacterItem | TextItem | ImageItem | SubtitleItem
export const KIND_LABEL: Record<Item['kind'], string> = { character: '角色', text: '文字', image: '图片', subtitle: '字幕' }

/** who speaks when. free: whoever is named, else by how chatty and how long silent; round: left to right on the
 *  stage; host: the host and the guests take turns */
export type Order = 'free' | 'round' | 'host'
export const ORDERS: { id: Order; label: string; hint: string }[] = [
  { id: 'free', label: '自由', hint: '被点名的人接话，否则看谁话多、谁沉默得久；你随时可以插话' },
  { id: 'round', label: '轮流', hint: '按舞台上从左到右轮流说；轮到你扮演的角色时等你' },
  { id: 'host', label: '主持', hint: '主持人和嘉宾一来一回，主持人决定问谁' },
]
export type Talk = {
  order: Order
  host: string | null
  /** AI characters cutting in: 0 never, 1 now and then, 2 often */
  interrupt: 0 | 1 | 2
  /** your line cuts in at once (else after the current line) */
  cutIn: boolean
  language: 'auto' | 'zh' | 'en' | 'ja'
  /** answering viewers' messages (danmaku.ts): 0 never, 1 now and then, 2 often */
  danmaku: 0 | 1 | 2
  triggersOn: boolean
  triggers: AudienceRule[]
}

export type Scene = {
  id: string
  name: string
  width: number
  height: number
  /** a CSS background: a colour, a gradient, an image, or 'transparent' (a checkerboard here) */
  background: string
  backgroundAsset?: string
  /** items in drawing order: the last is in front */
  items: Item[]
  topic: string
  talk: Talk
  /** while editing: the title- and action-safe areas; on a 9:16 stage, where Douyin / TikTok put their buttons and
   *  comments; on a 16:9 one, the 9:16 crop in its middle */
  guides: boolean
  mask: boolean
  crop: boolean
}

/** edit: placing things (frames, handles, labels, empty subtitles show); show: the picture as it goes out */
export type Mode = 'edit' | 'show'

/** characters' own colours (subtitle names, bubble borders, labels): eight that stay clear of the selection blue and
 *  of red, given out in turn */
export const COLORS = ['#e2679a', '#2a9d8f', '#d4922a', '#5a9e4b', '#8a6cd8', '#e0763e', '#a47a55', '#b05c9c']

/** models imported from files, by key, once loaded (they are kept in IndexedDB: vault.ts) */
export const localModels = new Map<string, Map<string, Blob>>()

const KEY = 'livliv-stage:scene', SHOTS_KEY = 'livliv-stage:shots'
const TALK: Talk = { order: 'free', host: null, interrupt: 0, cutIn: false, language: 'auto', danmaku: 1, triggersOn: false, triggers: [] }
export const emptyScene = (): Scene => ({ id: uid(), name: tr("未命名舞台"), width: 1920, height: 1080, background: '#f7f4ef', items: [], topic: '', talk: { ...TALK }, guides: false, mask: false, crop: false })

/** an item as saved by an earlier version: what it lacks, at its default (the old 'ai' / 'idle' drivers are now a
 *  character moving by itself, with AI or nobody giving the lines) */
function normalize(i: Item): Item {
  if (i.kind === 'subtitle') {
    const style = (['bubble', 'bar', 'pop', 'plain'] as const).includes(i.style) ? i.style : 'bubble'
    return { ...i, style, showName: i.showName ?? i.of === 'all', typewriter: i.typewriter ?? false, linger: i.linger ?? 2.5 }
  }
  if (i.kind === 'image') return { ...i, rotation: typeof i.rotation === 'number' && Number.isFinite(i.rotation) ? i.rotation : 0, flip: i.flip === true, attachment: readAttachment(i.attachment) ?? undefined }
  if (i.kind !== 'character') return i
  const old = i.driver as string
  const driver: DriverKind = old === 'ai' || old === 'idle' ? 'auto' : (i.driver ?? 'auto')
  const lines: LinesBy = i.lines ?? (old === 'ai' ? 'ai' : old === 'idle' || old === 'pointer' ? 'none' : 'me')
  // a sample saved with the one line it used to have as a persona gets its card
  const url = i.model.type === 'url' ? local(i.model.url) : '', sample = url ? sampleAt(url) : undefined
  const card = sample && !i.tagline && i.persona.startsWith(sample.tagline) ? cardOf(sample) : null
  return {
    ...withoutLive(i), ...card, tuning: readTuning(i.tuning), driver, lines, readAloud: i.readAloud ?? driver !== 'mic', chatty: i.chatty ?? 1, length: i.length ?? 'normal',
    motion: i.motion ?? 'natural', talk: i.talk ?? 0.6, gaze: i.gaze ?? 'people', mirror: i.mirror ?? false, shadow: i.shadow ?? true,
    smooth: i.smooth ?? 0.5, micGain: i.micGain ?? 1, muted: i.muted ?? false, ...liveFields(i), model: i.model.type === 'url' ? { type: 'url', url: local(i.model.url) } : i.model, voice: { ...i.voice, source: i.voice?.source ?? 'auto', livliv: i.voice?.livliv ?? '', api: i.voice?.api ?? '' },
  }
}

/** the live settings a character was saved with, where they make sense (the rest left out, not set to undefined) */
function liveFields({ faceMic, autoAway, exprModes }: CharacterItem): Pick<CharacterItem, 'faceMic' | 'autoAway' | 'exprModes'> {
  const modes = readExprModes(exprModes)
  return { ...(typeof faceMic === 'boolean' ? { faceMic } : {}), ...(typeof autoAway === 'number' && Number.isFinite(autoAway) ? { autoAway: Math.max(0, Math.min(600, autoAway)) } : {}), ...(modes ? { exprModes: modes } : {}) }
}
function withoutLive(i: CharacterItem): CharacterItem {
  const copy = { ...i }
  delete copy.faceMic; delete copy.autoAway; delete copy.exprModes
  return copy
}

/** a saved scene, made whole: what earlier versions lacked, at its defaults. Characters imported from files come back
 *  from this browser's kept packages (vault.ts); one that isn't kept here says so on the stage */
export function loadable(s: Partial<Scene> | null, keepRemote = true): Scene | null {
  if (!s || !Array.isArray(s.items)) return null
  const value = { ...emptyScene(), ...s, id: typeof s.id === 'string' && s.id ? s.id : uid(), talk: { ...TALK, ...s.talk, triggersOn: s.talk?.triggersOn === true, triggers: readAudienceRules(s.talk?.triggers ?? []) ?? [] }, items: s.items.map(normalize) }
  return keepRemote ? value : persistentScene(value)
}

/** Friend assets live only for their session; saved projects keep your own cast. */
export function persistentScene(value: Scene): Scene {
  const remote = new Set(value.items.filter((item) => item.kind === 'character' && item.remote).map((item) => item.id))
  return { ...value, talk: { ...value.talk, host: remote.has(value.talk.host ?? '') ? null : value.talk.host, triggers: value.talk.triggers.filter((r) => !remote.has(r.character)) }, items: value.items.filter((item) => !remote.has(item.id) && !(item.kind === 'subtitle' && remote.has(item.of)) && !(item.kind === 'image' && item.attachment && remote.has(item.attachment.of))) }
}

function restore(): Project {
  try {
    const saved = JSON.parse(localStorage.getItem(SHOTS_KEY) || 'null')
    if (saved && Array.isArray(saved.scenes) && saved.scenes.length) {
      const scenes = saved.scenes.map((s: Partial<Scene>) => loadable(s, false)).filter((s: Scene | null): s is Scene => !!s)
      if (scenes.length && new Set(scenes.map((s: Scene) => s.id)).size === scenes.length) {
        const active = scenes.find((s: Scene) => s.id === saved.active) ?? scenes[0]
        return { active: active.id, scenes: shareCast(scenes, active) }
      }
    }
    const first = loadable(JSON.parse(localStorage.getItem(KEY) || 'null'), false) ?? emptyScene()
    return { active: first.id, scenes: [first] }
  } catch { const first = emptyScene(); return { active: first.id, scenes: [first] } }
}

/** whether a project was saved in this browser before (a first visit starts empty) */
export const hadSaved = (() => { try { return !!(localStorage.getItem(SHOTS_KEY) || localStorage.getItem(KEY)) } catch { return false } })()
const restored = restore()
let scenes: Scene[] = restored.scenes
let scene: Scene = scenes.find((s) => s.id === restored.active)!
let selected: string | null = null
let mode: Mode = isOutput ? 'show' : 'edit'
const subs = new Set<() => void>()
let saveTimer = 0
type Snapshot = { scene: Scene; scenes: Scene[]; selected: string | null; mode: Mode; canUndo: boolean; canRedo: boolean }
let snapshot: Snapshot = { scene, scenes, selected, mode, canUndo: false, canRedo: false }

const past: Project[] = [], future: Project[] = []
let lastKey = '', lastAt = 0, holding = false
const project = (): Project => ({ active: scene.id, scenes: scenes.map((s) => s.id === scene.id ? scene : s) })

function remember(key: string) {
  const now = Date.now()
  if (holding || (key === lastKey && now - lastAt < 800)) { lastAt = now; return }
  past.push(project()); if (past.length > 100) past.shift()
  future.length = 0
  lastKey = key; lastAt = now
}

function emit() {
  scenes = shareCast(project().scenes, scene)
  scene = scenes.find((s) => s.id === scene.id)!
  snapshot = { scene, scenes, selected, mode, canUndo: past.length > 0, canRedo: future.length > 0 }
  subs.forEach((f) => f())
  if (isOutput) return
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(persist, 400)
  sendScene()
}

// whether this tab saves and feeds the output window: only the one tab that edits (tabs.ts); none until that is known
let editing = false
function persist() {
  if (!editing) return
  try {
    localStorage.setItem(SHOTS_KEY, JSON.stringify({ active: scene.id, scenes: scenes.map(persistentScene) }))
    localStorage.setItem(KEY, JSON.stringify(persistentScene(scene)))
  } catch { /* Storage may be unavailable; projects can still be downloaded. */ }
}
if (!isOutput) addEventListener('pagehide', () => { clearTimeout(saveTimer); persist() })

let sendTimer = 0, sent: Scene | null = null
const sentModels = new Map<string, Map<string, Blob>>()
function publishScene() {
  const used = new Set<string>()
  // Temporary packages must precede their scene, independent of module listener order.
  for (const item of scene.items) if (item.kind === 'character' && item.model.type === 'files') {
    const key = item.model.key, files = localModels.get(key)
    used.add(key)
    if (files && sentModels.get(key) !== files) {
      post({ t: 'assets', key, files: [...files] }); sentModels.set(key, files)
    }
  }
  for (const key of sentModels.keys()) if (!used.has(key)) sentModels.delete(key)
  sent = scene; post({ t: 'scene', scene })
}
function sendScene(now = false) {
  if (!editing) return
  if (!outputOpen() && !now) { sentModels.clear(); return }
  clearTimeout(sendTimer)
  if (now || sent?.id !== scene.id) { publishScene(); return }
  sendTimer = window.setTimeout(() => { if (sent !== scene) publishScene() }, 60)
}
if (!isOutput) onMsg((m) => { if (m.t === 'hello') { sentModels.clear(); sendScene(true) } })

const exists = (id: string | null) => !!id && scene.items.some((i) => i.id === id)
function finishEditing() {
  if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) document.activeElement.blur()
  holding = false; lastKey = ''
}
function applyProject(value: Project) {
  scenes = value.scenes; scene = scenes.find((s) => s.id === value.active) ?? scenes[0]
  if (!exists(selected)) selected = null
}
function restoreHistory(value: Project) {
  const remote = scene.items.filter((i): i is CharacterItem => i.kind === 'character' && !!i.remote)
  applyProject({ ...value, scenes: value.scenes.map((s) => ({ ...s, items: [...s.items, ...remote.filter((r) => !s.items.some((i) => i.id === r.id)).map((r) => ({ ...r, hidden: s.id !== value.active || r.hidden }))] })) })
  lastKey = ''; emit()
}

export const store = {
  /** this tab edits (tabs.ts): it saves and feeds the output from now on */
  edit() { editing = true; clearTimeout(saveTimer); persist(); sendScene(true) },
  /** saves now (another tab takes over) */
  flush() { clearTimeout(saveTimer); persist() },
  /** the project as saved (by the tab that edited before this one), history cleared */
  reload() { const p = restore(); past.length = 0; future.length = 0; selected = null; applyProject({ active: p.active, scenes: p.scenes }); lastKey = ''; emit() },
  get: () => scene,
  project,
  selected: () => selected,
  mode: () => mode,
  subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
  set(next: Partial<Scene>, key = Object.keys(next).join()) {
    remember(`scene:${key}`)
    const w = next.width ?? scene.width, h = next.height ?? scene.height
    if (w !== scene.width || h !== scene.height) {
      scenes = project().scenes.map((s) => s.id === scene.id ? s : { ...s, width: w, height: h, items: reshape(s.items, s.width, s.height, w, h) })
    }
    scene = { ...scene, ...next, id: scene.id }; emit()
  },
  setBackground(id: string, background: string, backgroundAsset?: string) {
    if (!scenes.some((s) => s.id === id)) return
    remember('background:' + id)
    scenes = project().scenes.map((s) => s.id === id ? { ...s, background, backgroundAsset } : s)
    scene = scenes.find((s) => s.id === scene.id)!; emit()
  },
  setTalk(p: Partial<Talk>) { remember(`talk:${Object.keys(p).join()}`); scene = { ...scene, talk: { ...scene.talk, ...p } }; emit() },
  add(...items: Item[]) {
    remember(`add:${items[0]?.id}`)
    scene = { ...scene, items: [...scene.items, ...items] }; selected = items[0]?.id ?? selected; emit()
  },
  addImage(sceneId: string, item: ImageItem) {
    if (!scenes.some((s) => s.id === sceneId)) return false
    if (scene.id === sceneId) { store.add(item); return true }
    remember('add-image:' + sceneId)
    scenes = project().scenes.map((s) => s.id === sceneId ? { ...s, items: [...s.items, item] } : s)
    emit(); return true
  },
  patch(id: string, p: Partial<Item>) {
    if (!scene.items.some((i) => i.id === id)) return
    remember(`patch:${id}:${Object.keys(p).join()}`)
    scene = { ...scene, items: scene.items.map((i) => i.id === id ? ({ ...i, ...p } as Item) : i) }; emit()
  },
  setRemote(item: CharacterItem) { scene = { ...scene, items: [...scene.items.filter((old) => old.id !== item.id), item] }; emit() },
  dropRemote(peer: string) {
    const ids = new Set([project(), ...past, ...future].flatMap((value) => value.scenes.flatMap((s) => s.items.filter((i) => i.kind === 'character' && i.remote?.peer === peer).map((i) => i.id))))
    const clean = (s: Scene): Scene => ({ ...s, talk: { ...s.talk, host: ids.has(s.talk.host ?? '') ? null : s.talk.host, triggers: s.talk.triggers.filter((r) => !ids.has(r.character)) }, items: s.items.filter((i) => !ids.has(i.id) && !(i.kind === 'subtitle' && ids.has(i.of)) && !(i.kind === 'image' && i.attachment && ids.has(i.attachment.of))) })
    scene = clean(scene); scenes = scenes.map(clean)
    for (const history of [past, future]) history.forEach((value, index) => { history[index] = { ...value, scenes: value.scenes.map(clean) } })
    if (selected && !exists(selected)) selected = null
    emit()
  },
  remove(id: string) {
    const item = scene.items.find((i) => i.id === id)
    if (!item) return
    if (item.kind === 'character' && item.remote) { store.patch(id, { hidden: true }); return }
    remember(`remove:${id}`)
    const clean = (s: Scene): Scene => ({ ...s, talk: { ...s.talk, host: s.talk.host === id ? null : s.talk.host, triggers: s.talk.triggers.filter((r) => r.character !== id) }, items: s.items.filter((i) => i.id !== id && !(i.kind === 'subtitle' && i.of === id) && !(i.kind === 'image' && i.attachment?.of === id)) })
    if (item.kind === 'character') { scenes = project().scenes.map(clean); scene = scenes.find((s) => s.id === scene.id)! }
    else scene = clean(scene)
    if (selected && !exists(selected)) selected = null
    emit()
  },
  duplicate(id: string) {
    const it = scene.items.find((i) => i.id === id)
    if (!it || (it.kind === 'character' && it.remote)) return
    const copy = { ...it, id: uid(), x: it.x + 40, y: it.y + 40 } as Item
    const extra: Item[] = []
    if (it.kind === 'character' && copy.kind === 'character') {
      copy.name = `${it.name} 2`
      copy.color = COLORS[(COLORS.indexOf(it.color) + 1) % COLORS.length]
      const own = scene.items.find((i): i is SubtitleItem => i.kind === 'subtitle' && i.of === it.id)
      if (own) extra.push({ ...own, id: uid(), of: copy.id, x: own.x + 40, y: own.y + 40 })
    }
    store.add(copy, ...extra)
  },
  restack(id: string, by: 1 | -1 | 'front' | 'back') {
    const items = [...scene.items], i = items.findIndex((x) => x.id === id)
    if (i < 0) return
    remember(`restack:${id}`)
    const [it] = items.splice(i, 1)
    const j = by === 'front' ? items.length : by === 'back' ? 0 : Math.max(0, Math.min(items.length, i + by))
    items.splice(j, 0, it)
    scene = { ...scene, items }; emit()
  },
  select(id: string | null) { selected = id; emit() },
  setMode(m: Mode) { mode = m; if (m === 'show') selected = null; emit() },
  switchScene(id: string) {
    if (id === scene.id || !scenes.some((s) => s.id === id)) return false
    finishEditing(); scenes = project().scenes; scene = scenes.find((s) => s.id === id)!
    if (!exists(selected)) selected = null
    emit(); return true
  },
  addScene(blank = false) {
    finishEditing(); remember('add-scene')
    const next: Scene = { ...scene, id: uid(), name: tr('镜头 {0}', scenes.length + 1), items: blank ? scene.items.filter((i) => i.kind === 'character').map((i) => ({ ...i, hidden: true })) : scene.items.map((i) => i.kind === 'character' ? i : { ...i, id: uid() }) }
    scenes = [...project().scenes, next]; scene = next
    if (!exists(selected)) selected = null
    emit(); return next.id
  },
  removeScene(id: string) {
    if (scenes.length === 1 || !scenes.some((s) => s.id === id)) return
    finishEditing(); remember('remove-scene')
    const index = scenes.findIndex((s) => s.id === id)
    scenes = project().scenes.filter((s) => s.id !== id)
    if (scene.id === id) scene = scenes[Math.min(index, scenes.length - 1)]
    if (!exists(selected)) selected = null
    emit()
  },
  replace(next: Scene) { finishEditing(); remember('replace'); scene = next; scenes = [next]; selected = null; emit() },
  replaceProject(next: Project) { finishEditing(); remember('replace'); applyProject(next); selected = null; emit() },
  mirror(next: Scene) { scene = next; scenes = [next]; emit() },
  begin() { remember('begin'); holding = true },
  end() { holding = false; lastKey = '' },
  undo() { finishEditing(); const s = past.pop(); if (!s) return; future.push(project()); restoreHistory(s) },
  redo() { finishEditing(); const s = future.pop(); if (!s) return; past.push(project()); restoreHistory(s) },
}

export function useScene() { return useSyncExternalStore(store.subscribe, () => snapshot) }

export function uid() { return Math.random().toString(36).slice(2, 10) }
export const participants = (s: Scene) => s.items.filter((i): i is CharacterItem => i.kind === 'character')
export const characters = (s: Scene) => participants(s).filter((i) => !i.hidden)

/** a new character, sized to the stage: about three quarters of its height, standing on its bottom edge */
export function newCharacter(s: Scene, name: string, model: ModelRef, persona = '', at?: number, card?: Card): CharacterItem {
  const h = Math.round(s.height * 0.78), w = Math.round(h * 2 / 3)
  const n = characters(s).length
  const x = Math.round((at ?? freeSpot(s)) * s.width - w / 2)
  return {
    tuning: defaultTuning(),
    id: uid(), kind: 'character', name, model, persona, ...card, x, y: s.height - h, w, h,
    driver: 'auto', lines: 'ai', readAloud: true, chatty: 1, length: 'short',  // short lines keep a conversation moving: 60 characters take 13 s to say
    voice: { source: 'auto', livliv: '', api: '', name: '', pitch: 1 + ((n % 3) - 1) * 0.15, rate: 1 }, color: COLORS[n % COLORS.length],
    motion: 'natural', talk: 0.6, gaze: 'people', mirror: false, shadow: true, smooth: 0.5, micGain: 1, muted: false,
  }
}

/** where a new character stands (a share of the stage's width): as far as can be from the ones already there */
function freeSpot(s: Scene) {
  const taken = characters(s).map((c) => (c.x + c.w / 2) / s.width)
  if (!taken.length) return 0.5
  let best = 0.5, room = -1
  for (let p = 0.15; p <= 0.851; p += 0.05) {
    const d = Math.min(...taken.map((t) => Math.abs(t - p)))
    if (d > room) { room = d; best = p }
  }
  return best
}

/** a new stage shape: everything scaled to fit (the same for all, so they keep their places to each other), centred
 *  across and standing on the bottom edge as before */
export function reshape(items: Item[], ow: number, oh: number, nw: number, nh: number): Item[] {
  const k = Math.min(nw / ow, nh / oh)
  return items.map((i) => {
    if (i.kind === 'image' && i.attachment) return i
    const w = Math.round(i.w * k), h = Math.round(i.h * k)
    const cx = nw / 2 + (i.x + i.w / 2 - ow / 2) * k, bottom = nh - (oh - (i.y + i.h)) * k
    return { ...i, w, h, x: Math.round(cx - w / 2), y: Math.round(bottom - h), ...(i.kind === 'subtitle' || i.kind === 'text' ? { size: Math.max(14, Math.round(i.size * Math.max(k, 0.75))) } : {}) }
  })
}

/** the characters spread across the stage for its shape, left to right as they were, standing on the bottom edge, and
 *  each one's own subtitles over its head. Landscape: 78 % of the height for one or two, 72 % for three, 62 % for
 *  more; portrait: as tall as fits across (overlapping a little, more from three on, so they stay large), at most 55 %
 *  of the height. Bubbles are no wider than the space between characters, so they don't cover each other */
export function arrange(s: Scene): Item[] {
  const cs = characters(s).sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2)), n = cs.length
  if (!n) return s.items
  const W = s.width, H = s.height, portrait = H > W
  const h = Math.round(portrait ? Math.min(H * 0.55, (W * (n >= 3 ? 1.5 : 1.15) / n) * 1.5) : H * (n <= 2 ? 0.78 : n === 3 ? 0.72 : 0.62))
  const step = W * (portrait ? 0.9 : 0.8) / n
  const placed = new Map<string, CharacterItem>()
  cs.forEach((c, i) => {
    const w = Math.round(h * c.w / c.h), cx = W / 2 + (i - (n - 1) / 2) * step
    placed.set(c.id, { ...c, w, h, x: Math.round(cx - w / 2), y: H - h })
  })
  const size = Math.max(24, Math.min(48, Math.round(34 * h / (1080 * 0.78))))
  return s.items.map((i) => {
    if (i.kind === 'character') return placed.get(i.id) ?? i
    const c = i.kind === 'subtitle' ? placed.get(i.of) : undefined
    if (!c || i.kind !== 'subtitle') return i
    const bw = Math.round(Math.min(c.w * 1.1, n > 1 ? step * 0.98 : W, W * 0.9)), bh = Math.round(c.h * 0.2)
    return { ...i, w: bw, h: bh, size, x: Math.round(Math.min(Math.max(0, c.x + (c.w - bw) / 2), W - bw)), y: Math.round(Math.max(H * 0.05, c.y - bh * 0.4)) }
  })
}

/** a character's own speech bubble, over its head */
export function bubbleFor(c: CharacterItem): SubtitleItem {
  const w = Math.round(c.w * 1.1), h = Math.round(c.h * 0.2)
  return { id: uid(), kind: 'subtitle', of: c.id, style: 'bubble', size: 34, showName: false, typewriter: true, linger: 2.5,
    x: Math.round(c.x + (c.w - w) / 2), y: Math.max(0, c.y - Math.round(h * 0.4)), w, h }
}

/** one caption strip for everyone, along the bottom */
export function captionBar(s: Scene): SubtitleItem {
  const w = Math.round(s.width * 0.7), h = Math.round(s.height * 0.14)
  return { id: uid(), kind: 'subtitle', of: 'all', style: 'bar', size: 40, showName: true, typewriter: false, linger: 2.5,
    x: Math.round((s.width - w) / 2), y: s.height - h - Math.round(s.height * 0.04), w, h }
}
