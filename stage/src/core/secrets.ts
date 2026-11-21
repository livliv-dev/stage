// API keys in the desktop app: kept encrypted by the system, through the app (desktop/src/secrets.ts), never in this
// page's storage. A setting with a key in it (the text model, the speech API, the realtime call) is saved here without
// the key, and the key on its own; the first time the app runs with keys saved the old way, each moves over and its
// plain copy is gone. In a browser, or a desktop without system encryption, keys stay in the page's storage as before.
import type { PrefKey } from './prefs'

type Vault = { all(): Record<string, string> | null; set(name: string, value: string): boolean }
let given: Vault | null | undefined
const vault = (): Vault | null => (given !== undefined ? given : typeof window === 'undefined' ? null : window.livlivDesktop?.secrets ?? null)
/** the keys kept, read once; null: they are kept in the page's storage */
let keys: Record<string, string> | null | undefined
const kept = () => {
  if (keys === undefined) { try { keys = vault()?.all() ?? null } catch { keys = null } }
  return keys
}
/** another vault (the tests' stand-in), read afresh */
export function setKeyVault(v: Vault | null | undefined) { given = v; keys = undefined }

type Keyed = { key?: unknown }
const without = (value: Keyed) => { const { key: _key, ...rest } = value; return rest }

/** a setting's saved text, with its key put back from where it is kept. A key still saved here is moved there (once) */
export function readKeyed(name: PrefKey, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): string | null {
  const raw = storage.getItem(name), store = kept(), v = vault()
  if (!raw || !store || !v) return raw
  let value: Keyed
  try { value = JSON.parse(raw) } catch { return raw }
  if (!value || typeof value !== 'object') return raw
  if (typeof value.key === 'string' && value.key) {
    // saved the old way: the key moves over, and only if it did is the plain copy removed
    if (v.set(name, value.key)) { store[name] = value.key; storage.setItem(name, JSON.stringify(without(value))) }
    return raw
  }
  return store[name] ? JSON.stringify({ ...value, key: store[name] }) : raw
}

/** a setting saved: here without its key, the key where keys are kept (an empty key removed there) */
export function writeKeyed(name: PrefKey, value: object & Keyed, storage: Pick<Storage, 'setItem'> = localStorage) {
  const store = kept(), v = vault(), key = typeof value.key === 'string' ? value.key : ''
  if (store && v?.set(name, key)) {
    if (key) store[name] = key
    else delete store[name]
    storage.setItem(name, JSON.stringify(without(value)))
    return
  }
  storage.setItem(name, JSON.stringify(value))
}
