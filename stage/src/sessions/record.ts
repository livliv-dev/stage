// The conversation's record: which one is open (the cast's, private or public), opening it for a session, and the
// public one in place of the private one when an output comes on. Lines are saved as they change (sessions/state.ts).
import { tr } from '../i18n'
import { loadBrainConfig } from '../brain'
import { chatHistory } from '../chatHistory'
import type { MemoryScope } from '../memory'
import { profiles } from './context'
import type { Run } from './run'
import { outputsNow } from './outputs'
import { scopeFor } from './scope'
import { conversation, set, showRecord } from './state'

let restoreRequest: { controller: AbortController; signal: AbortSignal } | null = null
/** a record being opened outside a session (restore, the public record) is given up */
export function cancelRestore() { restoreRequest?.controller.abort(); restoreRequest = null }
/** a record opened outside a session, cancelled by cancelRestore */
export function restoring(controller: AbortController, signal: AbortSignal) {
  restoreRequest = { controller, signal }
  return () => { if (restoreRequest?.controller === controller) restoreRequest = null }
}

/** an output is on: the OBS output window, a recording, a co-stream (好友联播) or a live audience (Twitch chat, a 直播间).
 *  While one is, every session is public: no private memory is read or written, by any path, and the conversation goes
 *  to the public record. With all of them off, the scope chosen in the console (chatScope) applies */
export function outputOn() {
  const state = conversation()
  return outputsNow(state.running && state.mode === 'live')
}
/** the scope a session started now gets: the one chosen, unless an output is on */
export const sessionScope = (chosen: MemoryScope = conversation().chatScope): MemoryScope => scopeFor(chosen, outputOn())

/** the cast's record in this scope, opened and shown (a fresh one when asked) */
export async function openHistory(scope: MemoryScope, signal: AbortSignal, fresh = false) {
  if (restoreRequest && restoreRequest.signal !== signal) cancelRestore()
  if (loadBrainConfig().kind === 'demo' && conversation().mode !== 'realtime') return
  const record = await chatHistory.open(profiles(), scope, signal, fresh)
  signal.throwIfAborted()
  showRecord({ sessionId: record.id, scope, lines: record.lines, storageError: '' })
}

/** nothing running: the public record in place of the private one */
export function showPublicRecord() {
  cancelRestore()
  set({ scope: 'public', sessionId: '', lines: [], speaking: null }, false)
  if (!profiles().length) { chatHistory.reset(); return }
  const controller = new AbortController(), done = restoring(controller, controller.signal)
  void openHistory('public', controller.signal)
    .catch((error: unknown) => { if (!controller.signal.aborted) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) })
    .finally(done)
}

/** opens a starting session's record; an output coming on meanwhile opens the public one instead (the facade's
 *  goPublic) */
export async function openRecord(run: Run, scope: MemoryScope, signal: AbortSignal) {
  try { await openHistory(scope, signal) }
  catch (error) {
    if (signal.aborted || !run.switching) throw error
    await run.switching; signal.throwIfAborted()
  }
}
