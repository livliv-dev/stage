// The session's clock: the time it reads and the timers it waits on (its waits, the pause between lines, the glances
// while a line is said, its limits). One source, like the chance draws: a test runs it faster (the behaviour traces end
// a minute's limit after a second), and the session runner keeps time by it.

export type Clock = {
  /** milliseconds since the epoch, as Date.now() */
  now(): number
  /** `f` after `ms` milliseconds; the id clears it */
  timeout(f: () => void, ms: number): number
  clear(id: number | undefined): void
}

const real: Clock = {
  now: () => Date.now(),
  timeout: (f, ms) => setTimeout(f, ms) as unknown as number,
  clear: (id) => clearTimeout(id),
}
let current: Clock = real

/** the clock now (a session reads it each time, so a test may swap it before a session starts) */
export const clock: Clock = {
  now: () => current.now(),
  timeout: (f, ms) => current.timeout(f, ms),
  clear: (id) => current.clear(id),
}

/** the clock from here on: the parts given, the real clock's for the rest (all of it when left out) */
export function setClock(next: Partial<Clock> = {}) { current = { ...real, ...next } }
