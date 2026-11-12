import { tr } from './i18n'
import { useSyncExternalStore } from 'react'

export type InputSettings = { camera: string; microphone: string }
type Inputs = { settings: InputSettings; devices: MediaDeviceInfo[]; error: string }
const KEY = 'livliv-stage:inputs'
const defaults: InputSettings = { camera: '', microphone: '' }
function restore(): InputSettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || 'null') } }
  catch { return defaults }
}
let state: Inputs = { settings: restore(), devices: [], error: '' }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())
export const inputs = () => state.settings
export const onInputs = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export const useInputs = () => useSyncExternalStore(onInputs, () => state)

export function setInput(change: Partial<InputSettings>) {
  state = { ...state, settings: { ...state.settings, ...change } }
  try { localStorage.setItem(KEY, JSON.stringify(state.settings)) }
  catch { state = { ...state, error: tr("设备已切换，但无法保存；下次打开需要重新选择") } }
  emit()
}

export async function refreshDevices() {
  try { state = { ...state, devices: await navigator.mediaDevices.enumerateDevices(), error: '' } }
  catch (e) { state = { ...state, error: deviceError(tr("设备列表"), e as Error) } }
  emit()
}

export const microphoneConstraints = (): MediaTrackConstraints => ({
  echoCancellation: true, noiseSuppression: true,
  ...(inputs().microphone ? { deviceId: { exact: inputs().microphone } } : {}),
})

export function deviceError(what: string, e: Error) {
  if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') return tr("找不到{0}，请选择其他设备", what)
  if (e.name === 'NotAllowedError') return tr("{0}权限未开放，请在系统或浏览器设置里允许", what)
  if (e.name === 'NotReadableError') return tr("{0}无法打开，请检查是否被其他程序占用", what)
  return tr("{0}没有打开：{1}", what, e.message)
}

if (navigator.mediaDevices) navigator.mediaDevices.addEventListener('devicechange', () => void refreshDevices())
