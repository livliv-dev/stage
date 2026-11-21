// A model of one's own (any OpenAI-compatible API): a whole reply per turn, the persona as brain.ts writes it; game
// actions from the same model.
import { decideExternalAction, makeBrain, type ModelConfig } from '../../brain'
import { once, type Engine } from './types'

export function openaiEngine(config: ModelConfig): Engine {
  const brain = makeBrain(config)
  return {
    id: 'openai', caps: { stream: false, vision: false, tools: false, multiCast: true },
    reply: (turn, signal) => once(() => { if (turn.kind !== 'standard') throw new Error('openai: a standard turn'); return brain.reply(turn.ask, signal) }),
    decideAction: (actor, request, signal) => decideExternalAction(config, actor, request, signal),
  }
}
