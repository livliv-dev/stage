import { tr } from './i18n'
// Voicebox (voicebox.sh, MIT): a local voice studio people run themselves, free, nothing leaving the computer. In the
// desktop app Stage looks for it (at start, and when the voice settings open): running with a voice of an open
// engine, and no other voice set, it is the characters' voice. Each character speaks in a Voicebox profile, a preset or
// one you cloned in Voicebox; what you say can be heard by its Whisper too. The calls go through the desktop app
// (desktop/src/voicebox.ts): Voicebox lets no other page call it, so the web doesn't offer it.
import { useSyncExternalStore } from 'react'
import type { VoiceboxFailure, VoiceboxProfile } from '../../protocol/src/voicebox'

export type { VoiceboxProfile }

/** where to get it */
export const VOICEBOX_SITE = 'https://voicebox.sh'

/** the engines Stage uses unasked, all openly licensed: Qwen3-TTS, its CustomVoice and VoiceDesign, Kokoro (Apache-2.0),
 *  Chatterbox (MIT). A voice of another engine (HumeAI TADA: the Llama 3.2 licence; OmniVoice: non-commercial weights)
 *  speaks only when you pick it for a character */
export const OPEN_ENGINES: ReadonlySet<string> = new Set(['qwen', 'qwen_custom_voice', 'qwen_voice_design', 'kokoro', 'chatterbox', 'chatterbox_turbo'])
export const openProfiles = (profiles: readonly VoiceboxProfile[]) => profiles.filter((p) => OPEN_ENGINES.has(p.engine))
/** the voices Stage uses unasked: of an open engine, with its model downloaded (Stage starts no download) */
export const usableProfiles = (profiles: readonly VoiceboxProfile[]) => openProfiles(profiles).filter((p) => p.ready)

/** the language a line is said in, as Voicebox names it: from its writing (kana, hangul, Chinese characters, letters),
 *  else the voice's own */
export function lineLanguage(text: string, voice = '') {
  if (/[぀-ヿ]/.test(text)) return 'ja'
  if (/[가-힯]/.test(text)) return 'ko'
  if (/[一-鿿]/.test(text)) return 'zh'
  if (/[a-z]/i.test(text)) return 'en'
  return /^[a-z]{2}$/.test(voice) ? voice : 'en'
}

/** why Voicebox couldn't do it, in words people can act on */
export function voiceboxError(error: VoiceboxFailure, detail = '') {
  if (error === 'not-running') return tr('Voicebox 没有在运行：打开 Voicebox 后再试')
  if (error === 'no-profiles') return tr('Voicebox 里还没有声音：在 Voicebox 里添加一个预设声音或克隆一个')
  if (error === 'no-model') return tr('Voicebox 里还没下载这个声音的模型：在 Voicebox 里用这个声音生成一句（它会先下载模型），或在它的模型设置里下载，再回来试')
  if (error === 'downloading') return tr('Voicebox 还在下载模型，下载好后再试')
  return tr('Voicebox 没有说出这句：{0}', detail || tr('未知原因'))
}

/** what Stage knows of Voicebox: running (with its profiles), not running or unusable (why), being looked for */
export type VoiceboxState = { status: 'unknown' | 'on' | 'off'; checking: boolean; profiles: VoiceboxProfile[]; error: VoiceboxFailure | null; detail: string }
let state: VoiceboxState = { status: 'unknown', checking: false, profiles: [], error: null, detail: '' }
const subs = new Set<() => void>()
const set = (patch: Partial<VoiceboxState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()) }
export const voiceboxState = () => state
export const onVoicebox = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const useVoicebox = () => useSyncExternalStore(onVoicebox, voiceboxState)

