import { parameterRule, readTrackingProfile, type TrackingProfile } from '@livliv-dev/player/tracking'
import { readTuning } from './tuning'
import type { CharacterItem } from './scene'

export type TrackingSettings = { profile: TrackingProfile; smooth: number; follow: number; fps: 'auto' | 15 | 30 }
export type TrackingPreset = { id: string; name: string; settings: TrackingSettings }
export const trackingDefaults = (): TrackingSettings => ({ profile: {}, smooth: .5, follow: 0, fps: 'auto' })
const sensitive = (): TrackingSettings => ({ ...trackingDefaults(), smooth: .25, profile: {
  angleX: { ...parameterRule('angleX'), input: [-18, 18] }, angleY: { ...parameterRule('angleY'), input: [-18, 18] },
  mouthOpen: { ...parameterRule('mouthOpen'), input: [0, .7] },
} })
const steady = (): TrackingSettings => ({ ...trackingDefaults(), smooth: .7, profile: {
  angleX: { ...parameterRule('angleX'), smoothing: .3 }, angleY: { ...parameterRule('angleY'), smoothing: .3 }, angleZ: { ...parameterRule('angleZ'), smoothing: .3 },
} })
export const BUILTIN_PROFILES = [
  { id: 'default', name: '默认', settings: trackingDefaults }, { id: 'sensitive', name: '更灵敏', settings: sensitive }, { id: 'steady', name: '更稳定', settings: steady },
]
export function readTrackingSettings(value: unknown): TrackingSettings {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const tuning = readTuning({ faceFollow: v.follow as number, faceFps: v.fps as TrackingSettings['fps'] })
  return { profile: readTrackingProfile(v.profile), smooth: typeof v.smooth === 'number' && Number.isFinite(v.smooth) ? Math.max(0, Math.min(1, v.smooth)) : .5, follow: tuning.faceFollow, fps: tuning.faceFps }
}
export const trackingSettingsOf = (c: CharacterItem): TrackingSettings => readTrackingSettings({ profile: c.tuning.tracking, smooth: c.smooth, follow: c.tuning.faceFollow, fps: c.tuning.faceFps })
export const trackingPatch = (c: CharacterItem, settings: TrackingSettings): Partial<CharacterItem> => ({ tuning: { ...c.tuning, tracking: readTrackingProfile(settings.profile) } })
