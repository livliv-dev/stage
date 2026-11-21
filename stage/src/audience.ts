export type AudienceMessage = { id: string; user: string; text: string; at: number }
export const MESSAGE_MAX_AGE = 30_000
/** how many messages wait at most, and how many recent ones are remembered to drop repeats */
export const MESSAGES_WAITING = 8, MESSAGES_REMEMBERED = 40

/** a message still worth answering at `now` */
export const fresh = (message: AudienceMessage, now: number) => now - message.at < MESSAGE_MAX_AGE
/** the message repeats one of these: the same id, or the same viewer saying the same */
export const repeats = (recent: readonly AudienceMessage[], message: AudienceMessage) =>
  recent.some((m) => m.id === message.id || (m.user.toLowerCase() === message.user.toLowerCase() && m.text === message.text))

/** A short, expiring inbox. Repeated messages cannot occupy every slot in a busy stream. */
export class AudienceInbox<T extends AudienceMessage> {
  private pending: T[] = []
  private recent: T[] = []
  push(message: T) {
    this.recent = this.recent.filter((m) => fresh(m, message.at))
    if (repeats(this.recent, message)) return false
    this.recent.push(message)
    this.recent = this.recent.slice(-MESSAGES_REMEMBERED)
    this.pending.push(message)
    this.pending = this.pending.slice(-MESSAGES_WAITING)
    return true
  }
  available(now = Date.now(), blocked: (user: string) => boolean = () => false) {
    this.pending = this.pending.filter((m) => fresh(m, now) && !blocked(m.user))
    return this.pending.length > 0
  }
  take(now = Date.now(), blocked: (user: string) => boolean = () => false): T | null {
    this.available(now, blocked)
    return this.pending.shift() ?? null
  }
  /** a taken message back in front, as if it had not been taken (what answered it was thrown away) */
  putBack(message: T) { if (!this.pending.includes(message)) this.pending = [message, ...this.pending].slice(-MESSAGES_WAITING) }
  clear() { this.pending = []; this.recent = [] }
}
