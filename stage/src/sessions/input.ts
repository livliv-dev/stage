// Your lines in a session: said by whom they are from (your character, or the narrator), a transcribed one shown as
// heard, 记住… kept as a memory in the scope it was said in, and the wait on your character's turn.
import { loadBrainConfig } from '../brain'
import { memory } from '../memory'
import { participants, store, type CharacterItem } from '../scene'
import type { Line } from '../core/lines'
import type { YourLine } from './inbox'
import { deliver } from './performance'
import type { Run } from './run'
import { picked } from './speakers'
import { conversation, set } from './state'

/** your line, said by whom it is from */
async function yours(run: Run, line: Line, signal: AbortSignal, scope = conversation().scope) {
  await deliver(line, participants(store.get()).find((character) => character.id === line.who) ?? null, signal, undefined, undefined, run.lineAhead)
  signal.throwIfAborted()
  await rememberLine(line, undefined, scope)
}
export { yours as sayYours }

/** a line of yours taken from the inbox: said (typed), or shown as heard (transcribed) */
export async function consumeInput(run: Run, { line, kind }: YourLine, signal: AbortSignal) {
  const scope = conversation().scope
  if (kind === 'transcript') {
    if (!conversation().lines.some((entry) => entry.id === line.id)) set({ lines: [...conversation().lines, line] })
    await rememberLine(line, undefined, scope)
  } else await yours(run, line, signal, scope)
}

/** 记住…: saved in the scope the line was said in; not at all if an output switched the session since */
export async function rememberLine(line: Line, target?: CharacterItem, scope = conversation().scope) {
  const remembered = line.text.match(/^(?:请)?记住(?:这件事)?[：:，,\s]*(.+)$/s)?.[1] ?? line.text.match(/^remember\s+(.+)$/is)?.[1]
  if (!remembered || (loadBrainConfig().kind === 'demo' && conversation().mode !== 'realtime') || conversation().scope !== scope) return
  const character = target ?? participants(store.get()).find((candidate) => candidate.id === picked() && candidate.lines === 'ai')
    ?? participants(store.get()).find((candidate) => candidate.lines === 'ai' && !candidate.remote)
  if (character) await memory.remember({ profileId: character.profileId ?? character.id, scope, text: remembered.trim(), sourceSessionId: conversation().sessionId, sourceLineIds: [line.id] })
}

/** your character's turn: wait for your line (it goes straight to the turn), or a skip */
export function waitFor(run: Run, c: CharacterItem, signal: AbortSignal) {
  set({ waiting: c.id, as: c.id })
  return new Promise<Line | null>((resolve, reject) => {
    const abort = () => { run.yourTurn = null; set({ waiting: null }); reject(signal.reason) }
    const done = (l: Line | null) => { signal.removeEventListener('abort', abort); run.yourTurn = null; set({ waiting: null }); resolve(l) }
    run.yourTurn = { said: done, skip: () => done(null) }
    signal.addEventListener('abort', abort, { once: true })
  })
}
