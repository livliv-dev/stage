// A running session waits for something to happen (a viewer's message, your line, resume, a game event, a decision
// made, the end of a game character's dialogue) and is woken when it does. One waiter at a time: the session's loop,
// or the turn it is in.

export class Wake {
  private waiter: (() => void) | null = null
  /** until the next wake(), or `ms` milliseconds when given; rejects with the signal's reason when it aborts */
  wait(signal: AbortSignal, ms?: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      signal.throwIfAborted()
      const clean = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); if (this.waiter === done) this.waiter = null }
      const done = () => { clean(); resolve() }
      const abort = () => { clean(); reject(signal.reason) }
      const timer = ms === undefined ? undefined : setTimeout(done, Math.max(0, ms))
      this.waiter = done
      signal.addEventListener('abort', abort, { once: true })
    })
  }
  /** the one waiting goes on (to look again at what it waits for) */
  wake() { this.waiter?.() }
}

/** `ms` milliseconds, or until the signal aborts (rejecting with its reason) */
export const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted()
  const done = () => { signal.removeEventListener('abort', abort); resolve() }
  const timer = setTimeout(done, ms)
  const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason) }
  signal.addEventListener('abort', abort, { once: true })
})

/** waits, woken each time, for as long as `busy` holds (paused, a game character talking, you speaking, ...) */
export async function waitWhile(busy: () => boolean, wake: Wake, signal: AbortSignal) {
  while (busy()) await wake.wait(signal)
}

/** the wait before a line is said: while `busy`, then `check` (which may throw: the line is not said); again if it
 *  became busy meanwhile, so the check always sees the moment the line starts */
export async function untilFree(busy: () => boolean, wake: Wake, signal: AbortSignal, check: () => Promise<void> | void) {
  do {
    await waitWhile(busy, wake, signal)
    await check()
  } while (busy())
}
