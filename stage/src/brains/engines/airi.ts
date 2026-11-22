// Project AIRI (the desktop app, one character, a model of one's own): its reply streams a sentence at a time, each
// with its feeling and move; it sees a game's frame or window, and decides game actions with tools. A turn asks it what
// to answer (a viewer's message, your last line, else to start talking) apart from the history, which it reads without
// those, with at most 48 memories.
import { firstSeen } from '../airiHistory'
import { asEmotion } from '../../core/lines'
import { conversationContext } from '../../chatContext'
import { chooseAiriGameAction, streamAiriReply, type AiriSentence, type AiriTurn } from '../../airiEngine'
import { store } from '../../scene'
import type { ModelConfig } from '../../brain'
import type { Engine, TurnRequest, Utterance } from './types'

/** a streamed sentence as a line: its feeling, its move, where it looks, and its cue to play */
const utterance = ({ text, cue }: AiriSentence): Utterance => ({
  text, emotion: asEmotion(cue?.feeling), action: cue?.action ?? 'none', to: null, look: cue?.look,
  cues: cue ? [{ ...cue, action: undefined }] : undefined,
})

/** the most memories an AIRI turn carries */
export const AIRI_MEMORIES = 48

/** a turn request as AIRI's runtime reads it */
export function airiTurnOf({ speaker, persona, context, constraints }: TurnRequest, model: ModelConfig): Omit<AiriTurn, 'signal'> {
  const latest = context.replyToOwner ? context.lines.findLast((line) => line.human && !line.audience) : undefined
  const viewer = context.viewer
  const input = viewer ? `Viewer ${viewer.user}: ${viewer.text}` : latest?.text
    ?? (context.mode === 'live' ? 'The livestream is quiet. Start a short conversation about the show.' : 'Start a short conversation with the user.')
  const used = conversationContext(context.lines, context.summary)
  // the owner's line (or the viewer's) is this turn's input: its time in AIRI's history is now, when it was said
  for (const line of [latest?.id, viewer?.id]) if (line) firstSeen(line)
  return {
    sessionId: context.sessionId, scope: context.scope, actor: speaker, persona, model, input, verifyMemory: constraints.verifyMemory ?? (async () => {}),
    allowBatch: constraints.allowBatch, ...(context.frame ? { frame: context.frame } : {}), ...(context.event ? { event: context.event } : {}),
    lines: context.lines.filter((line) => line.id !== latest?.id && line.id !== viewer?.id),
    language: constraints.language,
    context: { topic: context.topic, game: context.game, summary: used.earlier, memories: context.memories, memoryCount: context.memoryCount },
  }
}

export function airiEngine(model: ModelConfig): Engine {
  return {
    id: 'airi', caps: { stream: true, vision: true, tools: true, multiCast: false, memories: AIRI_MEMORIES },
    reply(request, signal) {
      return {
        [Symbol.asyncIterator]() {
          const reader = streamAiriReply({ ...airiTurnOf(request, model), signal }).getReader()
          return {
            async next() { const read = await reader.read(); return read.done ? { done: true, value: undefined } : { done: false, value: utterance(read.value) } },
            // the rest given up: the stream is cancelled (its request too)
            async return() { await reader.cancel().catch(() => {}); reader.releaseLock(); return { done: true, value: undefined } },
          }
        },
      }
    },
    decideAction: (actor, request, signal, frame, beforeRequest) => chooseAiriGameAction(model, actor, store.get().talk.language, request, signal, frame, beforeRequest),
  }
}
