// Project AIRI (the desktop app, one character, a model of one's own): its reply streams a sentence at a time, each
// with its feeling and move; it sees a game's frame or window, and decides game actions with tools.
import { asEmotion } from '../../core/lines'
import { chooseAiriGameAction, streamAiriReply, type AiriSentence } from '../../airiEngine'
import { store } from '../../scene'
import type { ModelConfig } from '../../brain'
import type { Engine, Utterance } from './types'

/** a streamed sentence as a line: its feeling, its move, where it looks, and its cue to play */
const utterance = ({ text, cue }: AiriSentence): Utterance => ({
  text, emotion: asEmotion(cue?.feeling), action: cue?.action ?? 'none', to: null, look: cue?.look,
  cues: cue ? [{ ...cue, action: undefined }] : undefined,
})

export function airiEngine(model: ModelConfig): Engine {
  return {
    id: 'airi', caps: { stream: true, vision: true, tools: true, multiCast: false },
    reply(turn, signal) {
      if (turn.kind !== 'airi') throw new Error('airi: an AIRI turn')
      return {
        [Symbol.asyncIterator]() {
          const reader = streamAiriReply({ ...turn.turn, signal }).getReader()
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
