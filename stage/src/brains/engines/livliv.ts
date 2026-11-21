// LivLiv's points (livliv.ai): the site writes the line from the character's card and, when asked, voices it in the
// character's LivLiv voice in the same call (each call is paid, so a line is never split).
import { makeBrain } from '../../brain'
import { askOf } from './ask'
import { once, type Engine } from './types'

export function livlivEngine(): Engine {
  const brain = makeBrain({ kind: 'livliv' })
  return {
    id: 'livliv', caps: { stream: false, vision: false, tools: false, multiCast: true },
    reply: (request, signal) => once(() => brain.reply(askOf(request), signal)),
  }
}
