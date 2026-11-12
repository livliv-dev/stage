// WebGL contexts. A page keeps only a few live (Chromium 16; the desktop app raises it to 32, desktop/src/config.ts)
// and every character on the stage holds one. One too many and the browser takes one away: the new character gets
// none, or one already there goes blank. That character is "crowded" here: it says so (CharacterView), the stage says
// it once (CrowdNotice), and it starts again on a new canvas when a live context is given up (a character removed, a
// video done). While one is crowded, hidden characters give theirs up and start again when shown, so hiding makes room
// too.
// A video being made (render.ts) needs one more for each of its characters. When those and the stage's don't fit
// together, the stage lends its own while the video is made (each character shows a still of itself meanwhile) and
// takes them back after, rather than have the browser take some away.
import { useSyncExternalStore } from 'react'
import { desktop } from './desktopBridge'

/** about how many characters a stage holds here, to tell people (a few contexts left for face tracking and the like) */
export const ROOM = desktop ? 30 : 15

const crowded = new Set<string>()
/** asked to start again, not started yet */
const pending = new Set<string>()
const retries = new Map<string, () => void>()
const listeners = new Set<() => void>()
let snapshot: ReadonlySet<string> = new Set()
let lent = false
const emit = () => { snapshot = new Set(crowded); listeners.forEach((f) => f()) }
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

/** the character `id` got no context or lost it while others still draw (on), or has one again or left (off) */
export function crowd(id: string, on = true) {
  pending.delete(id)
  if (on === crowded.has(id)) return
  if (on) crowded.add(id); else crowded.delete(id)
  emit()
}

/** while a character is on the stage: how it starts again on a new canvas */
export function onRetry(id: string, retry: () => void) {
  retries.set(id, retry)
  return () => { if (retries.get(id) === retry) retries.delete(id) }
}

/** contexts given up since the last restart */
let room = 0, restart = 0
/** a live context was given up: as many crowded characters as were given room start again, the longest crowded first.
 *  The player lets a context go a task after its dispose({ release: true }), so they start in a task after the last
 *  one given up: a new context made before that would push out a character still drawing, and nothing would bring
 *  that one back */
export function released() {
  room++
  clearTimeout(restart)
  restart = window.setTimeout(() => {
    for (const id of crowded) {
      if (room <= 0) break
      if (pending.has(id) || !retries.has(id)) continue
      pending.add(id); room--
      retries.get(id)!()
    }
    room = 0
  })
}

/** resolves once the contexts given up so far are gone (see released) */
export const settled = () => new Promise<void>((resolve) => setTimeout(resolve))

const lenders = new Set<() => void>()
/** while a character is on the stage: what it does just before it lends its context (keeps a still of itself, while
 *  its canvas is still on the page) */
export function onLend(f: () => void) {
  lenders.add(f)
  return () => { lenders.delete(f) }
}
/** the stage gives its characters' contexts to a video being made (on), or takes them back (off) */
export function lend(on: boolean) {
  if (lent === on) return
  if (on) lenders.forEach((f) => f())
  lent = on
  listeners.forEach((f) => f())
}

export const useCrowded = () => useSyncExternalStore(subscribe, () => snapshot)
export const useLent = () => useSyncExternalStore(subscribe, () => lent)
