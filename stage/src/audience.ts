export type AudienceMessage = { id: string; user: string; text: string; at: number }
export const MESSAGE_MAX_AGE = 30_000

/** A short, expiring inbox. Repeated messages cannot occupy every slot in a busy stream. */
export class AudienceInbox<T extends AudienceMessage> {
  private pending: T[] = []
  private recent: T[] = []
  push(message: T) {
    this.recent = this.recent.filter((m) => message.at - m.at < MESSAGE_MAX_AGE)
    if (this.recent.some((m) => m.id === message.id || (m.user.toLowerCase() === message.user.toLowerCase() && m.text === message.text))) return false
    this.recent.push(message)
    this.recent = this.recent.slice(-40)
    this.pending.push(message)
    this.pending = this.pending.slice(-8)
    return true
  }
  available(now = Date.now(), blocked: (user: string) => boolean = () => false) {
    this.pending = this.pending.filter((m) => now - m.at < MESSAGE_MAX_AGE && !blocked(m.user))
    return this.pending.length > 0
  }
  take(now = Date.now(), blocked: (user: string) => boolean = () => false): T | null {
    this.available(now, blocked)
    return this.pending.shift() ?? null
  }
  /** a taken message back in front, as if it had not been taken (what answered it was thrown away) */
  putBack(message: T) { if (!this.pending.includes(message)) this.pending = [message, ...this.pending].slice(-8) }
  clear() { this.pending = []; this.recent = [] }
}
