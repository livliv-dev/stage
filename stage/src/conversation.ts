import { tr } from './i18n'
// Who speaks when (the stage's talk settings, scene.ts Talk), and you in it.
//  - free: the one just named answers, else an AI character picked by how chatty it is and how long it has been
//    quiet (never the same twice running). You can cut in at any time.
//  - round: everyone who speaks (AI and the characters you play), left to right on the stage.
//  - host: the host speaks after every guest and names the next one (else the guest quiet longest).
// When the turn falls to a character you play (round, host, or named in free), the conversation waits for your line
// (or a skip). Your line comes from the console, as one of your characters (said in its voice, or only shown when
// you speak for real) or as the narrator; it waits for the current line, or cuts it off (cutIn). AI characters can
// cut each other off too (interrupt: now and then, often): the line stops part way and the next one starts with a
// short interjection. Before a line the speaker looks at whom it talks to and the others turn to it, a moment apart.
// Pause lets the current line finish and waits; a conversation stops after `limit` AI lines, so a paid model can't
// run on by itself.
import { useSyncExternalStore } from 'react'
import { actors, faceOf, type Take } from './actors'
import { brainReady, makeBrain, loadBrainConfig, type Line } from './brain'
import { demoFor, demoPause, demoSpeaker } from './demo'
import { participants as characters, store, uid, type CharacterItem } from './scene'
import { estimate, hush } from './speech'
import { isBlocked, onChat, type Chat } from './danmaku'
import { AudienceInbox } from './audience'
import { voiceRoute } from './voiceApi'
import { isOutput, onMsg, outputOpen, post } from './link'

export type ConvState = {
  running: boolean
  mode: 'conversation' | 'live'
  waitingAudience: boolean
  until: number
  generations: number
  generationLimit: number
  /** a live turn failed: when it is tried again (Date.now()), else 0 */
  retryAt: number
  ended: string
  paused: boolean
  /** a character is thinking of its line (its id) */
  thinking: string | null
  /** the line being said now */
  speaking: Line | null
  /** the conversation waits for your line as this character (its id) */
  waiting: string | null
  /** who you speak as from the console: a character you play (its id), or 'narrator' */
  as: string
  lines: Line[]
  /** AI lines this run, and the most */
  turns: number
  limit: number
  /** seconds between lines */
  gap: number
  error: string
  /** an AI turn needed a model and none is set up: the app shows where to set one */
  needModel: boolean
}

let state: ConvState = { running: false, mode: 'conversation', waitingAudience: false, until: 0, generations: 0, generationLimit: 100, retryAt: 0, ended: '', paused: false, thinking: null, speaking: null, waiting: null, as: '', lines: [], turns: 0, limit: 12, gap: 0.6, error: '', needModel: false }

/** an AI character's turn came with no model set up: the conversation stops there and asks for one (needModel) */
class NeedModel extends Error {}
/** the line was said (shown) but its voice failed: the message it answered was answered */
class VoiceFailed extends Error {}
const subs = new Set<() => void>()
const set = (p: Partial<ConvState>) => { state = { ...state, ...p }; subs.forEach((f) => f()); if (outputOpen()) sendConv() }
// what the output window needs of it: the lines, and who is thinking, speaking or awaited
const sendConv = () => post({ t: 'conv', conv: { lines: state.lines, speaking: state.speaking, thinking: state.thinking, waiting: state.waiting } })
if (!isOutput) onMsg((m) => { if (m.t === 'hello') sendConv() })
/** the output window: the editor's conversation */
export const mirrorConv = (c: Partial<ConvState>) => set(c)
export const useConversation = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
/** the state now, outside React */
export const conversation = () => state
/** told each time the conversation changes (a recording takes it down) */
export const onConv = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

let ctrl: AbortController | null = null
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted()
  const done = () => { signal.removeEventListener('abort', abort); resolve() }
  const timer = setTimeout(done, ms)
  const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason) }
  signal.addEventListener('abort', abort, { once: true })
})


