import { isCmdBody, type CmdBody } from './commands'

export type StageCommand = (CmdBody & { character?: string; weight?: number; on?: boolean; duration?: number }) | { do: 'scene'; id: string }
export type StageResult = { ok: true; character?: string; scene?: string; pending?: 'voice-input' | 'microphone' } | { ok: false; status: 400 | 404 | 409 | 503; error: string }
export type StageControlRequest = { id: string; expires: number; command: StageCommand | null }
export type StageApiState = { enabled: boolean; port: number | null; token: string; error: string | null }

export function readStageCommand(value: unknown): StageCommand | null {
  if (value && typeof value === 'object' && 'do' in value && value.do === 'scene') {
    const raw = value as Record<string, unknown>
    if (typeof raw.id !== 'string' || !raw.id.length || raw.id.length > 160 || raw.character !== undefined || raw.weight !== undefined || raw.on !== undefined || raw.duration !== undefined) return null
    return { do: 'scene', id: raw.id }
  }
  if (!isCmdBody(value)) return null
  const raw = value as unknown as Record<string, unknown>
  if (raw.character !== undefined && (typeof raw.character !== 'string' || !raw.character.length || raw.character.length > 160)) return null
  if (raw.weight !== undefined && (raw.do !== 'expr' || typeof raw.weight !== 'number' || !Number.isFinite(raw.weight) || raw.weight < 0 || raw.weight > 1)) return null
  if (raw.duration !== undefined && (raw.do !== 'expr' || raw.on === false || typeof raw.duration !== 'number' || !Number.isFinite(raw.duration) || raw.duration < .5 || raw.duration > 30)) return null
  if (raw.on !== undefined && ((raw.do !== 'expr' && raw.do !== 'mute' && raw.do !== 'ai-pause') || typeof raw.on !== 'boolean')) return null
  const command: CmdBody = value.do === 'expr' ? { do: 'expr', id: value.id, ...(value.on === undefined ? {} : { on: value.on }) } : value.do === 'act' ? { do: 'act', id: value.id } : { do: value.do }
  return { ...command, ...(raw.character === undefined ? {} : { character: raw.character as string }), ...(raw.weight === undefined ? {} : { weight: raw.weight as number }), ...(raw.on === undefined ? {} : { on: raw.on as boolean }), ...(raw.duration === undefined ? {} : { duration: raw.duration as number }) }
}

/** the editor's answer to a command, as the API passes it on (200, 202, 400, 404, 409 or 503); anything else is the
 *  editor failing */
export function readStageResult(value: unknown): StageResult {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const text = (v: unknown) => v === undefined || typeof v === 'string'
  if (r.ok === true && text(r.character) && text(r.scene) && (r.pending === undefined || r.pending === 'voice-input' || r.pending === 'microphone'))
    return { ok: true, ...(r.character === undefined ? {} : { character: r.character as string }), ...(r.scene === undefined ? {} : { scene: r.scene as string }), ...(r.pending === undefined ? {} : { pending: r.pending as 'voice-input' | 'microphone' }) }
  if (r.ok === false && (r.status === 400 || r.status === 404 || r.status === 409 || r.status === 503) && typeof r.error === 'string') return { ok: false, status: r.status, error: r.error }
  return { ok: false, status: 503, error: 'Stage is not responding' }
}
