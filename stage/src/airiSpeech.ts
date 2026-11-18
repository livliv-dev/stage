// Long AIRI replies are spoken one sentence at a time, the same split Stage uses
// for its own chat. The next sentence's voice is prepared while the current one plays.
import type { Emotion, Move } from './brain'
import { speechSegments } from './chatContext'
import { parseAiriMarkers } from './airiMarkers'
import type { ReactionCue, ReactionFeeling } from './reactions'

export type AiriSegment = { text: string; emotion: Emotion; move: Move; cues: ReactionCue[] }

const VOICE: Partial<Record<ReactionFeeling, Emotion>> = {
  happy: 'happy', sad: 'sad', angry: 'angry', surprised: 'surprised', shy: 'shy', neutral: 'neutral',
}

export function planAiriSpeech(text: string, raw?: string): AiriSegment[] {
  const spoken = text.trim()
  if (!spoken) return []
  const source = raw?.includes('<|ACT') ? raw : spoken.includes('<|ACT') ? spoken : ''
  const marked = source ? parseAiriMarkers(source) : { speech: spoken, cues: [] as ReactionCue[] }
  const parts = speechSegments(spoken)
  const total = parts.reduce((sum, part) => sum + part.length, 0) || 1
  let offset = 0
  return parts.map((part, index) => {
    const start = offset / total
    const width = part.length / total
    const end = index === parts.length - 1 ? 1.001 : start + width
    const cues = marked.cues.filter((cue) => cue.at >= start && cue.at < end).map((cue) => ({ ...cue, at: width ? Math.min(0.999, (cue.at - start) / width) : 0 }))
    offset += part.length
    const feeling = cues.find((cue) => cue.feeling)?.feeling
    const action = cues.find((cue) => cue.action && cue.action !== 'none')?.action
    return { text: part, cues, emotion: voiceEmotion(feeling), move: (action ?? 'none') as Move }
  })
}

export async function speakSentences<T>(args: {
  segments: AiriSegment[]
  signal: AbortSignal
  prepare: (segment: AiriSegment) => Promise<T>
  play: (segment: AiriSegment, prepared: T, onStart: () => void) => Promise<void>
  onStart: () => void
}): Promise<'ended' | 'cancelled'> {
  if (!args.segments.length) return 'ended'
  let preparing = args.prepare(args.segments[0])
  let started = false
  for (let index = 0; index < args.segments.length; index++) {
    if (args.signal.aborted) return 'cancelled'
    let prepared: T
    try { prepared = await preparing }
    catch (error) { if (args.signal.aborted) return 'cancelled'; throw error }
    if (args.signal.aborted) return 'cancelled'
    const next = args.segments[index + 1]
    if (next) {
      preparing = args.prepare(next)
      void Promise.resolve(preparing).catch(() => {})
    }
    try {
      await args.play(args.segments[index], prepared, () => { if (!started) { started = true; args.onStart() } })
    } catch (error) { if (args.signal.aborted) return 'cancelled'; throw error }
  }
  return args.signal.aborted ? 'cancelled' : 'ended'
}

function voiceEmotion(feeling: ReactionFeeling | undefined): Emotion {
  return (feeling && VOICE[feeling]) || 'neutral'
}
