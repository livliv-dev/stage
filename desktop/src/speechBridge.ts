// One playback owner for lines handed to Stage from outside its own chat model.
// Audio is inline bytes only. This module never fetches a URL.

export const SPEECH_TEXT_LIMIT = 4_000
export const SPEECH_AUDIO_LIMIT = 1_500_000
export const SPEECH_CHUNK_LIMIT = 64
export const SPEECH_EMOTIONS = ['neutral', 'happy', 'shy', 'angry', 'sad', 'surprised'] as const
export type SpeechEmotion = (typeof SPEECH_EMOTIONS)[number]
export type SpeechPhase = 'accepted' | 'audible-start' | 'ended' | 'cancelled' | 'failed'

export type SpeechInput = {
  utteranceId?: string
  character?: string
  text?: string
  emotion?: SpeechEmotion
  audio?: Uint8Array
  mime?: string
  seq?: number
  final?: boolean
  interrupt?: boolean
}

export type SpeechResult = {
  ok: boolean
  status: 200 | 202 | 400 | 404 | 409 | 413 | 503
  utteranceId?: string
  phase?: SpeechPhase
  character?: string
  heard?: boolean
  dropped?: boolean
  error?: string
}

export type SpeechControl =
  | { op: 'submit'; input: SpeechInput }
  | { op: 'status'; utteranceId: string }
  | { op: 'cancel'; utteranceId: string }

export type SpeechJob = {
  utteranceId: string
  character: string
  text: string
  emotion: SpeechEmotion
  audio?: Uint8Array
  mime?: string
}

export type SpeechPlayer = {
  /** Missing or busy characters do not replace the line already playing. */
  available(character?: string): { ok: true; character: string } | { ok: false; status: 404 | 409; error: string }
  start(job: SpeechJob, report: (phase: 'audible-start' | 'ended' | 'failed', error?: string) => void): { cancel(): void }
}

type Owned = {
  id: string
  generation: number
  character: string
  text: string
  emotion: SpeechEmotion
  mime?: string
  chunks: Uint8Array[]
  nextSeq: number
  bytes: number
  final: boolean
  phase: SpeechPhase
  heard: boolean
  error?: string
  handle: { cancel(): void } | null
}

const idOk = (value: string) => /^[A-Za-z0-9_-]{1,80}$/.test(value)

/** The renderer answer, with only the fields the local API returns. */
export function readSpeechResult(value: unknown): SpeechResult {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const phase = raw.phase
  const known = phase === 'accepted' || phase === 'audible-start' || phase === 'ended' || phase === 'cancelled' || phase === 'failed'
  const status = raw.status
  const statuses = [200, 202, 400, 404, 409, 413, 503]
  if ((raw.ok === true || raw.ok === false) && typeof status === 'number' && statuses.includes(status) && (phase === undefined || known)
    && (raw.utteranceId === undefined || typeof raw.utteranceId === 'string')
    && (raw.character === undefined || typeof raw.character === 'string')
    && (raw.error === undefined || typeof raw.error === 'string')
    && (raw.heard === undefined || typeof raw.heard === 'boolean')
    && (raw.dropped === undefined || typeof raw.dropped === 'boolean')) {
    return {
      ok: raw.ok, status: status as SpeechResult['status'],
      ...(typeof raw.utteranceId === 'string' ? { utteranceId: raw.utteranceId } : {}),
      ...(known ? { phase } : {}),
      ...(typeof raw.character === 'string' ? { character: raw.character } : {}),
      ...(raw.heard === undefined ? {} : { heard: raw.heard }),
      ...(raw.dropped === true ? { dropped: true } : {}),
      ...(typeof raw.error === 'string' ? { error: raw.error } : {}),
    }
  }
  return { ok: false, status: 503, error: 'Stage is not responding' }
}

export class SpeechBridge {
  private generation = 0
  private owner: Owned | null = null
  private history = new Map<string, Owned>()
  private serial = 0
  private readonly player: SpeechPlayer

  constructor(player: SpeechPlayer) { this.player = player }

