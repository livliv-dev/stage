import { defaultParams, PARAM_RANGES, type Params } from '@livliv-dev/player'
import type { InputPose } from './inputTracking'
import { readAudienceEffect, type AudienceEffect } from './triggers'
import { tr } from './i18n'

export const PAD_AXES = ['angleX', 'angleY', 'angleZ', 'bodyX', 'bodyZ'] as const
export type PadAxis = (typeof PAD_AXES)[number]
export type PadAxisBinding = { axis: number; inverted: boolean }
export type GamepadSettings = { device: number; deadzone: number; sensitivity: number; axes: Record<PadAxis, PadAxisBinding>; buttons: Record<number, AudienceEffect> }
export const defaultGamepad = (): GamepadSettings => ({ device: -1, deadzone: .15, sensitivity: 1,
  axes: { angleX: { axis: 0, inverted: false }, angleY: { axis: 1, inverted: true }, angleZ: { axis: 2, inverted: false }, bodyX: { axis: -1, inverted: false }, bodyZ: { axis: -1, inverted: false } },
  buttons: { 0: { do: 'act', id: 'nod' }, 1: { do: 'act', id: 'shake' }, 2: { do: 'act', id: 'hop' }, 3: { do: 'act', id: 'tilt' } },
})
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
export function readGamepad(value: unknown): GamepadSettings {
  const d = defaultGamepad()
  if (!record(value)) return d
  if (Number.isInteger(value.device) && Number(value.device) >= -1 && Number(value.device) < 16) d.device = Number(value.device)
  if (typeof value.deadzone === 'number' && Number.isFinite(value.deadzone)) d.deadzone = Math.max(0, Math.min(.5, value.deadzone))
  if (typeof value.sensitivity === 'number' && Number.isFinite(value.sensitivity)) d.sensitivity = Math.max(.2, Math.min(2, value.sensitivity))
  if (record(value.axes)) for (const key of PAD_AXES) {
    const axis = value.axes[key]
    if (record(axis) && Number.isInteger(axis.axis) && Number(axis.axis) >= -1 && Number(axis.axis) < 16) d.axes[key] = { axis: Number(axis.axis), inverted: axis.inverted === true }
  }
  if (record(value.buttons)) {
    d.buttons = {}
    for (const [key, effect] of Object.entries(value.buttons)) {
      const button = Number(key), parsed = readAudienceEffect(effect)
      if (/^\d+$/.test(key) && Number.isInteger(button) && button >= 0 && button < 32 && parsed) d.buttons[button] = parsed
    }
  }
  return d
}
export function connectedGamepads(): Gamepad[] {
  if (typeof navigator.getGamepads !== 'function') throw new Error(tr('这个浏览器无法读取手柄'))
  return [...navigator.getGamepads()].filter((pad): pad is Gamepad => !!pad?.connected)
}
export function axisValue(value: number, deadzone: number) {
  const v = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0
  return Math.abs(v) <= deadzone ? 0 : Math.sign(v) * (Math.abs(v) - deadzone) / (1 - deadzone)
}

export function gamepadSource(settings: () => GamepadSettings, reaction: (effect: AudienceEffect) => void) {
  let previous: boolean[] = [], device = '', center: number[] = [], current: Gamepad | null = null, stopped = false
  let last: InputPose = { id: '', params: defaultParams(), channels: [], active: false }
  const generations = new Map<number, number>()
  const connection = (event: GamepadEvent) => { const index = event.gamepad.index; generations.set(index, (generations.get(index) ?? 0) + 1) }
  globalThis.addEventListener?.('gamepadconnected', connection)
  globalThis.addEventListener?.('gamepaddisconnected', connection)
  return {
    poll(): InputPose {
      if (stopped) return { ...last, active: false }
      const config = settings(), all = connectedGamepads(), pad = config.device < 0 ? all[0] : all.find((p) => p.index === config.device), params: Params = defaultParams()
      current = pad ?? null
      if (!pad) { previous = []; device = ''; center = []; return { ...last, active: false } }
      const id = pad.id + ':' + pad.index + ':' + (generations.get(pad.index) ?? 0), pressed = pad.buttons.map((b) => b.pressed || b.value > .5)
      if (id === device) {
        for (const [button, effect] of Object.entries(config.buttons)) if (pressed[+button] && !previous[+button]) reaction(effect)
      } else center = []
      device = id; previous = pressed
      const channels = PAD_AXES.filter((key) => config.axes[key].axis >= 0 && config.axes[key].axis < pad.axes.length)
      for (const key of channels) {
        const binding = config.axes[key], value = axisValue((pad.axes[binding.axis] ?? 0) - (center[binding.axis] ?? 0), config.deadzone) * (binding.inverted ? -1 : 1) * config.sensitivity
        const [lo, hi] = PARAM_RANGES[key]; params[key] = Math.max(lo, Math.min(hi, value * hi))
      }
      last = { id, params, channels, active: true }; return last
    },
    calibrate() { if (!current) return false; center = [...current.axes]; return true },
    stop() {
      stopped = true; current = null
      globalThis.removeEventListener?.('gamepadconnected', connection); globalThis.removeEventListener?.('gamepaddisconnected', connection)
    },
  }
}