/** your lines waiting their turn (free order), and the wait for your line when it is your character's turn */
const queue: Line[] = []
let answer: ((l: Line | null) => void) | null = null
/** the character that had the last turn, said or skipped (round and host orders go on from it), and the one you
 *  skipped since the last line */
let lastTurn: string | null = null
let skipped: string | null = null
/** the character you picked to speak next (a click on its card), and a way to end the pause between lines now */
let forced: string | null = null
let hurry: (() => void) | null = null
/** the next AI line cuts into the one before */
let cutting = false
let cutTimer = 0

const viewers = new AudienceInbox<Chat>()
let wakeLive: (() => void) | null = null
onChat((message) => { if (viewers.push(message)) wakeLive?.() })
/** a viewer's message, now and then (as often as the stage's talk settings say) */
const someViewer = () => (Math.random() < [0, 0.35, 0.8][store.get().talk.danmaku] ? viewers.take(Date.now(), isBlocked) : null)

export type LiveOptions = { minutes: number; maxGenerations: number; warmupSeconds: number; textOnly: boolean }
let liveOptions: LiveOptions | null = null
/** a live session rides out a busy or slow service: a failed turn is tried again after these seconds, and the
 *  session stops at LIVE_FAILURES failed turns in a row */
const RETRY_SECONDS = [5, 15]
const LIVE_FAILURES = RETRY_SECONDS.length + 1

/** Woken by a new message, resume, or the optional warm-up timer. */
function liveEvent(signal: AbortSignal, milliseconds?: number) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted()
    const clean = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); if (wakeLive === done) wakeLive = null }
    const done = () => { clean(); resolve() }
    const abort = () => { clean(); reject(signal.reason) }
    const timer = milliseconds === undefined ? undefined : setTimeout(done, Math.max(0, milliseconds))
    wakeLive = done
    signal.addEventListener('abort', abort, { once: true })
  })
}

const ready = (c: CharacterItem) => actors.get(c.id)?.status === 'ready'
const voices = () => characters(store.get()).filter((c) => (c.lines === 'ai' && ready(c)) || c.lines === 'me')
export const played = () => characters(store.get()).filter((c) => c.lines === 'me')
/** where a character is, left to right */
const across = (c: CharacterItem) => c.x + c.w / 2

/** how many lines since c last spoke (all of them if never) */
const quiet = (c: CharacterItem) => { const i = state.lines.map((l) => l.who).lastIndexOf(c.id); return i < 0 ? state.lines.length + 1 : state.lines.length - 1 - i }

function freePick(pool: CharacterItem[]): CharacterItem | null {
  if (!pool.length) return null
  const w = pool.map((c) => c.chatty * (1 + quiet(c)))
  let r = Math.random() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i] }
  return pool[pool.length - 1]
}

function nextSpeaker(): CharacterItem | null {
  const t = store.get().talk, all = voices(), ai = all.filter((c) => c.lines === 'ai'), last = state.lines.at(-1)
  const picked = all.find((c) => c.id === forced)
  forced = null
  if (picked) return picked
  if (t.order === 'round') {
    const ring = [...all].sort((a, b) => across(a) - across(b))
    return ring.length ? ring[(ring.findIndex((c) => c.id === lastTurn) + 1) % ring.length] : null
  }
  if (t.order === 'host') {
    const host = all.find((c) => c.id === t.host) ?? ai[0]
    if (!host) return null
    if (lastTurn !== host.id) return host
    const guests = all.filter((c) => c.id !== host.id)
    return guests.find((c) => c.name === last?.to) ?? [...guests].sort((a, b) => quiet(b) - quiet(a))[0] ?? host
  }
  // a character you skipped isn't asked again until someone has spoken
  const named = last?.to ? all.find((c) => c.name === last.to && c.id !== last.who && c.id !== skipped) : undefined
  if (named) return named
  const pick = freePick(ai.filter((c) => c.id !== last?.who))
  if (pick) return pick
  // one AI only: with a character you play it is your turn (you two take turns); alone, it goes on talking
  return all.find((c) => c.lines === 'me' && c.id !== last?.who && c.id !== skipped) ?? ai[0] ?? null
}

