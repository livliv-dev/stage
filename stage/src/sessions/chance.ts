// The session's chance draws, from one source: who speaks next in free order, whether a line answers a waiting viewer,
// whether an AI character cuts in and when, the pause between lines, where the speaker and the others glance. A test
// pins it (the behaviour traces draw the first choice every time); a session runner draws from it too.

/** pinned draws; none: Math.random, as it is at each draw (a page that swaps Math.random is heard) */
let source: (() => number) | null = null

/** a draw in [0, 1) */
export const chance = () => (source ?? Math.random)()

/** draws come from `next` from here on (Math.random when left out) */
export function setChance(next?: () => number) { source = next ?? null }
