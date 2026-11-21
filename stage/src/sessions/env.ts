// The stage as a session's Env (sessions/runner.ts): the conversation's state, who can speak, the demo's script, the
// inbox and its holds, your lines and turns (sessions/input.ts), the speak path (sessions/speak.ts), the voices and
// looks on the stage.
import { actors } from '../actors'
import { loadBrainConfig } from '../brain'
import { airiEngine } from '../brains/engines'
import { demoPause, demoSpeaker } from '../demo'
import { isBlocked } from '../danmaku'
import { chatHistory } from '../chatHistory'
import { desktop } from '../desktopBridge'
import { memory } from '../memory'
import { airiGameError, airiGameText } from '../airiEngine'
import type { ExternalEvent } from '../externalEvents'
import type { GameEnv } from './games'
import { checkMemory } from './memoryGate'
import { participants, store, uid } from '../scene'
import { hush } from '../speech'
import { voices } from './context'
import { holds, inbox, turnHeld, wake } from './inbox'
import { consumeInput, sayYours, waitFor } from './input'
import { isCutting, looks } from './performance'
import { openHistory } from './record'
import type { Env } from './runner'
import { aheadStill, dropAhead, engineNow, followLines, interruptTurn, speakTurn, turnLimit } from './speak'
import { conversation, set } from './state'

export const stageEnv: Env = {
  engine: airiEngine,
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
  nextEpoch: () => { holds.epoch++ },
  openPublic: (signal) => openHistory('public', signal),
  yourTurn: waitFor,
  sayYours,
  speak: speakTurn,
  ahead: (run) => aheadStill(run)?.who ?? null,
  lineLimit: turnLimit,
  cutting: isCutting,
  waitingForYou: () => actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('waiting') }),
  interrupt: interruptTurn,
  silence: (what) => { if (what === 'all') hush(); actors.forEach((actor) => actor.silence()) },
  lookAround: () => looks(null, null),
}

/** the stage for game actions (sessions/games.ts); `told` shows a game's line (the facade's externalEvent) */
export const gameEnv = (told: (event: ExternalEvent) => void): GameEnv => ({
  state: conversation, set, wake,
  engine: engineNow,
  interrupt: interruptTurn,
  actor: (id) => participants(store.get()).find((character) => character.id === id),
  frame: async (windowId) => desktop?.vision?.frame(windowId),
  get host() { return desktop?.airiGame },
  memories: (profile) => chatHistory.context(profile, conversation().lines, 'public'),
  checkMemory: (profile, revision) => checkMemory(memory, profile, 'public', revision),
  told: (event) => told({ id: uid(), ...event }),
  describe: airiGameText,
  failure: airiGameError,
})
