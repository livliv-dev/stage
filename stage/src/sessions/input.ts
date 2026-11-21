// Your lines in a session: said by whom they are from (your character, or the narrator), a transcribed one shown as
// heard, 记住… kept as a memory in the scope it was said in, and the wait on your character's turn.
import { loadBrainConfig } from '../brain'
import { memory } from '../memory'
import { participants, store, type CharacterItem } from '../scene'
import type { Line } from '../core/lines'
import { session } from './context'
import { inbox } from './inbox'
import { deliver } from './performance'
import { lineAhead } from './speak'
import { conversation, set } from './state'

/** your line, said by whom it is from */
async function yours(line: Line, signal: AbortSignal, scope = conversation().scope) {
  await deliver(line, participants(store.get()).find((character) => character.id === line.who) ?? null, signal, undefined, undefined, lineAhead)
  signal.throwIfAborted()
  await rememberLine(line, undefined, scope)
}
export { yours as sayYours }

/** the next line of yours waiting: said (typed), or shown as heard (transcribed) */
export async function consumeInput(signal: AbortSignal) {
  if (session.switching) { await session.switching; signal.throwIfAborted() }
  const scope = conversation().scope
  const { line, transcribed } = inbox.queue.shift()!
  if (transcribed) {
    if (!conversation().lines.some((entry) => entry.id === line.id)) set({ lines: [...conversation().lines, line] })
    await rememberLine(line, undefined, scope)
  } else await yours(line, signal, scope)
}

/** 记住…: saved in the scope the line was said in; not at all if an output switched the session since */
export async function rememberLine(line: Line, target?: CharacterItem, scope = conversation().scope) {
  const remembered = line.text.match(/^(?:请)?记住(?:这件事)?[：:，,\s]*(.+)$/s)?.[1] ?? line.text.match(/^remember\s+(.+)$/is)?.[1]
  if (!remembered || (loadBrainConfig().kind === 'demo' && conversation().mode !== 'realtime') || conversation().scope !== scope) return
  const character = target ?? participants(store.get()).find((candidate) => candidate.id === session.forced && candidate.lines === 'ai')
    ?? participants(store.get()).find((candidate) => candidate.lines === 'ai' && !candidate.remote)
  if (character) await memory.remember({ profileId: character.profileId ?? character.id, scope, text: remembered.trim(), sourceSessionId: conversation().sessionId, sourceLineIds: [line.id] })
}

/** your character's turn: wait for your line, or a skip */
export function waitFor(c: CharacterItem, signal: AbortSignal) {
  set({ waiting: c.id, as: c.id })
  return new Promise<Line | null>((resolve, reject) => {
    const abort = () => { inbox.answer = null; set({ waiting: null }); reject(signal.reason) }
    inbox.answer = (l) => { signal.removeEventListener('abort', abort); inbox.answer = null; set({ waiting: null }); resolve(l) }
    signal.addEventListener('abort', abort, { once: true })
  })
}
