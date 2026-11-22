// A realtime call's WebSocket for the Stage editor (Alibaba Cloud Bailian with a standard key): a page can't put the key in
// a WebSocket's headers, so the socket lives here and the editor sends and receives its text through ipc.ts. Only
// Bailian's realtime address opens (protocol/src/realtime.ts), at most two at a time. A socket closes with the page
// that opened it: when it reloads, crashes or closes, its calls are gone. The key goes in the Authorization header and
// nowhere else, and is never logged. Plain Node: main.ts gives it `ws`.
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
/** opens a socket: `maxPayload` is the largest message taken in (`ws` closes the socket on a bigger one) */
export type SocketDeps = { connect(url: string, options: { headers: Record<string, string>; maxPayload: number }): Socket }
type Owner = {
  send(channel: string, ...args: unknown[]): void
  isDestroyed(): boolean
  on(event: 'destroyed' | 'did-start-loading' | 'render-process-gone', listener: () => void): unknown
}

const MAX_SOCKETS = 2, MAX_MESSAGE = 1_000_000
/** the largest message taken from Bailian: its audio comes in small pieces, and each message goes to the page whole */
export const MAX_INBOUND = 2 * 1024 * 1024

export function realtimeSockets({ connect }: SocketDeps) {
  /** an open socket; `quiet` once its page is gone (nothing more is sent to it) */
  type Entry = { socket: Socket; owner: Owner; quiet: boolean }
  const open = new Map<string, Entry>()
  const watched = new WeakSet<Owner>()
  const tell = (entry: Entry, id: string, event: RealtimeSocketEvent) => { if (!entry.quiet && !entry.owner.isDestroyed()) entry.owner.send('livliv:realtime-socket-event', id, event) }
  function close(id: string, quiet = false) {
    const entry = open.get(id)
    if (!entry) return
    open.delete(id)
    if (quiet) entry.quiet = true
    try { entry.socket.close() } catch { entry.socket.terminate() }
  }
  /** a page is watched once: reloading, crashing or closing closes every socket it opened */
  function watch(owner: Owner) {
    if (watched.has(owner)) return
    watched.add(owner)
    const gone = () => { for (const [id, entry] of [...open]) if (entry.owner === owner) close(id, true) }
    owner.on('destroyed', gone); owner.on('did-start-loading', gone); owner.on('render-process-gone', gone)
  }
  return {
    /** opens a socket for this page: false when the address, the key or the id isn't allowed */
    open(owner: Owner, id: unknown, url: unknown, key: unknown): boolean {
      const target = readRealtimeSocketUrl(url)
      if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id) || open.has(id) || !target || typeof key !== 'string' || !key || key.length > 4096 || open.size >= MAX_SOCKETS) return false
      watch(owner)
      const socket = connect(target, { headers: { Authorization: `Bearer ${key}` }, maxPayload: MAX_INBOUND })
      const entry: Entry = { socket, owner, quiet: false }, current = () => open.get(id) === entry
      open.set(id, entry)
      socket.on('open', () => { if (current()) tell(entry, id, { type: 'open' }) })
      socket.on('message', (data, binary) => { if (!binary && current()) tell(entry, id, { type: 'message', data: String(data) }) })
      socket.on('unexpected-response', (_request, response) => { if (current()) { tell(entry, id, { type: 'error', message: 'handshake refused', status: response.statusCode }); close(id) } })
      socket.on('error', (error) => { if (current()) tell(entry, id, { type: 'error', message: error.message.slice(0, 200) }) })
      socket.on('close', (code) => { if (current()) open.delete(id); tell(entry, id, { type: 'close', code }) })
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
