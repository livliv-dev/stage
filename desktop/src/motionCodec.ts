import { MOTION_LIMITS, type MotionChannel, type MotionParams } from './trackingProtocol'

export class MotionPacketError extends Error {}
type OscArg = string | number | boolean | null
export type OscMessage = { address: string; types: string; args: OscArg[] }
const invalid = (): never => { throw new MotionPacketError('Invalid tracking packet') }
const text = new TextDecoder('utf-8', { fatal: true })
export function decodeOsc(packet: Uint8Array): OscMessage[] {
  if (!packet.length || packet.length > 16384 || packet.length % 4) invalid()
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength), result: OscMessage[] = []
  let count = 0
  const read = (start: number, end: number, depth: number) => {
    if (depth > 8 || ++count > 512) invalid()
    let p = start
    const string = () => {
      const from = p
      while (p < end && packet[p] !== 0 && p - from <= 1024) p++
      if (p >= end || p - from > 1024) invalid()
      let value: string
      try { value = text.decode(packet.subarray(from, p)) } catch { return invalid() }
      const next = (p + 4) & ~3
      if (next > end) invalid()
      while (p < next) if (packet[p++] !== 0) invalid()
      return value
    }
    const address = string()
    if (address === '#bundle') {
      if (p + 8 > end) invalid(); p += 8
      while (p < end) { if (p + 4 > end) invalid(); const n = view.getInt32(p); p += 4; if (n <= 0 || n % 4 || p + n > end) invalid(); read(p, p + n, depth + 1); p += n }
      return
    }
    if (!address.startsWith('/')) invalid()
    const tag = string()
    if (!tag.startsWith(',') || tag.length > 65) invalid()
    const args: OscArg[] = []
    for (const type of tag.slice(1)) {
      if (type === 's') args.push(string())
      else if (type === 'i' || type === 'f' || type === 'd') {
        const n = type === 'd' ? 8 : 4
        if (p + n > end) invalid()
        const value = type === 'i' ? view.getInt32(p) : type === 'f' ? view.getFloat32(p) : view.getFloat64(p)
        if (!Number.isFinite(value)) invalid(); args.push(value); p += n
      } else if (type === 'h' || type === 't') { if (p + 8 > end) invalid(); p += 8; args.push(null) }
      else if (type === 'b') { if (p + 4 > end) invalid(); const size = view.getInt32(p); p += 4; if (size < 0 || p + size > end) invalid(); p = (p + size + 3) & ~3; if (p > end) invalid(); args.push(null) }
      else if (type === 'T' || type === 'F' || type === 'N' || type === 'I') args.push(type === 'T' ? true : type === 'F' ? false : null)
      else return // An unknown argument type discards this message, not the other bundle elements.
    }
    if (p !== end) invalid()
    result.push({ address, types: tag.slice(1), args })
  }
  read(0, packet.length, 0)
  return result
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const blendName = (s: string) => s.replace(/_l$/i, 'Left').replace(/_r$/i, 'Right').replace(/[^a-z0-9]/gi, '').toLowerCase()
const BLENDS = new Set(['blink', 'blinkleft', 'blinkright', 'eyeblinkleft', 'eyeblinkright', 'jawopen', 'mouthopen', 'a', 'i', 'u', 'e', 'o', 'aa', 'ih', 'ou', 'ee', 'oh', 'mouthfunnel', 'mouthpucker', 'joy', 'happy', 'smile', 'mouthsmileleft', 'mouthsmileright', 'eyelookinleft', 'eyelookinright', 'eyelookoutleft', 'eyelookoutright', 'eyelookupleft', 'eyelookupright', 'eyelookdownleft', 'eyelookdownright', 'browinnerup', 'browouterupleft', 'browouterupright', 'browdownleft', 'browdownright'])
type Quaternion = [number, number, number, number]
const multiply = (a: Quaternion, b: Quaternion): Quaternion => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]
const inverse = (q: Quaternion): Quaternion => [-q[0], -q[1], -q[2], q[3]]
const identity: Quaternion = [0, 0, 0, 1]
function angles([x, y, z, w]: Quaternion) {
  // XYZ Euler from a unit Unity quaternion; VMC supplies local bone rotation.
  const r11 = 1 - 2 * (y * y + z * z), r12 = 2 * (x * y - z * w), r13 = 2 * (x * z + y * w), r23 = 2 * (y * z - x * w), r33 = 1 - 2 * (x * x + y * y)
  const yaw = Math.asin(clamp(r13, -1, 1))
  const pitch = Math.abs(r13) < .999999 ? Math.atan2(-r23, r33) : Math.atan2(2 * (x * y + z * w), 1 - 2 * (x * x + z * z))
  const roll = Math.abs(r13) < .999999 ? Math.atan2(-r12, r11) : 0
  return { yaw: yaw * 180 / Math.PI, pitch: pitch * 180 / Math.PI, roll: roll * 180 / Math.PI }
}
const wrap = (n: number) => ((n + 180) % 360 + 360) % 360 - 180

