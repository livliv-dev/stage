// The keys that play the character you perform, as the site's live window did: while the stage has the keyboard
// (nobody typing in a field), 1-9 show its expressions by their own number keys, 0 clears, Q W E R T play the moves, B
// dozes off and back (Space, in App, sets the current pose as front). Each expression shows as its mode says (the
// site's 表情 tab sets them on its characters): on and off, while the key is held (let go, or the window loses the
// keyboard: off), or for a few seconds (pressed again: off sooner). Which character, and what each key does to it, is
// the command path's (control.ts): the one 开播 put on the stage, else the selected one, else the first you play.
import { ACTION_IDS } from '../../protocol/src/commands'
import { actors, type Actor } from './actors'
import { commandTarget, modeOf, performStageCommand, type KeyCommand } from './control'
import { participants, store } from './scene'

/** the moves on Q W E R T, in the site's order (B is away) */
export const MOVE_KEYS = { q: 'nod', w: 'shake', e: 'tilt', r: 'hop', t: 'shy' } as const satisfies Record<string, (typeof ACTION_IDS)[number]>

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

/** the key a keyboard event means here: a digit or a letter, by the key typed (by where it sits while an input method
 *  is composing) */
function keyOf(e: KeyboardEvent) {
  if (e.key.length === 1) return e.key.toLowerCase()
  if (e.code.startsWith('Digit')) return e.code.slice(5)
  if (e.code.startsWith('Key')) return e.code.slice(3).toLowerCase()
  return ''
}

const typing = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"]')

/** the keys on this window (App mounts it once) */
export function connectCharacterKeys() {
  let held: { actor: string; id: string } | null = null
  const target = () => { const c = commandTarget(participants(store.get()), 'keys'), a = c && actors.get(c.id); return a?.status === 'ready' ? a : undefined }
  const key = (character: string, what: KeyCommand['key']) => performStageCommand({ do: 'key', character, key: what })
  const release = () => {
    const h = held
    held = null
    if (h && actors.get(h.actor)) key(h.actor, { is: 'expr', id: h.id, how: 'up' })
  }
  const down = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented || typing(e.target)) return
    const k = keyOf(e), a = target()
    if (!a || !k) return
    const character = a.item.id
    if (k === '0') { e.preventDefault(); if (!e.repeat) key(character, { is: 'clear' }); return }
    if (k === 'b') { e.preventDefault(); if (!e.repeat) key(character, { is: 'away' }); return }
    const m = MOVE_KEYS[k as keyof typeof MOVE_KEYS]
    if (m) { e.preventDefault(); if (!e.repeat) key(character, { is: 'move', id: m }); return }
    const x = /^[1-9]$/.test(k) ? keysOf(a).find((x) => x.key === k) : undefined
    if (!x) return
    e.preventDefault()
    if (e.repeat) return
    if (held) release()
    key(character, { is: 'expr', id: x.id, how: 'down' })
    if (modeOf(a.item, x.id).mode === 'hold') held = { actor: character, id: x.id }
  }
  const up = (e: KeyboardEvent) => {
    if (!held) return
    const a = actors.get(held.actor), x = a && keysOf(a).find((x) => x.id === held!.id)
    if (x && keyOf(e) === x.key) release()
  }
  addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', release)
  return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', release) }
}
