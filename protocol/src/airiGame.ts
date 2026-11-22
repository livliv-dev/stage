import type { ExternalAction } from './neuro'

export type AiriGameConfig =
  | { game: 'minecraft'; vision: boolean }
  | { game: 'factorio'; eventsPort: number; rconPort: number }

export type AiriGameFrame = { mimeType: 'image/png' | 'image/jpeg'; data: string }
export type AiriGameConnection = { id: string; game: AiriGameConfig['game']; actions: ExternalAction[] }
export type AiriGameSnapshot = { state: string; frame?: AiriGameFrame }
// args applies to Stage's UI message keys. Upstream chat and logs are literal text.
export type AiriGameMessage = { text: string; args?: (string | number)[]; detail?: string }
export type AiriGameEvent = {
  connection: string
  status: 'context' | 'chat' | 'done' | 'failed' | 'unknown' | 'disconnected'
} & AiriGameMessage

export function validGamePort(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535
}

export function readAiriGameConfig(value: unknown): AiriGameConfig | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (input.game === 'minecraft' && typeof input.vision === 'boolean') return { game: input.game, vision: input.vision }
  if (input.game === 'factorio' && validGamePort(input.eventsPort) && validGamePort(input.rconPort)) {
    return { game: input.game, eventsPort: input.eventsPort, rconPort: input.rconPort }
  }
  return null
}
