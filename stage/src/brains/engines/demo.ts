// The demo: the prepared conversation's next line, in the character's own recorded voice; no model, no key.
import { makeBrain } from '../../brain'
import { once, type Engine } from './types'

export function demoEngine(): Engine {
  const brain = makeBrain({ kind: 'demo' })
  return {
    id: 'demo', caps: { stream: false, vision: false, tools: false, multiCast: true },
    reply: (turn, signal) => once(() => { if (turn.kind !== 'standard') throw new Error('demo: a standard turn'); return brain.reply(turn.ask, signal) }),
  }
}
