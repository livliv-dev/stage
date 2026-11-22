// The demo: the prepared conversation's next line, in the character's own recorded voice; no model, no key.
import { makeBrain } from '../../brain'
import { askOf } from './ask'
import { once, type Engine } from './types'

export function demoEngine(): Engine {
  const brain = makeBrain({ kind: 'demo' })
  return {
    id: 'demo', caps: { stream: false, vision: false, tools: false, multiCast: true },
    reply: (request, signal) => once(() => brain.reply(askOf(request), signal)),
  }
}
