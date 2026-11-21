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

/** the profiles Voicebox lists, as Stage needs them (anything malformed left out) */
export function readProfiles(raw: unknown): VoiceboxProfile[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((p) => {
    if (!p || typeof p !== 'object') return []
    const { id, name, language, voice_type } = p as Record<string, unknown>
    if (typeof id !== 'string' || !id || id.length > 200 || typeof name !== 'string') return []
    const kind = typeof voice_type === 'string' && KINDS.has(voice_type) ? voice_type as VoiceboxProfile['kind'] : 'other'
    return [{ id, name: name.slice(0, 100) || id, language: typeof language === 'string' ? language : '', kind, engine: engineOf(p as Record<string, unknown>) }]
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
/** a model it needs is still downloading, or was never downloaded */
const downloading = (status: number, detail: string) => status === 202 || /not downloaded|being downloaded|downloading/i.test(detail)

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
    /** its voice profiles; none is a failure (Stage has nothing to say lines in) */
    async profiles(): Promise<VoiceboxResult<VoiceboxProfile[]>> {
      const r = await call('/profiles', {}, 2500)
      if (!(r instanceof Response)) return r
      if (!r.ok) return failure('failed', await said(r))
      const profiles = readProfiles(await r.json().catch(() => null))
      return profiles.length ? { ok: true, value: profiles } : failure('no-profiles')
    },
    /** a line in this profile and language, as a WAV */
    async speak(profile: string, text: string, language: string, signal?: AbortSignal): Promise<VoiceboxResult<ArrayBuffer>> {
      const r = await call('/generate/stream', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile_id: profile, text, language }) }, 120_000, signal)
      if (!(r instanceof Response)) return r
      if (!r.ok) { const detail = await said(r); return failure(downloading(r.status, detail) ? 'downloading' : 'failed', detail) }
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
      if (r.status === 202 || !r.ok) { const detail = await said(r); return failure(downloading(r.status, detail) ? 'downloading' : 'failed', detail) }
      const data = await r.json().catch(() => null)
      return typeof data?.text === 'string' ? { ok: true, value: data.text.trim() } : failure('failed', 'no text')
    },
  }
}
export type VoiceboxClient = ReturnType<typeof voiceboxClient>