/** glances planned for the line being said (cleared by the next one) */
let glances: number[] = []
const later = (seconds: number, f: () => void) => { glances.push(window.setTimeout(f, seconds * 1000)) }

/** who looks where while a line is said (characters whose eyes follow people; a tracked face or the mouse decides for
 *  its own). The speaker looks at whom the line is for: who the AI says it looks at, else whom it names, else someone
 *  it mentions, else whom it answers; at the audience or down and aside when the AI says so. The one it is for looks
 *  back (eye contact); the others watch the speaker and glance at the one it is for, or at someone it mentions, now
 *  and then. A longer line to someone may turn to the audience for a moment. */
function looks(speaker: CharacterItem | null, line: Line | null, seconds = 0) {
  for (const g of glances) clearTimeout(g)
  glances = []
  const all = characters(store.get())
  const free = (c: CharacterItem) => !(c.driver === 'face' || c.driver === 'replay' || c.driver === 'pointer')
  const byName = (n: string | null | undefined) => (n ? all.find((x) => x.name === n && x.id !== speaker?.id) : undefined)
  const said = line?.text ?? ''
  const mentioned = all.find((x) => x.id !== speaker?.id && x.name.length > 1 && said.includes(x.name))
  const answered = byName([...state.lines].reverse().find((l) => l.who !== speaker?.id && !l.audience && l.who !== 'me')?.name)
  const at = line?.look === 'camera' ? 'camera' : line?.look === 'away' ? 'away' : byName(line?.look) ?? byName(line?.to) ?? mentioned ?? answered
  const toWhom = typeof at === 'object' ? at : undefined
  for (const c of all) {
    const a = actors.get(c.id)
    if (!a || !free(c)) continue
    if (!speaker) { a.rest(Math.random() * 0.4); continue }
    if (c.gaze !== 'people') {
      a.listening = c.id !== speaker.id
      a.look(c.gaze === 'free' ? 'free' : null)
      continue
    }
    if (c.id === speaker.id) {
      a.listening = false
      if (at === 'away') {
        // down and to the side, then back to whom it talks to (or the audience)
        const f = faceOf(c), side = Math.random() < 0.5 ? -1 : 1
        a.look({ x: f.x + side * c.w * 0.6, y: f.y + c.h * 0.35 })
        later(Math.min(1.6, seconds * 0.5), () => a.look(answered ? faceOf(answered) : null))
      } else {
        a.look(toWhom ? faceOf(toWhom) : null)
        // a longer line to someone turns to the audience for a moment
        if (toWhom && seconds > 2.6 && Math.random() < 0.4) {
          later(seconds * (0.5 + Math.random() * 0.15), () => a.look(null))
          later(seconds * 0.5 + 1.1, () => a.look(faceOf(toWhom)))
        }
      }
      continue
    }
    a.listening = true
    if (c.id === toWhom?.id) { a.look(faceOf(speaker), 0.08 + Math.random() * 0.12); continue }  // looks back
    a.look(faceOf(speaker), 0.1 + Math.random() * 0.3)
    // a glance at the one it talks to, or at someone it mentions
    const other = toWhom ?? (mentioned && mentioned.id !== c.id ? mentioned : undefined)
    if (other && other.id !== c.id && seconds > 1.6 && Math.random() < 0.45) {
      const t0 = seconds * (0.3 + Math.random() * 0.3)
      later(t0, () => a.look(faceOf(other)))
      later(t0 + 0.9 + Math.random() * 0.6, () => a.look(faceOf(speaker)))
    }
  }
}

