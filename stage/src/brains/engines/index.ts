// The engine a session is given when it starts: AIRI when chooseEngine (brains/select.ts, the only place that decides)
// chose it, with the model it runs on; else the brain set up (a model of one's own, LivLiv's points, or the demo).
import type { BrainConfig, ModelConfig } from '../../brain'
import { airiEngine } from './airi'
import { demoEngine } from './demo'
import { livlivEngine } from './livliv'
import { openaiEngine } from './openai'
import type { Engine } from './types'

/** the session's engine: `airi`, the model AIRI runs on when chooseEngine chose AIRI */
export function makeEngine(brain: BrainConfig, airi: ModelConfig | null = null): Engine {
  if (airi) return airiEngine(airi)
  return brain.kind === 'openai' ? openaiEngine(brain) : brain.kind === 'livliv' ? livlivEngine() : demoEngine()
}
export type { Engine, TurnRequest, Utterance } from './types'
