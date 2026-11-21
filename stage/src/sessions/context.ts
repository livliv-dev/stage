// What every session asks of the stage: the AI cast (its profiles, as one key), who can speak, the characters you
// play. The running session itself is a value (sessions/run.ts); how a turn can end besides being said is errors.ts.
import { actors } from '../actors'
import { participants, store, type CharacterItem } from '../scene'

export { NeedModel, TURN_INTERRUPTED, VoiceFailed } from './errors'
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
