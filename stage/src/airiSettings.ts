import { useSyncExternalStore } from 'react'

export type AiriSettings = {
  enabled: boolean
  url: string
  token: string
  forwardInput: boolean
  characterId: string
}

export const AIRI_DEFAULT: AiriSettings = {
  enabled: false,
  url: 'ws://127.0.0.1:6121/ws',
  token: '',
  forwardInput: false,
  characterId: '',
}

const KEY = 'livliv-stage:airi'
const listeners = new Set<() => void>()

function clean(value: unknown): AiriSettings {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<AiriSettings>
  return {
    enabled: raw.enabled === true,
    url: typeof raw.url === 'string' && raw.url.length <= 300 ? raw.url : AIRI_DEFAULT.url,
    token: typeof raw.token === 'string' ? raw.token.slice(0, 500) : '',
    forwardInput: raw.forwardInput === true,
    characterId: typeof raw.characterId === 'string' && raw.characterId.length <= 160 ? raw.characterId : '',
  }
}

function read(): AiriSettings {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')) } catch { return { ...AIRI_DEFAULT } }
}

let settings = typeof localStorage === 'undefined' ? { ...AIRI_DEFAULT } : read()

export const loadAiri = () => settings
export function saveAiri(patch: Partial<AiriSettings>) {
  settings = clean({ ...settings, ...patch })
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* private mode */ }
  listeners.forEach((listener) => listener())
}
export const subscribeAiri = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useAiri = () => useSyncExternalStore(subscribeAiri, loadAiri)