/** a line said: by its character (in its voice, or shown only), or by the narrator (shown only). AI lines may be
 *  cut off part way (interrupt), yours may cut theirs. `ready`: its voice, made already (an AI line's, while it
 *  thought) */
async function deliver(line: Line, c: CharacterItem | null, signal: AbortSignal, ready?: Take) {
  const a = c ? actors.get(c.id) : undefined
  const take = ready ?? (a && c ? await a.prepare(line.text, line.emotion, !line.human || c.readAloud, signal) : undefined)
  signal.throwIfAborted()
  const seconds = take?.seconds ?? estimate(line.text)
  looks(c, line, seconds)
  if (c && !line.human) await wait(line.demo === undefined ? 260 : 140, signal)  // a look first, then the words
  lastTurn = c?.id ?? lastTurn; skipped = null
  line = { ...line, seconds }
  set({ speaking: line, lines: [...state.lines, line] })
  // a voice still coming in has only a guess for its length: the true one for what is drawn from here on (a video)
  const said = line
  void take?.clip?.live?.whole.then(() => { said.seconds = take.clip!.seconds }, () => {})
  if (c && !line.human) makeAhead()
  const t = store.get().talk
  const others = voices().filter((x) => x.lines === 'ai' && x.id !== c?.id)
  if (c && !line.human && line.demo === undefined && t.interrupt && others.length && line.text.length >= 14 && Math.random() < [0, 0.2, 0.45][t.interrupt]) {
    cutTimer = window.setTimeout(() => cut(line.id), seconds * (0.5 + Math.random() * 0.25) * 1000)
  }
  try {
    if (a && take) await a.perform(take, line.emotion, line.action)
    else await new Promise<void>((r) => { const s = setTimeout(r, seconds * 1000); signal.addEventListener('abort', () => { clearTimeout(s); r() }, { once: true }) })
  } finally {
    clearTimeout(cutTimer)
    if (state.speaking?.id === said.id) set({ speaking: null })
  }
}

/** the line being said stops here; the next AI line starts by cutting in */
function cut(id: string, byYou = false) {
  const l = state.speaking
  if (!l || l.id !== id) return
  dropAhead()
  set({ lines: state.lines.map((x) => (x.id === id ? { ...x, cut: true } : x)) })
  if (!byYou) cutting = true
  actors.get(l.who)?.silence()
}

/** a line and its voice, made ready */
async function makeLine(me: CharacterItem, signal: AbortSignal, audience?: Chat | null) {
  const s = store.get(), t = s.talk
  const ai = voices().filter((c) => c.lines === 'ai')
  const people = played().map((h) => h.name)
  if (state.lines.some((l) => l.who === 'me')) people.push(tr("我"))
  const role = t.order === 'host' ? (me.id === (t.host ?? ai[0]?.id) ? 'host' : 'guest') : null
  const cutIn = cutting; cutting = false
  const chat = audience === undefined ? someViewer() : audience
  if (state.mode === 'live') set({ generations: state.generations + 1 })
  const viewer = chat ? { user: chat.user, text: chat.text } : null
  const r = await makeBrain(loadBrainConfig()).reply({
    me, others: ai.filter((c) => c.id !== me.id), humans: people, topic: s.topic, lines: state.lines, role, cutIn, language: t.language, viewer,
    layout: [...characters(s)].sort((a, b) => across(a) - across(b)).map((c) => c.name),
  }, signal)
  // its voice is made while it still shows 在想 (a LivLiv voice takes about a second)
  const take = await actors.get(me.id)?.prepare(r.text, r.emotion, !liveOptions?.textOnly, signal, r.audio)
  signal.throwIfAborted()
  if (liveOptions && !liveOptions.textOnly && take?.mute) throw new Error(actors.get(me.id)?.voiceError || tr("角色还没有声音，请设置声音或选择仅字幕"))
  return { r, take, chat }
}

