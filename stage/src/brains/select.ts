// Which engine a session runs on: Stage's own (the model set up, asked line by line), or Project AIRI built in (its
// chat runtime streams a reply sentence by sentence, reads memories by tool, sees a window, plays a game). This is the
// only place that decides; it says why, for the console's status line.
// AIRI runs when all of these hold: the desktop app (it has window capture), a model of one's own (OpenAI-compatible),
// one AI character on the stage and a local one (not a friend's), AIRI not switched off in the model settings (a
// game or a window asks for AIRI whatever the switch says), and not a livliv.ai voice (charged per /say call, and AIRI
// voices each sentence on its own) unless it is muted or the session shows subtitles only. livliv.ai's text is a model
// like one's own.
import { tr } from '../i18n'
import type { BrainConfig } from '../brain'
import type { Features } from '../core/platform'
import type { CharacterItem } from '../scene'
import type { VoiceRoute } from '../voiceApi'

/** what is starting: 持续聊天, AI 直播, or the model card's test of the model */
export type Show = {
  kind: 'chat' | 'live' | 'test'
  /** 持续聊天 with this character (its card, the Neuro panel) */
  target?: string
  /** AI 直播 with subtitles only */
  textOnly?: boolean
  /** AI 直播 with a game or a window, which only AIRI can do */
  needsAiri?: boolean
  /** the voice the one AI character speaks in (voiceApi voiceRoute); the test leaves it out */
  voice?: VoiceRoute
}
/** why: 'airi' when it runs on AIRI, else what stood in the way */
export type EngineReason = 'airi' | 'web' | 'model' | 'none' | 'cast' | 'remote' | 'off' | 'target' | 'livliv-voice'
export type EngineChoice = { engine: 'standard' | 'airi'; reason: EngineReason }

const standard = (reason: EngineReason): EngineChoice => ({ engine: 'standard', reason })

/** the engine for this session, and why. `cast`: the AI characters on the stage */
export function chooseEngine(brain: BrainConfig, cast: readonly Pick<CharacterItem, 'id' | 'remote' | 'muted'>[], show: Show, features: Pick<Features, 'airi'>): EngineChoice {
  if (!features.airi) return standard('web')
  if (brain.kind === 'demo') return standard('model')
  if (!cast.length) return standard('none')
  if (cast.length > 1) return standard('cast')
  const [actor] = cast
  if (actor.remote) return standard('remote')
  if (brain.kind === 'openai' && brain.airi === false && !show.needsAiri) return standard('off')
  if (show.target && show.target !== actor.id) return standard('target')
  if (show.voice === 'livliv' && !actor.muted && !show.textOnly) return standard('livliv-voice')
  return { engine: 'airi', reason: 'airi' }
}

/** AIRI could run this cast with this model (whatever the switch, the character asked for or the voice say) */
export const airiFits = (choice: EngineChoice) => !['web', 'model', 'none', 'cast', 'remote'].includes(choice.reason)

/** the reason in a few words, for the status line: what made it the standard engine (引擎：标准 · <reason>) */
export function engineReason(choice: EngineChoice, cast: number): string {
  switch (choice.reason) {
    case 'airi': return tr('由 Project AIRI 驱动')
    case 'web': return tr('网页版')
    case 'model': return tr('不是 OpenAI 兼容模型')
    case 'none': return tr('没有 AI 角色')
    case 'cast': return tr('{0} 个 AI 角色', cast)
    case 'remote': return tr('好友联播的角色')
    case 'off': return tr('AIRI 已关闭')
    case 'target': return tr('选中的不是这位角色')
    case 'livliv-voice': return tr('livliv.ai 声音')
  }
}
