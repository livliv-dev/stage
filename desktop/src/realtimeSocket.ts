// A realtime call's WebSocket for the Stage editor (Alibaba Cloud Bailian with a standard key): a page can't put the key in
// a WebSocket's headers, so the socket lives here and the editor sends and receives its text through ipc.ts. Only
// Bailian's realtime address opens (protocol/src/realtime.ts), at most two at a time; a socket closes with its page.
// The key goes in the Authorization header and nowhere else, and is never logged. Plain Node: main.ts gives it `ws`.
import { readRealtimeSocketUrl, type RealtimeSocketEvent } from '#protocol/realtime'

/** the part of a `ws` WebSocket used here */
export type Socket = {
  on(event: 'open', listener: () => void): void
  on(event: 'message', listener: (data: unknown, binary: boolean) => void): void
  on(event: 'close', listener: (code: number) => void): void
  on(event: 'error', listener: (error: Error) => void): void
  on(event: 'unexpected-response', listener: (request: unknown, response: { statusCode?: number }) => void): void
  send(data: string): void
  close(): void
  terminate(): void
  readonly readyState: number
}
export type SocketDeps = { connect(url: string, headers: Record<string, string>): Socket }
type Owner = { send(channel: string, ...args: unknown[]): void; isDestroyed(): boolean; once(event: 'destroyed', listener: () => void): void }

const MAX_SOCKETS = 2, MAX_MESSAGE = 1_000_000

export function realtimeSockets({ connect }: SocketDeps) {
  const open = new Map<string, { socket: Socket; owner: Owner }>()
  const tell = (owner: Owner, id: string, event: RealtimeSocketEvent) => { if (!owner.isDestroyed()) owner.send('livliv:realtime-socket-event', id, event) }
  function close(id: string) {
    const entry = open.get(id)
    if (!entry) return
    open.delete(id)
    try { entry.socket.close() } catch { entry.socket.terminate() }
  }
  return {
    /** opens a socket for this page: false when the address, the key or the id isn't allowed */
    open(owner: Owner, id: unknown, url: unknown, key: unknown): boolean {
      const target = readRealtimeSocketUrl(url)
      if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id) || open.has(id) || !target || typeof key !== 'string' || !key || key.length > 4096 || open.size >= MAX_SOCKETS) return false
      const socket = connect(target, { Authorization: `Bearer ${key}` })
      open.set(id, { socket, owner })
      owner.once('destroyed', () => close(id))
      socket.on('open', () => tell(owner, id, { type: 'open' }))
      socket.on('message', (data, binary) => { if (!binary && open.has(id)) tell(owner, id, { type: 'message', data: String(data) }) })
      socket.on('unexpected-response', (_request, response) => { tell(owner, id, { type: 'error', message: 'handshake refused', status: response.statusCode }); close(id) })
      socket.on('error', (error) => { if (open.has(id)) tell(owner, id, { type: 'error', message: error.message.slice(0, 200) }) })
      socket.on('close', (code) => { open.delete(id); tell(owner, id, { type: 'close', code }) })
      return true
    },
    /** a message from the page (JSON text) */
    send(id: unknown, data: unknown): boolean {
      const entry = typeof id === 'string' ? open.get(id) : undefined
      if (!entry || typeof data !== 'string' || data.length > MAX_MESSAGE || entry.socket.readyState !== 1) return false
      entry.socket.send(data); return true
    },
    close(id: unknown) { if (typeof id === 'string') close(id) },
    /** sockets open now */
    count: () => open.size,
  }
}
export type RealtimeSockets = ReturnType<typeof realtimeSockets>
