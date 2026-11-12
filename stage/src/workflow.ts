import type { CharacterItem } from './scene'

export type Control = 'human' | 'ai' | 'silent'
export const CONTROLS = [
  { id: 'human' as const, label: '我来演', hint: '摄像头跟随你，使用你自己的声音' },
  { id: 'ai' as const, label: 'AI 来演', hint: '按人设自动说话、回应观众' },
  { id: 'silent' as const, label: '只展示', hint: '待机展示，不参与对话' },
]
export function controlOf(c: CharacterItem): Control {
  return c.lines === 'ai' ? 'ai' : c.lines === 'me' ? 'human' : 'silent'
}
export function controlSettings(control: Control): Pick<CharacterItem, 'lines' | 'driver' | 'readAloud'> {
  if (control === 'human') return { lines: 'me', driver: 'face', readAloud: false }
  return { lines: control === 'ai' ? 'ai' : 'none', driver: 'auto', readAloud: true }
}
