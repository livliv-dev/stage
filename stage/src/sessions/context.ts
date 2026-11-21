// What the running session holds while it runs, shared by the runner, its policies, the speak path and the facade
// (conversation.ts): its controller and the turn in hand, the 直播间's options and AIRI's binding, the cast it started
// with, whose turn it was, and the call in progress. One session at a time.
import { actors } from '../actors'
import { participants, store, type CharacterItem } from '../scene'
import type { ModelConfig } from '../brain'
import type { ExternalEvent } from '../externalEvents'
import type { AiriGameConnection } from '../../../desktop/src/airiGameProtocol'
import type { LiveOptions } from './budget'

/** an AI character's turn came with no model set up: the session stops there and asks for one (needModel) */
export class NeedModel extends Error {}
/** the line was said (shown) but its voice failed: the message it answered was answered */
export class VoiceFailed extends Error {}
/** a turn cut off by you, an output coming on, a game character talking: the session goes on */
export const TURN_INTERRUPTED = new DOMException('The speaker was interrupted', 'AbortError')

/** a realtime call's controls: its own connection, told what the session does */
export type RealtimeControls = { stop(): void; pause(paused: boolean): void; interrupt(): void; say(text: string): void; event(event: ExternalEvent): boolean }

export const session = {
  /** the session running, stopped by aborting it */
  ctrl: null as AbortController | null,
  /** the AI turn in hand (cut off by interrupting it) */
  currentTurn: null as AbortController | null,
  /** one answer and done (a line of yours with nothing running): nothing is made ahead */
  single: false,
  /** the 直播间's options while one runs */
  liveOptions: null as LiveOptions | null,
  /** the session runs on AIRI: its model, the character it is bound to, a window it sees, a game it plays */
  airi: null as { model: ModelConfig; actorId: string; windowId: string; game?: AiriGameConnection } | null,
  /** the AI cast the session started with (its profiles): a change stops it */
  boundProfiles: '',
  /** the character that had the last turn, said or skipped (round and host orders go on from it), and the one you
   *  skipped since the last line */
  lastTurn: null as string | null,
  skipped: null as string | null,
  /** the character you picked to speak next (a click on its card) */
  forced: null as string | null,
  /** ends the pause between lines now (下一句) */
  hurry: null as (() => void) | null,
  /** the switch to the public record under way (an output came on: sessions/record.ts) */
  switching: null as Promise<void> | null,
  /** a realtime call in progress, and what stops its record from watching memory */
  realtime: null as RealtimeControls | null,
  offRealtimeHistory: () => {},
}

/** the AI characters' profiles on the stage (a friend's left out) */
export const profiles = () => participants(store.get()).filter((c) => c.lines === 'ai' && !c.remote).map((c) => c.profileId ?? c.id)
/** the AI cast, as one key */
export const castKey = () => JSON.stringify([...new Set(profiles())].sort())

const ready = (c: CharacterItem) => actors.get(c.id)?.status === 'ready'
/** who can speak: AI characters loaded, and the characters you play */
export const voices = () => participants(store.get()).filter((c) => (c.lines === 'ai' && ready(c)) || c.lines === 'me')
/** the characters you play */
export const played = () => participants(store.get()).filter((c) => c.lines === 'me')
