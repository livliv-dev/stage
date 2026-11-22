// What the desktop app and the Stage editor say to each other about a realtime call's WebSocket (Alibaba Cloud
// Bailian's, with a standard key): the socket lives in the app, because a page can't put a key in a WebSocket's headers
// (desktop/src/realtimeSocket.ts; the editor's side is stage/src/realtime/socket.ts).

/** what happened to a socket: opened, a message (text), closed, or failed (`status`: the HTTP answer to the handshake) */
export type RealtimeSocketEvent =
  | { type: 'open' }
  | { type: 'message'; data: string }
  | { type: 'close'; code: number }
  | { type: 'error'; message: string; status?: number }

/** the realtime WebSockets the app opens: Bailian's, in China and internationally, for one model */
export const REALTIME_SOCKET_HOSTS: readonly string[] = ['dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com']
export const REALTIME_SOCKET_PATH = '/api-ws/v1/realtime'

/** a realtime socket address the app may open, or null: wss, one of the hosts, the realtime path, `model` alone */
export function readRealtimeSocketUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null
  const match = /^wss:\/\/([a-z0-9.-]+)(\/[^?#]*)\?model=([\w.-]{1,80})$/.exec(value)
  return match && REALTIME_SOCKET_HOSTS.includes(match[1]) && match[2] === REALTIME_SOCKET_PATH ? value : null
}
/** the realtime socket address for a model on a host (Bailian's, from its API's address) */
export const realtimeSocketUrl = (host: string, model: string) => `wss://${host}${REALTIME_SOCKET_PATH}?model=${encodeURIComponent(model)}`
