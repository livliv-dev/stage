// How a reply is voiced, by the line or by the sentence: a chat says a whole reply sentence by sentence, so the first is
// heard sooner; the rest say it whole. A livliv.ai voice is paid by the line: a reply's sentences go with one line id
// (livliv.ts voiceLine), so saying it sentence by sentence, or AIRI streaming it so, costs what one call would.

/** a whole reply said sentence by sentence: a chat */
export const bySentence = (mode: 'conversation' | 'chat' | 'live' | 'realtime') => mode === 'chat'
