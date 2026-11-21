// A session while it runs, as a value: made when it starts and handed to its policy and to the speak path, which change
// it as the session goes. One runs at a time; the facade (conversation.ts) reaches it through current(). The order of
// turns (who had the last one, who you skipped, who you picked to go next) belongs to the conversation, not to one
// session: round order goes on from the last turn, and a pick made with nothing running starts the next session.
import type { BrainConfig, ModelConfig } from '../brain'
import type { Engine } from '../brains/engines/types'
import type { Chat } from '../danmaku'
import type { ExternalEvent } from '../externalEvents'
import type { CharacterItem } from '../scene'
import type { Line } from '../core/lines'
import type { AiriGameConnection } from '../../../desktop/src/airiGameProtocol'
import type { LiveOptions } from './budget'

/** a realtime call's controls: its own connection, told what the session does */
export type RealtimeControls = { stop(): void; pause(paused: boolean): void; interrupt(): void; say(text: string): void; event(event: ExternalEvent): boolean }
/** what saying a line does to the line made ahead (sessions/speak.ts): an AI line on lets the next be made meanwhile;
 *  a line cut off drops what was made to follow it */
export type LineAhead = { started(): void; dropped(): void }
/** the line made ahead while one is said (sessions/speak.ts): its speaker, the line it follows, the topic then, what
 *  stops it, the viewer's message it answers, and the line with its voice when made */
export type Ahead = { who: CharacterItem; after: string; topic: string; ctl: AbortController; chat: Chat | null; made: Promise<unknown> }

/** the session runs on AIRI: its model, the character it is bound to, a window it sees, a game it plays */
export type AiriBinding = { model: ModelConfig; actorId: string; windowId: string; game?: AiriGameConnection }

export class Run {
  /** stops the session */
  readonly controller = new AbortController()
  /** the AI turn in hand (cut off by interrupting it) */
  currentTurn: AbortController | null = null
  /** one answer and done (a line of yours with nothing running): nothing is made ahead */
  single = false
  /** the 直播间's options while one runs */
  liveOptions: LiveOptions | null = null
  /** the brain set up when it started, and the engine it runs on (AIRI when chooseEngine chose it: brains/engines) */
  brain: BrainConfig = { kind: 'demo' }
  engine: Engine | null = null
  /** the session runs on AIRI (sessions/airiBinding.ts) */
  airi: AiriBinding | null = null
  /** the AI cast the session started with (its profiles): a change stops it */
  boundProfiles = ''
  /** ends the pause between lines now (下一句) */
  hurry: (() => void) | null = null
  /** the switch to the public record under way (an output came on: sessions/record.ts) */
  switching: Promise<void> | null = null
  /** a realtime call: its controls, and what stops its record from watching memory */
  realtime: RealtimeControls | null = null
  offRealtimeHistory = () => {}
  /** what a line said does to the line made ahead (sessions/speak.ts gives it) */
  lineAhead: LineAhead | undefined = undefined
  /** the line made ahead (sessions/speak.ts) */
  ahead: Ahead | null = null
  /** the event the turn in hand answers (taken from the inbox) */
  event: ExternalEvent | null = null
  /** your character's turn, waiting for your line: given it, or skipped */
  yourTurn: { said(line: Line): void; skip(): void } | null = null
  /** what runs: the characters among themselves (and a line of yours answered once), a chat, a 直播间, a call */
  readonly kind: 'conversation' | 'chat' | 'live' | 'realtime'
  constructor(kind: Run['kind']) { this.kind = kind }
  get signal() { return this.controller.signal }
}

let running: Run | null = null, latest: Run | null = null
/** the session running, if any */
export const current = () => running
/** the last session begun, running or not (a line it made ahead is given up when the next starts) */
export const lastBegun = () => latest
/** this session runs from now on (the one before has been stopped by its starter) */
export function begin(run: Run) { running = latest = run }
/** this session is over: true when it was still the one running (it then puts the stage back) */
export function finish(run: Run) {
  if (running !== run) return false
  running = null
  return true
}
/** nothing runs (talk.stop) */
export function clearCurrent() { running = null }

/** whose turn it was: the character that had the last turn, said or skipped (round and host orders go on from it), the
 *  one you skipped since the last line, and the one you picked to speak next (a click on its card) */
export const order = { lastTurn: null as string | null, skipped: null as string | null, forced: null as string | null }
