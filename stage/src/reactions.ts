/** Semantic reactions stay independent of the renderer and model provider. */
export type ReactionFeeling = 'neutral' | 'happy' | 'shy' | 'angry' | 'sad' | 'surprised' | 'curious' | 'confused' | 'amused' | 'proud' | 'thoughtful'
export type ReactionMove = 'none' | 'nod' | 'shake' | 'tilt' | 'hop' | 'shy'
export type ReactionPhase = 'idle' | 'listening' | 'thinking' | 'waiting' | 'interrupted'
export type ReactionCue = {
  /** Fraction of the utterance, from 0 to 1. */
  at: number
  feeling?: ReactionFeeling
  action?: ReactionMove
  strength?: number
  duration?: number
  look?: 'camera' | 'away'
  /** A model-specific expression supplied by the voice service, never read from free-form model cues. */
  expression?: string
}
export type ListenerReaction = { who: string; cue: ReactionCue }
export type ReactionSettings = { enabled: boolean; intensity: number; listen?: boolean; motion?: number; mapping?: Partial<Record<ReactionFeeling, string>>; holdSeconds?: number; cooldownSeconds?: number }
export type ReactionExpression = { id: string; label: string; labels?: Record<string, string> }

const FEELINGS: ReactionFeeling[] = ['neutral', 'happy', 'shy', 'angry', 'sad', 'surprised', 'curious', 'confused', 'amused', 'proud', 'thoughtful']
const MOVES: ReactionMove[] = ['none', 'nod', 'shake', 'tilt', 'hop', 'shy']
const ALIASES: Record<Exclude<ReactionFeeling, 'neutral'>, string[]> = {
  happy: ['smile', 'happy', 'joy', '开心', '微笑', '笑顔', '笑'],
  shy: ['shy', 'blush', '害羞', '照れ'],
  angry: ['angry', 'anger', '生气', '生氣', '怒り', '怒'],
  sad: ['sad', 'sorrow', '难过', '難過', '悲しい', '悲'],
  surprised: ['surprised', 'surprise', 'shock', '惊讶', '驚訝', '驚き'],
  curious: ['curious', 'curiosity', '好奇', '興味'],
  confused: ['confused', 'confusion', 'puzzled', '疑惑', '困惑'],
  amused: ['amused', 'laugh', 'happy', 'smile', '开心', '開心', '笑'],
  proud: ['proud', 'smug', '得意', '自信'],
  thoughtful: ['thoughtful', 'thinking', 'think', '思考', '考え'],
}
const FALLBACK: Partial<Record<ReactionFeeling, { action: ReactionMove; look?: 'camera' | 'away' }>> = {
  curious: { action: 'tilt' }, confused: { action: 'tilt' }, amused: { action: 'nod' },
  proud: { action: 'nod', look: 'camera' }, thoughtful: { action: 'none', look: 'away' },
}
const numberIn = (value: unknown, low: number, high: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high

export function readReactionSettings(value: unknown): ReactionSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const mapping: Partial<Record<ReactionFeeling, string>> = {}
  if (raw.mapping && typeof raw.mapping === 'object') for (const feeling of FEELINGS) {
    const id = (raw.mapping as Record<string, unknown>)[feeling]
    if (typeof id === 'string' && id.length > 0 && id.length <= 256) mapping[feeling] = id
  }
  return { enabled: raw.enabled !== false, intensity: numberIn(raw.intensity, 0, 1) ? raw.intensity : 0.8,
    listen: raw.listen !== false, motion: numberIn(raw.motion, 0, 1) ? raw.motion : 0.85,
    mapping, holdSeconds: numberIn(raw.holdSeconds, 0.2, 8) ? raw.holdSeconds : 1.8,
    cooldownSeconds: numberIn(raw.cooldownSeconds, 0, 8) ? raw.cooldownSeconds : 1.6 }
}

