import { object, personName } from '../../../collab/protocol.mjs'
export { ROOM_VERSION, MAX_MEMBERS, object, personName, validSignal } from '../../../collab/protocol.mjs'
export const MAX_MODEL_BYTES = 64 * 1024 * 1024
export const MAX_FILES = 512
export const CHUNK_BYTES = 16 * 1024
export type Member = { id: string; name: string; host: boolean }
export type Invite = { server: string; room: string; token: string }
export type ModelManifest = { id: string; name: string; format: 'livliv' | 'vrm' | 'png'; mirror: boolean; color: string; files: { path: string; size: number; type: string }[] }
// Plain ws: is for this machine or a private network (RFC 1918, IPv6 ULA); anything else has to use wss:.
const privateHost = (host: string) => host === 'localhost' || host === '[::1]' || /^\[f[cd][\da-f]{2}:/.test(host) || /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01]))\.[\d.]+$/.test(host)
export function serviceUrl(raw: string) {
  const url = URL.canParse(raw) ? new URL(raw) : null
  if (!url || !['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error('好友联播服务地址不对')
  if (url.protocol === 'ws:' && !privateHost(url.hostname)) throw new Error('公网好友联播服务要用 wss:// 地址')
  if (url.pathname === '/') url.pathname = '/room'
  return url.href
}
export function encodeInvite(invite: Invite) { return 'lls1.' + btoa(JSON.stringify(invite)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
export function decodeInvite(raw: string): Invite {
  let invite: Invite
  try {
    const text = raw.trim()
    if (!text.startsWith('lls1.') || text.length > 2048) throw new Error()
    const value: unknown = JSON.parse(atob(text.slice(5).replace(/-/g, '+').replace(/_/g, '/')))
    if (!object(value) || typeof value.server !== 'string' || typeof value.room !== 'string' || typeof value.token !== 'string' || !/^[\w-]{16,64}$/.test(value.room) || !/^[\w-]{24,80}$/.test(value.token)) throw new Error()
    invite = { server: value.server, room: value.room, token: value.token }
  } catch { throw new Error('邀请码不完整，请重新复制') }
  return { ...invite, server: serviceUrl(invite.server) }
}
export const safePath = (path: string) => path.length > 0 && path.length <= 256 && !/[\u0000-\u001f\\%?#:]/.test(path) && !path.startsWith('/') && !/^[a-z]:/i.test(path) && path.split('/').every((part) => part !== '..' && part !== '.' && part !== '')
export function readManifest(raw: unknown): ModelManifest | null {
  if (!object(raw) || typeof raw.id !== 'string' || !/^[\w-]{1,64}$/.test(raw.id) || !personName(raw.name) || !['livliv', 'vrm', 'png'].includes(String(raw.format)) || typeof raw.mirror !== 'boolean' || typeof raw.color !== 'string' || !/^#[\da-f]{6}$/i.test(raw.color) || !Array.isArray(raw.files) || !raw.files.length || raw.files.length > MAX_FILES) return null
  let size = 0
  const seen = new Set<string>()
  for (const file of raw.files) {
    if (!object(file) || typeof file.path !== 'string' || !safePath(file.path) || seen.has(file.path) || !Number.isSafeInteger(file.size) || Number(file.size) <= 0 || typeof file.type !== 'string' || file.type.length > 80) return null
    size += Number(file.size); seen.add(file.path)
  }
  if (size > MAX_MODEL_BYTES) return null
  return { id: raw.id, name: personName(raw.name), format: raw.format as ModelManifest['format'], mirror: raw.mirror, color: raw.color, files: raw.files.map((file) => ({ path: file.path, size: file.size, type: file.type })) }
}
