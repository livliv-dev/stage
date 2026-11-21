// What comes in to a running session, in one place: your lines (typed, or heard and transcribed), the wait for your line
// on your character's turn, viewers' messages, external and game events, a game character talking, a game action
// being decided, you speaking. The session waits on it (its wake) and takes from it turn by turn.
import { chatState, isBlocked, onChat, type Chat } from '../danmaku'
import { AudienceInbox } from '../audience'
import { store } from '../scene'
import type { Line } from '../core/lines'
import type { ExternalEvent } from '../externalEvents'
import { chance } from './chance'
import { clock } from './clock'
import { conversation } from './state'
import { Wake } from './wake'

/** a line of yours waiting its turn: typed, or heard (already shown) */
export type ChatInput = { line: Line; transcribed: boolean }

export const inbox = {
  /** your lines waiting their turn (free order) */
  queue: [] as ChatInput[],
  /** the wait for your line on your character's turn: answered with it, or null (skipped) */
  answer: null as ((l: Line | null) => void) | null,
  /** viewers' messages (Twitch, a test message) */
  viewers: new AudienceInbox<Chat>(),
  /** events from a game or the Neuro bridge waiting to be answered, the one being answered, and those seen */
  external: [] as ExternalEvent[],
  activeEvent: null as ExternalEvent | null,
  externalSeen: new Set<string>(),
  /** a game character talking (its dialogue ids): lines wait */
  dialogue: new Set<string>(),
  /** game actions being decided: turns wait */
  decisions: 0,
  /** you speaking (push to talk, hands-free): lines wait; each time you start, the epoch moves on */
  hearing: false,
  epoch: 0,
}

/** a running session waiting is woken by a viewer's message, your line, resume, a game event or decision, the end of a
 *  game character's dialogue (sessions/wake.ts) */
export const wake = new Wake()
onChat((message) => { if (inbox.viewers.push(message)) wake.wake() })

/** what holds a line back before it is said: paused, a game character talking (dialogue), you speaking */
export const speechHeld = () => conversation().paused || inbox.dialogue.size > 0 || inbox.hearing
/** what holds a session's next turn back: those, and a game action being decided */
export const turnHeld = () => speechHeld() || inbox.decisions > 0
/** a viewer's message, now and then (as often as the stage's talk settings say) */
export const someViewer = () => (chance() < [0, 0.35, 0.8][store.get().talk.danmaku] ? inbox.viewers.take(clock.now(), isBlocked) : null)
/** a viewer's message waiting, or chat connected: a conversation that answers viewers is public */
export const viewersWaiting = () => store.get().talk.danmaku > 0 && (chatState().status === 'on' || inbox.viewers.available(clock.now(), isBlocked))
/** your lines and the events no session will answer any more */
export function clearInbox() { inbox.queue.length = 0; inbox.external.length = 0; inbox.dialogue.clear(); inbox.activeEvent = null }
