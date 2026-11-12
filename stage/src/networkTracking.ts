import { useSyncExternalStore } from 'react'
import { defaultParams } from '@livliv-dev/player'
import { defaultMotionSettings, type MotionEvent, type MotionFrame, type MotionSettings, type MotionState } from '../../desktop/src/trackingProtocol'
import { desktop } from './desktopBridge'
import type { InputPose } from './inputTracking'
import { tr } from './i18n'

let state: MotionState = { settings: defaultMotionSettings(), listening: false, addresses: [], source: null, packets: 0, discarded: 0, frame: null, error: null }
let latest: MotionFrame | null = null, received = 0
const listeners = new Set<() => void>()
export const motionSupported = () => !!desktop?.tracking && !!desktop.onMotion
export const useMotion = () => useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f) } }, () => state)
export const motionState = () => state
export const currentMotion = () => ({ frame: latest, active: state.listening && !!latest?.available && performance.now() - received < 500 })
const frame = (next: MotionFrame | null) => { latest = next; received = next ? performance.now() - Math.max(0, Date.now() - next.at) : 0 }
const hydrate = (next: MotionState) => { state = next; frame(next.frame); listeners.forEach((f) => f()) }

export function connectNetworkTracking() {
  if (!desktop?.tracking || !desktop.onMotion) return () => {}
  let alive = true
  const off = desktop.onMotion((event: MotionEvent) => { if (!alive) return; if (event.type === 'state') hydrate(event.state); else frame(event.frame) })
  void desktop.tracking.get().then((value) => { if (alive) hydrate(value) }, (error: unknown) => { if (alive) hydrate({ ...state, error: { code: 'IPC_ERROR', message: error instanceof Error ? error.message : String(error) } }) })
  return () => { alive = false; off(); frame(null) }
}
export async function configureMotion(settings: MotionSettings) {
  if (!desktop?.tracking) throw new Error(tr('此输入在桌面版连接'))
  hydrate(await desktop.tracking.set(settings))
}
export async function refreshMotion() { if (desktop?.tracking) hydrate(await desktop.tracking.get()) }
export function motionError(error: MotionState['error']) {
  if (!error) return ''
  if (error.code === 'EADDRINUSE') return tr('这个端口已在使用，请换一个或关闭占用它的应用')
  if (error.code === 'EACCES' || error.code === 'EPERM') return tr('系统未允许接收追踪数据')
  if (error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH') return tr('无法连接手机，请检查 IP 和 Wi-Fi')
  return error.message
}
export function networkSource() {
  let last: InputPose = { id: '', params: defaultParams(), channels: [], active: false }
  return (): InputPose => {
    if (!motionSupported()) throw new Error(tr('此输入在桌面版连接'))
    if (state.error) throw new Error(motionError(state.error))
    const { frame, active } = currentMotion()
    if (!frame || !state.listening) return { ...last, active: false }
    const channels = Object.keys(frame.params) as (keyof typeof frame.params)[]
    last = { id: frame.source, params: { ...defaultParams(), ...frame.params }, channels, active }; return last
  }
}
