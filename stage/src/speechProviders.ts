// The speech APIs Stage knows (voiceApi.ts uses them): OpenAI-compatible ones, Bailian's own, Kokoro on this computer,
// Voicebox through the desktop app, anything else that speaks the same API; and what makes one ready to speak, and to
// hear you. A speech API ready to hear you is your own recognition: hearing you spends no LivLiv points.

export type SpeechApi = { provider: string; base: string; key: string; model: string; voice: string; asr: string }
/** where a character's voice comes from: LivLiv's (points), your speech API, the system's, or none (subtitles) */
export type VoiceRoute = 'livliv' | 'api' | 'system' | 'none'
/** tone: the model takes a speaking style (OpenAI's instructions); voicesPath: the API lists its voices there */
export type SpeechProvider = { id: string; label: string; base: string; model: string; asr: string; voices?: string[]; voicesPath?: string; noKey?: boolean; keyUrl?: string; tone?: boolean
  /** gives a WAV as it is made: a line starts being heard with its first piece (speakLive) */
  live?: boolean
  /** its voices that sound like a woman / a man, the best first: who gets which (apiVoice) */
  women?: string[]; men?: string[] }
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
  // Voicebox on this computer, through the desktop app (voicebox.ts): its voices are its profiles; recognition by Whisper
  { id: 'voicebox', label: 'Voicebox', base: 'voicebox', model: 'voicebox', asr: 'whisper', noKey: true },
  { id: 'custom', label: '其他', base: '', model: 'tts-1', asr: 'whisper-1', voicesPath: '/audio/voices' },
]
export const speechProviderOf = (s: SpeechApi) => SPEECH_PROVIDERS.find((p) => p.id === s.provider) ?? SPEECH_PROVIDERS.at(-1)!
export const speechReady = (s: SpeechApi) => !!s.base && !!s.model && (!!s.key || s.provider === 'custom' || !!speechProviderOf(s).noKey)
export const asrReady = (s: SpeechApi) => !!s.base && !!s.asr && (!!s.key || s.provider === 'custom' || !!speechProviderOf(s).noKey)
export const SPEECH_UNSET: SpeechApi = { provider: '', base: '', key: '', model: '', voice: '', asr: '' }
/** chosen in settings: no speech API, not even the model key's */
export const SPEECH_OFF: SpeechApi = { ...SPEECH_UNSET, provider: 'off' }
/** Voicebox as the speech API: its voices. Its Whisper hears you only once you switch it on (asr: 'whisper', saved
 *  with it in settings): Voicebox found running never moves 按住说 / 免按键 off the recognition you had */
export const VOICEBOX_SPEECH: SpeechApi = { provider: 'voicebox', base: 'voicebox', key: '', model: 'voicebox', voice: '', asr: '' }
