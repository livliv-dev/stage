import { tr } from '../i18n'
// One loop for every session. The runner owns what every session does the same way: the time limit (armed here for
// all), the held wait, your lines taken in, a turn said (an AI character's, or your character's), a failed turn tried
// again or the session ended, the pause between turns, the limits, how it ends and the stage put back. A policy
// (sessions/policies) says only what differs: who speaks next and to what (or that it waits, or is done), what a
// turn's outcome means for it, how often a failed turn is tried again, its limits, its messages; what it opens and
// closes comes from where it is started (sessions/start.ts). Everything outside the session (the stage, the record,
// the speak path, the inbox) comes through an Env, so the loop and the policies run as well against a fake one
// (test/runner.test.ts).
import type { BrainConfig, ModelConfig } from '../brain'
import type { Engine } from '../brains/engines/types'
import type { Line } from '../core/lines'
import type { Chat } from '../danmaku'
import type { CharacterItem, Talk } from '../scene'
import type { ConvState } from './state'
import type { Inbox } from './queue'
import { deadline, GenerationLimit, spent } from './budget'
import { clock } from './clock'
import { NeedModel } from './errors'
import { begin, current, finish, lastBegun, order, type Run } from './run'
import { sleep, waitWhile, type Wake } from './wake'

/** the next step: the session is done, it waits (woken by the inbox, or after `ms`), your character's turn, or an AI
 *  character's turn (answering a viewer's message, or your last line) */
export type Next =
  | { end: true }
  | { wait: true; ms?: number }
  | { yours: CharacterItem }
  | { speak: CharacterItem; viewer?: Chat | null; replyToOwner?: boolean }
export type Speak = Extract<Next, { speak: CharacterItem }>
/** how an AI turn went: said, or cut off (by you, an output coming on, a game character talking: the session goes on);
 *  `input`: you started speaking, or interrupted, while it was said */
export type Outcome = { said: boolean; input: boolean }

/** everything a session reads and does outside itself */
export interface Env {
  /** the engine a session runs on: AIRI with this model, else the brain's own (brains/engines) */
  engine(brain: BrainConfig, airi: ModelConfig | null): Engine
  /** what a line said does to the line made ahead in this session (sessions/speak.ts), and that line given up */
  follow(run: Run): void
  letGo(run: Run | null): void
  state(): ConvState
  set(patch: Partial<ConvState>, persist?: boolean): void
  /** who can speak (AI characters loaded, and the characters you play), and the stage's talk settings */
  cast(): CharacterItem[]
  talk(): Talk
  /** the demo's script while the demo plays: the next speaker (undefined: it said all its lines) and the pause after a
   *  line (null: the usual one) */
  demo(): { speaker(): CharacterItem | null | undefined; pause(): number | null } | null
  inbox: Inbox
  wake: Wake
  /** a turn is held back (paused, a game character talking, you speaking, a game action being decided) */
  held(): boolean
  /** moves on each time you start speaking or interrupt */
  epoch(): number
  /** a viewer you blocked */
  blocked(user: string): boolean
  /** your next line taken from the inbox: said (typed) or shown (heard) */
  consume(run: Run, signal: AbortSignal): Promise<void>
  /** your character's turn: your line, or null (skipped) */
  yourTurn(run: Run, who: CharacterItem, signal: AbortSignal): Promise<Line | null>
  sayYours(run: Run, line: Line, signal: AbortSignal): Promise<void>
  /** an AI turn said: true when said, false when cut off */
  speak(run: Run, who: CharacterItem, signal: AbortSignal, viewer?: Chat | null, replyToOwner?: boolean): Promise<boolean>
  /** the speaker of the line made ahead, while it still answers what was said last (对谈) */
  ahead(run: Run): CharacterItem | null
  /** the lines a 对谈 runs to */
  lineLimit(): number
  /** the next AI line cuts into the one before */
  cutting(): boolean
  /** the AI characters show they wait for you */
  waitingForYou(): void
  /** the turn in hand stops (time's up in a chat) */
  interrupt(run: Run): void
  /** every voice stops (the system voice, the characters') */
  silence(): void
  /** where everyone looks, put back */
  lookAround(): void
}

