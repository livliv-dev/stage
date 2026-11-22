// The engines. A session on AIRI is given AIRI's when it starts (chooseEngine in brains/select.ts decides, the only
// place that does); every other turn runs on the brain set up at that moment (a model of one's own, livliv.ai's text,
// or the demo), so a model changed mid-session answers the next line.
import { modelOf, type BrainConfig } from '../../brain'
import { demoEngine } from './demo'
import { openaiEngine } from './openai'
import type { Engine } from './types'

/** the engine of the brain set up: livliv.ai's text is a model like one's own */
export function brainEngine(brain: BrainConfig): Engine {
  const model = modelOf(brain)
  return model ? openaiEngine(model) : demoEngine()
}
export { airiEngine } from './airi'
export type { Engine, TurnRequest, Utterance } from './types'
