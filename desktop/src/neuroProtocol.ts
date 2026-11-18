/** IPC data for the desktop adapter. The conversation core does not import this protocol. */
export type NeuroCharacter = { id: string; name: string; profileId?: string }
export type NeuroConfig = { enabled: false } | { enabled: true; port: number; character: NeuroCharacter }
export type NeuroState = {
  enabled: boolean
  port: number | null
  url: string | null
  character: NeuroCharacter | null
  connections: { id: string; game: string; actions: number; speaking: boolean }[]
  error: string | null
}
export type ExternalAction = { name: string; description: string; schema?: Record<string, unknown> }
export type ExternalDecision = {
  character: string
  source: string
  state?: string
  query: string
  actions: ExternalAction[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  silent: boolean
}
export type ExternalSelection = { name: string; data?: Record<string, unknown> }
export type NeuroMessage =
  | { kind: 'context'; id: string; connection: string; character: string; source: string; message: string; reply: 'never' | 'maybe' | 'always' }
  | { kind: 'dialogue'; id: string; connection: string; character: string; started: boolean }
  | { kind: 'disconnect'; connection: string }
  | { kind: 'decision'; id: string; expires: number; connection: string; request: ExternalDecision }
  | { kind: 'cancel'; id: string }
export type NeuroAnswer = { ok: true; action: ExternalSelection | null } | { ok: false; error: string }
export type NeuroSpeech = { character: string; isFinal: boolean; cancelled?: boolean }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max
export function readNeuroConfig(value: unknown): NeuroConfig | null {
  if (!object(value) || typeof value.enabled !== 'boolean') return null
  if (!value.enabled) return { enabled: false }
  if (!Number.isInteger(value.port) || (value.port as number) < 0 || (value.port as number) > 65535 || !object(value.character) || !text(value.character.id, 200) || !text(value.character.name, 200)) return null
  if (value.character.profileId !== undefined && !text(value.character.profileId, 200)) return null
  return { enabled: true, port: value.port as number, character: { id: value.character.id, name: value.character.name, ...(value.character.profileId ? { profileId: value.character.profileId as string } : {}) } }
}
function json(value: unknown, depth = 0): boolean {
  if (depth > 20) return false
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.length <= 1024 && value.every((entry) => json(entry, depth + 1))
  return object(value) && Object.keys(value).length <= 256 && Object.values(value).every((entry) => json(entry, depth + 1))
}
export function readNeuroAnswer(value: unknown): NeuroAnswer | null {
  if (!object(value)) return null
  if (value.ok === false && text(value.error, 500)) return { ok: false, error: value.error }
  if (value.ok !== true) return null
  if (value.action === null) return { ok: true, action: null }
  const action = value.action
  if (!object(action) || !text(action.name, 200) || (action.data !== undefined && (!object(action.data) || !json(action.data)))) return null
  if (JSON.stringify(action).length > 65536) return null
  return { ok: true, action: { name: action.name, ...(action.data !== undefined ? { data: action.data as Record<string, unknown> } : {}) } }
}
