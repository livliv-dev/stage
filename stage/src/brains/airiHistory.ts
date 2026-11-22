// The conversation AIRI is given each turn (airiEngine.ts priorMessages), kept the same from one call to the next so the
// provider's cache can keep the start of it: each line keeps the time Stage first passed it on (AIRI stamps a user
// message that has none with the current minute, which changed every past line's text each turn; the owner's line, the
// turn's input, is seen as the turn starts); the window grows to HISTORY_LINES lines and is then trimmed HISTORY_STEP
// at a time, so it holds no fewer than HISTORY_LINES - HISTORY_STEP and its start moves a step at a time, not one line
// a turn; and an event line (a game's or another app's, up to 4,000 characters in the conversation) carries at most
// EVENT_CHARS. Pure: test/airiHistory.test.ts.

export const HISTORY_LINES = 30, HISTORY_STEP = 12, EVENT_CHARS = 500

/** where the window starts in a conversation of `count` lines: at 0 until it is full, then at a multiple of the step,
 *  so between trims only new lines are added at its end */
export const windowStart = (count: number) => count <= HISTORY_LINES ? 0 : Math.ceil((count - HISTORY_LINES) / HISTORY_STEP) * HISTORY_STEP

/** a line's text as AIRI's history carries it: an event line cut to EVENT_CHARS */
export const historyText = (line: { who: string; text: string }) =>
  line.who.startsWith('external:') && line.text.length > EVENT_CHARS ? line.text.slice(0, EVENT_CHARS - 1) + '…' : line.text

/** when each line was first passed to AIRI, by its id (the newest thousand kept) */
const seen = new Map<string, number>()
export function firstSeen(id: string, now = Date.now()) {
  let at = seen.get(id)
  if (at === undefined) {
    seen.set(id, at = now)
    if (seen.size > 1000) seen.delete(seen.keys().next().value!)
  }
  return at
}
