import { useSyncExternalStore } from 'react'
import { tr } from './i18n'

export type AudioBus = 'microphone' | 'characters' | 'friends'
export type BusSetting = { volume: number; muted: boolean }
export type MixerSettings = Record<AudioBus, BusSetting>
const KEY = 'livliv-stage:mixer'
export const defaultMixer = (): MixerSettings => ({ microphone: { volume: 1, muted: false }, characters: { volume: 1, muted: false }, friends: { volume: 1, muted: false } })
export function readMixer(value: unknown): MixerSettings {
  const result = defaultMixer()
  if (!value || typeof value !== 'object') return result
  for (const key of Object.keys(result) as AudioBus[]) {
    const source = (value as Partial<MixerSettings>)[key]
    if (!source || typeof source !== 'object') continue
    if (typeof source.volume === 'number' && Number.isFinite(source.volume)) result[key].volume = Math.max(0, Math.min(key === 'microphone' ? 2 : 1, source.volume))
    if (typeof source.muted === 'boolean') result[key].muted = source.muted
  }
  return result
}
function restore() { try { return readMixer(JSON.parse(localStorage.getItem(KEY) || 'null')) } catch { return defaultMixer() } }
let state = { settings: restore(), error: '' }
const listeners = new Set<() => void>()
export const mixer = () => state
export const onMixer = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useMixer = () => useSyncExternalStore(onMixer, mixer)
export const busGain = (bus: AudioBus) => state.settings[bus].muted ? 0 : state.settings[bus].volume
export function setBus(bus: AudioBus, change: Partial<BusSetting>) {
  const settings = { ...state.settings, [bus]: { ...state.settings[bus], ...change } }
  state = { settings, error: '' }
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { state.error = tr('音量已调整，但无法保存设置') }
  listeners.forEach((listener) => listener())
}