// The next line is made while this one is said, so it can follow at once: at most one line ahead. It is thrown away
// when what it answers changes (you said something, the line was cut, the topic changed, the conversation stopped);
// that costs one model call and one line's voice at most, at the user's own expense, so it isn't done where lines get
// cut on purpose (AI 抢话). A viewer's message it answers goes back to wait for the next line
type Ahead = { who: CharacterItem; after: string; topic: string; ctl: AbortController; chat: Chat | null; made: Promise<Awaited<ReturnType<typeof makeLine>> | null> }
let ahead: Ahead | null = null
function dropAhead() { if (ahead?.chat) viewers.putBack(ahead.chat); ahead?.ctl.abort(); ahead = null }

// A prepared demo always reaches its ending; paid conversations retain the user's limit.
const turnLimit = () => loadBrainConfig().kind === 'demo' ? demoFor(voices())?.script.lines.length ?? state.limit : state.limit
function makeAhead() {
  const t = store.get().talk, last = state.lines.at(-1)
  if (state.mode === 'live' || ahead || !ctrl || single || !last || queue.length || state.turns >= turnLimit()) return
  const cfg = loadBrainConfig()
  if (!brainReady(cfg) || (cfg.kind !== 'demo' && t.interrupt)) return
  const who = cfg.kind === 'demo' ? demoSpeaker(voices(), state.lines) : nextSpeaker()
  if (!who) return
  if (who.lines !== 'ai') { forced = who.id; return }  // your turn is next: nothing to make, and it stays next
  const ctl = new AbortController(), chat = someViewer()
  ahead = { who, after: last.id, topic: store.get().topic, ctl, chat, made: makeLine(who, AbortSignal.any([ctrl.signal, ctl.signal]), chat).catch(() => null) }
}

/** the line made ahead, if it still answers what was just said */
function aheadStill() {
  if (ahead && (ahead.after !== state.lines.at(-1)?.id || ahead.topic !== store.get().topic || (forced && forced !== ahead.who.id)
    || !voices().some((c) => c.id === ahead!.who.id && c.lines === 'ai'))) dropAhead()
  return ahead
}

async function aiTurn(me: CharacterItem, signal: AbortSignal, audience?: Chat | null) {
  signal.throwIfAborted()
  if (!brainReady(loadBrainConfig())) throw new NeedModel()
  set({ thinking: me.id })
  const a = aheadStill()?.who.id === me.id ? ahead : null
  if (!a) dropAhead()
  else ahead = null
  const made = a ? await Promise.race([a.made, new Promise<never>((_, no) => signal.addEventListener('abort', () => no(signal.reason), { once: true }))]) : null
  signal.throwIfAborted()
  const { r, take, chat } = made ?? await makeLine(me, signal, a?.chat ?? audience)
  signal.throwIfAborted()
  set({ thinking: null, turns: state.turns + 1 })
  if (chat) set({ lines: [...state.lines, { id: chat.id, who: 'audience', name: tr("弹幕 · {0}", chat.user), text: chat.text, emotion: 'neutral', action: 'none', to: null, human: true, audience: true }] })
  await deliver({ id: uid(), who: me.id, name: me.name, ...r }, me, signal, take)
  if (liveOptions && !liveOptions.textOnly) {
    await take?.clip?.live?.whole
    const error = actors.get(me.id)?.voiceError
    if (error) throw new VoiceFailed(error)
  }
}

/** the conversation answers once and stops (you said something on your own): nothing to make ahead */
let single = false

/** your line, said by whom it is from */
const yours = (l: Line, signal: AbortSignal) => deliver(l, characters(store.get()).find((c) => c.id === l.who) ?? null, signal)

/** your character's turn: wait for your line, or a skip */
function waitFor(c: CharacterItem, signal: AbortSignal) {
  set({ waiting: c.id, as: c.id })
  return new Promise<Line | null>((resolve, reject) => {
    const abort = () => { answer = null; set({ waiting: null }); reject(signal.reason) }
    answer = (l) => { signal.removeEventListener('abort', abort); answer = null; set({ waiting: null }); resolve(l) }
    signal.addEventListener('abort', abort, { once: true })
  })
}