/** Only an AI character present in this request can receive a model-directed listener cue. */
export function readListenerReactions(value: unknown, cast: readonly { id: string; name: string }[]): ListenerReaction[] {
  if (!Array.isArray(value)) return []
  for (const raw of value.slice(0, 3)) {
    if (!raw || typeof raw !== 'object') continue
    const target = cast.find((character) => character.name === raw.who)
    const cue = readReactionCues([raw])[0]
    if (!target || !cue) continue
    return [{ who: target.id, cue: { ...cue, at: Math.max(0.15, Math.min(0.9, cue.at)), strength: Math.min(0.7, cue.strength ?? 0.55), duration: Math.min(2, cue.duration ?? 1.2) } }]
  }
  return []
}

/** Model output is a boundary: only a short, valid timeline reaches the player. */
export function readReactionCues(value: unknown): ReactionCue[] {
  if (!Array.isArray(value)) return []
  const result: ReactionCue[] = []
  for (const raw of value.slice(0, 6)) {
    if (!raw || typeof raw !== 'object' || !numberIn(raw.at, 0, 1)) continue
    const cue: ReactionCue = { at: raw.at }
    if (FEELINGS.includes(raw.feeling)) cue.feeling = raw.feeling
    if (MOVES.includes(raw.action)) cue.action = raw.action
    if (numberIn(raw.strength, 0, 1)) cue.strength = raw.strength
    if (numberIn(raw.duration, 0.2, 8)) cue.duration = raw.duration
    if (raw.look === 'camera' || raw.look === 'away') cue.look = raw.look
    if (cue.feeling === undefined && cue.action === undefined && cue.look === undefined) continue
    result.push(cue)
  }
  return result.sort((a, b) => a.at - b.at)
}

export function reactionExpression(feeling: ReactionFeeling, expressions: readonly ReactionExpression[]): string | null {
  if (feeling === 'neutral') return null
  const aliases = ALIASES[feeling]
  for (const alias of aliases) {
    const exact = expressions.find((entry) => entry.id.toLowerCase() === alias)
    if (exact) return exact.id
  }
  for (const alias of aliases) {
    const labelled = expressions.find((entry) => [entry.label, ...Object.values(entry.labels ?? {})].some((label) => label.toLowerCase().includes(alias)))
    if (labelled) return labelled.id
  }
  return null
}

export type ReactionPlan = { expression?: string | null; weight: number; action?: ReactionMove; look?: 'camera' | 'away'; duration: number }
export function planReaction(cue: ReactionCue, expressions: readonly ReactionExpression[], intensity: number, expressionStrength = 1): ReactionPlan {
  const expression = cue.expression && expressions.some((entry) => entry.id === cue.expression) ? cue.expression : cue.feeling === undefined ? undefined : reactionExpression(cue.feeling, expressions)
  const missing = cue.feeling !== undefined && cue.feeling !== 'neutral' && expression === null
  const fallback = missing ? FALLBACK[cue.feeling!] : undefined
  return {
    // An unsupported expression leaves the current face alone; it is not presented as an available expression.
    expression: missing ? undefined : expression,
    weight: Math.max(0, Math.min(1, intensity * expressionStrength * (cue.strength ?? 1))),
    action: cue.action === undefined || cue.action === 'none' ? fallback?.action ?? cue.action : cue.action,
    look: cue.look ?? fallback?.look,
    duration: Math.max(0.2, cue.duration ?? 1.8),
  }
}

export type ReactionHost = {
  settings(): ReactionSettings
  canReact(): boolean
  expressions(): readonly ReactionExpression[]
  expressionStrength(): number
  expression(id: string | null, weight: number): boolean
  act(action: Exclude<ReactionMove, 'none'>, strength: number): void
  look(direction: 'camera' | 'away'): void
}
export type ReactionClock = { now(): number; later(callback: () => void, milliseconds: number): unknown; cancel(timer: unknown): void }
const clock: ReactionClock = {
  now: () => performance.now(), later: (callback, milliseconds) => setTimeout(callback, milliseconds),
  cancel: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
}

/** Owns only automatic reactions. Manual expressions remain held until the caller clears them. */
export class ReactionDirector {
  private timers = new Set<unknown>()
  private expiry: unknown = null
  private revision = 0
  private lastAt = -Infinity
  private lastPhaseAt = -Infinity
  private manualExpression = false
  private manualUntil = 0
  private ownsExpression = false
  private phase: ReactionPhase = 'idle'
  private host: ReactionHost
  private time: ReactionClock

