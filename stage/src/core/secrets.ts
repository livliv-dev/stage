// API keys and the livliv.ai sign-in in the desktop app: kept encrypted by the system, through the app
// (desktop/src/secrets.ts), not in this page's storage. A setting with a key in it (the text model, the speech API, the
// realtime call) is saved here without the key, and the key on its own; the sign-in is kept there whole. A key saved
// stays in the page's storage until the app says its encrypted copy is written, and only then is removed from it; if
// that fails, it stays as it was. A key cleared (signed out, a key emptied) is gone from the page at once and marked
// cleared here until the app says the encrypted copy is deleted too: until then the old one still in the app's file is
// never read back, and the delete is tried again as the app starts. Keys saved the old way move over in one pass as the
// app starts (migrateKeys). A key the app can no longer decrypt (the system's keychain changed) is reported (lostKey),
// so the settings ask for it again. In a browser, or a desktop without system encryption, everything stays in the
// page's storage as before.
import type { PrefKey } from './prefs'

type Vault = { all(): { keys: Record<string, string>; lost: string[] } | null; set(name: string, value: string): Promise<boolean> }
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>
let given: Vault | null | undefined
const vault = (): Vault | null => (given !== undefined ? given : typeof window === 'undefined' ? null : window.livlivDesktop?.secrets ?? null)
/** the keys kept, read once; null: they are kept in the page's storage */
let read: { keys: Record<string, string>; lost: Set<string> } | null | undefined
const kept = () => {
  if (read === undefined) {
    try { const all = vault()?.all() ?? null; read = all ? { keys: { ...all.keys }, lost: new Set(all.lost) } : null } catch { read = null }
  }
  return read
}
/** another vault (the tests' stand-in), read afresh */
export function setKeyVault(v: Vault | null | undefined) { given = v; read = undefined }

/** the settings that carry a key, and the secrets kept whole (desktop/src/secrets.ts KEYED) */
export const KEYED: PrefKey[] = ['livliv-stage:brain', 'livliv-stage:brain-api', 'livliv-stage:speech', 'livliv-stage:realtime']
export const WHOLE: PrefKey[] = ['livliv-stage:session']

/** the keys cleared here whose encrypted copy the app hasn't confirmed deleted yet */
const CLEARED: PrefKey = 'livliv-stage:keys-cleared'
function cleared(storage: Storage): Set<string> {
  try { const v = JSON.parse(storage.getItem(CLEARED) ?? '[]'); return new Set(Array.isArray(v) ? v.filter((n) => typeof n === 'string') : []) } catch { return new Set() }
}
function mark(storage: Storage, name: string, on: boolean) {
  const names = cleared(storage)
  if (names.has(name) === on) return
  if (on) names.add(name); else names.delete(name)
  if (names.size) storage.setItem(CLEARED, JSON.stringify([...names])); else storage.removeItem(CLEARED)
}
/** cleared here: the encrypted copy is deleted, and only then is the mark taken off (a later save takes it off too) */
function clear(name: PrefKey, storage: Storage) {
  mark(storage, name, true)
  const v = vault()
  if (!v) return Promise.resolve(false)
  return v.set(name, '').then((ok) => { if (ok) mark(storage, name, false); return ok }, () => false)
}

type Keyed = { key?: unknown }
const without = (value: Keyed) => { const { key: _key, ...rest } = value; return rest }
const parsed = (raw: string | null): (object & Keyed) | null => {
  if (!raw) return null
  try { const v = JSON.parse(raw); return v && typeof v === 'object' && !Array.isArray(v) ? v : null } catch { return null }
}

/** the encrypted copy written: then, if the page's storage still holds what was saved, it goes from there */
function moved(name: PrefKey, value: string, saved: string, after: string | null, storage: Storage) {
  const v = vault()
  if (!v) return Promise.resolve(false)
  return v.set(name, value).then((ok) => {
    if (ok && storage.getItem(name) === saved) { if (after === null) storage.removeItem(name); else storage.setItem(name, after) }
    return ok
  }, () => false)
}

