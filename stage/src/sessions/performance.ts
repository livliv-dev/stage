// A line said on the stage: by its character (in its voice, or shown only), or by the narrator (shown only). Before a
// line the speaker looks at whom it talks to and the others turn to it, a moment apart; listeners react as it plays.
// AI characters can cut each other off (interrupt: now and then, often): the line stops part way and the next one
// starts with a short interjection. Who speaks and when is the runner's; how a line is played is here.
import { actors, faceOf, type Take } from '../actors'
import { participants, store, type CharacterItem } from '../scene'
import { estimate } from '../speech'
import { demoReactions } from '../demo'
import type { Line } from '../core/lines'
import type { MemoryScope } from '../memory'
import { chance } from './chance'
import { clock } from './clock'
import { session, voices, VoiceFailed } from './context'
import { conversation, set } from './state'
import { sleep } from './wake'

/** a character starting or stopping to speak, as the Neuro bridge and others hear it */
export type SpeechEvent = { character: string; scope: MemoryScope; speaking: boolean; final?: boolean; cancelled?: boolean }
const speechListeners = new Set<(event: SpeechEvent) => void>()
export function onSpeech(listener: (event: SpeechEvent) => void) { speechListeners.add(listener); return () => { speechListeners.delete(listener) } }
export const tellSpeech = (event: SpeechEvent) => speechListeners.forEach((listener) => listener(event))

/** what the speak path hears from a line played: an AI line started (the next is made ahead), a line cut (what was
 *  made ahead no longer follows) */
export const hooks = { aiLineStarted: () => {}, cutOff: () => {} }

/** the next AI line cuts into the one before */
let cutting = false
let cutTimer = 0
/** the next AI line cuts in (and the flag is spent) */
export function takeCutting() { const was = cutting; cutting = false; return was }
export const isCutting = () => cutting
/** no cut-in pending (the session stopped) */
export function clearCutting() { cutting = false; clock.clear(cutTimer) }

/** glances planned for the line being said (cleared by the next one) */
let glances: number[] = []
const later = (seconds: number, f: () => void) => { glances.push(clock.timeout(f, seconds * 1000)) }

/** who looks where while a line is said (characters whose eyes follow people; a tracked face or the mouse decides for
 *  its own). The speaker looks at whom the line is for: who the AI says it looks at, else whom it names, else someone
 *  it mentions, else whom it answers; at the audience or down and aside when the AI says so. The one it is for looks
 *  back (eye contact); the others watch the speaker and glance at the one it is for, or at someone it mentions, now
 *  and then. A longer line to someone may turn to the audience for a moment. */
export function looks(speaker: CharacterItem | null, line: Line | null, seconds = 0) {
  for (const g of glances) clock.clear(g)
  glances = []
  const state = conversation()
  const all = participants(store.get())
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
    if (!speaker) { a.setPhase(state.waitingInput ? 'waiting' : 'idle'); a.rest(chance() * 0.4); continue }
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
        const f = faceOf(c), side = chance() < 0.5 ? -1 : 1
        a.look({ x: f.x + side * c.w * 0.6, y: f.y + c.h * 0.35 })
        later(Math.min(1.6, seconds * 0.5), () => a.look(answered ? faceOf(answered) : null))
      } else {
        a.look(toWhom ? faceOf(toWhom) : null)
        // a longer line to someone turns to the audience for a moment
        if (toWhom && seconds > 2.6 && chance() < 0.4) {
          later(seconds * (0.5 + chance() * 0.15), () => a.look(null))
          later(seconds * 0.5 + 1.1, () => a.look(faceOf(toWhom)))
        }
      }
      continue
    }
    a.listening = true
    if (c.id === toWhom?.id) { a.look(faceOf(speaker), 0.08 + chance() * 0.12); continue }  // looks back
    a.look(faceOf(speaker), 0.1 + chance() * 0.3)
    // a glance at the one it talks to, or at someone it mentions
    const other = toWhom ?? (mentioned && mentioned.id !== c.id ? mentioned : undefined)
    if (other && other.id !== c.id && seconds > 1.6 && chance() < 0.45) {
      const t0 = seconds * (0.3 + chance() * 0.3)
      later(t0, () => a.look(faceOf(other)))
      later(t0 + 0.9 + chance() * 0.6, () => a.look(faceOf(speaker)))
    }
  }
}

