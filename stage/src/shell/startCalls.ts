// What a start does, as calls into today's sessions: a recording (rec.start), then the conversation (talk.start), a
// chat (talk.startChat, or talk.say with your first line) or a 直播间 (talk.startLive with its limits, subtitles-only
// and AIRI's game), and hands-free after it. Pure, so every goal and option combination is pinned by a test
// (test/startCalls.test.ts); shell/start.ts gathers the inputs from the stores and makes the calls.
import { chooseEngine, engineReason } from '../brains/select'
import type { BrainConfig } from '../brain'
import type { Features } from '../core/platform'
import type { CharacterItem, Goal } from '../scene'
import type { LiveOptions } from '../sessions/budget'
import type { VoiceRoute } from '../voiceApi'
import { startPlan, type StartOptions, type StartStage } from './goals'
import { liveGame, type LiveSetup } from './liveSetup'

export type StartInput = {
  goal: Goal; options: StartOptions
  /** 和角色聊天's first line, typed in the console before the start ('' for none) */
  firstLine: string
  stage: StartStage
  /** the AI characters that take part (not a friend's), with the voice each would speak in */
  ai: readonly (Pick<CharacterItem, 'id' | 'remote' | 'muted'> & { voice: VoiceRoute })[]
  brain: BrainConfig
  features: Pick<Features, 'airi'>
  /** 直播间's own settings: its limits, what it does with no chat, its game (shell/liveSetup.ts) */
  live: LiveSetup
}
export type StartCall = { kind: 'conversation' } | { kind: 'chat'; firstLine: string } | { kind: 'live'; options: LiveOptions }
export type StartCalls =
  | { blocked: string; args?: (string | number)[] }
  | { record: { mic: boolean; talk: boolean } | null; call: StartCall | null; handsFree: boolean }

/** subtitles only: when a character that speaks (not muted) has no voice; the 直播间 asks it of every character */
export const subtitlesOnly = (ai: StartInput['ai']) => ai.some((c) => !c.muted && c.voice === 'none')

export function startCalls(input: StartInput): StartCalls {
  const plan = startPlan(input.goal, input.options, input.stage)
  if ('blocked' in plan) return plan
  const you = input.options.you, textOnly = subtitlesOnly(input.ai)
  // a recording takes your microphone when you speak in it (on camera, held or hands-free)
  const record = plan.record ? { mic: you === 'camera' || you === 'hold' || you === 'handsfree', talk: plan.session === 'conversation' } : null
  // a recording that starts the characters talking (录制's 同时开始对话) is the conversation's start
  if (plan.session === 'conversation') return { record, call: record ? null : { kind: 'conversation' }, handsFree: false }
  if (plan.session === 'chat') return { record, call: { kind: 'chat', firstLine: input.firstLine.trim() }, handsFree: plan.handsFree }
  // 直播间: AIRI when the rule picks it (brains/select.ts), which a game or a game window asks for
  const { needsAiri, game, windowId, portsReady } = liveGame(input.live)
  const engine = chooseEngine(input.brain, input.ai, { kind: 'live', textOnly, needsAiri }, input.features)
  if (needsAiri && engine.engine !== 'airi') return { blocked: '游戏需要内置 AIRI：{0}', args: [engineReason(engine, input.ai.length)] }
  if (!portsReady) return { blocked: '两个端口应连接同一个运行 Autorio 的存档。' }
  const options: LiveOptions = { minutes: input.live.minutes, maxGenerations: input.live.maxGenerations, warmupSeconds: input.live.warmupSeconds, textOnly, ...(engine.engine === 'airi' ? { airi: { windowId, game } } : {}) }
  return { record, call: { kind: 'live', options }, handsFree: plan.handsFree }
}
