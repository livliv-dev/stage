// How a session's turn can end besides being said: no model set up, a voice that failed, cut off.

/** an AI character's turn came with no model set up: the session stops there and asks for one (needModel) */
export class NeedModel extends Error {}
/** the line was said (shown) but its voice failed: the message it answered was answered */
export class VoiceFailed extends Error {}
/** a turn cut off by you, an output coming on, a game character talking: the session goes on */
export const TURN_INTERRUPTED = new DOMException('The speaker was interrupted', 'AbortError')
