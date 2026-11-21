// The demo: the three sample characters' prepared conversation in their recorded voices, which needs no model, key or
// voice. Started from the start page, the model card, Space on the site, and the phone page.
import { tr } from '../i18n'
import { playDemo } from '../brain'
import { talk } from '../conversation'
import { demoFor } from '../demo'
import { cancel as pttCancel } from '../ptt'
import { characters, store } from '../scene'
import { buildTemplate } from '../templates'
import { controlSettings } from '../workflow'

/** the demo's three on the stage (as they stand in it), unless they already are */
let building: Promise<void> | null = null
export function ensureTrio() {
  const current = characters(store.get()).filter((item) => !item.hidden)
  if (current.length === 3 && !current.some((item) => item.remote) && demoFor(current)?.script.template === 'trio') return Promise.resolve()
  return building ??= buildTemplate('trio').then((next) => {
    next.name = tr('三人聊天演示')
    pttCancel(); talk.detach(); store.replace(next); store.select(characters(next)[0]?.id ?? null)
  }).finally(() => { building = null })
}

export async function beginDemo(done?: () => void) {
  await ensureTrio()
  const demo = demoFor(characters(store.get()))!
  const cast = new Map(Object.values(demo.who).map((item) => [item.id, { ...item,
    y: item.y === store.get().height - item.h ? item.y + Math.round(store.get().height * 0.022) : item.y }])), captionSize = 32
  store.set({ topic: demo.script.topic, items: store.get().items.map((item) => {
    if (item.kind === 'subtitle') {
      const speaker = cast.get(item.of)
      return { ...item, showName: true, typewriter: false, linger: .8, size: captionSize,
        y: item.style === 'bubble' && speaker ? Math.max(0, speaker.y - item.h - captionSize) : item.y }
    }
    return item.kind === 'character' && cast.has(item.id) ? { ...item, ...controlSettings('ai'), muted: false,
      y: cast.get(item.id)!.y } : item
  }) }); store.select(null)
  pttCancel(); talk.detach(); playDemo(true); done?.(); talk.start()
}

