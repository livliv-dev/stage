import { tr } from './i18n'
// Opening Stage with a character: ?c=<id> (livliv.ai links to /stage/?c=<id>). A featured character comes from the
// copy bundled with Stage; any other from LivLiv by its id: the visitor's own (signed in), or a public one. It joins
// the stage as it is (⌘Z takes it off again); one already in the project comes back into view and is selected. The id
// leaves the address once handled, so a reload doesn't add it twice.
import { byId, samples, type Pick } from './library'
import { bubbleFor, characters, newCharacter, store } from './scene'

/** the id asked for in the address, if any */
export const linkedId = () => new URLSearchParams(location.search).get('c')?.trim() || null

function forget() {
  const q = new URLSearchParams(location.search)
  q.delete('c')
  history.replaceState(history.state, '', location.pathname + (q.size ? `?${q}` : '') + location.hash)
}

let handled = false
/** puts the linked character on the stage (once a page); says what happened (or what went wrong) */
export async function openLinked(id: string): Promise<string> {
  if (handled) return ''
  handled = true
  forget()
  let pick: Pick
  try {
    pick = samples().find((s) => s.id === id) ?? await byId(id)
  } catch (e) {
    return (e as Error).message
  }
  const url = pick.model.type === 'url' ? pick.model.url : null
  const there = characters(store.get()).find((c) => !c.remote && c.model.type === 'url' && c.model.url === url)
  if (there) {
    if (there.hidden) store.patch(there.id, { hidden: false })
    store.select(there.id)
    return tr("{0} 已经在舞台上", there.name)
  }
  const c = newCharacter(store.get(), pick.name, pick.model, pick.persona, undefined, pick.card)
  store.add(c, bubbleFor(c))
  store.select(c.id)
  return tr("{0} 上台了", pick.name)
}
