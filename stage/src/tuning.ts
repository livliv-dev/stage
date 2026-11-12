import { readTrackingProfile, type TrackingProfile } from '@livliv-dev/player/tracking'
import { defaultGamepad, readGamepad, type GamepadSettings } from './gamepad'
import type { View } from '@livliv-dev/player'

/** Stage's persisted choices for public Player and tracking APIs. */
export type CharacterTuning = {
  gamepad: GamepadSettings; pixelated: boolean; idle: boolean; bounce: boolean; volume: number; faceFollow: number; faceFps: 'auto' | 15 | 30
  tracking: TrackingProfile; expressionStrength: number; view: View
}
export const defaultTuning = (): CharacterTuning => ({ gamepad: defaultGamepad(), pixelated: false, idle: true, bounce: false, volume: 1, faceFollow: 0, faceFps: 'auto', tracking: {}, expressionStrength: 1, view: { x: 0, y: 0, zoom: 1, head: false, fit: 'frame' } })
const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
export function readTuning(value?: Partial<CharacterTuning> | null): CharacterTuning {
  const source = value ?? {}, defaults = defaultTuning(), view = source.view
  return {
    gamepad: readGamepad(source.gamepad),
    pixelated: source.pixelated === true,
    idle: typeof source.idle === 'boolean' ? source.idle : defaults.idle,
    bounce: typeof source.bounce === 'boolean' ? source.bounce : defaults.bounce,
    volume: number(source.volume, 1, 0, 1), faceFollow: number(source.faceFollow, 0, 0, 2),
    faceFps: source.faceFps === 15 || source.faceFps === 30 ? source.faceFps : 'auto',
    tracking: readTrackingProfile(source.tracking), expressionStrength: number(source.expressionStrength, 1, 0, 1),
    // fit: a full-body character's shot (its head and chest, down to the knees, the whole figure)
    view: { x: number(view?.x, 0, -1, 1), y: number(view?.y, 0, -1, 1), zoom: number(view?.zoom, 1, .5, 3), head: view?.head === true,
      fit: view?.fit === 'knee' || view?.fit === 'whole' ? view.fit : 'frame' },
  }
}
