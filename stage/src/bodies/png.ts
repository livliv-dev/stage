export type { PngSlot } from '@livliv-dev/player/png'
export const PNG_SLOTS = [
  { id: 'closed', label: '闭嘴', need: true }, { id: 'open', label: '张嘴', need: true },
  { id: 'blink', label: '闭眼', need: false }, { id: 'blink-open', label: '闭眼张嘴', need: false },
] as const
