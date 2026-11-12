// WebGL contexts. A page keeps only a few live (Chromium 16; the desktop app raises it to 32, desktop/src/config.ts)
// and every character on the stage holds one, the video being made one more for each of its characters. One too many
// and the browser takes one away: the new character gets none, or one already there goes blank. That character is
// "crowded" here: it says so (CharacterView), the stage says it once (CrowdNotice), and it starts again on a new canvas
// when a live context is given up (a character removed, a video done). While one is crowded, hidden characters give
// theirs up and start again when shown, so hiding makes room too.
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
const emit = () => { snapshot = new Set(crowded); listeners.forEach((f) => f()) }

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

/** a live context was given up: the character crowded longest starts again */
export function released() {
  const id = [...crowded].find((x) => !pending.has(x) && retries.has(x))
  if (id === undefined) return
  pending.add(id)
  retries.get(id)!()
}

export const useCrowded = () => useSyncExternalStore((f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }, () => snapshot)
