// The free voice: the system's own text to speech (speechSynthesis), no account, no cost. It gives no audio to
// measure, so the mouth follows a syllable rhythm while it speaks, restarted on each word it reports. Where it can't
// speak (no voices, a blocked page) the line still takes its time, silently, so a conversation keeps its pace.
// A real voice (LivLiv's, or any TTS returning audio) would go through the SDK's createSpeech instead, with exact lip
// sync: that is the next step, not this prototype.
import type { Voice } from './scene'

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null

// macOS's novelty voices (sound effects, singing, robots): not for a character
const NOVELTY = new Set(['Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News', 'Jester', 'Organ',
  'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox', 'Fred', 'Junior', 'Ralph', 'Kathy'])

/** the system's voices for Chinese, Japanese and English, in that order */
export function voices(): SpeechSynthesisVoice[] {
  const rank = (v: SpeechSynthesisVoice) => ['zh', 'ja', 'en'].findIndex((l) => v.lang.toLowerCase().startsWith(l))
  return (synth ? synth.getVoices() : []).filter((v) => rank(v) >= 0 && !NOVELTY.has(v.name)).sort((a, b) => rank(a) - rank(b))
}
/** the list arrives late in Chromium: call f again when it does */
export function onVoices(f: () => void) {
  synth?.addEventListener('voiceschanged', f)
  return () => synth?.removeEventListener('voiceschanged', f)
}

const cjk = (t: string) => /[぀-ヿ㐀-鿿]/.test(t)

/** a voice for this text: the chosen one, else one in the text's language (Chinese / Japanese / English) */
function pick(text: string, v: Voice): SpeechSynthesisVoice | null {
  const all = voices()
  const named = v.name && all.find((x) => x.name === v.name)
  if (named) return named
  const lang = /[぀-ヿ]/.test(text) ? 'ja' : cjk(text) ? 'zh' : 'en'
  return all.find((x) => x.lang.toLowerCase().startsWith(lang) && x.localService) ?? all.find((x) => x.lang.toLowerCase().startsWith(lang)) ?? null
}

/** seconds a line takes, roughly: ~4.5 CJK characters or ~14 Latin letters a second */
export function estimate(text: string, rate = 1) {
  const c = (text.match(/[぀-ヿ㐀-鿿]/g) || []).length, l = text.length - c
  return Math.max(0.8, (c / 4.5 + l / 14) / rate)
}

export type Utterance = {
  /** mouth openness now, 0..1, and the vowel shape (-1 round .. 1 wide) */
  level(): number
  vowel(): number
  done: Promise<void>
  stop(): void
}

/** says `text`; the returned level() drives the mouth until done */
export function say(text: string, v: Voice, volume = 1): Utterance {
  let guard = 0, silentTimer = 0
  let speaking = false, finished = false, t0 = performance.now(), syl = 0.18, amp = 0.7, vow = 0
  let resolve!: () => void
  const done = new Promise<void>((r) => { resolve = r })
  const finish = () => { clearTimeout(guard); clearTimeout(silentTimer); if (!finished) { finished = true; speaking = false; resolve() } }
  const word = () => { t0 = performance.now(); syl = 0.14 + Math.random() * 0.1; amp = 0.45 + Math.random() * 0.5; vow = Math.random() * 2 - 1 }
  // the timed fallback: silent, but at a speaking pace
  const silent = () => { if (finished) return; speaking = true; word(); silentTimer = window.setTimeout(finish, estimate(text, v.rate) * 1000) }
  const voice = pick(text, v)
  if (synth && voice) {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice; u.lang = voice.lang; u.pitch = v.pitch; u.rate = v.rate; u.volume = volume
    u.onstart = () => { if (!finished) { speaking = true; word() } }
    u.onboundary = () => { if (!finished) word() }
    u.onend = () => { clearTimeout(guard); finish() }
    u.onerror = (e) => { if (finished) return; clearTimeout(guard); if (e.error === 'interrupted' || e.error === 'canceled') finish(); else silent() }
    synth.speak(u)
    // Chromium sometimes never says it started or ended: never let a line hang the conversation
    guard = window.setTimeout(() => { if (!speaking) { synth.cancel(); silent() } else finish() }, estimate(text, v.rate) * 2000 + 3000)
  } else silent()
  return {
    level() {
      if (!speaking) return 0
      const t = (performance.now() - t0) / 1000, p = (t % syl) / syl
      // open and close once a syllable, a little ragged, never quite shut mid-word
      return Math.max(0.08, amp * Math.sin(Math.PI * p) * (0.75 + 0.25 * Math.sin(t * 23)))
    },
    vowel: () => vow,
    done,
    stop() { if (synth && voice) synth.cancel(); finish() },
  }
}

/** stop every voice at once (the conversation stopped) */
export function hush() { synth?.cancel() }
