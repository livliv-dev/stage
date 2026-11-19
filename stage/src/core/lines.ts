// A line: what a character (or you, a viewer, a game) says in a conversation, with its feeling and move. Every part of
// Stage that makes, says, records or remembers lines shares these types; they import nothing that runs.
import type { Locale } from '../i18n'
import type { ListenerReaction, ReactionCue } from '../reactions'

export type Emotion = 'neutral' | 'happy' | 'shy' | 'angry' | 'sad' | 'surprised'
export type Move = 'none' | 'nod' | 'shake' | 'tilt' | 'hop' | 'shy'
/** human: typed by you; cut: it was interrupted (said up to there); audience: a viewer's message (弹幕), never said;
 *  seconds: how long it takes to say (its voice's length, set as it is said) */
/** look: where the speaker's eyes go while it says the line: someone's name, 'camera' (the audience), 'away' (shy,
 *  thinking); null: whoever it answers or names (conversation.ts looks) */
export type Line = { id: string; who: string; name: string; text: string; emotion: Emotion; action: Move; to: string | null; look?: string | null; human?: boolean; cut?: boolean; audience?: boolean; seconds?: number
  cues?: ReactionCue[]
  listeners?: ListenerReaction[]
  memoryIds?: string[]
  memoryRevision?: number
  /** the demo's: its recording, and its place in the script (demo.ts) */
  audio?: string; demo?: number; demoLocale?: Locale }

/** what a brain gives for a line: the line without whose it is, and a new summary of the conversation when asked */
export type Reply = Omit<Line, 'id' | 'who' | 'name'> & { summary?: string }

/** a line's sound as it is being made: for the player from its start, whatever has come so far and the rest as it comes;
 *  when all of it is in, the whole file (for a recording) and its true length */
export type StreamingVoice = { open(): Response; whole: Promise<Blob>; seconds: () => number | null }
