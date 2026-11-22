import { tr } from '../i18n'
// Game actions in a running session. A game or the Neuro bridge asks for an action: the session's engine decides it
// (AIRI with its tools and the window it sees, else a model of one's own), counted as a generation, while the
// session's turns wait; an urgent request cuts the turn in hand first. And a game played on AIRI from the console:
// what you ask is decided against the game's state and the public memories, done by the game, and told as the game's
// line. What these read and do outside the session comes through a GameEnv (sessions/env.ts is the stage's).
import type { CharacterItem } from '../scene'
import type { Engine } from '../brains/engines/types'
import type { ExternalActionDecision, ExternalActionRequest, ExternalEvent } from '../externalEvents'
import type { AiriGameConfig, AiriGameFrame, AiriGameMessage } from '../../../protocol/src/airiGame'
import type { Desktop } from '../desktopBridge'
import type { ConvState } from './state'
import { counted, spent } from './budget'
import { holds } from './holds'
import { current, type Run } from './run'
import { sleep, type Wake } from './wake'

export interface GameEnv {
  state(): ConvState
  set(patch: Partial<ConvState>): void
  wake: Wake
  /** the engine the session's turn would run on now */
  engine(run: Run): Engine
  interrupt(run: Run): void
  /** a character on the stage by its id */
  actor(id: string): CharacterItem | undefined
  /** what a window shows now (null when it closed, or screen recording isn't allowed) */
  frame(windowId: string): Promise<AiriGameFrame | null | undefined>
  /** AIRI's game host (the desktop app) */
  host?: Pick<NonNullable<Desktop['airiGame']>, 'snapshot' | 'execute'>
  /** the public memories a character draws on, with their revision, and the check that they are still the saved ones */
  memories(profile: string): Promise<{ memories: { text: string }[]; revision: number }>
  checkMemory(profile: string, revision: number): Promise<void>
  /** a game's line, shown and not answered */
  told(event: Omit<ExternalEvent, 'id'>): void
  /** a game's result and error as the console shows them */
  describe(result: AiriGameMessage): string
  failure(error: unknown): string
}

export const gameName = (game: AiriGameConfig['game']) => game === 'minecraft' ? 'Minecraft' : 'Factorio'

/** a game action for another app's request (a game, the Neuro bridge), decided in the public session running */
export async function decideAction(env: GameEnv, request: ExternalActionRequest, incoming: AbortSignal): Promise<ExternalActionDecision | null> {
  const run = current(), state = env.state()
  if (!run || !state.running || state.scope !== 'public' || state.paused) throw new Error(tr('请先开启公开的游戏互动会话'))
  const airi = run.airi
  if (airi && (!state.sessionId || request.character !== airi.actorId)) throw new Error(tr('参与角色已改变，请重新开始会话'))
  const actor = env.actor(request.character)
  if (!actor || actor.lines !== 'ai' || actor.remote) throw new Error(tr('先选择一个 AI 角色'))
  const signal = AbortSignal.any([run.signal, incoming, AbortSignal.timeout(45000)])
  holds.decisions++
  try {
    if (request.priority === 'critical' || request.priority === 'high') env.interrupt(run)
    while (current()?.currentTurn) await sleep(40, signal)
    signal.throwIfAborted()
    if (env.state().paused || spent(env.state())) throw new Error(tr('会话已暂停或达到生成上限'))
    env.set(counted(env.state()))
    const frame = airi?.windowId ? await env.frame(airi.windowId) : undefined
    signal.throwIfAborted()
    if (airi?.windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
    // the engine the session runs on decides: AIRI with its tools (and the window it sees), else a model of one's own
    const engine = env.engine(run)
    if (!engine.decideAction) throw new Error(tr('游戏动作决策需要使用自己的模型接口'))
    const action = await engine.decideAction(actor, request, signal, frame ?? undefined)
    signal.throwIfAborted()
    if (env.state().paused) throw new Error(tr('会话已暂停或达到生成上限'))
    return action
  } finally { holds.decisions--; env.wake.wake() }
}

/** what you ask the game played on AIRI to do: decided, done, and told as the game's line */
export async function playGame(env: GameEnv, instruction: string) {
  const run = current(), airi = run?.airi, game = airi?.game, host = env.host, sessionId = env.state().sessionId
  if (!run || !airi || !game || !host || !sessionId || env.state().scope !== 'public' || env.state().paused || env.state().game?.status !== 'ready') {
    throw new Error(tr('请先在 AIRI 开启游戏直播'))
  }
  const actor = env.actor(airi.actorId)
  const query = instruction.trim().slice(0, 500)
  if (!actor || !query) return
  if (spent(env.state())) throw new Error(tr('会话已暂停或达到生成上限'))
  const parent = run.controller, signal = AbortSignal.any([parent.signal, AbortSignal.timeout(45_000)])
  const profile = actor.profileId ?? actor.id
  env.set({ ...counted(env.state()), game: { name: game.game, status: 'submitting', text: '' } })
  try {
    const [context, snapshot] = await Promise.all([env.memories(profile), host.snapshot(game.id, true)])
    const stillCurrent = async () => {
      signal.throwIfAborted()
      if (current()?.airi !== airi || airi.game !== game || sessionId !== env.state().sessionId || env.state().scope !== 'public' || env.state().paused) {
        throw new Error(tr('游戏连接已关闭或会话已暂停'))
      }
      await env.checkMemory(profile, context.revision)
      signal.throwIfAborted()
    }
    const facts = context.memories.slice(0, 12).map((entry) => entry.text.slice(0, 300))
    const frame = snapshot.frame ?? (airi.windowId ? await env.frame(airi.windowId) : null)
    if (airi.windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
    await stillCurrent()
    const decision = await env.engine(run).decideAction!(actor, {
      character: actor.id, source: gameName(game.game), query, priority: 'medium', silent: true, actions: game.actions,
      state: JSON.stringify({ observation: snapshot.state, rememberedFacts: facts }),
    }, signal, frame ?? undefined, stillCurrent)
    if (!decision) throw new Error(tr('AIRI 没有选出适合的游戏动作'))
    await stillCurrent()
    const text = env.describe(await host.execute(game.id, decision))
    if (current()?.airi !== airi || airi.game !== game || parent.signal.aborted) return
    if (env.state().game?.status === 'submitting') env.set({ game: { name: game.game, status: game.game === 'minecraft' ? 'playing' : 'ready', text } })
    env.told({ source: gameName(game.game), message: text, character: actor.id, reply: 'never' })
  } catch (error) {
    if (current()?.airi === airi && airi.game === game && !parent.signal.aborted) {
      env.set({ game: { name: game.game, status: 'ready', text: env.failure(error) } })
    }
  } finally { env.wake.wake() }
}
