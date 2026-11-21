// Who speaks next, by one set of rules for every session: the stage's talk order (sessions/order.ts: free, round,
// host), the character you picked (a click on its card, or the one a chat starts with: it goes once), and one picked
// freely (the chattier and the longer quiet, the likelier). The draws come from the session's chance.
import type { Line } from '../core/lines'
import type { Talk } from '../scene'
import { chance } from './chance'
import { freePick, nextSpeaker, type Speaker } from './order'
import { order } from './run'

/** you picked this character to speak next (null: no pick) */
export function pick(id: string | null) { order.forced = id }
/** the character you picked, if any (it stays picked) */
export const picked = () => order.forced
/** the character you picked, taken: it goes once */
export function takePick() {
  const id = order.forced
  order.forced = null
  return id
}
/** who speaks next by the stage's talk order, your pick first (taken) */
export function byOrder<T extends Speaker>(talk: Pick<Talk, 'order' | 'host'>, cast: T[], lines: Pick<Line, 'who' | 'to'>[]): T | null {
  const who = nextSpeaker(talk, cast, { lines, lastTurn: order.lastTurn, skipped: order.skipped, forced: order.forced }, chance)
  order.forced = null
  return who
}
/** one of `pool`, picked freely */
export const freely = <T extends Speaker>(pool: T[], lines: Pick<Line, 'who'>[]) => freePick(pool, lines, chance)
