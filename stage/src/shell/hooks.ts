// The editor's keys while nothing is being typed, and whether the window is narrow (a phone).
import { useEffect, useRef, useState } from 'react'
import { loadBrainConfig } from '../brain'
import { conversation, talk } from '../conversation'
import { characters, participants, store } from '../scene'
import type { Zoom } from '../Stage'
import { voiceRoute } from '../voiceApi'
import { demoFor } from '../demo'
import { actors } from '../actors'
import { imageGeometry, moveImage } from '../attachments'
import { propSource } from '../propGeometry'
import { tr } from '../i18n'
import { beginDemo } from './demoStart'

type Keys = { escape: () => void; help: () => void; zoom: (z: Zoom | ((z: Zoom) => Zoom)) => void; bare: () => void; say: (s: string) => void; start: () => void }

/** keys while not typing: ⌘Z / ⇧⌘Z undo / redo, ⌘D copy, Delete, arrows move (⇧: by 10), ⇧1 fit, ⇧0 100%, ⌘\
 *  panels, Space start / pause, Esc, ? the list */
export function useShortcuts(keys: Keys) {
  const k0 = useRef(keys)
  k0.current = keys
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // any open card closes on Esc first, also while typing in it
      if (e.key === 'Escape') {
        const x = [...document.querySelectorAll<HTMLButtonElement>('.popover button[data-close], .card.transcript button[data-close]')].find((button) => button.getClientRects().length > 0)
        if (x) { x.click(); return }
      }
      if (t.closest('input, textarea, select, [contenteditable="true"]') || (e.key === ' ' && t.closest('button'))) return
      const K = k0.current, mod = e.metaKey || e.ctrlKey, id = store.selected(), k = e.key.toLowerCase()
      if (e.key === 'Escape') { K.escape(); return }
      if (e.key === '?') { K.help(); return }
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return }
      if (mod && k === 'y') { e.preventDefault(); store.redo(); return }
      if (mod && e.key === '\\') { e.preventDefault(); K.bare(); return }
      if (e.shiftKey && e.code === 'Digit1') { e.preventDefault(); K.zoom('fit'); return }
      if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); K.zoom(1); return }
      if (e.code === 'Space' && !t.closest('button')) {
        e.preventDefault()
        const c = conversation()
        if (!characters(store.get()).some((x) => x.lines === 'ai')) actors.forEach((a) => { if (a.item.lines === 'me') a.calibrate() })
        else if (c.running) { if (c.paused) talk.resume(); else talk.pause() }
        else {
          // the demo: again. Else the stage's start, as its button does; one that goes out to a 直播间 or records only
          // opens its checklist from a key. Lines paid with points start only from a button, never from a key: Space
          // plays the free demo instead. Points pay for LivLiv's lines and for every line in a LivLiv voice
          const brain = loadBrainConfig()
          const paidVoice = brain.kind !== 'demo' && participants(store.get()).some((c) => c.lines === 'ai' && !c.muted && voiceRoute(c) === 'livliv')
          if (brain.kind === 'demo') talk.start()
          else if (brain.kind === 'livliv') {
            if (demoFor(characters(store.get()))?.script.template === 'trio') void beginDemo()
            else K.say(tr("用积分的台词，请点按钮开始"))
          } else if (paidVoice) K.say(tr("用积分的台词，请点按钮开始"))
          else K.start()
        }
        return
      }
      if (!id || store.mode() !== 'edit') return
      if (mod && k === 'd') { e.preventDefault(); store.duplicate(id); return }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); store.remove(id); return }
      if (store.get().items.find((i) => i.id === id)?.locked) return
      const step = e.shiftKey ? 10 : 1
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      const it = store.get().items.find((i) => i.id === id)
      if (d && it) { e.preventDefault(); store.patch(id, it.kind === 'image' ? moveImage(it, imageGeometry(it, store.get(), propSource), d[0], d[1]) : { x: it.x + d[0], y: it.y + d[1] }) }
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])
}

/** a phone or a narrow window (the redesign lays the editor out for it) */
export function useNarrow() {
  const query = '(max-width: 760px)'
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => { const list = matchMedia(query), change = () => setNarrow(list.matches); list.addEventListener('change', change); return () => list.removeEventListener('change', change) }, [])
  return narrow
}
