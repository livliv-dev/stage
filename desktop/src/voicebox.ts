// Voicebox (github.com/jamiepine/voicebox, MIT), a local voice studio people install and run themselves. Its REST API
// answers on 127.0.0.1:17493 and lets only its own origins call it from a page, so LivLiv Stage reaches it from here:
// its voice profiles (GET /profiles), a line said in one (POST /generate/stream: the whole line as a WAV) and, when
// asked, what you said heard (POST /transcribe, Whisper). Nothing of it is bundled: Stage finds it running, or tells why
// it can't use it (not running, no voice yet, a model still downloading). Plain Node: main.ts gives it fetch.

/** where Voicebox listens */
export const VOICEBOX_URL = 'http://127.0.0.1:17493'

// what the editor and this side say about it (profiles, results): the shared protocol package
import type { VoiceboxFailure, VoiceboxProfile, VoiceboxResult } from '#protocol/voicebox'
export type { VoiceboxFailure, VoiceboxProfile, VoiceboxResult }

const KINDS = new Set(['preset', 'cloned', 'designed'])
/** the profile's engine: its own default, its preset's, else Voicebox's (a designed voice: VoiceDesign; else Qwen3-TTS) */
export function engineOf(raw: { default_engine?: unknown; preset_engine?: unknown; voice_type?: unknown }) {
  const own = typeof raw.default_engine === 'string' && raw.default_engine ? raw.default_engine : typeof raw.preset_engine === 'string' && raw.preset_engine ? raw.preset_engine : ''
  return own || (raw.voice_type === 'designed' ? 'qwen_voice_design' : 'qwen')
}

/** each engine's models, the one Voicebox uses unasked first, with the size to ask for (its /models/status names) */
const MODELS: Record<string, { name: string; size?: string; label: string }[]> = {
  qwen: [{ name: 'qwen-tts-1.7B', size: '1.7B', label: 'Qwen3-TTS 1.7B' }, { name: 'qwen-tts-0.6B', size: '0.6B', label: 'Qwen3-TTS 0.6B' }],
  qwen_custom_voice: [{ name: 'qwen-custom-voice-1.7B', size: '1.7B', label: 'Qwen CustomVoice 1.7B' }, { name: 'qwen-custom-voice-0.6B', size: '0.6B', label: 'Qwen CustomVoice 0.6B' }],
  qwen_voice_design: [{ name: 'qwen-voice-design-1.7B', size: '1.7B', label: 'Qwen VoiceDesign 1.7B' }],
  kokoro: [{ name: 'kokoro', label: 'Kokoro' }],
  chatterbox: [{ name: 'chatterbox-tts', label: 'Chatterbox' }],
  chatterbox_turbo: [{ name: 'chatterbox-turbo', label: 'Chatterbox Turbo' }],
  luxtts: [{ name: 'luxtts', label: 'LuxTTS' }],
  tada: [{ name: 'tada-1b', size: '1B', label: 'TADA 1B' }, { name: 'tada-3b-ml', size: '3B', label: 'TADA 3B' }],
  omnivoice: [{ name: 'omnivoice', label: 'OmniVoice' }],
}
/** the models downloaded, by name, from /models/status; null: it didn't say (an older Voicebox) */
export function readDownloaded(raw: unknown): Set<string> | null {
  const list = raw && typeof raw === 'object' ? (raw as { models?: unknown }).models : null
  if (!Array.isArray(list)) return null
  return new Set(list.flatMap((m) => (m && typeof m === 'object' && (m as { downloaded?: unknown }).downloaded === true && typeof (m as { model_name?: unknown }).model_name === 'string' ? [(m as { model_name: string }).model_name] : [])))
}
/** whether a profile's engine has a model to say lines with, the size to ask for, and the model to get if not; an
 *  engine Stage doesn't know, or a Voicebox that didn't say: ready, as Voicebox decides */
export function modelFor(engine: string, downloaded: Set<string> | null): Pick<VoiceboxProfile, 'ready' | 'size' | 'model'> {
  const models = MODELS[engine]
  if (!models || !downloaded) return { ready: true }
  const have = models.find((m) => downloaded.has(m.name))
  return have ? { ready: true, ...(have.size ? { size: have.size } : {}) } : { ready: false, model: models[0].label }
}

