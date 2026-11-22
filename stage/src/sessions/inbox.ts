// The session's inbox (one typed queue: sessions/queue.ts) and what feeds it here: viewers' messages as they come.
// What holds a turn back (a game character talking, a game action being decided, you speaking) is not an item: those
// are the holds. A running session waits on the wake.
import { chatState, isBlocked, onChat } from '../danmaku'
import { store } from '../scene'
import { holds } from './holds'
import { audienceWaiting, Inbox, viewerNowAndThen } from './queue'
import { chance } from './chance'
import { clock } from './clock'
import { conversation } from './state'
import { Wake } from './wake'

export { EVENTS, Inbox, YOURS, yourLine, type ChatInput, type InboxItem, type Kind, type YourLine } from './queue'
export { holds } from './holds'

export const inbox = new Inbox()


/** a running session waiting is woken by a viewer's message, your line, resume, a game event or decision, the end of a
 *  game character's dialogue (sessions/wake.ts) */
export const wake = new Wake()
onChat((message) => { if (inbox.push({ kind: 'viewer', chat: message })) wake.wake() })

/** what holds a line back before it is said: paused, a game character talking (dialogue), you speaking */
export const speechHeld = () => conversation().paused || holds.dialogue.size > 0 || holds.hearing
/** what holds a session's next turn back: those, and a game action being decided */
export const turnHeld = () => speechHeld() || holds.decisions > 0
/** a viewer's message, now and then (as often as the stage's talk settings say) */
export const someViewer = () => viewerNowAndThen(inbox, store.get().talk.danmaku, chance(), clock.now(), isBlocked)
/** a viewer's message waiting, or chat connected: a conversation that answers viewers is public */
export const viewersWaiting = () => audienceWaiting(inbox, store.get().talk.danmaku, chatState().status === 'on', clock.now(), isBlocked)