/** Partial VMC receiver: head/neck/torso orientation and standard face channels, no skeleton retargeting. */
export class MotionDecoder {
  private blends = new Map<string, number>()
  private bones = new Map<string, Quaternion>()
  private rest = new Map<string, Quaternion>()
  private phoneZero: number[] | null = null
  private params: MotionParams = {}
  available = true
  get pose() { return { ...this.params } }
  private blend(key: string, value: number) {
    key = blendName(key)
    if (!BLENDS.has(key)) return false
    this.blends.set(key, clamp(value, 0, 1)); return true
  }
  private face() {
    const b = this.blends, has = (...keys: string[]) => keys.some((k) => b.has(k)), max = (...keys: string[]) => Math.max(0, ...keys.map((k) => b.get(k) ?? 0))
    const put = (key: MotionChannel, value: number) => { const [lo, hi] = MOTION_LIMITS[key]; this.params[key] = clamp(value, lo, hi) }
    if (has('blink', 'blinkleft', 'eyeblinkleft')) put('eyeLOpen', 1 - max('blink', 'blinkleft', 'eyeblinkleft'))
    if (has('blink', 'blinkright', 'eyeblinkright')) put('eyeROpen', 1 - max('blink', 'blinkright', 'eyeblinkright'))
    if (has('jawopen', 'mouthopen', 'a', 'i', 'u', 'e', 'o', 'aa', 'ih', 'ou', 'ee', 'oh')) {
      const wide = max('i', 'e', 'ih', 'ee'), round = max('u', 'o', 'ou', 'oh', 'mouthfunnel', 'mouthpucker')
      put('mouthOpen', max('jawopen', 'mouthopen', 'a', 'aa', 'i', 'e', 'ih', 'ee', 'u', 'o', 'ou', 'oh'))
      put('vowel', (wide - round) / Math.max(.001, wide, round, max('jawopen', 'a', 'aa')))
    }
    if (has('joy', 'happy', 'smile', 'mouthsmileleft', 'mouthsmileright')) put('smile', max('joy', 'happy', 'smile', 'mouthsmileleft', 'mouthsmileright'))
    if (has('eyelookinleft', 'eyelookinright', 'eyelookoutleft', 'eyelookoutright')) put('eyeBallX', (max('eyelookinleft') + max('eyelookoutright') - max('eyelookoutleft') - max('eyelookinright')) / 2 * 2.2)
    if (has('eyelookupleft', 'eyelookupright', 'eyelookdownleft', 'eyelookdownright')) put('eyeBallY', (max('eyelookupleft') + max('eyelookupright') - max('eyelookdownleft') - max('eyelookdownright')) / 2 * 2.2)
    for (const side of ['left', 'right']) if (has('browinnerup', 'browouterup' + side, 'browdown' + side)) put(side === 'left' ? 'browLY' : 'browRY', max('browinnerup') * .6 + max('browouterup' + side) * .4 - max('browdown' + side) * .8)
  }
  private bone(name: string, raw: Quaternion) {
    if (!['Root', 'Hips', 'Head', 'Neck', 'Spine', 'Chest', 'UpperChest'].includes(name)) return false
    const length = Math.hypot(...raw)
    if (!Number.isFinite(length) || length < .1 || length > 10) return false
    const q = raw.map((v) => v / length) as Quaternion
    if (!this.rest.has(name)) this.rest.set(name, q)
    this.bones.set(name, q)
    const chain = (names: string[], values: Map<string, Quaternion>) => names.reduce((q, key) => multiply(q, values.get(key) ?? identity), identity)
    const torso = ['Root', 'Hips', 'Spine', 'Chest', 'UpperChest'], bodyRest = chain(torso, this.rest)
    // Original bone rest rotations are part of the chain; deltas cannot be multiplied independently.
    const headDelta = multiply(chain(['Neck', 'Head'], this.bones), inverse(chain(['Neck', 'Head'], this.rest)))
    const head = angles(multiply(multiply(bodyRest, headDelta), inverse(bodyRest)))
    if (this.bones.has('Head') || this.bones.has('Neck')) { this.params.angleX = head.yaw; this.params.angleY = -head.pitch; this.params.angleZ = -head.roll }
    const body = angles(multiply(chain(torso, this.bones), inverse(bodyRest)))
    if (torso.some((key) => this.bones.has(key))) { this.params.bodyX = body.yaw; this.params.bodyZ = -body.roll }
    return true
  }
  osc(packet: Uint8Array) {
    let changed = false, faceChanged = false
    const explicit: MotionParams = {}
    for (const m of decodeOsc(packet)) {
      const a = m.args
      if (m.address === '/VMC/Ext/Blend/Val' && m.types.startsWith('sf') && typeof a[0] === 'string' && typeof a[1] === 'number') { const applied = this.blend(a[0], a[1]); changed = applied || changed; faceChanged = applied || faceChanged }
      else if (m.address === '/VMC/Ext/Bone/Pos' && m.types.startsWith('sfffffff') && typeof a[0] === 'string') changed = this.bone(a[0], a.slice(4, 8) as Quaternion) || changed
      else if (m.address === '/VMC/Ext/Root/Pos' && m.types.startsWith('sfffffff')) changed = this.bone('Root', a.slice(4, 8) as Quaternion) || changed
      else if (m.address === '/VMC/Ext/OK' && m.types.startsWith('i') && (a[0] === 0 || a[0] === 1)) { this.available = a[0] === 1 && (m.types.length < 4 || m.types[3] !== 'i' || a[3] === 1); changed = true }
      else {
        const key = m.address.startsWith('/livliv/face/') ? m.address.slice('/livliv/face/'.length) : m.address === '/livliv/param' && typeof a[0] === 'string' ? a[0] : ''
        const value = m.address === '/livliv/param' && m.types.startsWith('sf') ? a[1] : m.types.startsWith('f') ? a[0] : undefined
        if (Object.hasOwn(MOTION_LIMITS, key) && typeof value === 'number') { const [lo, hi] = MOTION_LIMITS[key as MotionChannel]; explicit[key as MotionChannel] = clamp(value, lo, hi); changed = true }
      }
    }
    if (faceChanged) this.face()
    Object.assign(this.params, explicit); return changed
  }
  ifacial(packet: Uint8Array) {
    if (!packet.length || packet.length > 16384) invalid()
    let value: string
    try { value = text.decode(packet) } catch { return invalid() }
    const parts = value.split('|'); if (parts.length > 128) invalid()
    let headValues: number[] | null = null
    const blends: [string, number][] = []
    for (const part of parts) {
      const head = part.match(/^=?head#(.*)$/i)
      if (head) {
        const fields = head[1].split(','), values = fields.map(Number)
        if (fields.length !== 6 || fields.some((v) => !v.trim()) || values.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e6)) invalid()
        if (headValues) invalid()
        headValues = values
      } else {
        const pair = part.match(/^([a-zA-Z_]+)(?:&|-)(.*)$/)
        if (pair && BLENDS.has(blendName(pair[1]))) {
          const raw = pair[2].trim(), n = Number(raw)
          if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) || !Number.isFinite(n)) invalid()
          blends.push([pair[1], n / 100])
        }
      }
    }
    // Validate the complete datagram before replacing any previous tracking values.
    let changed = false
    for (const [name, value] of blends) changed = this.blend(name, value) || changed
    if (headValues) {
      this.phoneZero ??= headValues.slice(0, 3)
      this.params.angleX = wrap(headValues[1] - this.phoneZero[1]); this.params.angleY = -wrap(headValues[0] - this.phoneZero[0]); this.params.angleZ = -wrap(headValues[2] - this.phoneZero[2]); changed = true
    }
    if (changed) this.face()
    return changed
  }
}
