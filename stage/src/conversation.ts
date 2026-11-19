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
import { brainReady, makeBrain, loadBrainConfig, decideExternalAction, type Line, type ModelConfig } from './brain'
import { demoFor, demoPause, demoReactions, demoSpeaker } from './demo'
import { participants as characters, store, uid, type CharacterItem } from './scene'
import { estimate, hush } from './speech'
import { chatState, isBlocked, onChat, onChatState, type Chat } from './danmaku'
import { AudienceInbox } from './audience'
import { voiceRoute } from './voiceApi'
import { isOutput, onMsg, outputOpen, post } from './link'
import { chatHistory } from './chatHistory'
import { conversationContext, speechSegments } from './chatContext'
import { memory, type MemoryScope } from './memory'
import type { ExternalActionRequest, ExternalEvent } from './externalEvents'
import type { AiriGameConfig, AiriGameConnection } from '../../desktop/src/airiGameProtocol'
import { airiGameError, airiGameText, airiModelForCast, chooseAiriGameAction, streamAiriReply } from './airiEngine'
import { desktop } from './desktopBridge'
import { onRecording, recording } from './recording'
import { onRoom, roomState } from './collab/session'

export type ConvState = {
  running: boolean
  mode: 'conversation' | 'live' | 'chat' | 'realtime'
  scope: MemoryScope
  chatScope: MemoryScope
  sessionId: string
  waitingInput: boolean
  storageError: string
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
  engine?: 'airi'
  game?: { name: AiriGameConfig['game']; status: 'connecting' | 'ready' | 'submitting' | 'playing' | 'offline'; text: string }
  /** an output is on (outputOn): sessions are public, and private can't be chosen */
  output: boolean
  /** an AI turn needed a model and none is set up: the app shows where to set one */
  needModel: boolean
  modelIntent: 'chat' | 'conversation' | 'live' | 'input'
}

let state: ConvState = { running: false, mode: 'conversation', scope: 'private', chatScope: 'private', sessionId: '', waitingInput: false, storageError: '', waitingAudience: false, until: 0, generations: 0, generationLimit: 100, retryAt: 0, ended: '', paused: false, thinking: null, speaking: null, waiting: null, as: '', lines: [], turns: 0, limit: 12, gap: 0.6, error: '', output: false, needModel: false, modelIntent: 'conversation' }

/** an AI character's turn came with no model set up: the conversation stops there and asks for one (needModel) */
class NeedModel extends Error {}
/** the line was said (shown) but its voice failed: the message it answered was answered */
class VoiceFailed extends Error {}
class GenerationLimit extends Error {}
const subs = new Set<() => void>()
let restoring = false
let restoreRequest: { controller: AbortController; signal: AbortSignal } | null = null
function cancelRestore() { restoreRequest?.controller.abort(); restoreRequest = null }
let saveRevision = 0
let inputPending = false, inputEpoch = 0
const set = (p: Partial<ConvState>, persist = true) => {
  state = { ...state, ...p }; subs.forEach((f) => f()); if (outputOpen()) sendConv()
  if (persist && p.lines && !restoring && !isOutput && (state.mode === 'realtime' || loadBrainConfig().kind !== 'demo')
    && chatHistory.current?.id === state.sessionId && chatHistory.current.scope === state.scope) {
    const revision = ++saveRevision
    void chatHistory.save(p.lines).then(() => { if (revision === saveRevision && state.storageError) set({ storageError: '' }) }, (error: unknown) => { if (revision === saveRevision) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) })
  }
}
// what the output window needs of it: the lines, and who is thinking, speaking or awaited
const sendConv = () => {
  const demo = loadBrainConfig().kind === 'demo' && state.lines.every((line) => line.demo !== undefined)
  post({ t: 'conv', conv: state.scope === 'public' || demo
    ? { lines: state.lines, speaking: state.speaking, thinking: state.thinking, waiting: state.waiting }
    : { lines: [], speaking: null, thinking: null, waiting: null } })
}
if (!isOutput) onMsg((m) => {
  if (m.t === 'hello' || m.t === 'alive' || m.t === 'bye') outputChanged()
  if (m.t === 'hello') sendConv()
})
/** the output window: the editor's conversation */
export const mirrorConv = (c: Partial<ConvState>) => set(c)
export const useConversation = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
/** the state now, outside React */
export const conversation = () => state
/** told each time the conversation changes (a recording takes it down) */
export const onConv = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

let ctrl: AbortController | null = null
type RealtimeControls = { stop(): void; pause(paused: boolean): void; interrupt(): void; say(text: string): void; event(event: ExternalEvent): boolean }
let realtimeControls: RealtimeControls | null = null
let offRealtimeHistory = () => {}
export type RealtimeSession = {
  context: { earlier: string; history: string; memories: { id: string; text: string }[] }
  line(line: Line, complete?: boolean): void
  state(thinking: string | null, speaking: Line | null): void
  speech(speaking: boolean, final: boolean, cancelled?: boolean): void
  turn(): boolean
  end(error?: string, reason?: string): void
}
let currentTurn: AbortController | null = null
const TURN_INTERRUPTED = new DOMException('The speaker was interrupted', 'AbortError')
const dialogue = new Set<string>()
const externalQueue: ExternalEvent[] = []
const externalSeen = new Set<string>()
let externalDecisions = 0
let activeEvent: ExternalEvent | null = null
type SpeechEvent = { character: string; scope: MemoryScope; speaking: boolean; final?: boolean; cancelled?: boolean }
const speechListeners = new Set<(event: SpeechEvent) => void>()
const profiles = () => characters(store.get()).filter((c) => c.lines === 'ai' && !c.remote).map((c) => c.profileId ?? c.id)
const castKey = () => JSON.stringify([...new Set(profiles())].sort())
let boundProfiles = ''

async function openHistory(scope: MemoryScope, signal: AbortSignal, fresh = false) {
  if (restoreRequest && restoreRequest.signal !== signal) cancelRestore()
  if (loadBrainConfig().kind === 'demo' && state.mode !== 'realtime') return
  const session = await chatHistory.open(profiles(), scope, signal, fresh)
  signal.throwIfAborted()
  restoring = true
  try { set({ sessionId: session.id, scope, lines: session.lines, storageError: '' }) } finally { restoring = false }
}

function interruptTurn() {
  realtimeControls?.interrupt()
  dropAhead()
  if (state.speaking) cut(state.speaking.id, true)
  currentTurn?.abort(TURN_INTERRUPTED)
}
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted()
  const done = () => { signal.removeEventListener('abort', abort); resolve() }
  const timer = setTimeout(done, ms)
  const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason) }
  signal.addEventListener('abort', abort, { once: true })
})


/** your lines waiting their turn (free order), and the wait for your line when it is your character's turn */
type ChatInput = { line: Line; transcribed: boolean }
const queue: ChatInput[] = []
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

export type LiveOptions = { minutes: number; maxGenerations: number; warmupSeconds: number; textOnly: boolean; airi?: { windowId: string; game?: AiriGameConfig } }
let liveOptions: LiveOptions | null = null
let airi: { model: ModelConfig; actorId: string; windowId: string; game?: AiriGameConnection } | null = null
export const liveModelName = () => state.mode === 'live' ? airi?.model.model : undefined
const liveRoom = () => ['connecting', 'waiting', 'on'].includes(roomState().phase)
const gameName = (game: AiriGameConfig['game']) => game === 'minecraft' ? 'Minecraft' : 'Factorio'

/** an output is on: the OBS output window, a recording, a co-stream (好友联播) or a live audience (Twitch chat, AI 直播).
 *  While one is, every session is public: no private memory is read or written, by any path, and the conversation goes
 *  to the public record. With all of them off, the scope chosen in the console (chatScope) applies */
export function outputOn() {
  return outputOpen() || ['starting', 'recording'].includes(recording().phase) || liveRoom() || chatState().status === 'on' || (state.running && state.mode === 'live')
}
/** the scope a session started now gets: the one chosen, unless an output is on */
export const sessionScope = (chosen: MemoryScope = state.chatScope): MemoryScope => outputOn() ? 'public' : chosen