/** a setting's saved text, with its key put back from where it is kept (not one cleared here) */
export function readKeyed(name: PrefKey, storage: Storage = localStorage): string | null {
  const raw = storage.getItem(name), store = kept()
  const value = parsed(raw)
  if (!store || !value || (typeof value.key === 'string' && value.key) || cleared(storage).has(name)) return raw
  return store.keys[name] ? JSON.stringify({ ...value, key: store.keys[name] }) : raw
}

/** a setting saved: the whole of it in the page's storage until the key's encrypted copy is written, then without the
 *  key. Resolves once done: true when the key is kept encrypted */
export function writeKeyed(name: PrefKey, value: object & Keyed, storage: Storage = localStorage): Promise<boolean> {
  const store = kept(), key = typeof value.key === 'string' ? value.key : ''
  if (!store) { storage.setItem(name, JSON.stringify(value)); return Promise.resolve(false) }
  if (key) store.keys[name] = key
  else delete store.keys[name]
  store.lost.delete(name)
  if (!key) { storage.setItem(name, JSON.stringify(without(value))); return clear(name, storage).then(() => false) }
  // a new key: the page's copy is what counts until it is written, so a clear before it no longer applies
  mark(storage, name, false)
  const whole = JSON.stringify(value)
  storage.setItem(name, whole)
  return moved(name, key, whole, JSON.stringify(without(value)), storage)
}

/** a secret kept whole (the sign-in): from the page's storage, else from where it is kept (not one cleared here) */
export function readSecret(name: PrefKey, storage: Storage = localStorage): string {
  return storage.getItem(name) || (cleared(storage).has(name) ? '' : kept()?.keys[name] || '')
}
/** a secret saved whole: in the page's storage until its encrypted copy is written; '' removes it everywhere */
export function writeSecret(name: PrefKey, value: string, storage: Storage = localStorage): Promise<boolean> {
  const store = kept()
  if (!store) { if (value) storage.setItem(name, value); else storage.removeItem(name); return Promise.resolve(false) }
  if (value) store.keys[name] = value
  else delete store.keys[name]
  store.lost.delete(name)
  if (!value) { storage.removeItem(name); return clear(name, storage).then(() => false) }
  mark(storage, name, false)
  storage.setItem(name, value)
  return moved(name, value, value, null, storage)
}

/** as the app starts: a key cleared here whose delete wasn't confirmed is deleted again; then every key still in the
 *  page's storage moves to the encrypted store, in one pass, each removed from the page's storage once written */
export async function migrateKeys(storage: Storage = localStorage): Promise<PrefKey[]> {
  const store = kept()
  if (!store) return []
  const deleting: Promise<boolean>[] = []
  for (const name of cleared(storage)) {
    if (![...KEYED, ...WHOLE].includes(name as PrefKey)) { mark(storage, name, false); continue }
    delete store.keys[name]
    deleting.push(clear(name as PrefKey, storage))
  }
  await Promise.all(deleting)
  const moving: Promise<PrefKey | null>[] = []
  for (const name of KEYED) {
    const raw = storage.getItem(name), value = parsed(raw)
    if (!raw || !value || typeof value.key !== 'string' || !value.key) continue
    store.keys[name] = value.key; store.lost.delete(name)
    moving.push(moved(name, value.key, raw, JSON.stringify(without(value)), storage).then((ok) => (ok ? name : null)))
  }
  for (const name of WHOLE) {
    const raw = storage.getItem(name)
    if (!raw) continue
    store.keys[name] = raw; store.lost.delete(name)
    moving.push(moved(name, raw, raw, null, storage).then((ok) => (ok ? name : null)))
  }
  return (await Promise.all(moving)).filter((n): n is PrefKey => !!n)
}

/** a key kept here that the app could no longer decrypt: the setting asks for it again */
export const lostKey = (name: PrefKey) => !!kept()?.lost.has(name)