  submit(input: SpeechInput): SpeechResult {
    const checked = check(input)
    if (!checked.ok) return checked.result
    const spec = checked.input
    if (spec.utteranceId && this.owner?.id === spec.utteranceId && open(this.owner)) return this.append(this.owner, spec)
    const previous = spec.utteranceId ? this.history.get(spec.utteranceId) : undefined
    if (previous) return dropped(previous, previous.phase === 'cancelled' ? 'Late chunk dropped' : 'This utterance already finished')
    if (spec.seq !== undefined && spec.seq !== 0) return { ok: false, status: 400, error: 'A new utterance starts at chunk 0' }
    if (!spec.text && !spec.audio?.byteLength) return { ok: false, status: 400, error: 'An utterance needs text or audio' }
    if (this.owner && open(this.owner) && spec.interrupt === false) return { ok: false, status: 409, error: 'Another utterance is playing', utteranceId: this.owner.id, phase: this.owner.phase, heard: this.owner.heard }
    const slot = this.player.available(spec.character)
    if (!slot.ok) return { ok: false, status: slot.status, error: slot.error }
    if (this.owner && open(this.owner)) this.finish(this.owner, 'cancelled')
    const generation = ++this.generation
    const owned: Owned = {
      id: spec.utteranceId || `utt-${++this.serial}`, generation, character: slot.character, text: spec.text ?? '', emotion: spec.emotion ?? 'neutral',
      ...(spec.mime ? { mime: spec.mime } : {}), chunks: [], nextSeq: 0, bytes: 0, final: false, phase: 'accepted', heard: false, handle: null,
    }
    this.owner = owned
    const appended = this.append(owned, spec)
    if (!appended.ok && this.owner === owned) this.finish(owned, 'failed', appended.error)
    return appended.ok ? { ok: true, status: 202, utteranceId: owned.id, phase: owned.phase, character: owned.character, heard: owned.heard } : { ...appended, utteranceId: owned.id, phase: owned.phase }
  }

  status(utteranceId: string): SpeechResult {
    const owned = this.find(utteranceId)
    if (!owned) return { ok: false, status: 404, error: 'Utterance not found' }
    return view(owned, 200)
  }

  cancel(utteranceId: string): SpeechResult {
    const owned = this.find(utteranceId)
    if (!owned) return { ok: false, status: 404, error: 'Utterance not found' }
    if (open(owned)) this.finish(owned, 'cancelled')
    return view(owned, 200)
  }

  private append(owned: Owned, spec: SpeechInput): SpeechResult {
    if (!open(owned) || owned.final) return dropped(owned, 'Late chunk dropped')
    const seq = spec.seq ?? owned.nextSeq
    if (!Number.isInteger(seq) || seq < 0 || seq >= SPEECH_CHUNK_LIMIT) return { ok: false, status: 400, error: 'Chunk sequence is out of range', utteranceId: owned.id, phase: owned.phase }
    if (seq !== owned.nextSeq) return dropped(owned, 'Late chunk dropped')
    const audio = spec.audio
    if (audio && owned.bytes + audio.byteLength > SPEECH_AUDIO_LIMIT) {
      this.finish(owned, 'failed', 'Audio is larger than 1.5 MB')
      return { ok: false, status: 413, error: 'Audio is larger than 1.5 MB', utteranceId: owned.id, phase: 'failed' }
    }
    if (spec.text) owned.text = spec.text
    if (spec.emotion) owned.emotion = spec.emotion
    if (spec.mime) owned.mime = spec.mime
    if (audio?.byteLength) { owned.chunks.push(audio); owned.bytes += audio.byteLength }
    owned.nextSeq += 1
    if (spec.final !== false) owned.final = true
    if (owned.final) this.play(owned)
    return view(owned, 202)
  }

