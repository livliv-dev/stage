// How a reply is voiced, by the line or by the sentence. livliv.ai charges every /say call (a point at least), so a
// line in a LivLiv voice is always voiced whole, one call; a chat with a model of one's own in any other voice is said
// sentence by sentence, so the first is heard sooner. AIRI streams sentence by sentence, so it can't speak in the
// LivLiv voice at all.
import type { BrainConfig } from '../brain'
import type { VoiceRoute } from '../voiceApi'

/** a whole reply said sentence by sentence: a chat, with a model of one's own, in a voice that isn't LivLiv's */
export const bySentence = (mode: 'conversation' | 'chat' | 'live' | 'realtime', brain: BrainConfig['kind'], voice: VoiceRoute) =>
  mode === 'chat' && brain !== 'livliv' && voice !== 'livliv'

/** a streamed reply (AIRI) can be voiced: any voice but LivLiv's (each sentence would be a paid call) */
export const streamable = (voice: VoiceRoute) => voice !== 'livliv'
