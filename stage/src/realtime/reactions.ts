import { readReactionCues, type ReactionCue } from '../reactions'
import type { ModelEvent, RealtimeTool } from './connection'

export const REACTION_TOOL = 'stage_reaction'

/** Only semantic stage directions cross this interface; audio and model transport stay independent. */
export function reactionTool(names: string[]): RealtimeTool {
  return {
    type: 'function', name: REACTION_TOOL,
    description: '按当前对话内容，为在场角色安排一次简短、自然的非语言反应。被夸时害羞、疑惑时歪头、明确不同意时摇头；普通陈述不需要动作。不要每轮调用，不朗读动作或工具结果。',
    parameters: {
      type: 'object', additionalProperties: false,
      properties: {
        who: { type: 'string', enum: names },
        when: { type: 'string', enum: ['speaking', 'listening'] },
        feeling: { type: 'string', enum: ['neutral', 'happy', 'shy', 'angry', 'sad', 'surprised', 'curious', 'confused', 'amused', 'proud', 'thoughtful'] },
        action: { type: 'string', enum: ['none', 'nod', 'shake', 'tilt', 'hop', 'shy'] },
        strength: { type: 'number', minimum: 0, maximum: 0.8 },
        duration: { type: 'number', minimum: 0.2, maximum: 3 },
      },
      required: ['who', 'when', 'feeling', 'action', 'strength', 'duration'],
    },
  }
}

export type ReactionCall = { id: string; response: string; who: string; listening: boolean; cue: ReactionCue | null }

/** Final arguments also arrive for cancelled responses; the caller must check the response lifecycle. */
export function readReactionCall(event: ModelEvent): ReactionCall | null {
  const item = event.type === 'response.output_item.done' ? event.item : event
  if (!item || typeof item !== 'object') return null
  const raw = item as Record<string, unknown>
  if (raw.name !== REACTION_TOOL || typeof raw.call_id !== 'string' || raw.call_id.length > 256 || !raw.call_id
    || typeof event.response_id !== 'string' || !event.response_id) return null
  let value: Record<string, unknown> = {}
  if (typeof raw.arguments === 'string' && raw.arguments.length <= 2048) {
    try { const parsed: unknown = JSON.parse(raw.arguments); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) value = parsed as Record<string, unknown> } catch { /* A malformed direction is acknowledged without applying it. */ }
  }
  const cue = readReactionCues([{ ...value, at: 0 }])[0]
  return { id: raw.call_id, response: event.response_id, who: typeof value.who === 'string' ? value.who : '', listening: value.when === 'listening',
    cue: cue && ['speaking', 'listening'].includes(String(value.when)) ? { ...cue, strength: Math.min(0.8, cue.strength ?? 0.55), duration: Math.min(3, cue.duration ?? 1.2) } : null }
}
