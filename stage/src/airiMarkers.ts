// Decode an AIRI control marker into the gestures supported by the Stage actor.
import type { ReactionCue, ReactionFeeling, ReactionMove } from './reactions'

const ACT = /<\|ACT\s*([\s\S]*?)\|>/g
const MOTIONS = ['nod', 'shake', 'tilt', 'hop', 'shy'] as const

const FEELINGS: Record<string, { feeling: ReactionFeeling; action?: ReactionMove; look?: 'away' }> = {
  happy: { feeling: 'happy' },
  sad: { feeling: 'sad' },
  angry: { feeling: 'angry' },
  surprised: { feeling: 'surprised' },
  think: { feeling: 'thoughtful', look: 'away' },
  thinking: { feeling: 'thoughtful', look: 'away' },
  thoughtful: { feeling: 'thoughtful', look: 'away' },
  curious: { feeling: 'curious', action: 'tilt' },
  question: { feeling: 'confused', action: 'tilt' },
  awkward: { feeling: 'shy' },
  shy: { feeling: 'shy' },
  neutral: { feeling: 'neutral' },
  confused: { feeling: 'confused', action: 'tilt' },
}

export function parseAiriMarkers(raw: string): { speech: string; cues: ReactionCue[] } {
  if (!raw.includes('<|ACT')) return { speech: raw, cues: [] }
  const cues: ReactionCue[] = []
  let speech = ''
  let cursor = 0
  for (const match of raw.matchAll(ACT)) {
    const index = match.index ?? 0
    speech += raw.slice(cursor, index)
    cursor = index + match[0].length
    const cue = cueFrom(match[1] ?? '', speech.length)
    if (cue) cues.push(cue)
  }
  speech += raw.slice(cursor)
  const length = Math.max(1, speech.length)
  return {
    speech: speech.replace(/\s+/g, ' ').trim(),
    cues: cues.map((cue) => ({ ...cue, at: Math.min(0.999, cue.at / length) })),
  }
}

function cueFrom(body: string, at: number): ReactionCue | null {
  const parsed = readAct(body)
  if (!parsed) return null
  const mapped = FEELINGS[parsed.emotion.toLowerCase()]
  const motion = MOTIONS.find((item) => item === parsed.motion)
  if (!mapped && !motion) return null
  const cue: ReactionCue = { at }
  if (mapped) cue.feeling = mapped.feeling
  if (mapped?.look) cue.look = mapped.look
  if (motion) cue.action = motion
  else if (mapped?.action) cue.action = mapped.action
  if (parsed.strength !== undefined) cue.strength = parsed.strength
  return cue
}

function readAct(body: string): { emotion: string; motion: string; strength?: number } | null {
  const trimmed = body.trim()
  if (!trimmed) return null
  try {
    const value = JSON.parse(trimmed) as unknown
    if (!value || typeof value !== 'object') return null
    const record = value as { emotion?: unknown; motion?: unknown; intensity?: unknown }
    const emotion = emotionName(record.emotion)
    const motion = typeof record.motion === 'string' ? record.motion : ''
    const strength = strengthOf(record.intensity ?? (record.emotion && typeof record.emotion === 'object' ? (record.emotion as { intensity?: unknown }).intensity : undefined))
    if (!emotion && !motion) return null
    return { emotion, motion, ...(strength === undefined ? {} : { strength }) }
  } catch {
    const emotion = /"emotion"\s*:\s*"([^"]+)"/.exec(trimmed)?.[1] ?? ''
    const motion = /"motion"\s*:\s*"([^"]+)"/.exec(trimmed)?.[1] ?? ''
    if (!emotion && !motion) return null
    return { emotion, motion }
  }
}

function emotionName(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string') return (value as { name: string }).name
  return ''
}

function strengthOf(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const scaled = value > 1 && value <= 100 ? value / 100 : value
  return Math.max(0, Math.min(1, scaled))
}
