import { useSyncExternalStore } from 'react'
export type Quality = 'eco' | 'standard' | 'sharp'
export const QUALITIES: { id: Quality; label: string; ratio: number }[] = [{ id: 'eco', label: '省电', ratio: 1 }, { id: 'standard', label: '标准', ratio: 1.5 }, { id: 'sharp', label: '清晰', ratio: 2 }]
const KEY = 'livliv-stage:quality'
const valid = (v: unknown): v is Quality => QUALITIES.some((q) => q.id === v)
function read(): Quality { try { const v = localStorage.getItem(KEY); return valid(v) ? v : 'standard' } catch { return 'standard' } }
let quality = read()
const listeners = new Set<() => void>()
export const onQuality = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const getQuality = () => quality
export const pixelRatio = () => QUALITIES.find((q) => q.id === quality)!.ratio
export const useQuality = () => useSyncExternalStore(onQuality, getQuality)
export function setQuality(value: Quality) {
  if (!valid(value) || quality === value) return
  try { localStorage.setItem(KEY, value) } catch { /* Session-only preference when persistence is unavailable. */ }
  quality = value; listeners.forEach((listener) => listener())
}
if (typeof window !== 'undefined') addEventListener('storage', (event) => { if (event.key === KEY && valid(event.newValue)) { quality = event.newValue; listeners.forEach((listener) => listener()) } })
