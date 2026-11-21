// What every engine is to a session: a turn asked, what the character says back a line at a time (a whole reply, or
// the sentences of one as they stream), and, where it can, a game action decided. A session picks one engine per turn
// (brains/select.ts says whether it is AIRI) and speaks what it returns the same way, whichever it is
// (sessions/speak.ts).
import type { Ask } from '../../brain'
import type { AiriTurn } from '../../airiEngine'
import type { Reply } from '../../core/lines'
import type { CharacterItem } from '../../scene'
import type { ExternalActionDecision, ExternalActionRequest } from '../../externalEvents'
import type { AiriGameFrame } from '../../../../desktop/src/airiGameProtocol'

/** a turn as an engine is asked it: what a model of one's own, LivLiv or the demo reads (the cast, the history, a
 *  viewer, memories), or what AIRI reads (its session, the input, a game's frame) */
export type Turn = { kind: 'standard'; ask: Ask } | { kind: 'airi'; turn: Omit<AiriTurn, 'signal'> }

/** what a character says, one line of it: a whole reply, or a sentence of one streamed */
export type Utterance = Reply

export interface Engine {
  id: 'openai' | 'livliv' | 'demo' | 'airi'
  caps: { stream: boolean; vision: boolean; tools: boolean; multiCast: boolean }
  /** the character's answer, a line at a time; ending it early (return) gives up the rest */
  reply(turn: Turn, signal: AbortSignal): AsyncIterable<Utterance>
  /** a game action for the character (games, the Neuro bridge), or null when none fits */
  decideAction?(actor: CharacterItem, request: ExternalActionRequest, signal: AbortSignal, frame?: AiriGameFrame, beforeRequest?: () => Promise<void>): Promise<ExternalActionDecision | null>
}

/** an answer that comes whole: one utterance */
export function once(made: () => Promise<Utterance>): AsyncIterable<Utterance> {
  return {
    [Symbol.asyncIterator]() {
      let given = false
      return {
        async next() { if (given) return { done: true, value: undefined }; given = true; return { done: false, value: await made() } },
        async return() { given = true; return { done: true, value: undefined } },
      }
    },
  }
}