  private play(owned: Owned) {
    if (!owned.text && owned.bytes === 0) { this.finish(owned, 'failed', 'An utterance needs text or audio'); return }
    const audio = owned.bytes ? concat(owned.chunks) : undefined
    const generation = owned.generation
    try {
      const handle = this.player.start({
        utteranceId: owned.id, character: owned.character, text: owned.text, emotion: owned.emotion, ...(audio ? { audio, mime: owned.mime } : {}),
      }, (phase, error) => this.onPlayer(generation, phase, error))
      if (this.owner === owned && open(owned)) owned.handle = handle
      else if (open(owned)) handle.cancel()
    } catch (error) {
      this.finish(owned, 'failed', error instanceof Error ? error.message : 'Playback failed')
    }
  }

  private onPlayer(generation: number, phase: 'audible-start' | 'ended' | 'failed', error?: string) {
    const owned = this.owner
    if (!owned || owned.generation !== generation || !open(owned)) return
    if (phase === 'audible-start') { owned.phase = 'audible-start'; owned.heard = true; return }
    this.finish(owned, phase === 'ended' ? 'ended' : 'failed', error)
  }

  private finish(owned: Owned, phase: 'ended' | 'cancelled' | 'failed', error?: string) {
    if (!open(owned)) return
    owned.phase = phase
    if (error) owned.error = error
    owned.handle?.cancel()
    owned.handle = null
    if (this.owner === owned) this.owner = null
    this.history.set(owned.id, owned)
    while (this.history.size > 32) {
      const oldest = this.history.keys().next().value
      if (oldest === undefined) break
      this.history.delete(oldest)
    }
  }

  private find(id: string) {
    if (this.owner?.id === id) return this.owner
    return this.history.get(id) ?? null
  }
}

function open(owned: Owned) {
  return owned.phase === 'accepted' || owned.phase === 'audible-start'
}

function view(owned: Owned, status: 200 | 202): SpeechResult {
  return {
    ok: true, status, utteranceId: owned.id, phase: owned.phase, character: owned.character, heard: owned.heard,
    ...(owned.error ? { error: owned.error } : {}),
  }
}

function dropped(owned: Owned, error: string): SpeechResult {
  return { ok: false, status: 409, error, dropped: true, utteranceId: owned.id, phase: owned.phase, heard: owned.heard }
}

function check(input: SpeechInput): { ok: true; input: SpeechInput } | { ok: false; result: SpeechResult } {
  if (input.utteranceId !== undefined && (typeof input.utteranceId !== 'string' || !idOk(input.utteranceId))) return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance id' } }
  if (input.character !== undefined && (typeof input.character !== 'string' || !input.character.length || input.character.length > 160)) return { ok: false, result: { ok: false, status: 400, error: 'Invalid character id' } }
  if (input.text !== undefined && (typeof input.text !== 'string' || [...input.text].length > SPEECH_TEXT_LIMIT)) return { ok: false, result: { ok: false, status: 400, error: 'Text is longer than 4000 characters' } }
  if (input.audio !== undefined && !(input.audio instanceof Uint8Array)) return { ok: false, result: { ok: false, status: 400, error: 'Audio must be inline bytes' } }
  if (input.audio && input.audio.byteLength > SPEECH_AUDIO_LIMIT) return { ok: false, result: { ok: false, status: 413, error: 'Audio is larger than 1.5 MB' } }
  if (input.seq !== undefined && (typeof input.seq !== 'number' || !Number.isInteger(input.seq) || input.seq < 0 || input.seq >= SPEECH_CHUNK_LIMIT)) return { ok: false, result: { ok: false, status: 400, error: 'Chunk sequence is out of range' } }
  if (input.emotion !== undefined && !SPEECH_EMOTIONS.includes(input.emotion)) return { ok: false, result: { ok: false, status: 400, error: 'Unknown emotion' } }
  if (input.final !== undefined && typeof input.final !== 'boolean') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance' } }
  if (input.interrupt !== undefined && typeof input.interrupt !== 'boolean') return { ok: false, result: { ok: false, status: 400, error: 'Invalid utterance' } }
  return { ok: true, input }
}

function concat(chunks: Uint8Array[]) {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
  let offset = 0
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength }
  return out
}
