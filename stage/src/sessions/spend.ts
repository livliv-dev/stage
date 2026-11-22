// What a session may spend is settled when it starts (sessions/start.ts): where its lines come from (livliv.ai's text, or
// your own model), how you are heard (your own recognition, or livliv.ai's, for points) and each AI character's voice.
// A session that started free stays free: livliv.ai turned on while it runs, or something of yours going away
// (Voicebox quitting, a check timing out, your speech API turned off), never moves it onto points. Its lines stay on your
// own model, hearing that started on your own recognition stops and says why, and a character that started off
// livliv.ai's voices shows its lines as subtitles. livliv.ai turned off while it runs is free from the next line. What
// you choose yourself for one character (set to a livliv.ai voice in its card) is yours, in a session that started with
// livliv.ai's voices on. The demo is free to its end: it starts with neither its text nor its voices. Pure:
// test/spend.test.ts.
import type { VoiceRoute } from '../speechProviders'

export type Spend = {
  /** livliv.ai gave the lines when it started */
  text: boolean
  /** you were heard by livliv.ai's recognition when it started, else by your own */
  hearing: 'own' | 'points'
  /** livliv.ai's voices were on when it started: a card set to livliv.ai counts only then */
  voice: boolean
  /** each voiced character's voice when it started (an AI character, or yours read aloud), by its id */
  voices: Record<string, VoiceRoute>
}

/** what a session starting now may spend: livliv.ai's parts in use, and the route each voiced character has. A demo
 *  starts free, whatever is turned on */
export function spendAtStart(livliv: { text: boolean; voice: boolean }, voices: Record<string, VoiceRoute>, demo: boolean): Spend {
  const voice = livliv.voice && !demo
  return {
    text: livliv.text && !demo,
    hearing: voice ? 'points' : 'own',
    voice,
    voices: Object.fromEntries(Object.entries(voices).map(([id, route]) => [id, demo && route === 'livliv' ? 'none' : route])),
  }
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
 *  wasn't on it when the session started, nor chosen for it in its card in a session that started with livliv.ai's
 *  voices on: then subtitles */
export function voiceNow(id: string, now: VoiceRoute, chosen: boolean, spend: Spend | null | undefined): VoiceRoute {
  if (now !== 'livliv' || !spend || spend.voices[id] === 'livliv') return now
  return chosen && spend.voice ? now : 'none'
}
