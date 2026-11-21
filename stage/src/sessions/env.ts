// The stage as a session's Env (sessions/runner.ts): the conversation's state, who can speak, the demo's script, the
// inbox and its holds, your lines and turns (sessions/input.ts), the speak path (sessions/speak.ts), the voices and
// looks on the stage.
import { actors } from '../actors'
import { loadBrainConfig } from '../brain'
import { makeEngine } from '../brains/engines'
import { demoPause, demoSpeaker } from '../demo'
import { isBlocked } from '../danmaku'
import { store } from '../scene'
import { hush } from '../speech'
import { voices } from './context'
import { holds, inbox, turnHeld, wake } from './inbox'
import { consumeInput, sayYours, waitFor } from './input'
import { isCutting, looks } from './performance'
import type { Env } from './runner'
import { aheadStill, dropAhead, followLines, interruptTurn, speakTurn, turnLimit } from './speak'
import { conversation, set } from './state'

export const stageEnv: Env = {
  engine: makeEngine,
  follow: followLines,
  letGo: dropAhead,
  state: conversation,
  set,
  cast: voices,
  talk: () => store.get().talk,
  demo: () => loadBrainConfig().kind === 'demo' ? { speaker: () => demoSpeaker(voices(), conversation().lines), pause: () => demoPause(voices(), conversation().lines) } : null,
  inbox,
  wake,
  held: turnHeld,
  epoch: () => holds.epoch,
  blocked: isBlocked,
  consume: consumeInput,
  yourTurn: waitFor,
  sayYours,
  speak: speakTurn,
  ahead: (run) => aheadStill(run)?.who ?? null,
  lineLimit: turnLimit,
  cutting: isCutting,
  waitingForYou: () => actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('waiting') }),
  interrupt: interruptTurn,
  silence: () => { hush(); actors.forEach((actor) => actor.silence()) },
  lookAround: () => looks(null, null),
}