type Bridge = NonNullable<NonNullable<Window['livlivDesktop']>['voicebox']>
let given: Bridge | undefined
/** the desktop app's way to Voicebox (preload.ts), or one given instead (the tests' stand-in) */
const bridge = () => given ?? (typeof window === 'undefined' ? undefined : window.livlivDesktop?.voicebox)
export function setVoiceboxBridge(b: Bridge | undefined) { given = b }
/** Stage can use Voicebox here: the desktop app */
export const voiceboxHere = () => !!bridge()
/** Voicebox is running with a voice of an open engine: the characters' voice when no other is set */
export const voiceboxReady = () => state.status === 'on' && usableProfiles(state.profiles).length > 0

let looking: Promise<VoiceboxState> | null = null
/** looks for Voicebox now (once at a time) */
export function detectVoicebox(): Promise<VoiceboxState> {
  const b = bridge()
  if (!b) return Promise.resolve(state)
  looking ??= (async () => {
    set({ checking: true })
    try {
      const r = await b.profiles()
      // running, but no open voice has its model: it says how to get one, and isn't the default voice until then
      const missing = r.ok && openProfiles(r.value).length > 0 && !usableProfiles(r.value).length
      set(r.ok ? { status: 'on', profiles: r.value, error: missing ? 'no-model' : null, detail: '' } : { status: 'off', profiles: [], error: r.error, detail: r.detail })
    } catch (error) { set({ status: 'off', profiles: [], error: 'failed', detail: (error as Error).message }) }
    finally { set({ checking: false }); looking = null }
    return state
  })()
  return looking
}

/** a character's default voice: the open profiles in turn, by its place among those with none of their own */
export const defaultProfile = (place: number) => {
  const open = usableProfiles(state.profiles)
  return open.length ? open[Math.max(0, place) % open.length].id : ''
}
/** a profile's name, else its id */
export const profileName = (id: string) => state.profiles.find((p) => p.id === id)?.name ?? id

let calls = 0
/** an id for a call, so it can be given up */
const callId = () => `vb-${Date.now().toString(36)}-${++calls}`
async function giveUpWith<T>(signal: AbortSignal | undefined, run: (id: string) => Promise<T>) {
  const b = bridge(), id = callId()
  const cancel = () => { void b?.cancel(id) }
  signal?.throwIfAborted()
  signal?.addEventListener('abort', cancel, { once: true })
  try { return await run(id) } finally { signal?.removeEventListener('abort', cancel) }
}
const unavailable = () => new Error(tr('Voicebox 只能在 LivLiv Stage 桌面版里用'))

/** a line said in this Voicebox profile, as a WAV */
export async function voiceboxSpeak(profile: string, text: string, signal?: AbortSignal): Promise<Blob> {
  const b = bridge()
  if (!b) throw unavailable()
  if (!profile) throw new Error(voiceboxError('no-profiles'))
  const known = state.profiles.find((p) => p.id === profile), language = lineLanguage(text, known?.language)
  if (known && !known.ready) throw new Error(voiceboxError('no-model'))
  const r = await giveUpWith(signal, (id) => b.speak(id, { profile, text, ...(known?.size ? { size: known.size } : {}) }, language))
  signal?.throwIfAborted()
  if (!r.ok) {
    if (r.error === 'not-running') void detectVoicebox()
    throw new Error(voiceboxError(r.error, r.detail))
  }
  return new Blob([r.value], { type: 'audio/wav' })
}

/** what was said in a recording (a WAV), heard by Voicebox's Whisper */
export async function voiceboxTranscribe(wav: Blob, signal?: AbortSignal): Promise<string> {
  const b = bridge()
  if (!b) throw unavailable()
  const audio = await wav.arrayBuffer()
  const r = await giveUpWith(signal, (id) => b.transcribe(id, audio))
  signal?.throwIfAborted()
  if (!r.ok) {
    if (r.error === 'not-running') void detectVoicebox()
    throw new Error(voiceboxError(r.error, r.detail))
  }
  return r.value
}

// looked for as the desktop app starts
if (bridge()) void detectVoicebox()
