// Going live with your own face, as the site's live window did: while the stage has the keyboard (nobody typing in a
// field), 1-9 show the character's expressions by their own number keys, 0 clears, Q W E R T play the moves, B dozes
// off and back (Space, in App, sets the current pose as front). Each expression shows as its mode says (the site's 表情
// tab sets them on its characters): on and off, while the key is held (let go, or the window loses the keyboard: off),
// or for a few seconds (pressed again: off sooner). Which character: the one 开播 put on the stage, else the selected
// one, else the first you play.
import { ACTION_IDS } from '../../desktop/src/commands'
import { actors, type Actor } from './actors'
import { participants, store, type CharacterItem, type ExprMode } from './scene'

/** the moves on Q W E R T, in the site's order (B is away) */
export const MOVE_KEYS = { q: 'nod', w: 'shake', e: 'tilt', r: 'hop', t: 'shy' } as const satisfies Record<string, (typeof ACTION_IDS)[number]>

let live: string | null = null
/** the character 开播 put on the stage (entry.ts): the keys move it while it is in sight */
export const setLiveCharacter = (id: string | null) => { live = id }
export const liveCharacter = () => live

/** the character the keys move: the one 开播 put on the stage, else the selected one, else the first you play (all
 *  in sight and your own) */
export function liveTarget(): CharacterItem | undefined {
  const cast = participants(store.get()).filter((c) => !c.hidden && !c.remote)
  return cast.find((c) => c.id === live) ?? cast.find((c) => c.id === store.selected()) ?? cast.find((c) => c.lines === 'me')
}

/** each expression's number key: its own (model.json's hotkey), else the digits left over, in order (VRM, PNG and
 *  models without). The Player keeps the hotkeys on its puppet but doesn't list them (0.4.0) */
export function keysOf(a: Actor): { id: string; key: string }[] {
  if (a.format === 'png' || a.status !== 'ready') return []
  const own = new Map<string, string>()
  const model = (a.player as unknown as { puppet?: { model?: { expressions?: { id: string; key?: string }[] } } }).puppet?.model
  for (const x of model?.expressions ?? []) if (typeof x.key === 'string' && /^[1-9]$/.test(x.key) && ![...own.values()].includes(x.key)) own.set(x.id, x.key)
  const free = '123456789'.split('').filter((k) => ![...own.values()].includes(k))
  return a.player.expressions.flatMap((x) => {
    const key = own.get(x.id) ?? free.shift()
    return key ? [{ id: x.id, key }] : []
  })
}

export const modeOf = (c: CharacterItem, id: string): ExprMode => c.exprModes?.[id] ?? { mode: 'toggle' }

/** one expression's key: down and up (a key), or press (no release to come: a held one shows for 3 s) */
export function trigger(a: Actor, id: string, how: 'down' | 'up' | 'press') {
  const m = modeOf(a.item, id)
  if (how === 'up') { if (m.mode === 'hold' && a.expression === id) a.setExpression(null); return }
  if (m.mode !== 'hold' && a.expression === id) { a.setExpression(null); return }  // pressed again: off
  if (m.mode === 'timed') a.pulseExpression(id, m.secs ?? 3)
  else if (m.mode === 'hold' && how === 'press') a.pulseExpression(id, 3)
  else a.setExpression(id)
}

/** a move; shy also shows the character's own shy face for as long, when it has one and no expression is showing */
export function move(a: Actor, id: (typeof MOVE_KEYS)[keyof typeof MOVE_KEYS]) {
  a.player.act(id)
  const shy = id === 'shy' && !a.expression && a.format !== 'png' && a.player.expressions.find((x) => x.id === 'shy' || [x.label, ...Object.values(x.labels ?? {})].some((l) => /害羞|shy|照れ/i.test(l)))
  if (shy) a.pulseExpression(shy.id, 2.4)
}

/** the key a keyboard event means here: a digit or a letter, by the key typed (by where it sits while an input method
 *  is composing) */
function keyOf(e: KeyboardEvent) {
  if (e.key.length === 1) return e.key.toLowerCase()
  if (e.code.startsWith('Digit')) return e.code.slice(5)
  if (e.code.startsWith('Key')) return e.code.slice(3).toLowerCase()
  return ''
}

const typing = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"]')

/** the live keys on this window (App mounts it once) */
export function connectLiveKeys() {
  let held: { actor: string; id: string } | null = null
  const target = () => { const c = liveTarget(), a = c && actors.get(c.id); return a?.status === 'ready' ? a : undefined }
  const release = () => {
    const h = held, a = h && actors.get(h.actor)
    held = null
    if (a && h) trigger(a, h.id, 'up')
  }
  const down = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented || typing(e.target)) return
    const k = keyOf(e), a = target()
    if (!a || !k) return
    if (k === '0') { e.preventDefault(); if (!e.repeat) a.setExpression(null); return }
    if (k === 'b') { e.preventDefault(); if (!e.repeat) a.setAway(!a.away); return }
    const m = MOVE_KEYS[k as keyof typeof MOVE_KEYS]
    if (m) { e.preventDefault(); if (!e.repeat) move(a, m); return }
    const x = /^[1-9]$/.test(k) ? keysOf(a).find((x) => x.key === k) : undefined
    if (!x) return
    e.preventDefault()
    if (e.repeat) return
    if (held) release()
    trigger(a, x.id, 'down')
    if (modeOf(a.item, x.id).mode === 'hold') held = { actor: a.item.id, id: x.id }
  }
  const up = (e: KeyboardEvent) => {
    if (!held) return
    const a = actors.get(held.actor), x = a && keysOf(a).find((x) => x.id === held!.id)
    if (x && keyOf(e) === x.key) release()
  }
  addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', release)
  return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', release) }
}
