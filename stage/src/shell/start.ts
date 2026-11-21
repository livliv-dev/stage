// The one start: a goal and its options, run as one of today's sessions (shell/goals.ts says which).
import { talk } from '../conversation'
import { loadBrainConfig } from '../brain'
import { asrReady, activeSpeech, voiceRoute } from '../voiceApi'
import { accountNow } from '../livliv'
import { participants, store, type Goal } from '../scene'
import { rec } from '../recording'
import { setHandsFree } from '../ptt'
import { startPlan, type StartOptions, type StartPlan } from './goals'

/** what the stage offers a start now */
export function planNow(goal: Goal, options: StartOptions): StartPlan {
  const cast = participants(store.get())
  return startPlan(goal, options, { cast, hear: asrReady(activeSpeech()) || accountNow().status === 'in', demo: loadBrainConfig().kind === 'demo' })
}

/** starts it; an error in words when it can't */
export async function startGoal(goal: Goal, options: StartOptions) {
  const plan = planNow(goal, options)
  if ('blocked' in plan) throw new Error(plan.blocked)
  const t = store.get().talk, ai = participants(store.get()).filter((c) => c.lines === 'ai' && !c.remote)
  // a recording that starts the characters talking (录制's 同时开始对话) is the conversation's start
  if (plan.record) await rec.start({ mic: false, talk: plan.session === 'conversation' })
  if (plan.session === 'conversation') { if (!plan.record) talk.start() }
  else if (plan.session === 'chat') await talk.startChat()
  else talk.startLive({ minutes: t.chatMinutes ?? 60, maxGenerations: t.chatGenerations ?? 100, warmupSeconds: 0, textOnly: ai.some((c) => !c.muted && voiceRoute(c) === 'none') })
  if (plan.handsFree) await setHandsFree(true)
}
