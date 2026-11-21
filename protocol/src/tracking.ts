export const MOTION_LIMITS = {
  angleX: [-180, 180], angleY: [-180, 180], angleZ: [-180, 180], bodyX: [-180, 180], bodyZ: [-180, 180],
  eyeLOpen: [0, 1], eyeROpen: [0, 1], eyeBallX: [-1, 1], eyeBallY: [-1, 1], browLY: [-1, 1], browRY: [-1, 1], mouthOpen: [0, 1], smile: [0, 1], vowel: [-1, 1],
} as const
export type MotionChannel = keyof typeof MOTION_LIMITS
/** Angular input keeps its range until the renderer subtracts its calibrated centre. */
export type MotionParams = Partial<Record<MotionChannel, number>>
export type MotionFrame = { source: string; at: number; sequence: number; params: MotionParams; available: boolean }
export type MotionSettings = { enabled: boolean; kind: 'vmc' | 'ifacial'; scope: 'local' | 'lan'; port: number; phone: string; sender: string }
export type MotionState = { settings: MotionSettings; listening: boolean; addresses: string[]; source: string | null; packets: number; discarded: number; frame: MotionFrame | null; error: { code: string; message: string } | null }
export type MotionEvent = { type: 'state'; state: MotionState } | { type: 'frame'; frame: MotionFrame }
export const defaultMotionSettings = (): MotionSettings => ({ enabled: false, kind: 'vmc', scope: 'local', port: 39539, phone: '', sender: '' })
export function unicastIP(text: string) {
  const parts = text.split('.')
  return parts.length === 4 && parts.every((p) => /^(?:0|[1-9]\d{0,2})$/.test(p) && +p <= 255) && +parts[0] > 0 && +parts[0] < 224
}
export function lanIP(text: string) {
  if (!unicastIP(text)) return false
  const [a, b] = text.split('.').map(Number)
  return a === 127 || a === 10 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31 || a === 169 && b === 254 || a === 100 && b >= 64 && b <= 127
}
export function readMotionSettings(value: unknown): MotionSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (typeof v.enabled !== 'boolean' || (v.kind !== 'vmc' && v.kind !== 'ifacial') || (v.scope !== 'local' && v.scope !== 'lan') || !Number.isInteger(v.port) || Number(v.port) < 1024 || Number(v.port) > 65535 || typeof v.phone !== 'string' || typeof v.sender !== 'string') return null
  const phone = v.phone.trim(), sender = v.sender.trim()
  if ((phone && !lanIP(phone)) || (sender && !lanIP(sender))) return null
  if (v.kind === 'ifacial' && (v.port !== 49983 || v.scope !== 'lan' || (v.enabled && !phone))) return null
  return { enabled: v.enabled, kind: v.kind, scope: v.scope, port: Number(v.port), phone, sender }
}
