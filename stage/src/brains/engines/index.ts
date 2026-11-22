// The engines. A session on AIRI is given AIRI's when it starts (chooseEngine in brains/select.ts decides, the only
// place that does); every other turn runs on the brain set up at that moment (a model of one's own, LivLiv's points,
// or the demo), so a model changed mid-session answers the next line.
import type { BrainConfig } from '../../brain'
import { demoEngine } from './demo'
import { livlivEngine } from './livliv'
import { openaiEngine } from './openai'
import type { Engine } from './types'

/** the engine of the brain set up */
export function brainEngine(brain: BrainConfig): Engine {
  return brain.kind === 'openai' ? openaiEngine(brain) : brain.kind === 'livliv' ? livlivEngine() : demoEngine()
}
export { airiEngine } from './airi'
export type { Engine, TurnRequest, Utterance } from './types'