/** Content reactions follow audible playback; gaze can turn toward the speaker before the voice starts. */
function listenTo(speaker: CharacterItem | null, line: Line, seconds: number) {
  const all = participants(store.get())
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

/** the hooks a line said by an AI character gives its turn: before it starts (a wait and a check, which may throw: it
 *  is not said), as it starts and ends */
export type LineSpeech = { beforeStart(): Promise<void>; onStart(): void; onEnd(cancelled: boolean): void; final: boolean }

/** a line said: by its character (in its voice, or shown only), or by the narrator (shown only). AI lines may be
 *  cut off part way (interrupt), yours may cut theirs. `ready`: its voice, made already (an AI line's, while it
 *  thought) */
export async function deliver(line: Line, c: CharacterItem | null, signal: AbortSignal, ready?: Take, speech?: LineSpeech) {
  const scope = conversation().scope
  const a = c ? actors.get(c.id) : undefined
  const take = ready ?? (a && c ? await a.prepare(line.text, line.emotion, (!line.human || c.readAloud) && !c.muted, signal) : undefined)
  signal.throwIfAborted()
  // your line typed before an output switched the session to public: not said there
  if (line.human && conversation().scope !== scope) return
  const seconds = take?.seconds ?? estimate(line.text)
  looks(c, line, seconds)
  if (c && !line.human) await sleep(line.demo === undefined ? 260 : 140, signal)  // a look first, then the words
  if (speech) await speech.beforeStart()
  signal.throwIfAborted()
  if (line.human && conversation().scope !== scope) return
  session.lastTurn = c?.id ?? session.lastTurn; session.skipped = null
  line = { ...line, seconds }
  set({ speaking: line, lines: [...conversation().lines, line] })
  if (c && !line.human) { speech?.onStart(); tellSpeech({ character: c.id, scope, speaking: true, final: false }) }
  // a voice still coming in has only a guess for its length: the true one for what is drawn from here on (a video)
  const said = line
  void take?.clip?.live?.whole.then(() => { said.seconds = take.clip!.seconds }, () => {})
  if (c && !line.human) hooks.aiLineStarted()
  const t = store.get().talk
  const others = voices().filter((x) => x.lines === 'ai' && x.id !== c?.id)
  if (c && !line.human && line.demo === undefined && t.interrupt && others.length && line.text.length >= 14 && chance() < [0, 0.2, 0.45][t.interrupt]) {
    cutTimer = clock.timeout(() => cut(line.id), seconds * (0.5 + chance() * 0.25) * 1000)
  }
  try {
    const interrupted = () => cut(line.id, true)
    signal.addEventListener('abort', interrupted, { once: true })
    try {
    if (a && take) await a.perform(take, line.emotion, line.action, signal, line.cues, () => listenTo(c, line, seconds))
    else { listenTo(c, line, seconds); await new Promise<void>((r) => { const s = clock.timeout(r, seconds * 1000); signal.addEventListener('abort', () => { clock.clear(s); r() }, { once: true }) }) }
    await take?.clip?.live?.whole
    } catch (error) {
      cut(line.id, true)
      if (c && !line.human && !signal.aborted) throw new VoiceFailed((error as Error).message, { cause: error })
      throw error
    } finally { signal.removeEventListener('abort', interrupted) }
  } finally {
    clock.clear(cutTimer)
    if (c && !line.human) {
      const cancelled = signal.aborted || conversation().lines.find((entry) => entry.id === line.id)?.cut === true
      speech?.onEnd(cancelled)
      tellSpeech({ character: c.id, scope, speaking: false, final: speech?.final ?? true, cancelled })
    }
    if (conversation().speaking?.id === said.id) set({ speaking: null })
  }
}

/** the line being said stops here; the next AI line starts by cutting in */
export function cut(id: string, byYou = false) {
  const l = conversation().speaking
  if (!l || l.id !== id) return
  hooks.cutOff()
  looks(null, null)
  set({ lines: conversation().lines.map((x) => (x.id === id ? { ...x, cut: true } : x)) })
  if (!byYou) cutting = true
  actors.get(l.who)?.silence()
  actors.get(l.who)?.setPhase('interrupted')
}
