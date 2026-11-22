// How a reply is voiced, by the line or by the sentence. livliv.ai charges every /say call (a point at least), so a
// line in a livliv.ai voice is always voiced whole, one call; a chat in any other voice is said sentence by sentence, so
// the first is heard sooner. AIRI streams sentence by sentence, so it can't speak in a livliv.ai voice at all.
import type { VoiceRoute } from '../voiceApi'

/** a whole reply said sentence by sentence: a chat, in a voice that isn't livliv.ai's */
export const bySentence = (mode: 'conversation' | 'chat' | 'live' | 'realtime', voice: VoiceRoute) =>
  mode === 'chat' && voice !== 'livliv'

/** a streamed reply (AIRI) can be voiced: any voice but LivLiv's (each sentence would be a paid call) */
export const streamable = (voice: VoiceRoute) => voice !== 'livliv'
