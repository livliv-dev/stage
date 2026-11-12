import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultParams, type Driver, type Frame, type Host } from '@livliv-dev/player'
import { axisValue, defaultGamepad, gamepadSource, readGamepad } from '../src/gamepad'
import { startInputTracking } from '../src/inputTracking'

test('gamepad bounds, proportional deadzone and button edges survive held reconnects', (t) => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  t.after(() => { if (old) Object.defineProperty(globalThis, 'navigator', old); else Reflect.deleteProperty(globalThis, 'navigator') })
  const config = defaultGamepad(), pad = { id: 'Test', index: 0, connected: true, axes: [.575, -.575, 0, 0], buttons: [{ pressed: true, value: 1 }] }
  let pads: unknown[] = [pad]; Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads } })
  const effects: string[] = [], source = gamepadSource(() => config, (effect) => effects.push(effect.id)), poll = source.poll
  const first = poll(); assert.ok(Math.abs(first.params.angleX - 15) < 1e-10); assert.ok(Math.abs(first.params.angleY - 15) < 1e-10); assert.deepEqual(effects, [])
  poll(); assert.deepEqual(effects, [])
  pad.buttons[0] = { pressed: false, value: 0 }; poll(); pad.buttons[0] = { pressed: true, value: 1 }; poll(); poll(); assert.deepEqual(effects, ['nod'])
  pads = []; assert.equal(poll().active, false); pads = [pad]; poll(); assert.deepEqual(effects, ['nod'])
  pad.axes[0] = .5; poll(); assert.equal(source.calibrate(), true)
  for (const change of [{ sensitivity: 2 }, { deadzone: .3 }, { axes: { ...config.axes, angleX: { axis: 0, inverted: true } } }]) {
    Object.assign(config, change); assert.ok(Math.abs(poll().params.angleX) < 1e-12, 'raw-axis centre survives live mapping changes')
  }
  config.device = 1; assert.equal(poll().active, false); source.stop()
  assert.equal(axisValue(.1, .15), 0); assert.equal(axisValue(NaN, .15), 0)
  const read = readGamepad({ device: 50, deadzone: 5, sensitivity: -2, axes: { angleX: { axis: 99 } }, buttons: { 0: { do: 'act', id: 'away' }, 32: { do: 'act', id: 'nod' } } })
  assert.equal(read.device, -1); assert.equal(read.deadzone, .5); assert.equal(read.sensitivity, .2); assert.equal(read.axes.angleX.axis, 0); assert.deepEqual(read.buttons, {})
})
test('normalized tracking uses public profiles, calibration and idle recovery without owning a camera', () => {
  let driver: Driver | null = null, removed = false, connected = true, failure = false
  const host: Host = { use(value) { driver = value; return () => { removed = true } }, blink() {} }, statuses: string[] = []
  const params = { ...defaultParams(), angleX: 15 }
  const input = startInputTracking(host, () => { if (failure) throw new Error('Input unavailable'); return { id: 'device', params, channels: ['angleX'], active: connected } }, { profile: { angleX: { input: [-30, 30], output: [30, -30], curve: 1, smoothing: 0 } }, smoothing: () => .2, status: (on, error) => statuses.push(error?.message ?? String(on)) })
  const frame = () => { const f = { params: { ...defaultParams(), eyeLOpen: .1, mouthOpen: .6 }, dt: 1 / 60, tracked: false } as Frame; driver!.update(f, host); return f }
  for (let i = 0; i < 120; i++) frame()
  assert.ok(Math.abs(frame().params.angleX + 15) < 1e-6); assert.equal(input.active, true); assert.ok(Math.abs(input.sample!.input.angleX - 15) < 1e-9); assert.equal(frame().params.eyeLOpen, .1); assert.equal(frame().params.mouthOpen, .6)
  assert.equal(input.calibrate(), true); for (let i = 0; i < 120; i++) frame(); assert.ok(Math.abs(frame().params.angleX) < 1e-6)
  connected = false; for (let i = 0; i < 30; i++) frame(); assert.equal(input.active, false); assert.equal(frame().tracked, false); assert.equal(input.calibrate(), false)
  failure = true; frame(); assert.equal(statuses.at(-1), 'Input unavailable')
  input.stop(); assert.equal(removed, true); assert.equal(input.sample, null)
})
test('real source loss fades out and a reconnect event suppresses held buttons between polls', (t) => {
  const names = ['navigator', 'addEventListener', 'removeEventListener'], old = names.map((n) => [n, Object.getOwnPropertyDescriptor(globalThis, n)] as const)
  t.after(() => { for (const [n, d] of old) { if (d) Object.defineProperty(globalThis, n, d); else Reflect.deleteProperty(globalThis, n) } })
  const events = new EventTarget()
  Object.defineProperty(globalThis, 'addEventListener', { configurable: true, value: events.addEventListener.bind(events) })
  Object.defineProperty(globalThis, 'removeEventListener', { configurable: true, value: events.removeEventListener.bind(events) })
  const pad = { id: 'Test', index: 0, connected: true, axes: [.575, 0, 0], buttons: [{ pressed: false, value: 0 }] }
  let pads = [pad], count = 0, driver: Driver | null = null
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads } })
  const source = gamepadSource(defaultGamepad, () => { count++ }), host: Host = { blink() {}, use(d) { driver = d; return () => {} } }
  const tracking = startInputTracking(host, source.poll, { profile: {}, smoothing: () => 0, status() {}, calibrate: source.calibrate })
  const frame = () => { const f = { params: defaultParams(), dt: 1 / 60, tracked: false } as Frame; driver!.update(f, host); return f.params.angleX }
  for (let i = 0; i < 30; i++) frame(); assert.ok(Math.abs(frame() - 15) < 1e-6)
  pads = []; const firstLost = frame(); assert.ok(firstLost > 14 && firstLost < 15)
  for (let i = 0; i < 30; i++) frame(); assert.equal(frame(), 0)
  pads = [pad]; frame()
  const event = new Event('gamepadconnected'); Object.defineProperty(event, 'gamepad', { value: pad })
  pad.buttons[0] = { pressed: true, value: 1 }; events.dispatchEvent(event); frame()
  assert.equal(count, 0, 'a held button on a new connection is not a new press')
  pad.buttons[0] = { pressed: false, value: 0 }; frame(); pad.buttons[0] = { pressed: true, value: 1 }; frame(); assert.equal(count, 1)
  tracking.stop(); source.stop()
})

test('angular network samples calibrate before model limits and wrap across the half turn', () => {
  let driver: Driver | null = null, angle = 170
  const host: Host = { blink() {}, use(d) { driver = d; return () => {} } }
  const input = startInputTracking(host, () => ({ id: 'network', params: { ...defaultParams(), angleX: angle }, channels: ['angleX'], active: true }), { profile: {}, smoothing: () => 0, status() {} })
  const frame = () => { const f = { params: defaultParams(), dt: 1 / 60, tracked: false } as Frame; driver!.update(f, host); return f.params.angleX }
  for (let n = 0; n < 60; n++) frame(); assert.ok(frame() <= 30)
  assert.equal(input.calibrate(), true); angle = -175
  for (let n = 0; n < 60; n++) frame(); assert.ok(Math.abs(frame() - 15) < 1e-6)
  input.stop()
})
