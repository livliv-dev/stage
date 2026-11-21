// A goal's 准备清单: only what that goal needs, each with where it stands. The card (shell/Checklist.tsx) gives each a
// test and a way into the right setting, which comes back to the card.
import type { EngineChoice } from '../brains/select'
import type { Goal } from '../scene'
import type { VoiceRoute } from '../voiceApi'

export type CheckId = 'model' | 'voice' | 'camera' | 'microphone' | 'phone' | 'partner' | 'twitch' | 'game' | 'hearing' | 'realtime' | 'record-voice'
/** ok: ready; todo: needed and not ready; warn: works, short of what you might expect (subtitles only); optional: not
 *  needed, not set; off: not here (a desktop item on the web) */
export type CheckState = 'ok' | 'todo' | 'warn' | 'optional' | 'off'
export type Check = { id: CheckId; label: string; state: CheckState; detail: string; desktop?: boolean }

export type CheckContext = {
  /** the model the AI characters think with: its name, 'LivLiv', or null when none is set up (the demo is none) */
  model: string | null
  /** the AI characters on the stage, and how each would speak */
  ai: readonly { name: string; voice: VoiceRoute; muted: boolean }[]
  /** a character you play: whether its camera is on and calibrated; null when none */
  face: { name: string; tracking: boolean; calibrated: boolean } | null
  partner: boolean
  hear: boolean
  microphone: boolean
  /** the desktop app receives phone and VMC tracking */
  phone: { here: boolean; on: boolean }
  twitch: { status: 'off' | 'connecting' | 'on' | 'error'; channel: string }
  /** games: the desktop app's AIRI connections; the engine this cast would run on for 开播 with a game */
  game: { here: boolean; engine: EngineChoice; reason: string }
  /** 实时通话: credentials for OpenAI's or Bailian's realtime API */
  realtime: { ready: boolean; provider: string }
}

const voiced = (route: VoiceRoute) => route === 'api' || route === 'livliv' || route === 'system'

function modelCheck(c: CheckContext): Check {
  return { id: 'model', label: '文字模型', state: c.model ? 'ok' : 'todo', detail: c.model ?? '需要设置' }
}
function voiceCheck(c: CheckContext): Check {
  const silent = c.ai.filter((a) => !a.muted && !voiced(a.voice))
  if (!c.ai.length) return { id: 'voice', label: '声音', state: 'todo', detail: '先放一个 AI 角色' }
  return silent.length ? { id: 'voice', label: '声音', state: 'warn', detail: '现在只有字幕' } : { id: 'voice', label: '声音', state: 'ok', detail: c.ai.map((a) => a.name).join('、') }
}

export function checklist(goal: Goal, c: CheckContext): Check[] {
  const camera: Check = c.face
    ? { id: 'camera', label: '摄像头', state: c.face.calibrated ? 'ok' : c.face.tracking ? 'todo' : 'todo', detail: c.face.calibrated ? '已校准' : c.face.tracking ? '看向镜头，校准正面' : '打开摄像头' }
    : { id: 'camera', label: '摄像头', state: 'todo', detail: '先放一个「我来演」的角色' }
  const microphone: Check = { id: 'microphone', label: '麦克风', state: c.microphone ? 'ok' : 'optional', detail: c.microphone ? '已打开' : '可选：口型跟着你的声音' }
  const phone: Check = { id: 'phone', label: '手机或 VMC 面捕', state: c.phone.here ? c.phone.on ? 'ok' : 'optional' : 'off', detail: c.phone.here ? c.phone.on ? '已连接' : '可选' : '桌面版接收手机和 VMC 的面捕', desktop: true }
  // 我来演 alone: viewers' messages can still move your character (弹幕动作), from the 直播间 card
  const chat: Check = { id: 'twitch', label: '直播间弹幕', state: c.twitch.status === 'on' ? 'ok' : c.twitch.status === 'error' ? 'todo' : 'optional', detail: c.twitch.status === 'on' ? `Twitch：${c.twitch.channel}` : c.twitch.status === 'error' ? '连接失败' : '可选：弹幕可以触发角色的表情和动作' }
  if (goal === 'perform') return c.partner ? [camera, microphone, phone, { ...modelCheck(c), label: 'AI 搭档的文字模型' }, { ...voiceCheck(c), label: 'AI 搭档的声音' }] : [camera, microphone, phone, chat]
  if (goal === 'live') {
    const game: Check = !c.game.here ? { id: 'game', label: '游戏', state: 'off', detail: '桌面版可以让角色玩 Minecraft 或 Factorio', desktop: true }
      : { id: 'game', label: '游戏', state: c.game.engine.engine === 'airi' ? 'optional' : 'off', detail: c.game.engine.engine === 'airi' ? '可选：Minecraft（Airicraft）或 Factorio（Autorio）' : c.game.reason, desktop: true }
    return [modelCheck(c), voiceCheck(c),
      { id: 'twitch', label: '直播间弹幕', state: c.twitch.status === 'on' ? 'ok' : c.twitch.status === 'error' ? 'todo' : 'optional', detail: c.twitch.status === 'on' ? `Twitch：${c.twitch.channel}` : c.twitch.status === 'connecting' ? '正在连接…' : c.twitch.status === 'error' ? '连接失败' : '可选：不接弹幕也能开播' },
      game]
  }
  if (goal === 'chat') return [modelCheck(c), voiceCheck(c),
    { id: 'hearing', label: '语音识别', state: c.hear ? 'ok' : 'optional', detail: c.hear ? '可以按住说和免按键' : '可选：说话代替打字' },
    { id: 'realtime', label: '实时通话', state: c.realtime.ready ? 'ok' : 'optional', detail: c.realtime.ready ? c.realtime.provider : '另一种聊法：要自己的 OpenAI 或百炼密钥，用服务商的声音，只和一个角色' }]
  // 做一段视频: a voice a recording can take (the system voice plays aside and isn't in the file)
  const unrecorded = c.ai.filter((a) => !a.muted && a.voice !== 'api' && a.voice !== 'livliv')
  return [modelCheck(c), !c.ai.length ? voiceCheck(c)
    : unrecorded.length ? { id: 'record-voice', label: '可录的声音', state: 'warn', detail: unrecorded.some((a) => a.voice === 'system') ? '系统朗读录不进视频' : '现在只有字幕' }
    : { id: 'record-voice', label: '可录的声音', state: 'ok', detail: c.ai.map((a) => a.name).join('、') }]
}

/** how many of the needed items are ready, of how many */
export function readiness(checks: readonly Check[]) {
  const needed = checks.filter((c) => c.state !== 'optional' && c.state !== 'off')
  return { ready: needed.filter((c) => c.state === 'ok').length, of: needed.length }
}
