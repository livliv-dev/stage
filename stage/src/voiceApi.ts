import { tr } from './i18n'
// The user's own speech API (bring your own key, as for the AI model): any OpenAI-compatible /audio/speech gives the
// characters' voices, /audio/transcriptions push to talk. Presets for OpenAI, SiliconFlow (CosyVoice), Kokoro-FastAPI
// on this computer, and anything else that speaks the same API; the key kept on this computer. A clip from it plays
// like a LivLiv one: the mouth follows the sound, a recording takes it in.
// A model key from Bailian or SiliconFlow speaks and transcribes too, with nothing more to fill in (activeSpeech), each character in a
// voice of its own (apiVoice).
// Which voice a character speaks in (voiceRoute): the one chosen for it if it can be had, else your API, LivLiv's
// voice (signed in, a LivLiv character), else none: its lines show as subtitles. The system's voice only if chosen.
import { useSyncExternalStore } from 'react'
import { aiFetch, failed, loadBrainConfig, previousModelConfig, useBrainConfig, type BrainConfig, type Emotion } from './brain'
import { modelId, signedIn } from './livliv'
import type { CharacterItem } from './scene'
import { onSite } from './host'

export type SpeechApi = { provider: string; base: string; key: string; model: string; voice: string; asr: string }
/** tone: the model takes a speaking style (OpenAI's instructions); voicesPath: the API lists its voices there */
export type SpeechProvider = { id: string; label: string; base: string; model: string; asr: string; voices?: string[]; voicesPath?: string; noKey?: boolean; keyUrl?: string; tone?: boolean
  /** gives a WAV as it is made: a line starts being heard with its first piece (speakLive) */
  live?: boolean
  /** its voices that sound like a woman / a man, the best first: who gets which (apiVoice) */
  women?: string[]; men?: string[] }
const QWEN_FEATURED: Record<string, string> = { d03ft: 'longanlingxi_v3.1', k01: 'longanhuan_v3.1', v04: 'longanlang_v3.1' }
const COSY = ['alex', 'anna', 'bella', 'benjamin', 'charles', 'claire', 'david', 'diana'].map((v) => `FunAudioLLM/CosyVoice2-0.5B:${v}`)
export const SPEECH_PROVIDERS: SpeechProvider[] = [
  { id: 'qwen', label: '阿里云百炼', base: 'https://dashscope.aliyuncs.com/api/v1', model: 'qwen-audio-3.1-tts-flash', asr: 'qwen-audio-3.0-asr-flash', tone: true,
    voices: ['longanhuan_v3.1', 'longanlingxi_v3.1', 'longanlang_v3.1', 'longhan_v3.1', 'longyuan_v3.1', 'longanzhi_v3.1'], keyUrl: 'https://bailian.console.aliyun.com/',
    women: ['longanhuan_v3.1', 'longyuan_v3.1'], men: ['longhan_v3.1', 'longanzhi_v3.1'] },
  { id: 'openai', label: 'OpenAI', live: true, base: 'https://api.openai.com/v1', model: 'gpt-4o-mini-tts', asr: 'gpt-4o-mini-transcribe', tone: true,
    voices: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'], keyUrl: 'https://platform.openai.com/api-keys',
    women: ['coral', 'nova', 'shimmer', 'sage'], men: ['ash', 'onyx', 'echo', 'verse'] },
  { id: 'siliconflow', label: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'FunAudioLLM/CosyVoice2-0.5B', asr: 'FunAudioLLM/SenseVoiceSmall',
    voices: COSY, keyUrl: 'https://cloud.siliconflow.cn/account/ak',
    women: ['anna', 'bella', 'claire', 'diana'].map((v) => `FunAudioLLM/CosyVoice2-0.5B:${v}`), men: ['alex', 'benjamin', 'charles', 'david'].map((v) => `FunAudioLLM/CosyVoice2-0.5B:${v}`) },
  { id: 'kokoro', label: 'Kokoro', base: 'http://localhost:8880/v1', model: 'kokoro', asr: '', voicesPath: '/audio/voices', noKey: true },
  { id: 'custom', label: '其他', base: '', model: 'tts-1', asr: 'whisper-1', voicesPath: '/audio/voices' },
]
/** the ones offered: on livliv.ai/stage only those a web page can call straight (Kokoro runs on your computer, any
 *  other service is unknown); the desktop app reaches all */
