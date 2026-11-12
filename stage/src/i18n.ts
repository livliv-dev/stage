import { useSyncExternalStore } from 'react'
import { messages } from './locales/messages'

export const LANGUAGES = [
  { id: 'zh-Hans', label: '简体中文' }, { id: 'zh-Hant', label: '繁體中文' },
  { id: 'en', label: 'English' }, { id: 'ja', label: '日本語' },
] as const
export type Locale = (typeof LANGUAGES)[number]['id']
const KEY = 'livliv-stage:locale'
export function detectLocale(language: string): Locale {
  if (/^zh(?:-|$)/i.test(language)) return /Hant|TW|HK|MO/i.test(language) ? 'zh-Hant' : 'zh-Hans'
  return /^ja(?:-|$)/i.test(language) ? 'ja' : 'en'
}
function savedLocale(): Locale {
  try { const value = localStorage.getItem(KEY); if (LANGUAGES.some((language) => language.id === value)) return value as Locale } catch { /* Browser storage may be unavailable. */ }
  return typeof window === 'undefined' ? 'zh-Hans' : detectLocale(navigator.language)
}
let locale = savedLocale()
const listeners = new Set<() => void>()
export const getLocale = () => locale
export const subscribeLocale = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useLocale = () => useSyncExternalStore(subscribeLocale, getLocale)
function changed(next: Locale) {
  locale = next
  if (typeof document !== 'undefined') document.documentElement.lang = next
  listeners.forEach((listener) => listener())
}
export function setLocale(next: Locale) {
  if (!LANGUAGES.some((language) => language.id === next) || next === locale) return
  try { localStorage.setItem(KEY, next) } catch { /* The language still applies to this window. */ }
  changed(next)
}
/** Source messages are keys; model names, user text and provider errors pass through unchanged. */
export function tr(message: string, ...values: (string | number)[]) {
  const translated = messages[message]?.[locale] ?? message
  return translated.replace(/\{(\d+)\}/g, (token, index: string) => values[Number(index)] === undefined ? token : String(values[Number(index)]))
}
if (typeof window !== 'undefined') {
  document.documentElement.lang = locale
  addEventListener('storage', (event) => { if (event.key === KEY && LANGUAGES.some((language) => language.id === event.newValue)) changed(event.newValue as Locale) })
}
