// What every engine is to a session: one turn request, the same whoever answers it, and what the character says back a
// line at a time (a whole reply, or the sentences of one as they stream), and, where it can, a game action decided.
// A session is given its engine when it starts (brains/select.ts chooses whether it is AIRI) and asks every turn the
// same way; how the answer is said follows the engine's caps (sessions/speak.ts).
import type { ConversationSummary } from '../../chatContext'
import type { Line, Reply } from '../../core/lines'
import type { CharacterItem, Talk } from '../../scene'
import type { MemoryRecord, MemoryScope } from '../../memory'
import type { ExternalActionDecision, ExternalActionRequest, ExternalEvent } from '../../externalEvents'
import type { AiriGameFrame } from '../../../../protocol/src/airiGame'
import type { PersonaSpec } from '../persona'

/** a turn, asked of any engine */
export type TurnRequest = {
  /** who speaks, and who it is for this turn (its card in the session's language and scope) */
  speaker: CharacterItem
  persona: PersonaSpec
  /** the others on the stage: the AI characters, the people (you, the characters you play), who stands where from the
   *  left, and the speaker's part in the host order */
  cast: { others: CharacterItem[]; humans: string[]; layout: string[]; role: 'host' | 'guest' | null }
  /** what it answers from */
  context: {
    sessionId: string
    scope: MemoryScope
    topic: string
    lines: Line[]
    summary?: ConversationSummary
    memories: MemoryRecord[]
    /** how many memories there are in all, of which `memories` are the ones picked (AIRI numbers them: brains/airiMemory.ts) */
    memoryCount?: number
    /** a viewer's message to answer (its line's id when it is shown) */
    viewer: { id?: string; user: string; text: string } | null
    /** a game's or another app's event to answer */
    event?: ExternalEvent
    /** your last line is what it answers */
    replyToOwner: boolean
    /** the session it is in */
    mode: 'conversation' | 'chat' | 'live'
    /** a game's state, and what the engine sees (a frame of the game or the window) */
    game?: string
    frame?: AiriGameFrame
  }
  /** how to answer */
  constraints: {
    language: Talk['language']
    depth?: Talk['depth']
    /** the line before was cut off by this one */
    cutIn: boolean
    /** the engine voices the line itself (LivLiv's points, in the character's LivLiv voice) */
    voiced: boolean
    /** the engine may answer in one batch instead of streaming (no game, no window) */
    allowBatch: boolean
    /** checked before each sentence of a streamed reply: the memories it was made from are still the saved ones */
    verifyMemory?(): Promise<void>
  }
}

/** what a character says, one line of it: a whole reply, or a sentence of one streamed */
export type Utterance = Reply

export interface Engine {
  id: 'openai' | 'livliv' | 'demo' | 'airi'
  /** stream: the answer comes a sentence at a time, each said as it comes; vision: it sees a game's frame or a window;
   *  tools: it plays a game; multiCast: it can speak for any of several AI characters; memories: the most memories a
   *  turn carries, when it is capped */
  caps: { stream: boolean; vision: boolean; tools: boolean; multiCast: boolean; memories?: number }
  /** the character's answer, a line at a time; ending it early (return) gives up the rest */
  reply(request: TurnRequest, signal: AbortSignal): AsyncIterable<Utterance>
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