export const SPEECH_HERE = onSite ? SPEECH_PROVIDERS.filter((p) => !['kokoro', 'custom'].includes(p.id)) : SPEECH_PROVIDERS
export const speechProviderOf = (s: SpeechApi) => SPEECH_PROVIDERS.find((p) => p.id === s.provider) ?? SPEECH_PROVIDERS.at(-1)!
export const speechReady = (s: SpeechApi) => !!s.base && !!s.model && (!!s.key || s.provider === 'custom' || !!speechProviderOf(s).noKey)
export const asrReady = (s: SpeechApi) => !!s.base && !!s.asr && (!!s.key || s.provider === 'custom' || !!speechProviderOf(s).noKey)

const KEY = 'livliv-stage:speech'
export const SPEECH_UNSET: SpeechApi = { provider: '', base: '', key: '', model: '', voice: '', asr: '' }
/** chosen in settings: no speech API, not even the model key's */
export const SPEECH_OFF: SpeechApi = { ...SPEECH_UNSET, provider: 'off' }
function load(): SpeechApi {
  try { return { ...SPEECH_UNSET, ...JSON.parse(localStorage.getItem(KEY) || 'null') } } catch { return SPEECH_UNSET }
}
let config = load()
const subs = new Set<() => void>()
export const loadSpeech = () => config
export function saveSpeech(s: SpeechApi) {
  config = s
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
  subs.forEach((f) => f())
}
export const useSpeech = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => config)

/** the speech API that comes with this model's key: the same service, the same address and key (while the demo
 *  plays, the saved model's) */
export function speechOfModel(c: BrainConfig = loadBrainConfig()): SpeechApi | null {
  const b = c.kind === 'demo' ? previousModelConfig() : c
  if (!b.key) return null
  const p = SPEECH_PROVIDERS.find((q) => q.id === b.provider && q.women && q.id !== 'openai')
  return p ? { provider: p.id, base: p.id === 'qwen' ? b.base.replace(/\/compatible-mode\/v1\/?$/, '/api/v1') : b.base, key: b.key, model: p.model, voice: '', asr: p.asr } : null
}
/** the speech API in use: the one set in settings; none set, the one that comes with the model's key */
export const activeSpeech = (s = config, b: BrainConfig = loadBrainConfig()): SpeechApi => (s.provider ? s : speechOfModel(b) ?? s)
export function useActiveSpeech() {
  const s = useSpeech(), b = useBrainConfig()
  return activeSpeech(s, b)
}

/** a character's voice of this API: its own choice, the default set for the API, else one nobody else on the stage
 *  has: the next free woman's or man's voice by its gender, either in turn when it isn't known */
export function apiVoice(c: CharacterItem, s: SpeechApi, cast: CharacterItem[]): string {
  if (c.voice.api) return c.voice.api
  if (s.voice) return s.voice
  // Keep the featured cast's voices consistent with the demo, even when reordered or used solo.
  const featured = s.provider === 'qwen' ? QWEN_FEATURED[modelId(c) ?? ''] : undefined
  if (featured) return featured
  const p = speechProviderOf(s)
  if (!p.women || !p.men) return ''
  const mine = cast.filter((x) => x.gender === c.gender && !x.voice.api), i = Math.max(0, mine.findIndex((x) => x.id === c.id))
  const list = c.gender === 'f' ? p.women : c.gender === 'm' ? p.men : p.women.flatMap((v, k) => [v, p.men![k]])
  return list[i % list.length]
}

const endpoint = (s: SpeechApi, path: string) => `${s.base.replace(/\/+$/, '')}${path}`
const auth = (s: SpeechApi): Record<string, string> => (s.key ? { Authorization: `Bearer ${s.key}` } : {})
// the speaking style for a feeling, where the model takes one
const TONE: Partial<Record<Emotion, string>> = { happy: '语气开心、轻快，带着笑意', shy: '语气害羞、小声', sad: '语气低落、温柔', angry: '语气有点生气', surprised: '语气惊讶，尾音上扬' }

