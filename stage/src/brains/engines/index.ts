// The engine a turn runs on: AIRI when the session is bound to it (brains/select.ts chose it when the session started),
// else the brain set up: a model of one's own, LivLiv's points, or the demo.
import type { BrainConfig, ModelConfig } from '../../brain'
import { airiEngine } from './airi'
import { demoEngine } from './demo'
import { livlivEngine } from './livliv'
import { openaiEngine } from './openai'
import type { Engine } from './types'

export function engineFor(brain: BrainConfig, airi?: ModelConfig): Engine {
  if (airi) return airiEngine(airi)
  return brain.kind === 'openai' ? openaiEngine(brain) : brain.kind === 'livliv' ? livlivEngine() : demoEngine()
}
export type { Engine, Turn, Utterance } from './types'
