// What a session may spend is settled when it starts (sessions/start.ts): how you are heard (your own recognition, or
// LivLiv's, for points) and each AI character's voice. Something it used going away while it runs (Voicebox quitting, a
// check timing out, your speech API turned off) never moves it onto points: hearing that started on your own
// recognition stops and says why instead of turning to LivLiv's, and a character that started off LivLiv's voices shows
// its lines as subtitles instead of having them voiced for points. What you choose yourself while it runs (a character
// set to a LivLiv voice, the microphone pressed in a session that started on LivLiv's recognition) is yours. Pure:
// test/spend.test.ts.
import type { VoiceRoute } from '../speechProviders'

export type Spend = {
  /** you were heard by your own recognition when it started, else by LivLiv's */
  hearing: 'own' | 'points'
  /** each AI character's voice when it started, by its id */
  voices: Record<string, VoiceRoute>
}

/** how to hear what you said now: your own recognition, LivLiv's, or not at all (the session started on your own,
 *  which has gone) */
export function hearingNow(own: boolean, spend: Spend | null | undefined): 'own' | 'points' | 'stop' {
  return own ? 'own' : spend?.hearing === 'own' ? 'stop' : 'points'
}

/** a character's voice for this line: `now` as the settings have it, unless that is LivLiv's only because its own went
 *  away (it wasn't on LivLiv's when the session started, and you didn't choose LivLiv's): then subtitles */
export function voiceNow(id: string, now: VoiceRoute, chosen: boolean, spend: Spend | null | undefined): VoiceRoute {
  return now === 'livliv' && spend && !chosen && spend.voices[id] !== 'livliv' ? 'none' : now
}
