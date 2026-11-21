// The conversation as the app sees it: who is thinking, speaking or awaited, its lines, its scope and limits, and how
// it ended. One store, set by the session (runner, policies, the speak path) and read by everything that shows it
// (the console, the stage, a recording, the output window). Its lines are saved to the open record as they change.
import { tr } from '../i18n'
import { useSyncExternalStore } from 'react'
import { loadBrainConfig } from '../brain'
import { chatHistory } from '../chatHistory'
import { isOutput } from '../link'
import type { Line } from '../core/lines'
import type { MemoryScope } from '../memory'
import type { AiriGameConfig } from '../../../desktop/src/airiGameProtocol'

export type ConvState = {
  running: boolean
  mode: 'conversation' | 'live' | 'chat' | 'realtime'
  scope: MemoryScope
  chatScope: MemoryScope
  sessionId: string
  waitingInput: boolean
  storageError: string
  waitingAudience: boolean
  until: number
  generations: number
  generationLimit: number
  /** a live turn failed: when it is tried again (the session clock's now), else 0 */
  retryAt: number
  ended: string
  paused: boolean
  /** a character is thinking of its line (its id) */
  thinking: string | null
  /** the line being said now */
  speaking: Line | null
  /** the conversation waits for your line as this character (its id) */
  waiting: string | null
  /** who you speak as from the console: a character you play (its id), or 'narrator' */
  as: string
  lines: Line[]
  /** AI lines this run, and the most */
  turns: number
  limit: number
  /** seconds between lines */
  gap: number
  error: string
  engine?: 'airi'
  game?: { name: AiriGameConfig['game']; status: 'connecting' | 'ready' | 'submitting' | 'playing' | 'offline'; text: string }
  /** an output is on (sessions/outputs.ts): sessions are public, and private can't be chosen */
  output: boolean
  /** an AI turn needed a model and none is set up: the app shows where to set one */
  needModel: boolean
  modelIntent: 'chat' | 'conversation' | 'live' | 'input'
}

let state: ConvState = { running: false, mode: 'conversation', scope: 'private', chatScope: 'private', sessionId: '', waitingInput: false, storageError: '', waitingAudience: false, until: 0, generations: 0, generationLimit: 100, retryAt: 0, ended: '', paused: false, thinking: null, speaking: null, waiting: null, as: '', lines: [], turns: 0, limit: 12, gap: 0.6, error: '', output: false, needModel: false, modelIntent: 'conversation' }

const subs = new Set<() => void>()
/** a record being opened: its lines are shown, not saved again */
let restoring = false
let saveRevision = 0

/** the state now, outside React */
export const conversation = () => state

/** changes the state; its lines (when given) are saved to the open record, unless `persist` is false, a record is
 *  being opened, this is the output window, or the lines are the demo's */
export function set(p: Partial<ConvState>, persist = true) {
  state = { ...state, ...p }; subs.forEach((f) => f())
  if (persist && p.lines && !restoring && !isOutput && (state.mode === 'realtime' || loadBrainConfig().kind !== 'demo')
    && chatHistory.current?.id === state.sessionId && chatHistory.current.scope === state.scope) {
    const revision = ++saveRevision
    void chatHistory.save(p.lines).then(() => { if (revision === saveRevision && state.storageError) set({ storageError: '' }) }, (error: unknown) => { if (revision === saveRevision) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) })
  }
}

/** a record's lines shown as they were read (nothing to save) */
export function showRecord(p: Partial<ConvState>) {
  restoring = true
  try { set(p) } finally { restoring = false }
}

/** what an output may show of the conversation (the output window, a recording): its lines and who is thinking,
 *  speaking or awaited, when it is public or the demo's prepared lines; nothing of a private one */
export function shownConv(c: ConvState = state) {
  const demo = loadBrainConfig().kind === 'demo' && c.lines.every((line) => line.demo !== undefined)
  return c.scope === 'public' || demo
    ? { lines: c.lines, speaking: c.speaking, thinking: c.thinking, waiting: c.waiting }
    : { lines: [] as Line[], speaking: null, thinking: null, waiting: null }
}

/** the output window: the editor's conversation */
export const mirrorConv = (c: Partial<ConvState>) => set(c)
export const useConversation = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
/** told each time the conversation changes (the output window, a recording take it down) */
export const onConv = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