/** what a session's policy says */
export interface Policy {
  kind: 'conversation' | 'chat' | 'live'
  /** before the steps: what it opens (its record) and waits for (its cast loaded, a game connected); may throw */
  open(signal: AbortSignal): Promise<void>
  /** a deadline (at it, the turn in hand is cut, or every voice silenced); generations (the session is done when they
   *  are spent, unless `whileSpent` says to wait; `again`: checked again after the held wait); a limit a turn reaches
   *  (对谈's lines) */
  limits: {
    until?: number
    timeUp?: 'cut' | 'silence'
    generations?: { again?: boolean; whileSpent?(): boolean }
    reached?(): boolean
  }
  /** a step waits while a turn is held */
  waitsWhileHeld: boolean
  /** your lines taken this step (how many) */
  heard?(n: number): void
  next(): Promise<Next> | Next
  /** an AI turn's outcome (bookkeeping), and, once it was said and the session goes on, `settled` */
  after?(outcome: Outcome, turn: Speak): void
  settled?(): void
  /** a failed AI turn: 'on' (as if said: 对谈 goes on when a voice fails), milliseconds to wait before trying again, or
   *  null (the session fails) */
  failedTurn?(error: unknown, turn: Speak): 'on' | number | null
  /** the pause between turns (对谈) */
  between?(signal: AbortSignal): Promise<void>
  /** how it ends: at its limit (the message), wanting a model (the intent the model card opens with), on an error */
  ended: { limit?: string; needModel?: ConvState['modelIntent']; failure(error: unknown): Partial<ConvState> }
  /** its own teardown, before the stage is put back (a game closed, AIRI unbound) */
  close?(): Promise<void> | void
}

/** a session takes over: the one running stops, a line the last one made ahead is given up, and this one runs, on the
 *  brain set up (on AIRI with `airi`, when chooseEngine chose it) */
export function handOver(run: Run, env: Env, brain: BrainConfig, airi: ModelConfig | null = null) {
  current()?.controller.abort()
  env.letGo(lastBegun())
  begin(run); env.follow(run)
  run.brain = brain; run.engine = env.engine(brain, airi)
}

/** runs a session to its end */
export async function runSession(policy: Policy, run: Run, env: Env) {
  const signal = run.signal, { limits } = policy
  let finished = false
  const stopClock = limits.until === undefined ? () => {} : deadline(limits.until, () => {
    if (signal.aborted || finished || current() !== run) return
    env.set({ ended: tr('已达到本次时长上限') })
    if (limits.timeUp === 'cut') env.interrupt(run)
    run.controller.abort()
    if (limits.timeUp === 'silence') env.silence()
  })
  const budgetSpent = () => !!limits.generations && spent(env.state())
  try {
    await policy.open(signal)
    for (;;) {
      if (budgetSpent()) {
        if (limits.generations!.whileSpent?.()) { await env.wake.wait(signal); continue }
        break
      }
      signal.throwIfAborted()
      if (policy.waitsWhileHeld) await waitWhile(env.held, env.wake, signal)
      if (limits.generations?.again && budgetSpent()) break
      let heard = 0
      while (env.inbox.has(['typed', 'transcript'])) { await env.consume(run, signal); heard++ }
      policy.heard?.(heard)
      signal.throwIfAborted()
      if (policy.waitsWhileHeld && env.held()) continue
      const next = await policy.next()
      if ('end' in next) break
      if ('wait' in next) { await env.wake.wait(signal, next.ms); continue }
      if ('yours' in next) {
        const line = await env.yourTurn(run, next.yours, signal)
        if (line) await env.sayYours(run, line, signal)
        else { order.lastTurn = next.yours.id; order.skipped = next.yours.id }
      } else {
        const before = env.epoch()
        let said: boolean
        try { said = await env.speak(run, next.speak, signal, next.viewer, next.replyToOwner) }
        catch (error) {
          const plan = signal.aborted ? null : policy.failedTurn?.(error, next) ?? null
          if (plan === null) throw error
          if (plan !== 'on') {
            env.set({ thinking: null, waitingAudience: true, error: (error as Error).message, retryAt: clock.now() + plan })
            await sleep(plan, signal)
            env.set({ retryAt: 0 })
            continue
          }
          said = true
        }
        policy.after?.({ said, input: env.epoch() !== before }, next)
        signal.throwIfAborted()
        if (said) policy.settled?.()
      }
      signal.throwIfAborted()
      await policy.between?.(signal)
      if (limits.reached?.()) break
    }
    if (policy.ended.limit && budgetSpent()) env.set({ ended: policy.ended.limit })
  } catch (error) {
    if (error instanceof GenerationLimit && policy.ended.limit) env.set({ ended: policy.ended.limit })
    else if (error instanceof NeedModel && policy.ended.needModel) env.set({ needModel: true, modelIntent: policy.ended.needModel })
    else if (!signal.aborted) env.set(policy.ended.failure(error))
  } finally {
    finished = true
    stopClock()
    await policy.close?.()
    if (finish(run)) {
      run.liveOptions = null; run.airi = null; run.event = null
      env.silence()
      env.set({ running: false, paused: false, thinking: null, speaking: null, waiting: null, waitingInput: false, waitingAudience: false, retryAt: 0, engine: undefined, game: undefined })
      env.lookAround()
    }
  }
}
