// Room signaling is shared by the standalone server, desktop host and browser client.
export const ROOM_VERSION = 1
export const MAX_MEMBERS = 4
export const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
export const personName = (value) => typeof value === 'string' ? [...value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim()].slice(0, 24).join('') : ''
export function validSignal(raw) {
  if (!object(raw)) return false
  if (object(raw.description)) return ['offer', 'answer'].includes(String(raw.description.type)) && typeof raw.description.sdp === 'string' && raw.description.sdp.length <= 60_000
  if (object(raw.candidate)) return typeof raw.candidate.candidate === 'string' && raw.candidate.candidate.length <= 8192 && (raw.candidate.sdpMid == null || typeof raw.candidate.sdpMid === 'string') && (raw.candidate.sdpMLineIndex == null || (Number.isInteger(raw.candidate.sdpMLineIndex) && raw.candidate.sdpMLineIndex >= 0 && raw.candidate.sdpMLineIndex < 32))
  return false
}
