// The one start: a goal and its options, run as one of today's sessions (shell/goals.ts says which, and
// shell/startCalls.ts with which arguments).
import { talk } from '../conversation'
import { loadBrainConfig } from '../brain'
import { features } from '../core/platform'
import { tr } from '../i18n'
import { asrReady, activeSpeech, voiceRoute } from '../voiceApi'
import { accountNow } from '../livliv'
import { participants, store, type Goal } from '../scene'
import { rec } from '../recording'
import { setHandsFree } from '../ptt'
import { startPlan, type StartOptions, type StartPlan, type StartStage } from './goals'
import { liveSetup } from './liveSetup'
import { startCalls, type StartInput } from './startCalls'

const stageNow = (): StartStage => ({ cast: participants(store.get()), hear: asrReady(activeSpeech()) || accountNow().status === 'in', demo: loadBrainConfig().kind === 'demo' })

/** what the stage offers a start now */
export const planNow = (goal: Goal, options: StartOptions): StartPlan => startPlan(goal, options, stageNow())

/** what a start would be given now */
export function startInput(goal: Goal, options: StartOptions, firstLine = ''): StartInput {
  const ai = participants(store.get()).filter((c) => c.lines === 'ai' && !c.remote).map((c) => ({ id: c.id, remote: c.remote, muted: c.muted, voice: voiceRoute(c) }))
  return { goal, options, firstLine, stage: stageNow(), ai, brain: loadBrainConfig(), features, live: liveSetup.get() }
}

/** starts it; an error in words when it can't. A first line (和角色聊天's, typed before the start) starts the chat with
 *  that line as your first message */
export async function startGoal(goal: Goal, options: StartOptions, firstLine = '') {
  const calls = startCalls(startInput(goal, options, firstLine))
  if ('blocked' in calls) throw new Error(tr(calls.blocked, ...(calls.args ?? [])))
  if (calls.record) await rec.start(calls.record)
  const call = calls.call
  if (call?.kind === 'conversation') talk.start()
  else if (call?.kind === 'chat') { if (call.firstLine) await talk.say(call.firstLine, { chat: true }); else await talk.startChat() }
  else if (call?.kind === 'live') talk.startLive(call.options)
  if (calls.handsFree) await setHandsFree(true)
}

/** 和角色聊天 started by you: the console's field takes your first line, not a topic */
export const firstLineStart = (goal: Goal, options: StartOptions) => goal === 'chat' && options.audience === 'me' && options.you !== 'none'

/** what a start would turn on that makes it public: a 直播间, a recording */
export const startGoesOut = (goal: Goal, options: StartOptions) => options.audience === 'live' || goal === 'video'

/** speech recognition a start would pay for with points: holding to talk or hands-free with no recognition API of
 *  one's own (it goes through livliv.ai's, which charges each utterance). Space starts nothing that pays */
export const paidHearing = (options: StartOptions) => (options.you === 'hold' || options.you === 'handsfree') && !asrReady(activeSpeech())