/** told by everything that turns an output on or off (the output window, a recording, the room, Twitch), and checked
 *  every second as well (an output window can close without saying so) */
function outputChanged() {
  if (isOutput) return
  const on = outputOn()
  if (on !== state.output) set({ output: on }, false)
  if (on) goPublic()
}
/** an output came on while a private session runs: it is public from here on. The turn in hand (made with private
 *  memories) is cut, a line made ahead is dropped, and the session goes on in the public record, each turn (an AIRI
 *  one too) built from public memories only. A realtime call keeps its private context at the provider: it ends */
let switching: Promise<void> | null = null
function goPublic() {
  if (!state.running || state.scope === 'public' || switching) return
  if (loadBrainConfig().kind === 'demo' && state.mode !== 'realtime') return  // the demo reads and writes no memory
  if (realtimeControls) { talk.stop(); set({ ended: tr('输出已打开，私聊通话已结束') }); return }
  const run = ctrl
  if (!run) return
  inputEpoch++; dropAhead(); interruptTurn()
  set({ scope: 'public', sessionId: '', lines: [], speaking: null, thinking: null }, false)
  switching = openHistory('public', run.signal).catch((error: unknown) => {
    if (!run.signal.aborted && ctrl === run) { talk.stop(); set({ error: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
  }).finally(() => { switching = null; wakeLive?.() })
}
// once every module is ready (some of these import this one)
if (!isOutput && typeof window !== 'undefined') setTimeout(() => {
  onRecording(outputChanged); onRoom(outputChanged); onChatState(outputChanged)
  setInterval(outputChanged, 1000)
}, 0)

function bindAiri(controller: AbortController, model: ModelConfig, actor: CharacterItem, windowId = '') {
  airi = { model: { ...model }, actorId: actor.id, windowId }
  return store.subscribe(() => {
    if (ctrl !== controller || controller.signal.aborted) return
    const cast = characters(store.get()).filter((character) => character.lines === 'ai')
    if (cast.length === 1 && cast[0].id === actor.id && !cast[0].remote && cast[0].name === actor.name && boundProfiles === castKey()) return
    controller.abort()
    set({ ended: tr('角色已切换，本次 AIRI 会话已停止') })
  })
}

function preferredAiriForChat(config: ReturnType<typeof loadBrainConfig>, target?: string) {
  const cast = characters(store.get()).filter((character) => character.lines === 'ai')
  const model = airiModelForCast(config, cast)
  const actor = cast[0]
  if (!model || model.airi === false || (target && target !== actor.id) || (!actor.muted && voiceRoute(actor) === 'livliv')) return null
  return { model, actor }
}
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
    if (!speaker) { a.setPhase(state.waitingInput ? 'waiting' : 'idle'); a.rest(Math.random() * 0.4); continue }
    a.setPhase(c.id === speaker.id ? 'idle' : 'listening')
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

/** Content reactions follow audible playback; gaze can turn toward the speaker before the voice starts. */
function listenTo(speaker: CharacterItem | null, line: Line, seconds: number) {
  const all = characters(store.get())
  if (line.demo !== undefined) for (const { character, cues } of demoReactions(all, line)) {
    const listener = actors.get(character.id)
    if (!listener || character.id === speaker?.id) continue
    for (const cue of cues) later(cue.at * seconds, () => { if (listener.item.reactions?.listen !== false) listener.react(cue, true) })
  }
  if (line.demo === undefined) for (const reaction of line.listeners ?? []) {
    const listener = actors.get(reaction.who)
    if (!listener || listener.item.id === speaker?.id || !all.some((character) => character.id === reaction.who)) continue
    later(reaction.cue.at * seconds, () => { if (listener.item.reactions?.listen !== false) listener.react(reaction.cue) })
  }
}

/** a line said: by its character (in its voice, or shown only), or by the narrator (shown only). AI lines may be
 *  cut off part way (interrupt), yours may cut theirs. `ready`: its voice, made already (an AI line's, while it
 *  thought) */
async function deliver(line: Line, c: CharacterItem | null, signal: AbortSignal, ready?: Take, speech?: { beforeStart(): Promise<void>; onStart(): void; onEnd(cancelled: boolean): void; final: boolean }) {
  const scope = state.scope
  const a = c ? actors.get(c.id) : undefined
  const take = ready ?? (a && c ? await a.prepare(line.text, line.emotion, (!line.human || c.readAloud) && !c.muted, signal) : undefined)
  signal.throwIfAborted()
  const seconds = take?.seconds ?? estimate(line.text)
  looks(c, line, seconds)
  if (c && !line.human) await wait(line.demo === undefined ? 260 : 140, signal)  // a look first, then the words
  if (speech) await speech.beforeStart()
  signal.throwIfAborted()
  lastTurn = c?.id ?? lastTurn; skipped = null
  line = { ...line, seconds }
  set({ speaking: line, lines: [...state.lines, line] })
  if (c && !line.human) { speech?.onStart(); speechListeners.forEach((listener) => listener({ character: c.id, scope, speaking: true, final: false })) }
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
    const interrupted = () => cut(line.id, true)
    signal.addEventListener('abort', interrupted, { once: true })
    try {
    if (a && take) await a.perform(take, line.emotion, line.action, signal, line.cues, () => listenTo(c, line, seconds))
    else { listenTo(c, line, seconds); await new Promise<void>((r) => { const s = setTimeout(r, seconds * 1000); signal.addEventListener('abort', () => { clearTimeout(s); r() }, { once: true }) }) }
    await take?.clip?.live?.whole
    } catch (error) {
      cut(line.id, true)
      if (c && !line.human && !signal.aborted) throw new VoiceFailed((error as Error).message, { cause: error })
      throw error
    } finally { signal.removeEventListener('abort', interrupted) }
  } finally {
    clearTimeout(cutTimer)
    if (c && !line.human) {
      const cancelled = signal.aborted || state.lines.find((entry) => entry.id === line.id)?.cut === true
      speech?.onEnd(cancelled)
      speechListeners.forEach((listener) => listener({ character: c.id, scope, speaking: false, final: speech?.final ?? true, cancelled }))
    }
    if (state.speaking?.id === said.id) set({ speaking: null })
  }
}

/** the line being said stops here; the next AI line starts by cutting in */
function cut(id: string, byYou = false) {
  const l = state.speaking
  if (!l || l.id !== id) return
  dropAhead()
  looks(null, null)
  set({ lines: state.lines.map((x) => (x.id === id ? { ...x, cut: true } : x)) })
  if (!byYou) cutting = true
  actors.get(l.who)?.silence()
  actors.get(l.who)?.setPhase('interrupted')
}

/** a line and its voice, made ready */
async function makeLine(me: CharacterItem, signal: AbortSignal, audience?: Chat | null) {
  const s = store.get(), t = s.talk
  if (boundProfiles !== castKey()) throw new Error(tr('参与角色已改变，请重新开始会话'))
  const ai = voices().filter((c) => c.lines === 'ai')
  const people = played().map((h) => h.name)
  if (state.lines.some((l) => l.who === 'me')) people.push(tr("我"))
  const role = t.order === 'host' ? (me.id === (t.host ?? ai[0]?.id) ? 'host' : 'guest') : null
  const cutIn = cutting; cutting = false
  const chat = audience === undefined ? state.scope === 'public' ? someViewer() : null : audience
  if (state.mode !== 'conversation') {
    if (state.generations >= state.generationLimit) throw new GenerationLimit()
    set({ generations: state.generations + 1 })
  }
  const viewer = chat ? { user: chat.user, text: chat.text } : null
  const cfg = loadBrainConfig(), aloud = !liveOptions?.textOnly && !me.muted
  const voiced = aloud && voiceRoute(me) === 'livliv'
  const sessionId = state.sessionId
  const context = loadBrainConfig().kind === 'demo' ? { lines: state.lines, summary: undefined, memories: [], revision: 0 } : await chatHistory.context(me.profileId ?? me.id, state.lines, state.scope)
  signal.throwIfAborted()
  const used = conversationContext(context.lines, context.summary)
  const memoryIds = [...new Set([...context.memories.map((entry) => entry.id), ...(context.summary?.memoryIds ?? []), ...context.lines.flatMap((line) => line.memoryIds ?? [])])]
  const r = await makeBrain(cfg).reply({
    me, others: ai.filter((c) => c.id !== me.id), humans: people, topic: s.topic, lines: context.lines, role, cutIn, language: t.language, viewer,
    voiced, scope: state.scope, depth: t.depth, summary: context.summary, memories: context.memories, event: activeEvent ? { source: activeEvent.source, message: activeEvent.message } : undefined,
    layout: [...characters(s)].sort((a, b) => across(a) - across(b)).map((c) => c.name),
  }, signal)
  signal.throwIfAborted()
  const { summary, ...reply } = r
  if (summary && used.updateSummary) {
    await chatHistory.summarize(summary, used.sourceIds, memoryIds, context.revision, sessionId, state.lines)
  }
  // its voice is made while it still shows 在想 (a LivLiv voice takes about a second)
  const recorded = r.audio ?? (voiced && cfg.kind === 'livliv' ? null : undefined)
  // 持续聊天 with a model of one's own speaks sentence by sentence, so the first is heard sooner; not in the LivLiv voice:
  // livliv.ai charges every /say call (a point at least), so a line in it is voiced whole, one call, as everywhere else
  const bySentence = state.mode === 'chat' && cfg.kind !== 'livliv' && voiceRoute(me) !== 'livliv'
  const take = bySentence ? undefined : await actors.get(me.id)?.prepare(r.text, r.emotion, aloud, signal, recorded)
  signal.throwIfAborted()
  if (liveOptions && !liveOptions.textOnly && take?.mute) throw new Error(actors.get(me.id)?.voiceError || tr("角色还没有声音，请设置声音或选择仅字幕"))
  return { r: { ...reply, memoryIds, memoryRevision: context.revision }, take, chat, memoryRevision: context.revision, bySentence }
}

// The next line is made while this one is said, so it can follow at once: at most one line ahead. It is thrown away
// when what it answers changes (you said something, the line was cut, the topic changed, the conversation stopped);
// that costs one model call and one line's voice at most (with LivLiv, one line's points), at the user's own expense,
// so it isn't done where lines get cut on purpose (AI 抢话). A viewer's message it answers goes back to wait for the
// next line
type Ahead = { who: CharacterItem; after: string; topic: string; ctl: AbortController; chat: Chat | null; made: Promise<Awaited<ReturnType<typeof makeLine>> | null> }
let ahead: Ahead | null = null
function dropAhead() { if (ahead?.chat) viewers.putBack(ahead.chat); ahead?.ctl.abort(); ahead = null }

// A prepared demo always reaches its ending; paid conversations retain the user's limit.
const turnLimit = () => loadBrainConfig().kind === 'demo' ? demoFor(voices())?.script.lines.length ?? state.limit : state.limit
function makeAhead() {
  const t = store.get().talk, last = state.lines.at(-1)
  if (state.mode !== 'conversation' || ahead || !ctrl || single || !last || queue.length || state.turns >= turnLimit()) return
  const cfg = loadBrainConfig()
  if (!brainReady(cfg) || (cfg.kind !== 'demo' && t.interrupt)) return
  const who = cfg.kind === 'demo' ? demoSpeaker(voices(), state.lines) : nextSpeaker()
  if (!who) return
  if (who.lines !== 'ai') { forced = who.id; return }  // your turn is next: nothing to make, and it stays next
  if (switching) return
  const ctl = new AbortController(), chat = state.scope === 'public' ? someViewer() : null
  ahead = { who, after: last.id, topic: store.get().topic, ctl, chat, made: makeLine(who, AbortSignal.any([ctrl.signal, ctl.signal]), chat).catch(() => null) }
}

/** the line made ahead, if it still answers what was just said */
function aheadStill() {
  if (ahead && (ahead.after !== state.lines.at(-1)?.id || ahead.topic !== store.get().topic || (forced && forced !== ahead.who.id)
    || !voices().some((c) => c.id === ahead!.who.id && c.lines === 'ai'))) dropAhead()
  return ahead
}

function addViewer(chat: Chat | null | undefined) {
  if (!chat || state.lines.some((line) => line.id === chat.id)) return
  set({ lines: [...state.lines, { id: chat.id, who: 'audience', name: tr("弹幕 · {0}", chat.user), text: chat.text, emotion: 'neutral', action: 'none', to: null, human: true, audience: true }] })
}

async function playAiriTurn(me: CharacterItem, model: ModelConfig, chat: Chat | null | undefined, replyToOwner: boolean, signal: AbortSignal, onStart: () => void, onEnd: (cancelled: boolean) => void) {
  const actor = actors.get(me.id), profile = me.profileId ?? me.id
  const { sessionId, scope } = state, windowId = airi?.windowId, event = activeEvent
  if (airi?.actorId !== me.id || !sessionId || actor?.status !== 'ready' || boundProfiles !== castKey()) throw new Error(tr('参与角色已改变，请重新开始会话'))
  if (state.generations >= state.generationLimit) throw new GenerationLimit()
  const context = await chatHistory.context(profile, state.lines, scope)
  const verifyMemory = async () => {
    if ((await memory.context([profile], scope)).revision !== context.revision) throw new Error(tr('记忆已更新，请重新发送这一句'))
    signal.throwIfAborted()
  }
  signal.throwIfAborted()
  const snapshot = airi.game ? await desktop?.airiGame?.snapshot(airi.game.id, true) : undefined
  signal.throwIfAborted()
  const frame = snapshot?.frame ?? (windowId ? await desktop?.vision?.frame(windowId) : undefined)
  signal.throwIfAborted()
  if (windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
  const latest = replyToOwner ? context.lines.findLast((line) => line.human && !line.audience) : undefined
  const input = chat ? `Viewer ${chat.user}: ${chat.text}` : latest?.text
    ?? (state.mode === 'live' ? 'The livestream is quiet. Start a short conversation about the show.' : 'Start a short conversation with the user.')
  const used = conversationContext(context.lines, context.summary)
  const memories = context.memories.slice(0, 48)
  const memoryIds = [...new Set([...memories.map((entry) => entry.id), ...(context.summary?.memoryIds ?? []), ...context.lines.flatMap((line) => line.memoryIds ?? [])])]
  const textOnly = liveOptions?.textOnly === true
  set({ generations: state.generations + 1 })
  addViewer(chat)
  const reader = streamAiriReply({
    sessionId, scope, actor: me, model, input, signal, verifyMemory, allowBatch: !airi.game && !windowId, ...(frame ? { frame } : {}), ...(event ? { event } : {}),
    lines: context.lines.filter((line) => line.id !== latest?.id && line.id !== chat?.id),
    language: store.get().talk.language,
    context: { topic: store.get().topic, game: snapshot?.state, summary: used.earlier, memories },
  }).getReader()
  const speech = {
    final: false, onStart, onEnd,
    beforeStart: async () => {
      do {
        while (state.paused || dialogue.size || inputPending) await liveEvent(signal)
        if (state.sessionId !== sessionId || state.scope !== scope || boundProfiles !== castKey() || actors.get(me.id) !== actor) throw new Error(tr('参与角色已改变，请重新开始会话'))
        await verifyMemory()
      } while (state.paused || dialogue.size || inputPending)
    },
  }
  let first = true
  const prepareNext = async () => {
    const result = await reader.read()
    signal.throwIfAborted()
    if (result.done) return null
    const { text, cue } = result.value
    const feeling = cue?.feeling
    const emotion: Line['emotion'] = feeling === 'happy' || feeling === 'sad' || feeling === 'angry' || feeling === 'shy' || feeling === 'surprised' ? feeling : 'neutral'
    const aloud = !textOnly && !actor.item.muted
    if (aloud && voiceRoute(actor.item) === 'livliv') throw new Error(tr('内置 AIRI 支持自配语音接口、系统朗读或仅字幕'))
    const take = await actor.prepare(text, emotion, aloud, signal)
    signal.throwIfAborted()
    if (aloud && take.mute) throw new VoiceFailed(actor.voiceError || tr('声音播放失败，请检查声音设置'))
    return { text, cue, emotion, take }
  }
  try {
    let ready = await prepareNext()
    while (ready) {
      const { text, cue, emotion, take } = ready
      if (first) { set({ thinking: null, turns: state.turns + 1 }); first = false }
      const next = prepareNext()
      void next.catch(() => {})
      await deliver({
        id: uid(), who: me.id, name: me.name, text, emotion, action: cue?.action ?? 'none', to: null, look: cue?.look,
        cues: cue ? [{ ...cue, action: undefined }] : undefined, memoryIds, memoryRevision: context.revision,
      }, me, signal, take, speech)
      ready = await next
    }
    if (first && event?.reply !== 'maybe') throw new Error(tr('模型没有返回可播放的回复'))
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

async function aiTurn(me: CharacterItem, parent: AbortSignal, audience?: Chat | null, replyToOwner = false) {
  parent.throwIfAborted()
  if (switching) { await switching; parent.throwIfAborted() }
  while (dialogue.size || externalDecisions || inputPending) await liveEvent(parent)
  const model = airi?.model ?? loadBrainConfig()
  const scope = state.scope
  if (!brainReady(model)) throw new NeedModel()
  const turn = new AbortController(), signal = AbortSignal.any([parent, turn.signal])
  currentTurn = turn
  let spoke = false, hadCut = false
  set({ thinking: me.id })
  actors.get(me.id)?.setPhase('thinking')
  const prepared = aheadStill()?.who.id === me.id ? ahead : null
  const cancelPrepared = () => prepared?.ctl.abort(signal.reason)
  try {
    if (airi) {
      await playAiriTurn(me, airi.model, audience, replyToOwner, signal, () => { spoke = true }, (cancelled) => { hadCut ||= cancelled })
      return true
    }
    if (!prepared) dropAhead()
    else { ahead = null; signal.addEventListener('abort', cancelPrepared, { once: true }) }
    const made = prepared ? await prepared.made : null
    signal.throwIfAborted()
    const { r, take, chat, memoryRevision, bySentence } = made ?? await makeLine(me, signal, prepared?.chat ?? audience)
    signal.throwIfAborted()
    const speech = {
      final: false, onStart: () => { spoke = true }, onEnd: (cancelled: boolean) => { hadCut ||= cancelled },
      beforeStart: async () => {
        do {
          while (state.paused || dialogue.size || inputPending) await liveEvent(signal)
          if (loadBrainConfig().kind !== 'demo' && (await memory.context([me.profileId ?? me.id], state.scope)).revision !== memoryRevision) throw new Error(tr('记忆已更新，请重新发送这一句'))
          signal.throwIfAborted()
        } while (state.paused || dialogue.size || inputPending)
      },
    }
    await speech.beforeStart()
    set({ thinking: null, turns: state.turns + 1 })
    if (!r.text.trim()) {
      actors.get(me.id)?.react({ at: 0, feeling: r.emotion, action: r.action, ...r.cues?.[0] })
      for (const reaction of r.listeners ?? []) {
        const listener = actors.get(reaction.who)
        if (listener?.item.reactions?.listen !== false) listener?.react(reaction.cue)
      }
      return true
    }
    addViewer(chat)
    if (bySentence) {
      const segments = speechSegments(r.text), total = segments.reduce((sum, text) => sum + text.length, 0) || 1
      const actor = actors.get(me.id)
      let preparedVoice = actor?.prepare(segments[0], r.emotion, true, signal)
      let offset = 0
      for (let i = 0; i < segments.length; i++) {
        const text = segments[i]
        signal.throwIfAborted()
        while (state.paused || dialogue.size) await liveEvent(signal)
        const voice = await preparedVoice
        signal.throwIfAborted()
        if ((await memory.context([me.profileId ?? me.id], state.scope)).revision !== memoryRevision) throw new Error(tr('记忆已更新，请重新发送这一句'))
        if (voice?.mute && voiceRoute(me) !== 'none') throw new Error(actor?.voiceError || tr('声音播放失败，请检查声音设置'))
        preparedVoice = i + 1 < segments.length ? actor?.prepare(segments[i + 1], r.emotion, true, signal) : undefined
        // A cancelled future sentence may reject before playback reaches it.
        void preparedVoice?.catch(() => {})
        const start = offset / total, width = text.length / total
        const cues = r.cues?.filter((cue) => cue.at >= start && cue.at < start + width).map((cue) => ({ ...cue, at: (cue.at - start) / width }))
        const listeners = r.listeners?.filter(({ cue }) => cue.at >= start && cue.at < start + width).map((reaction) => ({ ...reaction, cue: { ...reaction.cue, at: (reaction.cue.at - start) / width } }))
        await deliver({ id: uid(), who: me.id, name: me.name, ...r, text, cues, listeners }, me, signal, voice, speech)
        offset += text.length
      }
    } else await deliver({ id: uid(), who: me.id, name: me.name, ...r }, me, signal, take, speech)
    if (liveOptions && !liveOptions.textOnly) {
      await take?.clip?.live?.whole
      const error = actors.get(me.id)?.voiceError
      if (error) throw new VoiceFailed(error)
    }
    return true
  } catch (error) {
    if (parent.aborted || !turn.signal.aborted) throw error
    return false
  } finally {
    if (spoke) speechListeners.forEach((listener) => listener({ character: me.id, scope, speaking: false, final: true, cancelled: signal.aborted || hadCut }))
    turn.abort()
    signal.removeEventListener('abort', cancelPrepared)
    if (currentTurn === turn) { currentTurn = null; set({ thinking: null }); actors.get(me.id)?.setPhase('waiting') }
  }
}

/** the conversation answers once and stops (you said something on your own): nothing to make ahead */
let single = false

/** your line, said by whom it is from */
async function yours(line: Line, signal: AbortSignal) {
  await deliver(line, characters(store.get()).find((character) => character.id === line.who) ?? null, signal)
  signal.throwIfAborted()
  await rememberLine(line)
}

async function consumeInput(signal: AbortSignal) {
  if (switching) { await switching; signal.throwIfAborted() }
  const { line, transcribed } = queue.shift()!
  if (transcribed) {
    if (!state.lines.some((entry) => entry.id === line.id)) set({ lines: [...state.lines, line] })
    await rememberLine(line)
  } else await yours(line, signal)
}

async function rememberLine(line: Line, target?: CharacterItem) {
  const remembered = line.text.match(/^(?:请)?记住(?:这件事)?[：:，,\s]*(.+)$/s)?.[1] ?? line.text.match(/^remember\s+(.+)$/is)?.[1]
  if (!remembered || (loadBrainConfig().kind === 'demo' && state.mode !== 'realtime')) return
  const character = target ?? characters(store.get()).find((candidate) => candidate.id === forced && candidate.lines === 'ai')
    ?? characters(store.get()).find((candidate) => candidate.lines === 'ai' && !candidate.remote)
  if (character) await memory.remember({ profileId: character.profileId ?? character.id, scope: state.scope, text: remembered.trim(), sourceSessionId: state.sessionId, sourceLineIds: [line.id] })
}

/** your character's turn: wait for your line, or a skip */
function waitFor(c: CharacterItem, signal: AbortSignal) {
  set({ waiting: c.id, as: c.id })
  return new Promise<Line | null>((resolve, reject) => {
    const abort = () => { answer = null; set({ waiting: null }); reject(signal.reason) }
    answer = (l) => { signal.removeEventListener('abort', abort); answer = null; set({ waiting: null }); resolve(l) }
    signal.addEventListener('abort', abort, { once: true })
  })
}

/** a 对谈 turn: a clip that won't play keeps its subtitle (the character shows the voice error) and the talk goes on,
 *  as it always did; the turn was already counted, so a voice that keeps failing still ends at the turn limit */
async function talkOn(who: CharacterItem, signal: AbortSignal) {
  try { await aiTurn(who, signal) } catch (e) { if (!(e instanceof VoiceFailed) || signal.aborted) throw e }
}

async function run(once: boolean) {
  ctrl?.abort()
  dropAhead()
  const c = new AbortController(); ctrl = c
  single = once; liveOptions = null; boundProfiles = castKey()
  // A public conversation consumes viewer inputs and opens only the public history.
  const audience = store.get().talk.danmaku > 0 && (chatState().status === 'on' || viewers.available(Date.now(), isBlocked))
  const scope: MemoryScope = audience ? 'public' : sessionScope()
  const switchScope = scope !== state.scope && loadBrainConfig().kind !== 'demo'
  set({ running: true, mode: 'conversation', waitingAudience: false, until: 0, ended: '', paused: false, error: '',
    ...(switchScope ? { scope, sessionId: '', lines: [], speaking: null } : {}),
  }, !switchScope)
  try {
    if (profiles().length) await openHistory(scope, c.signal)
    else { chatHistory.reset(); set({ sessionId: '', scope }) }
    // characters still loading (a template just placed, its players not made yet) are waited for, a little
    const loading = () => characters(store.get()).some((x) => x.lines === 'ai' && !['ready', 'error'].includes(actors.get(x.id)?.status ?? ''))
    for (let i = 0; i < 60 && loading(); i++) await wait(250, c.signal)
    do {
      while (queue.length) await consumeInput(c.signal)
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
          await talkOn(me, c.signal)
          if (!queue.length) break
          while (queue.length) await consumeInput(c.signal)
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
      } else await talkOn(who, c.signal)
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
    if (e instanceof NeedModel) set({ needModel: true, modelIntent: 'conversation' })
    else if (!c.signal.aborted) set({ error: (e as Error).message })
  } finally {
    if (ctrl === c) { ctrl = null; set({ running: false, paused: false, thinking: null, waiting: null }); looks(null, null) }
  }
}

async function runLive(options: LiveOptions) {
  const config = loadBrainConfig()
  if (!brainReady(config) || config.kind === 'demo') { set({ error: tr("AI 主播需要接上模型；离线演示可在「对谈」里体验"), needModel: true, modelIntent: 'live' }); return }
  const cast = characters(store.get()).filter((c) => c.lines === 'ai')
  if (!cast.length) { set({ error: tr("先添加一个「AI 来演」的角色") }); return }
  const airiModel = options.airi && airiModelForCast(config, cast)
  if (options.airi && !airiModel) {
    set({ error: tr('内置 AIRI 需要一个本地 AI 角色和流式模型接口') }); return
  }
  const gameHost = desktop?.airiGame, gameConfig = options.airi?.game
  if (gameConfig && !gameHost) { set({ error: tr('当前桌面版本不支持 AIRI 游戏') }); return }
  if (options.airi && !options.textOnly && !cast[0].muted && voiceRoute(cast[0]) === 'livliv') {
    set({ error: tr('内置 AIRI 支持自配语音接口、系统朗读或仅字幕') }); return
  }
  if (!options.textOnly && cast.some((c) => voiceRoute(c) === 'none')) { set({ error: tr("AI 角色还没有声音，请在设置里接上声音，或选择「仅字幕」") }); return }
  const c = new AbortController(); ctrl = c
  dropAhead(); viewers.clear(); queue.length = 0; externalQueue.length = 0; dialogue.clear(); activeEvent = null
  liveOptions = options
  single = false; boundProfiles = castKey()
  const offAiriCast = airiModel ? bindAiri(c, airiModel, cast[0], options.airi?.windowId) : undefined
  const engine = airi
  const until = Date.now() + options.minutes * 60_000
  set({ running: true, mode: 'live', paused: false, waitingAudience: true, turns: 0, generations: 0, generationLimit: options.maxGenerations, until, retryAt: 0, ended: '', error: '',
    engine: engine ? 'airi' : undefined, game: gameConfig ? { name: gameConfig.game, status: 'connecting', text: '' } : undefined,
    scope: 'public', sessionId: '', lines: [], speaking: null,
  }, false)
  const deadline = setTimeout(() => {
    if (ctrl !== c || c.signal.aborted) return
    set({ ended: tr("已达到本次时长上限") }); c.abort(); hush(); actors.forEach((a) => a.silence())
  }, until - Date.now())
  let lastReply = Date.now() - 6000, failures = 0, replyToOwner = false
  let retryChat: Chat | null = null
  let attached: AiriGameConnection | undefined
  let offGame: (() => void) | undefined
  const gameId = gameConfig ? crypto.randomUUID() : undefined
  let closingGame: Promise<void> | undefined
  const closeGame = () => {
    if (!gameId || !gameHost) return
    closingGame ??= gameHost.stop(gameId).catch((error: unknown) => {
      console.warn('[AIRI game close]', error)
      if (ctrl === c || (!ctrl && state.mode === 'live')) set({ error: airiGameError(error) })
    })
  }
  c.signal.addEventListener('abort', closeGame, { once: true })
  try {
    await openHistory('public', c.signal)
    // The template may have just mounted; use the same loading window as conversation mode.
    for (let i = 0; i < 60 && cast.some((x) => !actors.get(x.id) || actors.get(x.id)?.status === 'loading'); i++) await wait(250, c.signal)
    if (cast.some((x) => actors.get(x.id)?.status !== 'ready')) throw new Error(tr("有 AI 角色尚未载入，请检查角色列表"))
    if (engine && gameHost && gameConfig && gameId) {
      c.signal.throwIfAborted()
      attached = await gameHost.connect(gameId, gameConfig)
      c.signal.throwIfAborted()
      engine.game = attached
      offGame = gameHost.onEvent((event) => {
        if (airi !== engine || c.signal.aborted || event.connection !== engine.game?.id) return
        const text = airiGameText(event)
        if (event.status === 'disconnected') {
          engine.game = undefined
          set({ game: { name: gameConfig.game, status: 'offline', text } })
        } else if (event.status === 'done' || event.status === 'failed') {
          set({ game: { name: gameConfig.game, status: 'ready', text } })
        } else if (event.status === 'unknown') {
          set({ game: { name: gameConfig.game, status: 'playing', text } })
        }
        talk.externalEvent({ id: uid(), source: gameName(gameConfig.game), message: text, character: engine.actorId,
          reply: event.status === 'chat' || event.status === 'done' || event.status === 'failed' ? 'maybe' : 'never' })
      })
      set({ game: { name: gameConfig.game, status: 'ready', text: '' } })
    }
    for (;;) {
      if (state.generations >= options.maxGenerations) {
        if (state.game?.status === 'playing' || state.game?.status === 'submitting') { await liveEvent(c.signal); continue }
        break
      }
      while (state.paused || dialogue.size || inputPending || externalDecisions) await liveEvent(c.signal)
      while (queue.length) { await consumeInput(c.signal); replyToOwner = true }
      c.signal.throwIfAborted()
      if (state.paused || dialogue.size || inputPending || externalDecisions) continue
      const now = Date.now(), cooldown = lastReply + 6000 - now
      if (cooldown > 0 && !replyToOwner) { await liveEvent(c.signal, cooldown); continue }
      const warmupAt = options.warmupSeconds ? lastReply + options.warmupSeconds * 1000 : Infinity
      if (retryChat && isBlocked(retryChat.user)) retryChat = null
      if (!replyToOwner && !retryChat && !activeEvent && !externalQueue.length && !viewers.available(now, isBlocked) && now < warmupAt) {
        set({ waitingAudience: true })
        await liveEvent(c.signal, Number.isFinite(warmupAt) ? warmupAt - now : undefined)
        continue
      }
      activeEvent ??= !replyToOwner && !retryChat ? externalQueue.shift() ?? null : null
      const chat: Chat | null = activeEvent || (options.airi && replyToOwner) ? null : retryChat ?? viewers.take(now, isBlocked)
      const pool = voices().filter((x) => x.lines === 'ai')
      const who = activeEvent?.character ? pool.find((x) => x.id === activeEvent!.character) : pool.find((x) => x.id === forced) ?? freePick(pool.filter((x) => pool.length === 1 || x.id !== lastTurn))
      forced = null
      if (!who) throw new Error(tr("舞台上没有已就绪的 AI 角色"))
      set({ waitingAudience: false })
      const turnsBefore = state.turns
      try {
        const beforeInput = inputEpoch
        const completed = await aiTurn(who, c.signal, chat, replyToOwner)
        if (!completed) {
          if (beforeInput !== inputEpoch) { retryChat = null; replyToOwner = false; activeEvent = null }
          else retryChat = chat
          continue
        }
        retryChat = null; replyToOwner = false; activeEvent = null
      } catch (e) {
        if ((engine && (gameConfig || engine.windowId)) || e instanceof NeedModel || e instanceof GenerationLimit || c.signal.aborted) throw e
        // A streamed reply may already have delivered a sentence. Retry only the input that is still unanswered.
        if (engine ? state.turns !== turnsBefore : e instanceof VoiceFailed) { retryChat = null; replyToOwner = false; activeEvent = null }
        else retryChat = chat
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
    if (e instanceof GenerationLimit) set({ ended: tr('已达到本次生成次数上限') })
    else if (e instanceof NeedModel) set({ needModel: true, modelIntent: 'live' })
    else if (!c.signal.aborted) set({ error: gameConfig ? airiGameError(e) : (e as Error).message, ended: failures >= LIVE_FAILURES ? tr("连续出错 {0} 次，已停止", LIVE_FAILURES) : tr("会话因错误停止") })
  } finally {
    clearTimeout(deadline)
    offGame?.()
    c.signal.removeEventListener('abort', closeGame)
    closeGame()
    await closingGame
    offAiriCast?.()
    if (ctrl === c) {
      ctrl = null; liveOptions = null; airi = null; activeEvent = null; hush(); actors.forEach((a) => a.silence())
      set({ running: false, paused: false, thinking: null, speaking: null, waiting: null, waitingAudience: false, retryAt: 0, engine: undefined, game: undefined }); looks(null, null)
    }
  }
}

async function startChatSession(chosen: MemoryScope = state.chatScope, target?: string, firstInput?: ChatInput) {
  const scope = sessionScope(chosen)
  if (state.running) {
    if ((state.mode === 'chat' || (state.mode === 'live' && airi)) && state.scope === scope
      && (!airi || (state.sessionId && (!target || airi.actorId === target)))) return
    throw new Error(tr('请先停止当前会话'))
  }
  const config = loadBrainConfig()
  if (!brainReady(config) || config.kind === 'demo') { set({ needModel: true, modelIntent: firstInput ? 'input' : 'chat' }); throw new Error(tr('持续聊天需要接上 AI 模型')) }
  if (!profiles().length) {
    const error = tr('先添加一个「AI 来演」的角色')
    set({ error }); throw new Error(error)
  }
  const preferred = preferredAiriForChat(config, target)
  const controller = new AbortController(); ctrl = controller
  dropAhead(); single = true; liveOptions = null; forced = target ?? null; boundProfiles = castKey()
  externalQueue.length = 0; dialogue.clear(); activeEvent = null
  const offAiriCast = preferred ? bindAiri(controller, preferred.model, preferred.actor) : undefined
  const unbind = () => { offAiriCast?.() }
  const settings = store.get().talk
  const minutes = Math.max(1, Math.min(240, settings.chatMinutes ?? 60))
  set({ running: true, mode: 'chat', scope, sessionId: '', lines: [], speaking: null, waitingInput: false, paused: false, thinking: null, waitingAudience: false,
    engine: preferred ? 'airi' : undefined, game: undefined,
    generations: 0, generationLimit: Math.max(1, Math.min(500, settings.chatGenerations ?? 100)), turns: 0,
    until: Date.now() + minutes * 60000, ended: '', error: '' }, false)
  try {
    await openHistory(scope, controller.signal)
    for (let i = 0; i < 60 && !voices().some((character) => character.lines === 'ai'); i++) await wait(250, controller.signal)
    if (!voices().some((character) => character.lines === 'ai')) throw new Error(tr('有 AI 角色尚未载入，请检查角色列表'))
    controller.signal.throwIfAborted()
    if (firstInput) {
      if (firstInput.transcribed) set({ lines: [...state.lines, firstInput.line] })
      queue.unshift(firstInput)
    }
    void runChat(controller, unbind)
  } catch (error) {
    unbind()
    if (ctrl === controller) {
      ctrl = null; airi = null
      set({ running: false, engine: undefined, error: controller.signal.aborted ? '' : error instanceof Error ? error.message : String(error) })
    }
    throw error
  }
}

async function runChat(controller: AbortController, unbind: () => void) {
  const signal = controller.signal
  const deadline = setTimeout(() => { set({ ended: tr('已达到本次时长上限') }); interruptTurn(); controller.abort() }, Math.max(0, state.until - Date.now()))
  let requested = !state.lines.length, replyToOwner = false, lastReply = Date.now(), nudges = 0
  try {
    while (state.generations < state.generationLimit) {
      signal.throwIfAborted()
      while (state.paused || dialogue.size || inputPending || externalDecisions) await liveEvent(signal)
      if (state.generations >= state.generationLimit) break
      if (queue.length) {
        while (queue.length) await consumeInput(signal)
        requested = true; replyToOwner = true; nudges = 0
      }
      if (state.paused || dialogue.size || inputPending || externalDecisions) continue
      activeEvent = state.scope === 'public' && !(airi && replyToOwner) ? externalQueue.shift() ?? null : null
      if (activeEvent) requested = true
      if (forced) requested = true
      if (!requested) {
        set({ waitingInput: true })
        actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('waiting') })
        const seconds = store.get().talk.proactiveSeconds ?? 0
        const remaining = seconds && nudges < 1 ? lastReply + seconds * 1000 - Date.now() : Infinity
        if (remaining <= 0) { requested = true; nudges++ }
        else { await liveEvent(signal, Number.isFinite(remaining) ? remaining : undefined); continue }
      }
      set({ waitingInput: false })
      const pool = voices().filter((character) => character.lines === 'ai')
      const lastHuman = [...state.lines].reverse().find((line) => line.human && !line.audience)
      const speaker = pool.find((character) => character.id === (activeEvent?.character ?? forced))
        ?? pool.find((character) => lastHuman?.text.includes(character.name)) ?? freePick(pool)
      forced = null
      if (!speaker) throw new Error(tr('舞台上没有已就绪的 AI 角色'))
      const beforeInput = inputEpoch
      const completed = await aiTurn(speaker, signal, null, replyToOwner)
      requested = !completed && beforeInput === inputEpoch
      replyToOwner &&= requested
      activeEvent = null; lastReply = Date.now()
    }
    set({ ended: tr('已达到本次生成次数上限') })
  } catch (error) {
    if (error instanceof GenerationLimit) set({ ended: tr('已达到本次生成次数上限') })
    else if (!signal.aborted) set({ error: error instanceof Error ? error.message : String(error) })
  } finally {
    unbind()
    clearTimeout(deadline)
    if (ctrl === controller) {
      ctrl = null; airi = null; activeEvent = null; actors.forEach((actor) => actor.silence())
      set({ running: false, paused: false, thinking: null, speaking: null, waitingInput: false, engine: undefined }); looks(null, null)
    }
  }
}

export const talk = {
  /** The transport owns audio; this session owns the archive, memory scope and stage lifecycle. */
  async realtime(controls: RealtimeControls, until: number, character: CharacterItem, chosen: MemoryScope = state.chatScope): Promise<RealtimeSession | null> {
    if (state.running) return null
    const scope = sessionScope(chosen)
    const controller = new AbortController(); ctrl = controller
    dropAhead(); queue.length = 0; realtimeControls = controls; boundProfiles = castKey(); liveOptions = null
    set({ running: true, mode: 'realtime', scope, sessionId: '', lines: [], paused: false, thinking: null, speaking: null, waiting: null, waitingAudience: false, waitingInput: true,
      turns: 0, generations: 0, generationLimit: Math.max(1, Math.min(500, store.get().talk.chatGenerations ?? 100)), until, error: '', ended: '', needModel: false }, false)
    try {
      await openHistory(state.scope, controller.signal)
      await chatHistory.save(state.lines)
      const context = await chatHistory.context(character.profileId ?? character.id, state.lines, state.scope)
      controller.signal.throwIfAborted()
      const used = conversationContext(context.lines, context.summary)
      const memoryIds = [...new Set([...context.memories.map((entry) => entry.id), ...(context.summary?.memoryIds ?? []), ...context.lines.flatMap((line) => line.memoryIds ?? [])])]
      const mine = () => realtimeControls === controls
      const session: RealtimeSession = {
        context: { earlier: used.earlier, history: used.history, memories: context.memories.map(({ id, text }) => ({ id, text })) },
        line(line, complete = true) {
          if (!mine()) return
          const exists = state.lines.some((value) => value.id === line.id)
          if (!line.human) line = { ...line, memoryIds, memoryRevision: context.revision }
          const lines = exists ? state.lines.map((value) => value.id === line.id ? line : value) : [...state.lines, line]
          set({ lines, ...(state.speaking?.id === line.id ? { speaking: line } : {}) }, complete)
          if (complete && line.human && !line.audience && !exists) void rememberLine(line, character).catch((error: unknown) => {
            if (mine()) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) })
          })
        },
        state(thinking, speaking) {
          if (!mine()) return
          if (speaking && state.speaking?.id !== speaking.id) looks(character, speaking)
          else if (thinking) actors.get(thinking)?.setPhase('thinking')
          else if (!speaking) actors.get(character.id)?.setPhase('waiting')
          set({ thinking, speaking, waitingInput: !thinking && !speaking })
        },
        speech(speaking, final, cancelled = false) {
          if (mine()) speechListeners.forEach((listener) => listener({ character: character.id, scope, speaking, final, cancelled }))
        },
        turn() {
          if (!mine()) return false
          if (state.generations >= state.generationLimit) { session.end('', tr('已达到本次生成次数上限')); return false }
          set({ turns: state.turns + 1, generations: state.generations + 1 }); return true
        },
        end(error = '', reason = '') { if (mine()) { talk.stop(); set({ error, ended: reason }) } },
      }
      const sessionId = state.sessionId
      offRealtimeHistory = memory.subscribe(() => {
        void Promise.all([memory.context([character.profileId ?? character.id], scope), memory.session(sessionId)]).then(([latest, saved]) => {
          if (!mine()) return
          if (!saved) session.end('', tr('对话记录已删除，请重新开始实时语音'))
          else if (latest.revision !== context.revision) session.end('', tr('记忆已更新，请重新开始实时语音'))
        }, (error: unknown) => { if (mine()) session.end(tr('对话未保存：{0}', error instanceof Error ? error.message : String(error))) })
      })
      return session
    } catch (error) {
      if (realtimeControls === controls) {
        set({ error: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) })
        talk.stop()
      }
      throw error
    }
  },
  /** the model was asked for and shown (the model card opened) */
  modelAsked() { if (state.needModel) set({ needModel: false }) },
  startChat: startChatSession,
  onSpeech(listener: (event: SpeechEvent) => void) { speechListeners.add(listener); return () => { speechListeners.delete(listener) } },
  async restore(signal = new AbortController().signal) {
    if (isOutput || (loadBrainConfig().kind === 'demo' && state.mode !== 'realtime')) return
    if (state.running) { if (boundProfiles === castKey()) return; talk.stop() }
    cancelRestore()
    if (!profiles().length) { chatHistory.reset(); set({ sessionId: '' }); return }
    const controller = new AbortController(), active = AbortSignal.any([signal, controller.signal])
    restoreRequest = { controller, signal: active }
    try { await openHistory(state.scope, active) }
    catch (error) { if (!active.aborted) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
    finally { if (restoreRequest?.controller === controller) restoreRequest = null }
  },
  async setScope(scope: MemoryScope) {
    if (state.running || (scope === 'private' && outputOn())) return false
    try { await openHistory(scope, new AbortController().signal); set({ chatScope: scope }); return true }
    catch (error) { set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }); return false }
  },
  async newChat() {
    talk.stop()
    try { await openHistory(state.scope, new AbortController().signal, true); await chatHistory.save([]) }
    catch (error) { set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
  },
  async openSession(id: string) {
    if (state.running) return
    cancelRestore()
    try {
      const session = await chatHistory.select(id, profiles(), state.scope)
      restoring = true
      try { set({ sessionId: session.id, lines: session.lines }) } finally { restoring = false }
    } catch (error) { set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
  },
  detach() { talk.stop(); chatHistory.reset(); set({ lines: [], sessionId: '', turns: 0, scope: 'private', chatScope: 'private', storageError: '' }) },
  hearing(active = true, options: { interrupt?: boolean } = {}) {
    if (!realtimeControls) {
      inputPending = active
      if (active) { inputEpoch++; if (options.interrupt || state.mode === 'chat' || airi || store.get().talk.cutIn) interruptTurn() }
    }
    if (active) actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('listening') })
    wakeLive?.()
  },
  externalEvent(event: ExternalEvent): boolean {
    if (!state.running || state.scope !== 'public' || externalSeen.has(event.id)) return false
    if (airi && (!state.sessionId || (event.character && event.character !== airi.actorId))) return false
    if (realtimeControls && !realtimeControls.event(event)) return false
    externalSeen.add(event.id)
    if (externalSeen.size > 512) externalSeen.delete(externalSeen.values().next().value!)
    set({ lines: [...state.lines, { id: uid(), who: `external:${event.source}`, name: event.source, text: event.message.slice(0, 4000), emotion: 'neutral', action: 'none', to: null, human: true, audience: true }] })
    if (realtimeControls) return true
    if (event.reply === 'always' || (event.reply === 'maybe' && !state.speaking && !state.thinking && !externalQueue.length)) externalQueue.push(event)
    if (externalQueue.length > 16) externalQueue.shift()
    wakeLive?.(); return true
  },
  externalDialogue(event: { id: string; started: boolean; character?: string }) {
    if (event.started) {
      if (!state.running || state.scope !== 'public') return
      if (airi && (!state.sessionId || event.character !== airi.actorId)) return
      dialogue.add(event.id); interruptTurn()
    } else dialogue.delete(event.id)
    realtimeControls?.pause(state.paused || dialogue.size > 0)
    wakeLive?.()
  },
  async decideExternalAction(request: ExternalActionRequest, incoming: AbortSignal) {
    if (!ctrl || !state.running || state.scope !== 'public' || state.paused) throw new Error(tr('请先开启公开的游戏互动会话'))
    const engine = airi
    if (engine && (!state.sessionId || request.character !== engine.actorId)) throw new Error(tr('参与角色已改变，请重新开始会话'))
    const actor = characters(store.get()).find((character) => character.id === request.character && character.lines === 'ai' && !character.remote)
    if (!actor) throw new Error(tr('先选择一个 AI 角色'))
    const signal = AbortSignal.any([ctrl.signal, incoming, AbortSignal.timeout(45000)])
    externalDecisions++
    try {
      if (request.priority === 'critical' || request.priority === 'high') interruptTurn()
      while (currentTurn) await wait(40, signal)
      signal.throwIfAborted()
      if (state.paused || state.generations >= state.generationLimit) throw new Error(tr('会话已暂停或达到生成上限'))
      set({ generations: state.generations + 1 })
      const frame = engine?.windowId ? await desktop?.vision?.frame(engine.windowId) : undefined
      signal.throwIfAborted()
      if (engine?.windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
      const action = engine
        ? await chooseAiriGameAction(engine.model, actor, store.get().talk.language, request, signal, frame ?? undefined)
        : await decideExternalAction(loadBrainConfig(), actor, request, signal)
      signal.throwIfAborted()
      if (state.paused) throw new Error(tr('会话已暂停或达到生成上限'))
      return action
    } finally { externalDecisions--; wakeLive?.() }

  },
  async playGame(instruction: string) {
    const engine = airi, game = engine?.game, host = desktop?.airiGame, parent = ctrl, sessionId = state.sessionId
    if (!engine || !game || !host || !parent || !sessionId || state.scope !== 'public' || state.paused || state.game?.status !== 'ready') {
      throw new Error(tr('请先在 AIRI 开启游戏直播'))
    }
    const actor = characters(store.get()).find((character) => character.id === engine.actorId)
    const query = instruction.trim().slice(0, 500)
    if (!actor || !query) return
    if (state.generations >= state.generationLimit) throw new Error(tr('会话已暂停或达到生成上限'))
    const signal = AbortSignal.any([parent.signal, AbortSignal.timeout(45_000)])
    const profile = actor.profileId ?? actor.id
    set({ generations: state.generations + 1, game: { name: game.game, status: 'submitting', text: '' } })
    try {
      const [context, snapshot] = await Promise.all([chatHistory.context(profile, state.lines, 'public'), host.snapshot(game.id, true)])
      const stillCurrent = async () => {
        signal.throwIfAborted()
        if (airi !== engine || engine.game !== game || sessionId !== state.sessionId || state.scope !== 'public' || state.paused) {
          throw new Error(tr('游戏连接已关闭或会话已暂停'))
        }
        if ((await memory.context([profile], 'public')).revision !== context.revision) throw new Error(tr('记忆已更新，请重新发送这一句'))
        signal.throwIfAborted()
      }
      const facts = context.memories.slice(0, 12).map((entry) => entry.text.slice(0, 300))
      const frame = snapshot.frame ?? (engine.windowId ? await desktop?.vision?.frame(engine.windowId) : null)
      if (engine.windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
      await stillCurrent()
      const decision = await chooseAiriGameAction(engine.model, actor, store.get().talk.language, {
        character: actor.id, source: gameName(game.game), query, priority: 'medium', silent: true, actions: game.actions,
        state: JSON.stringify({ observation: snapshot.state, rememberedFacts: facts }),
      }, signal, frame ?? undefined, stillCurrent)
      if (!decision) throw new Error(tr('AIRI 没有选出适合的游戏动作'))
      await stillCurrent()
      const text = airiGameText(await host.execute(game.id, decision))
      if (airi !== engine || engine.game !== game || parent.signal.aborted) return
      if (conversation().game?.status === 'submitting') set({ game: { name: game.game, status: game.game === 'minecraft' ? 'playing' : 'ready', text } })
      talk.externalEvent({ id: uid(), source: gameName(game.game), message: text, character: actor.id, reply: 'never' })
    } catch (error) {
      if (airi === engine && engine.game === game && !parent.signal.aborted) {
        set({ game: { name: game.game, status: 'ready', text: airiGameError(error) } })
      }
    } finally { wakeLive?.() }
  },
  async cancelGame() {
    if (airi?.game?.game === 'minecraft') await desktop?.airiGame?.cancel(airi.game.id)
  },
  /** they talk until the limit (a new limit's worth of AI lines, from where they are). Gives what stops this run only,
   *  not one started after it */
  start(): (() => void) | null {
    if (state.running) return null
    if (loadBrainConfig().kind === 'demo' && demoFor(voices())) talk.detach()
    set({ turns: 0 }); void run(false)
    const mine = ctrl
    return () => { if (mine && ctrl === mine) talk.stop() }
  },
  startLive(options: LiveOptions) {
    if (state.running) return
    void runLive({ minutes: Math.max(1, Math.min(240, Math.round(options.minutes) || 30)), maxGenerations: Math.max(1, Math.min(500, Math.round(options.maxGenerations) || 100)), warmupSeconds: [30, 60, 120].includes(options.warmupSeconds) ? options.warmupSeconds : 0, textOnly: options.textOnly, airi: options.airi })
  },
  /** the line being said finishes, then they wait */
  pause() { if (state.running) { set({ paused: true }); realtimeControls?.pause(true); wakeLive?.() } },
  resume() { set({ paused: false }); realtimeControls?.pause(dialogue.size > 0); wakeLive?.() },
  stop() {
    cancelRestore()
    inputPending = false; activeEvent = null
    offRealtimeHistory(); offRealtimeHistory = () => {}
    realtimeControls?.interrupt()
    const realtime = realtimeControls; realtimeControls = null; realtime?.stop()
    interruptTurn(); ctrl?.abort(); ctrl = null; liveOptions = null; airi = null; queue.length = 0; externalQueue.length = 0; dialogue.clear(); cutting = false; clearTimeout(cutTimer)
    dropAhead()
    hush(); actors.forEach((a) => a.silence())
    set({ running: false, paused: false, thinking: null, speaking: null, waitingInput: false, waiting: null, waitingAudience: false, retryAt: 0, ended: state.mode === 'live' ? tr("已手动停止") : '', engine: undefined, game: undefined })
    looks(null, null)
  },
  clear() { talk.stop(); viewers.clear(); lastTurn = null; chatHistory.invalidate(); set({ lines: [], turns: 0, error: '' }) },
  setLimit(n: number) { set({ limit: Math.max(1, Math.min(60, Math.round(n) || 1)) }) },
  setGap(s: number) { set({ gap: Math.max(0, Math.min(3, s)) }) },
  /** who you speak as: a character you play, or 'narrator' */
  setAs(id: string) { set({ as: id }) },
  /** a line out of what they remember (it is no longer part of the conversation) */
  forget(id: string) { if (realtimeControls) return; interruptTurn(); chatHistory.invalidate(); set({ lines: state.lines.filter((l) => l.id !== id) }) },
  /** back to just before this line: it and everything after are gone */
  rewind(id: string) {
    if (state.running) return
    const i = state.lines.findIndex((l) => l.id === id)
    if (i >= 0) { chatHistory.invalidate(); lastTurn = state.lines[i - 1]?.who ?? null; set({ lines: state.lines.slice(0, i), error: '' }) }
  },
  /** the last line said again, differently */
  redo() {
    if (state.running) return
    const last = state.lines.at(-1)
    if (last && !last.human) { chatHistory.invalidate(); set({ lines: state.lines.slice(0, -1) }) }
    void run(true)
  },
  /** your character's turn passes */
  skip() { answer?.(null) },
  /** on to the next line now: your turn skipped, the line being said cut off, or the pause ended */
  next() {
    if (realtimeControls) { realtimeControls.interrupt(); return }
    if (!state.running) { talk.start(); return }
    if (airi && currentTurn) { inputEpoch++; interruptTurn(); return }
    if (answer) answer(null)
    else if (state.speaking) cut(state.speaking.id, true)
    else if (state.mode === 'chat') { forced = voices().find((character) => character.lines === 'ai')?.id ?? null; wakeLive?.() }
    else hurry?.()
  },
  /** this character speaks next (a click on its card): an AI one after the current line, or, idle, at once; one you
   *  play becomes who the console speaks as */
  nextUp(id: string) {
    if (realtimeControls) return
    const c = voices().find((x) => x.id === id)
    if (!c) return
    if (c.lines === 'me') { set({ as: c.id }); return }
    forced = c.id
    if (!state.running) void run(true)
    else if (!state.speaking && !answer) { hurry?.(); wakeLive?.() }
  },
  /** you say something, as whom the console says. On your character's turn it is that turn; otherwise it waits for
   *  the current line (or cuts it off, cutIn) and they answer */
  say(text: string, options: { respond?: boolean; transcribed?: boolean } = {}) {
    const t = text.trim()
    if (!t) return
    if (realtimeControls) { realtimeControls.say(t); return }
    if (state.running && (state.mode === 'chat' || airi) && !state.sessionId) { set({ error: tr('会话正在准备，请稍后再发') }); return false }
    const me = played()
    const c = me.find((x) => x.id === (state.waiting ?? state.as)) ?? (state.as === 'narrator' ? undefined : me[0])
    const line: Line = { id: uid(), who: c?.id ?? 'me', name: c?.name ?? tr("旁白"), text: t.slice(0, 200), emotion: 'neutral', action: 'none', to: null, human: true }
    set({ error: '' })
    if (desktop?.vision && !state.running && options.respond !== false && profiles().length) {
      const model = loadBrainConfig()
      if (model.kind !== 'demo') {
        return startChatSession(state.chatScope, undefined, { line, transcribed: options.transcribed === true }).then(() => true, () => false)
      }
    }
    if (options.transcribed || options.respond === false) set({ lines: [...state.lines, line] })
    if (options.respond === false) return
    if (answer) { answer(line); return }
    queue.push({ line, transcribed: options.transcribed === true })
    wakeLive?.()
    if (!state.running) { void run(true); return }
    if (airi) inputEpoch++
    if (state.mode === 'chat' || airi || store.get().talk.cutIn) interruptTurn()
  },
}
