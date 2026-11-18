// spark:command already reaches a Stage connection. Stage acts on pause, resume,
// and guidance that names an expression or a stage motion, then answers with spark:emit.
import type { ReactionFeeling } from './reactions'

const FEELINGS: Record<string, { feeling: ReactionFeeling; look?: 'away' }> = {
  happy: { feeling: 'happy' }, smile: { feeling: 'happy' },
  sad: { feeling: 'sad' }, angry: { feeling: 'angry' }, surprised: { feeling: 'surprised' },
  think: { feeling: 'thoughtful', look: 'away' }, thoughtful: { feeling: 'thoughtful', look: 'away' },
  curious: { feeling: 'curious' }, question: { feeling: 'confused' }, confused: { feeling: 'confused' },
  awkward: { feeling: 'shy' }, shy: { feeling: 'shy' }, neutral: { feeling: 'neutral' },
}
const MOTIONS = ['nod', 'shake', 'tilt', 'hop', 'shy', 'away'] as const

export type AiriSparkAction = {
  id: string
  perform: boolean
  pause: boolean
  resume: boolean
  feeling?: ReactionFeeling
  look?: 'away'
  motion?: (typeof MOTIONS)[number]
  interrupt: boolean
}

export function interpretSparkCommand(data: unknown): AiriSparkAction | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  const intent = typeof raw.intent === 'string' ? raw.intent : ''
  const text = commandText(raw)
  const named = namedFeeling(text)
  const written = MOTIONS.find((item) => new RegExp(`\\b${item}\\b`, 'i').test(text))
  const motion = written ?? (named?.feeling === 'curious' || named?.feeling === 'confused' ? 'tilt' : undefined)
  const pause = intent === 'pause' || /\bpause\b|暂停/.test(text)
  const resume = intent === 'resume' || /\bresume\b|继续/.test(text)
  const held = intent === 'plan' || intent === 'proposal' || intent === 'reroute' || intent === 'context'
  const perform = !held && (pause || resume || !!named || !!motion)
  return {
    id: raw.id.trim().slice(0, 120),
    perform,
    pause: !held && pause,
    resume: !held && resume && !pause,
    ...(named ? { feeling: named.feeling, ...(named.look ? { look: named.look } : {}) } : {}),
    ...(motion ? { motion } : {}),
    interrupt: raw.interrupt === 'force' || raw.interrupt === 'soft',
  }
}

export function sparkEmit(id: string, state: 'done' | 'dropped', note: string) {
  return { id, state, note: note.slice(0, 200), destinations: ['livliv-stage'] }
}

function commandText(raw: Record<string, unknown>) {
  const guidance = raw.guidance && typeof raw.guidance === 'object' ? raw.guidance as { options?: unknown } : undefined
  const options = Array.isArray(guidance?.options) ? guidance.options : []
  const bits = [typeof raw.ack === 'string' ? raw.ack : '']
  for (const option of options) {
    if (!option || typeof option !== 'object') continue
    const item = option as { label?: unknown; steps?: unknown }
    if (typeof item.label === 'string') bits.push(item.label)
    if (Array.isArray(item.steps)) bits.push(...item.steps.filter((step): step is string => typeof step === 'string'))
  }
  return bits.join('\n')
}

function namedFeeling(text: string) {
  const match = text.match(/\b(happy|smile|sad|angry|surprised|think|thoughtful|curious|question|confused|awkward|shy|neutral)\b/i)
  return match ? FEELINGS[match[1].toLowerCase()] : undefined
}
