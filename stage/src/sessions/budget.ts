// What a session may spend: model calls (generations) and time. 持续聊天, AI 直播 and a realtime call count every
// generation against their limit and end there; 对谈 ends after its lines (turnLimit); every timed session ends at its
// minutes (deadline). Limits from settings and the start options are kept within bounds here.
import type { AiriGameConfig } from '../../../desktop/src/airiGameProtocol'
import { clock } from './clock'

/** the session made all the model calls it may */
export class GenerationLimit extends Error {}

export type Budget = { generations: number; generationLimit: number }
/** no generation left */
export const spent = (budget: Budget) => budget.generations >= budget.generationLimit
/** the count with one more generation */
export const counted = (budget: Budget) => ({ generations: budget.generations + 1 })
/** one more generation, or GenerationLimit when none is left: the count to set */
export function spend(budget: Budget) {
  if (spent(budget)) throw new GenerationLimit()
  return counted(budget)
}

/** AI 直播's start options: how long, how many generations, a warm-up line after so many quiet seconds, subtitles
 *  only, and AIRI's window or game */
export type LiveOptions = { minutes: number; maxGenerations: number; warmupSeconds: number; textOnly: boolean; airi?: { windowId: string; game?: AiriGameConfig } }
/** AI 直播's options within bounds: 1–240 minutes (30 when unset), 1–500 generations (100), a warm-up of 30, 60 or 120 s
 *  or none */
export function liveLimits(options: LiveOptions): LiveOptions {
  return {
    minutes: Math.max(1, Math.min(240, Math.round(options.minutes) || 30)), maxGenerations: Math.max(1, Math.min(500, Math.round(options.maxGenerations) || 100)),
    warmupSeconds: [30, 60, 120].includes(options.warmupSeconds) ? options.warmupSeconds : 0, textOnly: options.textOnly, airi: options.airi,
  }
}
/** 持续聊天's limits from the stage's talk settings: 1–240 minutes (60 when unset) and 1–500 generations (100); a
 *  realtime call counts its generations the same way */
export function chatLimits(talk: { chatMinutes?: number; chatGenerations?: number }) {
  return { minutes: Math.max(1, Math.min(240, talk.chatMinutes ?? 60)), generations: Math.max(1, Math.min(500, talk.chatGenerations ?? 100)) }
}
/** 对谈's line limit as set: 1–60 */
export const lineLimit = (lines: number) => Math.max(1, Math.min(60, Math.round(lines) || 1))
/** the lines a 对谈 runs to: a prepared demo always reaches its ending (its script's lines), else the limit set */
export const turnLimit = (demoLines: number | undefined, limit: number) => demoLines ?? limit

/** `end` is called at `until` (milliseconds since the epoch, as Date.now()), at once if that has passed; the function
 *  returned cancels it */
export function deadline(until: number, end: () => void, now: () => number = clock.now) {
  const timer = clock.timeout(end, Math.max(0, until - now()))
  return () => clock.clear(timer)
}

/** AI 直播 rides out a busy or slow service: a failed turn is tried again after these seconds, and the session stops at
 *  LIVE_FAILURES failed turns in a row */
export const RETRY_SECONDS = [5, 15]
export const LIVE_FAILURES = RETRY_SECONDS.length + 1