  constructor(host: ReactionHost, time: ReactionClock = clock) { this.host = host; this.time = time }

  get available() { return this.host.settings().enabled && this.host.settings().intensity > 0 && this.host.canReact() && !this.manualExpression && this.time.now() >= this.manualUntil }

  manual(active: boolean) {
    this.manualExpression = active
    this.ownsExpression = false
    this.clearExpiry()
    this.revision++
  }

  manualAction() { this.manualUntil = this.time.now() + 1600 }

  react(cue: ReactionCue, planned = false) {
    return this.apply(cue, planned)
  }

  private apply(cue: ReactionCue, planned: boolean, phase = false) {
    const settings = this.host.settings()
    // Waiting and thinking must not consume the interval reserved for content reactions.
    const lastAt = phase ? Math.max(this.lastAt, this.lastPhaseAt) : this.lastAt
    if (!this.available || (!planned && this.time.now() - lastAt < (settings.cooldownSeconds ?? 1.6) * 1000)) return false
    const mapped = cue.feeling ? settings.mapping?.[cue.feeling] : undefined
    const plan = planReaction({ ...cue, duration: cue.duration ?? settings.holdSeconds, expression: mapped ?? cue.expression }, this.host.expressions(), settings.intensity, this.host.expressionStrength())
    const changed = plan.expression !== undefined && this.host.expression(plan.expression, plan.weight)
    if (changed) {
      this.clearExpiry()
      this.ownsExpression = plan.expression !== null
      const revision = ++this.revision
      if (this.ownsExpression) this.expiry = this.time.later(() => this.clearOwned(revision), plan.duration * 1000)
    }
    const motion = Math.min(1, (settings.motion ?? 0.85) * (cue.strength ?? 1))
    const moved = plan.action && plan.action !== 'none' && motion > 0
    if (moved) this.host.act(plan.action as Exclude<ReactionMove, 'none'>, motion)
    if (plan.look) this.host.look(plan.look)
    if (changed || moved || plan.look) {
      if (phase) this.lastPhaseAt = this.time.now()
      else this.lastAt = this.time.now()
      return true
    }
    return false
  }

  play(cues: readonly ReactionCue[], seconds: number) {
    this.clearTimeline()
    for (const cue of cues) {
      if (cue.at <= 0) { this.react(cue, true); continue }
      const timer = this.time.later(() => { this.timers.delete(timer); this.react(cue, true) }, cue.at * Math.max(0, seconds) * 1000)
      this.timers.add(timer)
    }
  }

  setPhase(phase: ReactionPhase) {
    if (phase === 'idle') { this.phase = phase; this.stop(); return }
    if (this.phase === phase) return
    this.phase = phase
    if (phase === 'thinking') this.apply({ at: 0, feeling: 'thoughtful', duration: 1.2 }, false, true)
    else if (phase === 'interrupted') this.apply({ at: 0, feeling: 'confused', duration: 0.8 }, false, true)
    else if (phase === 'waiting') this.apply({ at: 0, look: 'camera', duration: 1 }, false, true)
  }

  finish() {
    this.phase = 'idle'
    this.clearTimeline()
    this.clearExpiry()
    if (this.ownsExpression) {
      const revision = this.revision
      this.expiry = this.time.later(() => this.clearOwned(revision), (this.host.settings().holdSeconds ?? 1.2) * 1000)
    }
  }

  stop() {
    this.phase = 'idle'
    this.clearTimeline()
    this.clearExpiry()
    this.clearOwned(this.revision)
  }

  private clearOwned(revision: number) {
    if (revision !== this.revision || !this.ownsExpression || this.manualExpression) return
    this.host.expression(null, this.host.expressionStrength())
    this.ownsExpression = false
    this.expiry = null
  }
  private clearExpiry() { if (this.expiry !== null) { this.time.cancel(this.expiry); this.expiry = null } }
  private clearTimeline() { for (const timer of this.timers) this.time.cancel(timer); this.timers.clear() }
}
