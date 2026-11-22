// What a session may spend is settled when it starts (sessions/start.ts): where its lines come from (livliv.ai's text, or
// your own model), how you are heard (your own recognition, or livliv.ai's, for points) and each AI character's voice.
// A session that started free stays free: livliv.ai turned on while it runs, or something of yours going away
// (Voicebox quitting, a check timing out, your speech API turned off), never moves it onto points. Its lines stay on your
// own model, hearing that started on your own recognition stops and says why, and a character that started off
// livliv.ai's voices shows its lines as subtitles. livliv.ai turned off while it runs is free from the next line. What
// you choose yourself for one character (set to a livliv.ai voice in its card) is yours. Pure: test/spend.test.ts.
import type { VoiceRoute } from '../speechProviders'

export type Spend = {
  /** livliv.ai gave the lines when it started */
  text: boolean
  /** you were heard by livliv.ai's recognition when it started, else by your own */
  hearing: 'own' | 'points'
  /** each AI character's voice when it started, by its id */
  voices: Record<string, VoiceRoute>
}

/** the brain for this line: livliv.ai's text only when the session started on it, else your own model */
export function brainNow<B extends { kind: string }>(now: B, own: B, spend: Spend | null | undefined): B {
  return now.kind === 'livliv' && spend && !spend.text ? own : now
}

/** how to hear what you said now: livliv.ai's (its voices on, and the session didn't start on your own), your own
 *  recognition, or not at all */
export function hearingNow(points: boolean, own: boolean, spend: Spend | null | undefined): 'own' | 'points' | 'stop' {
  if (points && spend?.hearing !== 'own') return 'points'
  return own ? 'own' : 'stop'
}

/** a character's voice for this line: `now` as the settings have it, unless that is livliv.ai's and the character
 *  wasn't on it when the session started (and you didn't choose it in its card): then subtitles */
export function voiceNow(id: string, now: VoiceRoute, chosen: boolean, spend: Spend | null | undefined): VoiceRoute {
  return now === 'livliv' && spend && !chosen && spend.voices[id] !== 'livliv' ? 'none' : now
}
