// What every session asks of the stage: the AI cast (its profiles, as one key), who can speak, the characters you
// play; and how a session's turn can end besides finishing (no model, a voice that failed, cut off). The running
// session itself is a value (sessions/run.ts).
import { actors } from '../actors'
import { participants, store, type CharacterItem } from '../scene'

/** an AI character's turn came with no model set up: the session stops there and asks for one (needModel) */
export class NeedModel extends Error {}
/** the line was said (shown) but its voice failed: the message it answered was answered */
export class VoiceFailed extends Error {}
/** a turn cut off by you, an output coming on, a game character talking: the session goes on */
export const TURN_INTERRUPTED = new DOMException('The speaker was interrupted', 'AbortError')
export type { RealtimeControls } from './run'

/** the AI characters' profiles on the stage (a friend's left out) */
export const profiles = () => participants(store.get()).filter((c) => c.lines === 'ai' && !c.remote).map((c) => c.profileId ?? c.id)
/** the AI cast, as one key */
export const castKey = () => JSON.stringify([...new Set(profiles())].sort())

const ready = (c: CharacterItem) => actors.get(c.id)?.status === 'ready'
/** who can speak: AI characters loaded, and the characters you play */
export const voices = () => participants(store.get()).filter((c) => (c.lines === 'ai' && ready(c)) || c.lines === 'me')
/** the characters you play */
export const played = () => participants(store.get()).filter((c) => c.lines === 'me')