async function run(once: boolean) {
  ctrl?.abort()
  dropAhead()
  const c = new AbortController(); ctrl = c
  single = once; liveOptions = null
  set({ running: true, mode: 'conversation', waitingAudience: false, until: 0, ended: '', paused: false, error: '' })
  try {
    // characters still loading (a template just placed, its players not made yet) are waited for, a little
    const loading = () => characters(store.get()).some((x) => x.lines === 'ai' && !['ready', 'error'].includes(actors.get(x.id)?.status ?? ''))
    for (let i = 0; i < 60 && loading(); i++) await wait(250, c.signal)
    do {
      while (queue.length) await yours(queue.shift()!, c.signal)
      if (once) {
        // you said something on your own: one AI answer (the one named, else picked freely), and one more to what you
        // said while it answered
        for (;;) {
          const ai = voices().filter((x) => x.lines === 'ai'), last = state.lines.at(-1)
          const inDemo = loadBrainConfig().kind === 'demo' ? demoSpeaker(voices(), state.lines) : null
          if (inDemo === undefined) break  // the demo said all its lines
          const me = inDemo ?? ai.find((x) => x.id === forced) ?? ai.find((x) => x.name === last?.to) ?? freePick(ai)
          forced = null
          if (!me) break
          await aiTurn(me, c.signal)
          if (!queue.length) break
          while (queue.length) await yours(queue.shift()!, c.signal)
        }
        break
      }
      // the demo goes by its script, and ends with it
      const demo = loadBrainConfig().kind === 'demo' ? demoSpeaker(voices(), state.lines) : null
      if (demo === undefined) break
      const who = demo ?? aheadStill()?.who ?? nextSpeaker()
      if (!who) throw new Error(tr("舞台上还没有会说话的角色：给角色选「AI」或「我来说」"))
      if (who.lines === 'me') {
        const l = await waitFor(who, c.signal)
        if (l) await yours(l, c.signal)
        else { lastTurn = who.id; skipped = who.id }
      } else await aiTurn(who, c.signal)
      c.signal.throwIfAborted()  // stopped during the line: it ends quietly, and the next one mustn't start
      await new Promise<void>((r, j) => {  // the pause between lines: 下一句 ends it now
        const scripted = loadBrainConfig().kind === 'demo' ? demoPause(voices(), state.lines) : null
        const t = setTimeout(r, scripted !== null ? scripted * 1000 : state.gap * 1000 * (cutting ? 0.1 : 0.7 + Math.random() * 0.6))
        hurry = () => { clearTimeout(t); r() }
        c.signal.addEventListener('abort', () => { clearTimeout(t); j(c.signal.reason) }, { once: true })
      })
      hurry = null
      while (state.paused) await wait(200, c.signal)
    } while (state.turns < turnLimit())
  } catch (e) {
    if (e instanceof NeedModel) set({ needModel: true })
    else if (!c.signal.aborted) set({ error: (e as Error).message })
  } finally {
    if (ctrl === c) { ctrl = null; set({ running: false, paused: false, thinking: null, waiting: null }); looks(null, null) }
  }
}

