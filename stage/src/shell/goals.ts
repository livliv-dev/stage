// What you came to do (the start page's four goals), and how a start is set: who takes part (谁上场), who watches
// (谁在看), how you take part (你参与吗). Every start ends in one of today's sessions (conversation.ts talk.*):
//  - 谁在看 直播间: AI 直播 (talk.startLive), with Twitch or without chat; you may still type or speak to it
//  - 只有我, you not taking part: the characters talk among themselves (talk.start)
//  - 只有我, you typing, holding to talk, hands-free or on camera: chat (talk.startChat), hands-free switched on after it
//  - 做一段视频 records while it runs (rec.start)
// A combination today's sessions can't run is offered disabled, with the reason.
import type { Audience, CharacterItem, Goal, Talk, You } from '../scene'

export type { Audience, Goal, You }
export type StartOptions = { audience: Audience; you: You }

export const GOALS: readonly { id: Goal; label: string; hint: string; big: boolean; button: string | null }[] = [
  { id: 'perform', label: '我来演', hint: '用你的脸和声音演角色，可以加一个 AI 搭档', big: true, button: null },
  { id: 'live', label: 'AI 来开播', hint: 'AI 角色自己开播，回应直播间', big: true, button: '开播' },
  { id: 'chat', label: '和角色聊天', hint: '打字或说话，和角色聊', big: false, button: '开始聊天' },
  { id: 'video', label: '做一段视频', hint: '让几个角色聊一段，录下来', big: false, button: '开录' },
]

/** where a goal starts from, when the stage has none of your characters yet: one of the templates */
export const GOAL_TEMPLATE = { perform: 'solo', live: 'ai', chat: 'ai', video: 'duo' } as const

/** the options a goal starts with */
export function goalOptions(goal: Goal, partner: boolean): StartOptions {
  if (goal === 'perform') return partner ? { audience: 'live', you: 'camera' } : { audience: 'me', you: 'camera' }
  if (goal === 'live') return { audience: 'live', you: 'none' }
  if (goal === 'chat') return { audience: 'me', you: 'type' }
  return { audience: 'me', you: 'none' }
}

/** the start button's words: by the goal; 我来演 has none (its action is 输出到 OBS) unless it has an AI partner */
export function startLabel(goal: Goal, partner: boolean): string | null {
  if (goal === 'perform') return partner ? '开播' : null
  return GOALS.find((g) => g.id === goal)!.button
}

export const AUDIENCES: readonly { id: Audience; label: string; hint: string }[] = [
  { id: 'me', label: '只有我', hint: '不对外：私聊时只有你看得到' },
  { id: 'live', label: '直播间', hint: '回应观众（接上 Twitch，或不接弹幕）' },
]
export const YOUS: readonly { id: You; label: string; hint: string }[] = [
  { id: 'none', label: '不参与', hint: '角色之间聊' },
  { id: 'type', label: '打字', hint: '在控制台打字' },
  { id: 'hold', label: '按住说', hint: '按住按钮或 ` 键说话' },
  { id: 'handsfree', label: '免按键', hint: '直接说，停顿后自动发送' },
  { id: 'camera', label: '我也上镜', hint: '你的角色跟着摄像头动，你说话' },
]

/** what a way of taking part does in this start: 不参与 depends on who watches and how many AI characters there are */
export function youHint(you: You, audience: Audience, ai: number): string {
  if (you !== 'none') return YOUS.find((y) => y.id === you)!.hint
  if (audience === 'live') return '角色回应直播间'
  return ai >= 2 ? '角色之间聊' : '只有一个 AI 角色：它会一个人说下去'
}

/** what the stage offers a start: its characters (who plays each), whether speech recognition works, whether the AI
 *  characters think with the demo */
export type StartStage = { cast: readonly Pick<CharacterItem, 'id' | 'lines' | 'remote' | 'hidden'>[]; hear: boolean; demo: boolean }
/** what a start runs: today's session, recording or hands-free with it; or why it can't */
export type StartPlan = { session: 'conversation' | 'chat' | 'live'; record: boolean; handsFree: boolean } | { blocked: string }

export function startPlan(goal: Goal, options: StartOptions, stage: StartStage): StartPlan {
  const ai = stage.cast.filter((c) => c.lines === 'ai' && !c.remote), mine = stage.cast.filter((c) => c.lines === 'me' && !c.remote)
  if (!ai.length) return { blocked: '舞台上还没有 AI 角色' }
  if ((options.you === 'hold' || options.you === 'handsfree') && !stage.hear) return { blocked: '按住说和免按键需要语音识别' }
  if (options.you === 'camera' && !mine.length) return { blocked: '我也上镜需要一个「我来演」的角色' }
  if (options.audience === 'live' && stage.demo) return { blocked: '直播间需要接上模型，演示只能在「只有我」里看' }
  const record = goal === 'video'
  if (options.audience === 'live') return { session: 'live', record, handsFree: options.you === 'handsfree' }
  if (options.you === 'none') return { session: 'conversation', record, handsFree: false }
  return { session: 'chat', record, handsFree: options.you === 'handsfree' }
}

/** a goal's options, kept on the stage: what was chosen last there, else the goal's own */
export function optionsOf(talk: Pick<Talk, 'goal' | 'audience' | 'you'>, partner: boolean): StartOptions {
  const own = goalOptions(talk.goal ?? 'chat', partner)
  return { audience: talk.audience ?? own.audience, you: talk.you ?? own.you }
}