/** the profiles Voicebox lists, as Stage needs them (anything malformed left out) */
export function readProfiles(raw: unknown, downloaded: Set<string> | null = null): VoiceboxProfile[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((p) => {
    if (!p || typeof p !== 'object') return []
    const { id, name, language, voice_type } = p as Record<string, unknown>
    if (typeof id !== 'string' || !id || id.length > 200 || typeof name !== 'string') return []
    const kind = typeof voice_type === 'string' && KINDS.has(voice_type) ? voice_type as VoiceboxProfile['kind'] : 'other'
    const engine = engineOf(p as Record<string, unknown>)
    return [{ id, name: name.slice(0, 100) || id, language: typeof language === 'string' ? language : '', kind, engine, ...modelFor(engine, downloaded) }]
  })
}

const failure = (error: VoiceboxFailure, detail = ''): { ok: false; error: VoiceboxFailure; detail: string } => ({ ok: false, error, detail })
/** what Voicebox said about a failed call ({"detail": "…"} or {"detail": {"message": "…"}}) */
async function said(r: Response) {
  const text = (await r.text().catch(() => '')).slice(0, 400)
  try {
    const d = JSON.parse(text)?.detail
    return typeof d === 'string' ? d : typeof d?.message === 'string' ? d.message : text
  } catch { return text }
}
/** a model it needs is downloading (Voicebox started it), or was never downloaded (Stage starts no download) */
const modelFailure = (status: number, detail: string): VoiceboxFailure => (/not downloaded/i.test(detail) ? 'no-model' : status === 202 || /being downloaded|downloading/i.test(detail) ? 'downloading' : 'failed')

export type VoiceboxDeps = { fetch: typeof fetch; base?: string }

export function voiceboxClient({ fetch: get, base = VOICEBOX_URL }: VoiceboxDeps) {
  const url = (path: string) => base.replace(/\/+$/, '') + path
  /** a call that may find Voicebox not running: a refused connection or no answer in time */
  async function call(path: string, init: RequestInit, ms: number, signal?: AbortSignal): Promise<Response | { ok: false; error: VoiceboxFailure; detail: string }> {
    try { return await get(url(path), { ...init, signal: AbortSignal.any([AbortSignal.timeout(ms), ...(signal ? [signal] : [])]) }) } catch (error) {
      if (signal?.aborted) throw signal.reason
      return failure('not-running', (error as Error).message)
    }
  }
  return {
    /** its voice profiles, each with whether its model is downloaded; none is a failure (Stage has nothing to say lines
     *  in) */
    async profiles(): Promise<VoiceboxResult<VoiceboxProfile[]>> {
      const r = await call('/profiles', {}, 2500)
      if (!(r instanceof Response)) return r
      if (!r.ok) return failure('failed', await said(r))
      const raw = await r.json().catch(() => null)
      const status = await call('/models/status', {}, 2500)
      const downloaded = status instanceof Response && status.ok ? readDownloaded(await status.json().catch(() => null)) : null
      const profiles = readProfiles(raw, downloaded)
      return profiles.length ? { ok: true, value: profiles } : failure('no-profiles')
    },
    /** a line in this profile and language, as a WAV (`size`: the model size of its engine to use) */
    async speak(profile: string, text: string, language: string, signal?: AbortSignal, size?: string): Promise<VoiceboxResult<ArrayBuffer>> {
      const body = { profile_id: profile, text, language, ...(size ? { model_size: size } : {}) }
      const r = await call('/generate/stream', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, 120_000, signal)
      if (!(r instanceof Response)) return r
      if (!r.ok) { const detail = await said(r); return failure(modelFailure(r.status, detail), detail) }
      const audio = await r.arrayBuffer()
      return audio.byteLength ? { ok: true, value: audio } : failure('failed', 'empty audio')
    },
    /** what was said in a recording (a WAV) */
    async transcribe(wav: ArrayBuffer, language?: string, signal?: AbortSignal): Promise<VoiceboxResult<string>> {
      const form = new FormData()
      form.append('file', new Blob([wav], { type: 'audio/wav' }), 'say.wav')
      if (language) form.append('language', language)
      const r = await call('/transcribe', { method: 'POST', body: form }, 60_000, signal)
      if (!(r instanceof Response)) return r
      if (r.status === 202 || !r.ok) { const detail = await said(r); return failure(modelFailure(r.status, detail), detail) }
      const data = await r.json().catch(() => null)
      return typeof data?.text === 'string' ? { ok: true, value: data.text.trim() } : failure('failed', 'no text')
    },
  }
}
export type VoiceboxClient = ReturnType<typeof voiceboxClient>
