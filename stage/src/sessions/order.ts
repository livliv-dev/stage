// Who speaks next (the stage's talk settings, scene.ts Talk), among the characters that can: the AI ones that are
// loaded and those you play.
//  - free: the one just named answers (unless you skipped it since the last line), else an AI character picked by how
//    chatty it is and how long it has been quiet (never the same twice running); one AI character with one you play:
//    you take turns
//  - round: everyone who speaks, left to right on the stage, on from whoever had the last turn
//  - host: the host speaks after every guest and names the next one (else the guest quiet longest)
// A character picked by hand (a click on its card) goes first, whatever the order.
import type { Line } from '../core/lines'
import type { CharacterItem, Talk } from '../scene'

export type Speaker = Pick<CharacterItem, 'id' | 'name' | 'lines' | 'chatty' | 'x' | 'w'>
/** the conversation so far: its lines, who had the last turn (said or skipped), the one you skipped since the last
 *  line, and the one picked by hand */
export type Turns = { lines: Pick<Line, 'who' | 'to'>[]; lastTurn: string | null; skipped: string | null; forced: string | null }

/** where a character is, left to right */
export const across = (c: Speaker) => c.x + c.w / 2

/** how many lines since `c` last spoke (all of them, and one more, if never) */
export function quiet(c: Speaker, lines: Pick<Line, 'who'>[]) {
  const i = lines.map((l) => l.who).lastIndexOf(c.id)
  return i < 0 ? lines.length + 1 : lines.length - 1 - i
}

/** one of `pool`, the chattier and the longer quiet the likelier */
export function freePick<T extends Speaker>(pool: T[], lines: Pick<Line, 'who'>[], random: () => number = Math.random): T | null {
  if (!pool.length) return null
  const w = pool.map((c) => c.chatty * (1 + quiet(c, lines)))
  let r = random() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i] }
  return pool[pool.length - 1]
}

/** who speaks next among `all` (the AI characters loaded and those you play), or null when nobody can */
export function nextSpeaker<T extends Speaker>(talk: Pick<Talk, 'order' | 'host'>, all: T[], turns: Turns, random: () => number = Math.random): T | null {
  const ai = all.filter((c) => c.lines === 'ai'), last = turns.lines.at(-1)
  const picked = all.find((c) => c.id === turns.forced)
  if (picked) return picked
  if (talk.order === 'round') {
    const ring = [...all].sort((a, b) => across(a) - across(b))
    return ring.length ? ring[(ring.findIndex((c) => c.id === turns.lastTurn) + 1) % ring.length] : null
  }
  if (talk.order === 'host') {
    const host = all.find((c) => c.id === talk.host) ?? ai[0]
    if (!host) return null
    if (turns.lastTurn !== host.id) return host
    const guests = all.filter((c) => c.id !== host.id)
    return guests.find((c) => c.name === last?.to) ?? [...guests].sort((a, b) => quiet(b, turns.lines) - quiet(a, turns.lines))[0] ?? host
  }
  // a character you skipped isn't asked again until someone has spoken
  const named = last?.to ? all.find((c) => c.name === last.to && c.id !== last.who && c.id !== turns.skipped) : undefined
  if (named) return named
  const pick = freePick(ai.filter((c) => c.id !== last?.who), turns.lines, random)
  if (pick) return pick
  // one AI only: with a character you play it is your turn (you two take turns); alone, it goes on talking
  return all.find((c) => c.lines === 'me' && c.id !== last?.who && c.id !== turns.skipped) ?? ai[0] ?? null
}
