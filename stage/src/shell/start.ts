// The one start: a goal and its options, run as one of today's sessions (shell/goals.ts says which).
import { talk } from '../conversation'
import { loadBrainConfig } from '../brain'
import { chooseEngine, engineReason } from '../brains/select'
import { features } from '../core/platform'
import { tr } from '../i18n'
import { asrReady, activeSpeech, voiceRoute } from '../voiceApi'
import { accountNow } from '../livliv'
import { participants, store, type Goal } from '../scene'
import { rec } from '../recording'
import { setHandsFree } from '../ptt'
import { startPlan, type StartOptions, type StartPlan } from './goals'
import { liveGame, liveSetup } from './liveSetup'

/** what the stage offers a start now */
export function planNow(goal: Goal, options: StartOptions): StartPlan {
  const cast = participants(store.get())
  return startPlan(goal, options, { cast, hear: asrReady(activeSpeech()) || accountNow().status === 'in', demo: loadBrainConfig().kind === 'demo' })
}

/** starts it; an error in words when it can't */
export async function startGoal(goal: Goal, options: StartOptions) {
  const plan = planNow(goal, options)
  if ('blocked' in plan) throw new Error(tr(plan.blocked))
  const t = store.get().talk, ai = participants(store.get()).filter((c) => c.lines === 'ai' && !c.remote)
  // subtitles only when a character has no voice (muted or not): the 直播间 session asks it of every character
  const textOnly = ai.some((c) => voiceRoute(c) === 'none')
  // 直播间: AIRI when the rule picks it (brains/select.ts), which a game or a game window asks for
  let airi: { windowId: string; game?: ReturnType<typeof liveGame>['game'] } | undefined
  if (plan.session === 'live') {
    const setup = liveSetup.get(), { needsAiri, game, windowId, portsReady } = liveGame(setup)
    const engine = chooseEngine(loadBrainConfig(), ai, { kind: 'live', textOnly, needsAiri, voice: ai[0] && voiceRoute(ai[0]) }, features)
    if (needsAiri && engine.engine !== 'airi') throw new Error(tr('游戏需要内置 AIRI：{0}', engineReason(engine, ai.length)))
    if (!portsReady) throw new Error(tr('两个端口应连接同一个运行 Autorio 的存档。'))
    if (engine.engine === 'airi') airi = { windowId, game }
  }
  // a recording that starts the characters talking (录制's 同时开始对话) is the conversation's start
  if (plan.record) await rec.start({ mic: false, talk: plan.session === 'conversation' })
  if (plan.session === 'conversation') { if (!plan.record) talk.start() }
  else if (plan.session === 'chat') await talk.startChat()
  else talk.startLive({ minutes: t.chatMinutes ?? 60, maxGenerations: t.chatGenerations ?? 100, warmupSeconds: liveSetup.get().warmupSeconds, textOnly, ...(airi ? { airi } : {}) })
  if (plan.handsFree) await setHandsFree(true)
}

/** what a start would turn on that makes it public: a 直播间, a recording */
export const startGoesOut = (goal: Goal, options: StartOptions) => options.audience === 'live' || goal === 'video'