async function runLive(options: LiveOptions) {
  const config = loadBrainConfig()
  if (!brainReady(config) || config.kind === 'demo') { set({ error: tr("AI 主播需要接上模型；离线演示可在「对谈」里体验"), needModel: true }); return }
  const cast = characters(store.get()).filter((c) => c.lines === 'ai')
  if (!cast.length) { set({ error: tr("先添加一个「AI 来演」的角色") }); return }
  if (!options.textOnly && cast.some((c) => voiceRoute(c) === 'none')) { set({ error: tr("AI 角色还没有声音，请在设置里接上声音，或选择「仅字幕」") }); return }
  const c = new AbortController(); ctrl = c
  dropAhead(); viewers.clear(); queue.length = 0
  liveOptions = options; single = false
  const until = Date.now() + options.minutes * 60_000
  set({ running: true, mode: 'live', paused: false, waitingAudience: true, turns: 0, generations: 0, generationLimit: options.maxGenerations, until, retryAt: 0, ended: '', error: '' })
  const deadline = setTimeout(() => {
    set({ ended: tr("已达到本次时长上限") }); c.abort(); hush(); actors.forEach((a) => a.silence())
  }, until - Date.now())
  let lastReply = Date.now() - 6000, failures = 0
  try {
    // The template may have just mounted; use the same loading window as conversation mode.
    for (let i = 0; i < 60 && cast.some((x) => !actors.get(x.id) || actors.get(x.id)?.status === 'loading'); i++) await wait(250, c.signal)
    if (cast.some((x) => actors.get(x.id)?.status !== 'ready')) throw new Error(tr("有 AI 角色尚未载入，请检查角色列表"))
    while (state.generations < options.maxGenerations) {
      while (state.paused) await liveEvent(c.signal)
      if (queue.length) await yours(queue.shift()!, c.signal)
      c.signal.throwIfAborted()
      if (state.paused) continue
      const now = Date.now(), cooldown = lastReply + 6000 - now
      if (cooldown > 0) { await liveEvent(c.signal, cooldown); continue }
      const warmupAt = options.warmupSeconds ? lastReply + options.warmupSeconds * 1000 : Infinity
      if (!viewers.available(now, isBlocked) && now < warmupAt) {
        set({ waitingAudience: true })
        await liveEvent(c.signal, Number.isFinite(warmupAt) ? warmupAt - now : undefined)
        continue
      }
      const chat = viewers.take(now, isBlocked)
      const pool = voices().filter((x) => x.lines === 'ai')
      const who = pool.find((x) => x.id === forced) ?? freePick(pool.filter((x) => pool.length === 1 || x.id !== lastTurn))
      forced = null
      if (!who) throw new Error(tr("舞台上没有已就绪的 AI 角色"))
      set({ waitingAudience: false })
      try { await aiTurn(who, c.signal, chat) } catch (e) {
        if (e instanceof NeedModel || c.signal.aborted) throw e
        // a message the failed turn never answered is answered on the retry
        if (chat && !(e instanceof VoiceFailed)) viewers.putBack(chat)
        if (++failures >= LIVE_FAILURES) throw e
        const ms = RETRY_SECONDS[failures - 1] * 1000
        set({ thinking: null, waitingAudience: true, error: (e as Error).message, retryAt: Date.now() + ms })
        await wait(ms, c.signal)
        set({ retryAt: 0 })
        continue
      }
      c.signal.throwIfAborted()
      failures = 0
      lastReply = Date.now(); set({ waitingAudience: true, error: '' })
    }
    set({ ended: tr("已达到本次生成次数上限") })
  } catch (e) {
    if (e instanceof NeedModel) set({ needModel: true })
    else if (!c.signal.aborted) set({ error: (e as Error).message, ended: failures >= LIVE_FAILURES ? tr("连续出错 {0} 次，已停止", LIVE_FAILURES) : tr("会话因错误停止") })
  } finally {
    clearTimeout(deadline)
    if (ctrl === c) {
      ctrl = null; liveOptions = null; hush(); actors.forEach((a) => a.silence())
      set({ running: false, paused: false, thinking: null, speaking: null, waiting: null, waitingAudience: false, retryAt: 0 }); looks(null, null)
    }
  }
}

