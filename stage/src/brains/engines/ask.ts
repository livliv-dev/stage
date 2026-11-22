// A turn request as Stage's own brain reads it (brain.ts Ask): the brain behind a model of one's own, livliv.ai's text
// and the demo.
import type { Ask } from '../../brain'
import type { TurnRequest } from './types'

export const askOf = ({ speaker, persona, cast, context, constraints }: TurnRequest): Ask => ({
  me: speaker, persona, others: cast.others, humans: cast.humans, topic: context.topic, lines: context.lines, role: cast.role, cutIn: constraints.cutIn,
  language: constraints.language, viewer: context.viewer && { user: context.viewer.user, text: context.viewer.text },
  scope: context.scope, depth: constraints.depth, summary: context.summary, memories: context.memories,
  event: context.event ? { source: context.event.source, message: context.event.message } : undefined, layout: cast.layout,
})