/** a line in `voice` (or the API's default one) as MP3 */
export async function speakApi(s: SpeechApi, text: string, voice: string, emotion: Emotion, rate: number, signal?: AbortSignal): Promise<Blob> {
  if (s.provider === 'qwen') {
    const r = await aiFetch(endpoint(s, '/services/audio/tts/SpeechSynthesizer'), {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...auth(s) },
      body: JSON.stringify({ model: s.model, input: { text, voice: voice || s.voice || speechProviderOf(s).voices![0], format: 'wav', sample_rate: 24000, rate,
        ...(TONE[emotion] ? { instruction: TONE[emotion] } : {}) } }),
    })
    if (!r.ok) throw await failed(r)
    const data = await r.json(), url = data?.output?.audio?.url
    if (data?.code) throw new Error(data.message || data.code)
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) throw new Error(tr('语音接口没有返回声音'))
    // The generated file is fetched without forwarding the API key to its storage host.
    const audio = await aiFetch(url, { signal })
    if (!audio.ok) throw new Error(tr('声音文件读取失败（{0}）', audio.status))
    return audio.blob()
  }
  const tone = speechProviderOf(s).tone && TONE[emotion]
  const r = await aiFetch(endpoint(s, '/audio/speech'), {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...auth(s) },
    body: JSON.stringify({ model: s.model, input: text, voice: voice || s.voice, response_format: 'mp3', ...(rate !== 1 ? { speed: rate } : {}), ...(tone ? { instructions: tone } : {}) }),
  })
  if (!r.ok) throw await failed(r)
  return r.blob()
}

/** a line's sound as it is being made: for the player from its start, whatever has come so far and the rest as it comes;
 *  when all of it is in, the whole file (for a recording) and its true length */
export type Live = { open(): Response; whole: Promise<Blob>; seconds: () => number | null }

/** a WAV of unknown length as it was sent: its header given the real sizes, and its seconds */
function finished(parts: Uint8Array[], type: string): { blob: Blob; seconds: number | null } {
  const n = parts.reduce((a, p) => a + p.length, 0), all = new Uint8Array(n)
  let at = 0
  for (const p of parts) { all.set(p, at); at += p.length }
  if (!/wav/.test(type) || n < 44) return { blob: new Blob([all], { type }), seconds: null }
  const v = new DataView(all.buffer)
  let i = 12, rate = 0, align = 1
  while (i + 8 <= n) {
    const id = String.fromCharCode(all[i], all[i + 1], all[i + 2], all[i + 3]), size = v.getUint32(i + 4, true)
    if (id === 'fmt ' && size >= 16 && i + 24 <= n) { rate = v.getUint32(i + 16, true); align = v.getUint16(i + 20, true) || 1 }  // bytes a second
    if (id === 'data') {
      const end = n - ((n - i - 8) % align)
      v.setUint32(4, end - 8, true); v.setUint32(i + 4, end - i - 8, true)
      return { blob: new Blob([all.subarray(0, end)], { type }), seconds: rate ? (end - i - 8) / rate : null }
    }
    i += 8 + size + (size & 1)
  }
  return { blob: new Blob([all], { type }), seconds: null }
}

/** a line as WAV as it is made, once the first of it has come back. It keeps coming in whether or not it is being
 *  played yet; a line made ahead of its turn is complete by the time it is said. A service that sends something else
 *  still works: the player takes it whole */
