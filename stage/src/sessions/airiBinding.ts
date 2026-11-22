import { tr } from '../i18n'
// A session on AIRI is bound to one character and its model: the one rule (brains/select.ts) chooses it, and a change of
// that character (another cast, renamed, played by you) stops the session. Bound to livliv.ai's text, it stops too as
// soon as that is off (turned off, or signed out): off, nothing more is paid (sessions/spend.ts).
import { LIVLIV, livlivNow, loadBrainConfig, modelOf, onBrain, type ModelConfig } from '../brain'
import { chooseEngine } from '../brains/select'
import { features } from '../core/platform'
import { participants, store, type CharacterItem } from '../scene'
import { castKey } from './context'
import { current, type Run } from './run'
import { set } from './state'

/** binds the session to AIRI with this model and character; the function returned unbinds it */
export function bindAiri(run: Run, model: ModelConfig, actor: CharacterItem, windowId = '') {
  run.airi = { model: { ...model }, actorId: actor.id, windowId }
  const offCast = store.subscribe(() => {
    if (current() !== run || run.signal.aborted) return
    const cast = participants(store.get()).filter((character) => character.lines === 'ai')
    if (cast.length === 1 && cast[0].id === actor.id && !cast[0].remote && cast[0].name === actor.name && run.boundProfiles === castKey()) return
    run.controller.abort()
    set({ ended: tr('角色已切换，本次 AIRI 会话已停止') })
  })
  const offText = model.provider === LIVLIV ? onBrain(() => {
    if (current() !== run || run.signal.aborted || livlivNow().text) return
    run.controller.abort()
    set({ ended: tr('livliv.ai 的文字已关闭，本次会话已停止') })
  }) : () => {}
  return () => { offCast(); offText() }
}

/** a chat on AIRI, when the one rule says so (brains/select.ts): its model and the character */
export function preferredAiriForChat(config: ReturnType<typeof loadBrainConfig>, target?: string) {
  const cast = participants(store.get()).filter((character) => character.lines === 'ai'), actor = cast[0]
  const choice = chooseEngine(config, cast, { kind: 'chat', target }, features)
  const model = choice.engine === 'airi' ? modelOf(config) : null
  return model ? { model, actor } : null
}
