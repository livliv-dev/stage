import { tr } from '../i18n'
// A session on AIRI is bound to one character and its model: the one rule (brains/select.ts) chooses it, and a change of
// that character (another cast, renamed, played by you) stops the session.
import { loadBrainConfig, type ModelConfig } from '../brain'
import { chooseEngine } from '../brains/select'
import { features } from '../core/platform'
import { participants, store, type CharacterItem } from '../scene'
import { voiceRoute } from '../voiceApi'
import { castKey, session } from './context'
import { set } from './state'

/** binds the session to AIRI with this model and character; the function returned unbinds it */
export function bindAiri(controller: AbortController, model: ModelConfig, actor: CharacterItem, windowId = '') {
  session.airi = { model: { ...model }, actorId: actor.id, windowId }
  return store.subscribe(() => {
    if (session.ctrl !== controller || controller.signal.aborted) return
    const cast = participants(store.get()).filter((character) => character.lines === 'ai')
    if (cast.length === 1 && cast[0].id === actor.id && !cast[0].remote && cast[0].name === actor.name && session.boundProfiles === castKey()) return
    controller.abort()
    set({ ended: tr('角色已切换，本次 AIRI 会话已停止') })
  })
}

/** a chat on AIRI, when the one rule says so (brains/select.ts): its model and the character */
export function preferredAiriForChat(config: ReturnType<typeof loadBrainConfig>, target?: string) {
  const cast = participants(store.get()).filter((character) => character.lines === 'ai'), actor = cast[0]
  const choice = chooseEngine(config, cast, { kind: 'chat', target, voice: actor && voiceRoute(actor) }, features)
  return choice.engine === 'airi' && config.kind === 'openai' ? { model: config as ModelConfig, actor } : null
}
