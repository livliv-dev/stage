// A model of one's own (any OpenAI-compatible API): a whole reply per turn, the persona as brain.ts writes it; game
// actions from the same model.
import { decideExternalAction, makeBrain, type ModelConfig } from '../../brain'
import { askOf } from './ask'
import { once, type Engine } from './types'

export function openaiEngine(config: ModelConfig): Engine {
  const brain = makeBrain(config)
  return {
    id: 'openai', caps: { stream: false, vision: false, tools: false, multiCast: true },
    reply: (request, signal) => once(() => brain.reply(askOf(request), signal)),
    decideAction: (actor, request, signal) => decideExternalAction(config, actor, request, signal),
  }
}
