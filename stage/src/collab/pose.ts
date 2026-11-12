import { PARAM_RANGES, defaultParams, type Fit, type Params, type PlaybackPose } from '@livliv-dev/player'
import { object } from './protocol'
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const FITS: unknown[] = ['frame', 'knee', 'whole']
/** a full-body character's crouch, dip or talking bob: a share, <= 0 */
const down = (value: unknown) => (finite(value) ? Math.max(-1, Math.min(0, value as number)) : undefined)
export function readPose(raw: unknown): PlaybackPose | null {
  if (!object(raw) || !object(raw.params) || !object(raw.move) || !object(raw.expr) || !object(raw.view)) return null
  const params = defaultParams()
  for (const key of Object.keys(params) as (keyof Params)[]) {
    const value = raw.params[key], [min, max] = PARAM_RANGES[key]
    if (!finite(value)) return null
    params[key] = Math.min(max, Math.max(min, value as number))
  }
  if (![raw.move.x, raw.move.y, raw.move.s, raw.view.x, raw.view.y, raw.view.zoom].every(finite) || typeof raw.view.head !== 'boolean') return null
  const expr: Record<string, number> = {}, keys = Object.keys(raw.expr)
  if (keys.length > 256) return null
  for (const key of keys) {
    if (key.length > 80 || ['__proto__', 'constructor', 'prototype'].includes(key) || !finite(raw.expr[key])) return null
    expr[key] = Math.max(0, Math.min(1, raw.expr[key] as number))
  }
  const pose: PlaybackPose = { params, expr, move: { x: Math.max(-2, Math.min(2, raw.move.x as number)), y: Math.max(-2, Math.min(2, raw.move.y as number)), s: Math.max(.1, Math.min(4, raw.move.s as number)) }, view: { x: Math.max(-2, Math.min(2, raw.view.x as number)), y: Math.max(-2, Math.min(2, raw.view.y as number)), zoom: Math.max(.1, Math.min(4, raw.view.zoom as number)), head: raw.view.head, ...(FITS.includes(raw.view.fit) ? { fit: raw.view.fit as Fit } : {}) } }
  // a full-body character's: its feet stay on the ground (a half-body one sends none)
  const crouch = down(raw.crouch), dip = down(raw.dip), talk = down(raw.talk)
  if (crouch !== undefined) Object.assign(pose, { crouch, dip: dip ?? 0, talk: talk ?? 0 })
  return pose
}