export async function speakLive(s: SpeechApi, text: string, voice: string, emotion: Emotion, rate: number, signal?: AbortSignal): Promise<Live> {
  const tone = speechProviderOf(s).tone && TONE[emotion]
  const r = await aiFetch(endpoint(s, '/audio/speech'), {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...auth(s) },
    body: JSON.stringify({ model: s.model, input: text, voice: voice || s.voice, response_format: 'wav', ...(rate !== 1 ? { speed: rate } : {}), ...(tone ? { instructions: tone } : {}) }),
  })
  if (!r.ok) throw await failed(r)
  const type = r.headers.get('content-type') || 'audio/wav', parts: Uint8Array[] = []
  if (!r.body) throw new Error(tr("语音接口没有返回声音"))
  let over = false, failure: unknown, secs: number | null = null, wake = () => {}
  const whole = (async () => {
    const reader = r.body!.getReader()
    try {
      for (;;) { const { value, done } = await reader.read(); if (done) break; parts.push(value); wake() }
      const f = finished(parts, type)
      if (!f.blob.size) throw new Error(tr("语音接口返回了空文件"))
      secs = f.seconds
      return f.blob
    } catch (e) {
      if (signal?.aborted) { const f = finished(parts, type); secs = f.seconds; return f.blob }
      failure = new Error(tr("声音传输中断，请检查网络或语音接口"), { cause: e })
      throw failure
    } finally { over = true; reader.releaseLock(); wake() }
  })()
  // It may fail before the caller starts playback; keep the rejecting promise for callers to await.
  void whole.catch(() => {})
  return {
    whole, seconds: () => secs,
    open() {
      let i = 0
      return new Response(new ReadableStream<Uint8Array>({
        async pull(c) {
          while (i >= parts.length && !over) await new Promise<void>((go) => { wake = go })
          if (failure) { c.error(failure); return }
          if (i < parts.length) c.enqueue(parts[i++])
          else c.close()
        },
      }), { headers: { 'content-type': type } })
    },
  }
}

/** what was said in a recording (a WAV) */
export async function transcribeApi(s: SpeechApi, wav: Blob, signal?: AbortSignal): Promise<string> {
  if (s.provider === 'qwen') {
    const bytes = new Uint8Array(await wav.arrayBuffer())
    signal?.throwIfAborted()
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    const r = await aiFetch(endpoint(s, '/services/aigc/multimodal-generation/generation'), {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json', ...auth(s) },
      body: JSON.stringify({ model: s.asr, input: { messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: `data:audio/wav;base64,${btoa(binary)}` } }] }] }, parameters: { format: 'wav', sample_rate: '16000' } }),
    })
    if (!r.ok) {
      const error = await r.clone().json().catch(() => null)
      // Bailian reports silence as an HTTP error; PTT already handles an empty transcript.
      if (r.status === 400 && error?.code === 'CLIENT_ERROR' && error?.message === 'ASR_RESPONSE_HAVE_NO_WORDS') return ''
      throw await failed(r)
    }
    const data = await r.json()
    if (data?.code) throw new Error(data.message || data.code)
    if (typeof data?.output?.text !== 'string') throw new Error(tr('语音识别接口没有返回文字'))
    return data.output.text.trim()
  }
  const fd = new FormData()
  fd.append('file', wav, 'say.wav')
  fd.append('model', s.asr)
  const r = await aiFetch(endpoint(s, '/audio/transcriptions'), { method: 'POST', signal, headers: auth(s), body: fd })
  if (!r.ok) throw await failed(r)
  return String((await r.json())?.text ?? '').trim()
}

/** the voices to pick from: the preset's, or what the API lists (its /audio/voices: names, or objects with an id) */
export async function listVoices(s: SpeechApi, signal?: AbortSignal): Promise<string[]> {
  const p = speechProviderOf(s)
  if (p.voices) return p.voices
  if (!p.voicesPath || !s.base) return []
  try {
    const r = await aiFetch(endpoint(s, p.voicesPath), { headers: auth(s), signal })
    if (!r.ok) return []
    const j = await r.json(), list: unknown[] = Array.isArray(j) ? j : j?.voices ?? j?.data ?? []
    return list.map((v) => (typeof v === 'string' ? v : (v as { id?: string; name?: string })?.id ?? (v as { name?: string })?.name ?? '')).filter(Boolean)
  } catch { return [] }
}

export type VoiceRoute = 'livliv' | 'api' | 'system' | 'none'
/** where a character's voice comes from now: its choice if it can be had, else your API, LivLiv's, else none */
export function voiceRoute(c: CharacterItem, s = activeSpeech()): VoiceRoute {
  const livliv = !!modelId(c) && signedIn(), api = speechReady(s), want = c.voice.source
  if (want === 'system') return 'system'
  if (want === 'livliv' && livliv) return 'livliv'
  if (want === 'api' && api) return 'api'
  return livliv ? 'livliv' : api ? 'api' : 'none'
}