export const talk = {
  /** the model was asked for and shown (the model card opened) */
  modelAsked() { if (state.needModel) set({ needModel: false }) },
  /** they talk until the limit (a new limit's worth of AI lines, from where they are). Gives what stops this run only,
   *  not one started after it */
  start(): (() => void) | null {
    if (state.running) return null
    if (loadBrainConfig().kind === 'demo' && demoFor(voices())) talk.clear()
    set({ turns: 0 }); void run(false)
    const mine = ctrl
    return () => { if (mine && ctrl === mine) talk.stop() }
  },
  startLive(options: LiveOptions) {
    if (state.running) return
    void runLive({ minutes: Math.max(1, Math.min(240, Math.round(options.minutes) || 30)), maxGenerations: Math.max(1, Math.min(500, Math.round(options.maxGenerations) || 100)), warmupSeconds: [30, 60, 120].includes(options.warmupSeconds) ? options.warmupSeconds : 0, textOnly: options.textOnly })
  },
  /** the line being said finishes, then they wait */
  pause() { if (state.running) { set({ paused: true }); wakeLive?.() } },
  resume() { set({ paused: false }); wakeLive?.() },
  stop() {
    ctrl?.abort(); ctrl = null; liveOptions = null; queue.length = 0; cutting = false; clearTimeout(cutTimer)
    dropAhead()
    hush(); actors.forEach((a) => a.silence())
    set({ running: false, paused: false, thinking: null, speaking: null, waiting: null, waitingAudience: false, retryAt: 0, ended: state.mode === 'live' ? tr("已手动停止") : '' })
    looks(null, null)
  },
  clear() { talk.stop(); viewers.clear(); lastTurn = null; set({ lines: [], turns: 0, error: '' }) },
  setLimit(n: number) { set({ limit: Math.max(1, Math.min(60, Math.round(n) || 1)) }) },
  setGap(s: number) { set({ gap: Math.max(0, Math.min(3, s)) }) },
  /** who you speak as: a character you play, or 'narrator' */
  setAs(id: string) { set({ as: id }) },
  /** a line out of what they remember (it is no longer part of the conversation) */
  forget(id: string) { set({ lines: state.lines.filter((l) => l.id !== id) }) },
  /** back to just before this line: it and everything after are gone */
  rewind(id: string) {
    if (state.running) return
    const i = state.lines.findIndex((l) => l.id === id)
    if (i >= 0) { lastTurn = state.lines[i - 1]?.who ?? null; set({ lines: state.lines.slice(0, i), error: '' }) }
  },
  /** the last line said again, differently */
  redo() {
    if (state.running) return
    const last = state.lines.at(-1)
    if (last && !last.human) set({ lines: state.lines.slice(0, -1) })
    void run(true)
  },
  /** your character's turn passes */
  skip() { answer?.(null) },
  /** on to the next line now: your turn skipped, the line being said cut off, or the pause ended */
  next() {
    if (!state.running) { talk.start(); return }
    if (answer) answer(null)
    else if (state.speaking) cut(state.speaking.id, true)
    else hurry?.()
  },
  /** this character speaks next (a click on its card): an AI one after the current line, or, idle, at once; one you
   *  play becomes who the console speaks as */
  nextUp(id: string) {
    const c = voices().find((x) => x.id === id)
    if (!c) return
    if (c.lines === 'me') { set({ as: c.id }); return }
    forced = c.id
    if (!state.running) void run(true)
    else if (!state.speaking && !answer) { hurry?.(); wakeLive?.() }
  },
  /** you say something, as whom the console says. On your character's turn it is that turn; otherwise it waits for
   *  the current line (or cuts it off, cutIn) and they answer */
  say(text: string) {
    const t = text.trim()
    if (!t) return
    const me = played()
    const c = me.find((x) => x.id === (state.waiting ?? state.as)) ?? (state.as === 'narrator' ? undefined : me[0])
    const line: Line = { id: uid(), who: c?.id ?? 'me', name: c?.name ?? tr("旁白"), text: t.slice(0, 200), emotion: 'neutral', action: 'none', to: null, human: true }
    set({ error: '' })
    if (answer) { answer(line); return }
    queue.push(line)
    wakeLive?.()
    if (!state.running) { void run(true); return }
    if (store.get().talk.cutIn && state.speaking) cut(state.speaking.id, true)
  },
}
