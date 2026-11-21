// When a friend's character channel may carry our character: once both ends are listening. Each end says 'ready' as
// its channel opens and sends its package only after it has heard the other's; a channel announced by the other side
// is open at once, and what it sends then can reach the side that made the channel before that side is ready for it.
// The first ready heard is answered (the other side's own may have come too early to count). A friend on an older
// Stage never says ready: after a while it gets the package anyway. Shared once, never after the channel has closed.
export type Handshake = {
  /** the channel is open */
  opened(): void
  /** the other side said ready */
  heard(): void
  /** the channel closed or the friend left */
  close(): void
}
type Timers = { set(f: () => void, ms: number): unknown; clear(id: unknown): void }
const realTimers: Timers = { set: (f, ms) => setTimeout(f, ms), clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) }

/** `say`: send 'ready' on the channel. `share`: send the package (called once at most). `older`: how long an end that
 *  has said nothing is waited for */
export function handshake(say: () => void, share: () => void, older = 3000, timers: Timers = realTimers): Handshake {
  let open = false, heard = false, shared = false, closed = false, timer: unknown
  const go = () => { if (shared || closed) return; shared = true; timers.clear(timer); share() }
  return {
    opened() {
      if (open || closed) return
      open = true; say()
      if (heard) go()
      else timer = timers.set(go, older)
    },
    heard() {
      if (heard || closed) return
      heard = true
      // heard before the channel said it is open: the ready said on opening answers it
      if (!open) return
      say(); go()
    },
    close() { closed = true; timers.clear(timer) },
  }
}
