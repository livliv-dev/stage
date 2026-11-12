import { tr } from './i18n'
// Opening Stage with a character: ?c=<id> (livliv.ai links to /stage/?c=<id>). A featured character comes from the
// copy bundled with Stage; any other from LivLiv by its id: the visitor's own (signed in), or a public one. It joins
// the stage as it is (⌘Z takes it off again); one already in the project comes back into view and is selected. The id
// leaves the address once it is on the stage, so a reload doesn't add it twice (one that couldn't be had stays, so
// signing in comes back with it). Each time, its number keys take the modes its page on the site gives them.
//  &as=face: the site's 开播. The character alone in a shot of its own, big in the middle, played by you: your face
//  moves it and the microphone its mouth too, on green for OBS's chroma key (transparent in the desktop app, whose
//  output window is see-through). A character placed new starts from its live settings on the site (smoothing, how
//  far the body carries it, the voice's motion, hops, dozing off); Stage never writes them back
//  &as=ai: the same shot with the character as AI, for the AI 直播 panel (the old AI 直播 console's links)
import { byId, liveOf, samples, type Live, type Pick } from './library'
import { bubbleFor, captionBar, newCharacter, participants, store, type CharacterItem, type Scene } from './scene'
import { controlSettings } from './workflow'
import { setLiveCharacter } from './live'
import { talk } from './conversation'
import { GREEN } from './paint'
import { onSite } from './host'
import { desktop } from './desktopBridge'

/** the id asked for in the address, if any */
export const linkedId = () => new URLSearchParams(location.search).get('c')?.trim() || null
export type LinkedAs = 'face' | 'ai'
/** how it is to go on the stage: &as=face or &as=ai (above); null as it is */
export const linkedAs = (): LinkedAs | null => { const v = new URLSearchParams(location.search).get('as'); return v === 'face' || v === 'ai' ? v : null }

function forget() {
  const q = new URLSearchParams(location.search)
  q.delete('c'); q.delete('as')
  const rest = q.toString()
  history.replaceState(history.state, '', location.pathname + (rest ? `?${rest}` : '') + location.hash)
}

let handled = false
/** puts the linked character on the stage (once a page); says what happened (or what went wrong), and which one it is */
export async function openLinked(id: string, as: LinkedAs | null = null): Promise<{ note: string; character: string | null }> {
  if (handled) return { note: '', character: null }
  handled = true
  let pick: Pick, live: Live | undefined
  try {
    const sample = samples().find((s) => s.id === id)
    pick = sample ?? await byId(id)
    // a featured one's live settings are on the site only (its card); elsewhere it goes as it comes
    live = sample ? onSite ? await liveOf(id) : undefined : pick.live
  } catch (e) {
    return { note: (e as Error).message, character: null }  // the id stays: signing in comes back here with it
  }
  forget()
  const url = pick.model.type === 'url' ? pick.model.url : null
  const there = participants(store.get()).find((c) => !c.remote && c.model.type === 'url' && c.model.url === url)
  // the modes on its page, every time; none there: all on and off
  const modes = live ? { exprModes: live.expr } : {}
  if (as) return { note: '', character: onStage(pick, there, as, live) }
  if (there) {
    store.patch(there.id, { hidden: false, ...modes })
    store.select(there.id)
    return { note: tr("{0} 已经在舞台上", there.name), character: there.id }
  }
  const c = newCharacter(store.get(), pick.name, pick.model, pick.persona, undefined, pick.card)
  Object.assign(c, modes)
  store.add(c, bubbleFor(c))
  store.select(c.id)
  return { note: tr("{0} 上台了", pick.name), character: c.id }
}

/** the shot for 开播 / AI 直播: the one it is alone in already, else the one showing when nothing is in sight there,
 *  else a new one (the rest of the project stays as it was). Its id */
function onStage(pick: Pick, there: CharacterItem | undefined, as: LinkedAs, live?: Live): string {
  const alone = (s: Scene) => {
    const seen = s.items.filter((i) => !i.hidden)
    return !!there && seen.some((i) => i.id === there.id) && seen.every((i) => i.id === there.id || (i.kind === 'subtitle' && (i.of === there.id || i.of === 'all')))
  }
  const own = store.project().scenes.find(alone)
  if (own) store.switchScene(own.id)
  else {
    if (store.get().items.some((i) => !i.hidden)) store.addScene(true)
    store.set({ name: as === 'face' ? tr("开播 · {0}", pick.name) : `${tr("AI 直播")} · ${pick.name}`, background: desktop ? 'transparent' : GREEN, backgroundAsset: undefined })
  }
  // big, in the middle, standing on the bottom edge (in its own shot, where you put it last time)
  const s = store.get(), h = Math.round(Math.min(s.height * 0.94, s.width * 0.9 * 1.5)), w = Math.round(h * 2 / 3)
  const place = own ? { hidden: false } : { hidden: false, x: Math.round((s.width - w) / 2), y: s.height - h, w, h }
  const face = as === 'face'
  const setup: Partial<CharacterItem> = { ...controlSettings(face ? 'human' : 'ai'), ...place, ...(live ? { exprModes: live.expr } : {}),
    // the microphone on the mouth: on, unless you switched it off for this one
    ...(face ? { faceMic: there?.faceMic !== false } : {}) }
  store.begin()
  let id: string
  try {
    if (there) { store.patch(there.id, setup); id = there.id }
    else {
      const c = newCharacter(s, pick.name, pick.model, pick.persona, 0.5, pick.card)
      Object.assign(c, setup)
      // where it starts: its live settings on the site
      if (live?.smooth !== undefined) c.smooth = live.smooth
      if (live?.talk !== undefined) c.talk = Math.min(1.5, live.talk)
      if (live?.autoAway !== undefined) c.autoAway = live.autoAway
      c.tuning = { ...c.tuning, ...(live?.follow !== undefined ? { faceFollow: live.follow } : {}), ...(live?.bounce !== undefined ? { bounce: live.bounce } : {}) }
      store.add(c); id = c.id
    }
    // AI lines show along the bottom
    if (!face && !store.get().items.some((i) => i.kind === 'subtitle' && !i.hidden && (i.of === id || i.of === 'all'))) store.add(captionBar(store.get()))
  } finally { store.end() }
  store.select(id)
  setLiveCharacter(face ? id : null)
  if (face) talk.setAs(id)
  return id
}
