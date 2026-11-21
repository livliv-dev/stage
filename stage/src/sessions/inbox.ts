// What comes in to a session, in one queue, each item typed by where it came from: your lines (typed in the console or
// the Stage API, or heard and transcribed by push to talk and hands-free), viewers' messages (Twitch, a test message),
// other apps' events (the external events API, the Neuro bridge) and an AIRI game's. Producers push; the running
// session takes what its policy answers, in order. A viewer's message waits 30 s at most, eight wait at most, and a
// repeat (the same id, or the same viewer saying the same) is dropped; sixteen events wait at most. What holds a turn
// back (a game character talking, a game action being decided, you speaking) is not an item: those are the holds.
import { chatState, isBlocked, onChat, type Chat } from '../danmaku'
import { fresh, MESSAGES_REMEMBERED, MESSAGES_WAITING, repeats } from '../audience'
import { store } from '../scene'
import type { Line } from '../core/lines'
import type { ExternalEvent } from '../externalEvents'
import { chance } from './chance'
import { clock } from './clock'
import { conversation } from './state'
import { Wake } from './wake'

export type InboxItem =
  /** a line you typed */
  | { kind: 'typed'; line: Line }
  /** a line you said, heard and transcribed (already shown) */
  | { kind: 'transcript'; line: Line }
  /** a viewer's message */
  | { kind: 'viewer'; chat: Chat }
  /** another app's event (the external events API, the Neuro bridge) */
  | { kind: 'external'; event: ExternalEvent }
  /** an AIRI game's event */
  | { kind: 'game'; event: ExternalEvent }
export type Kind = InboxItem['kind']
export type YourLine = Extract<InboxItem, { kind: 'typed' | 'transcript' }>
/** a line of yours as the console gives it: typed, or heard (already shown) */
export type ChatInput = { line: Line; transcribed: boolean }
export const yourLine = ({ line, transcribed }: ChatInput): YourLine => transcribed ? { kind: 'transcript', line } : { kind: 'typed', line }
type Of<K extends Kind> = Extract<InboxItem, { kind: K }>

/** your lines, and the events a session answers */
export const YOURS = ['typed', 'transcript'] as const satisfies readonly Kind[]
export const EVENTS = ['external', 'game'] as const satisfies readonly Kind[]
const EVENTS_WAITING = 16, EVENTS_SEEN = 512

export class Inbox {
  private items: InboxItem[] = []
  /** viewers' messages pushed lately (repeats of them are dropped) */
  private recent: Chat[] = []
  /** events shown already, by id */
  private seen = new Set<string>()

  /** in at the end of the queue; false when refused (a viewer's message repeated) */
  push(item: InboxItem): boolean {
    if (item.kind === 'viewer') {
      const message = item.chat
      this.recent = this.recent.filter((m) => fresh(m, message.at))
      if (repeats(this.recent, message)) return false
      this.recent = [...this.recent, message].slice(-MESSAGES_REMEMBERED)
      this.items.push(item)
      this.keep(['viewer'], MESSAGES_WAITING)
      return true
    }
    this.items.push(item)
    if (item.kind === 'external' || item.kind === 'game') this.keep(EVENTS, EVENTS_WAITING)
    return true
  }
  /** in at the front: taken before any other of its kind (your first line, starting a chat) */
  pushFirst(item: YourLine) { this.items.unshift(item) }
  /** items of these kinds waiting */
  count(kinds: readonly Kind[]) { return this.items.filter((item) => kinds.includes(item.kind)).length }
  has(kinds: readonly Kind[]) { return this.items.some((item) => kinds.includes(item.kind)) }
  /** the first item of these kinds, taken */
  take<K extends Kind>(kinds: readonly K[]): Of<K> | undefined {
    const i = this.items.findIndex((item) => (kinds as readonly Kind[]).includes(item.kind))
    return i < 0 ? undefined : this.items.splice(i, 1)[0] as Of<K>
  }
  /** every item of these kinds thrown away; how many there were */
  drop(kinds: readonly Kind[]) {
    const before = this.items.length
    this.items = this.items.filter((item) => !kinds.includes(item.kind))
    return before - this.items.length
  }

  /** a viewer's message waiting at `now` (expired ones and blocked viewers' are let go) */
  viewerWaiting(now: number, blocked: (user: string) => boolean) {
    this.items = this.items.filter((item) => item.kind !== 'viewer' || (fresh(item.chat, now) && !blocked(item.chat.user)))
    return this.has(['viewer'])
  }
  /** the oldest viewer's message still waiting at `now` */
  takeViewer(now: number, blocked: (user: string) => boolean): Chat | null {
    this.viewerWaiting(now, blocked)
    return this.take(['viewer'])?.chat ?? null
  }
  /** a viewer's message taken back to the front, as if it had not been taken (what answered it was thrown away) */
  putBack(chat: Chat) {
    if (this.items.some((item) => item.kind === 'viewer' && item.chat === chat)) return
    this.items.unshift({ kind: 'viewer', chat })
    this.keep(['viewer'], MESSAGES_WAITING)
  }
  /** no viewer's message waiting, and none remembered */
  clearViewers() { this.drop(['viewer']); this.recent = [] }

  /** an event shown already (it is not shown or answered twice) */
  hasSeen(id: string) { return this.seen.has(id) }
  seenNow(id: string) {
    this.seen.add(id)
    if (this.seen.size > EVENTS_SEEN) this.seen.delete(this.seen.values().next().value!)
  }

  /** the newest `max` of these kinds stay; older ones go */
  private keep(kinds: readonly Kind[], max: number) {
    let extra = this.count(kinds) - max
    if (extra <= 0) return
    this.items = this.items.filter((item) => !(kinds.includes(item.kind) && extra-- > 0))
  }
}

export const inbox = new Inbox()

/** what holds a session's line or turn back: a game character talking (its dialogue ids), game actions being decided,
 *  you speaking (push to talk, hands-free); each time you start speaking, the epoch moves on */
export const holds = { dialogue: new Set<string>(), decisions: 0, hearing: false, epoch: 0 }

/** a running session waiting is woken by a viewer's message, your line, resume, a game event or decision, the end of a
 *  game character's dialogue (sessions/wake.ts) */
export const wake = new Wake()
onChat((message) => { if (inbox.push({ kind: 'viewer', chat: message })) wake.wake() })

/** what holds a line back before it is said: paused, a game character talking (dialogue), you speaking */
export const speechHeld = () => conversation().paused || holds.dialogue.size > 0 || holds.hearing
/** what holds a session's next turn back: those, and a game action being decided */
export const turnHeld = () => speechHeld() || holds.decisions > 0
/** a viewer's message, now and then (as often as the stage's talk settings say) */
export const someViewer = () => (chance() < [0, 0.35, 0.8][store.get().talk.danmaku] ? inbox.takeViewer(clock.now(), isBlocked) : null)
/** a viewer's message waiting, or chat connected: a conversation that answers viewers is public */
export const viewersWaiting = () => store.get().talk.danmaku > 0 && (chatState().status === 'on' || inbox.viewerWaiting(clock.now(), isBlocked))
