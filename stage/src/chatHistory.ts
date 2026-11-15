import { memory, type MemoryArchive, type MemoryScope, type SessionSummary, type StoredSession } from './memory'
import type { Line } from './brain'

export class ChatHistory {
  current: StoredSession | null = null
  private opened = 0
  private archive: MemoryArchive
  constructor(archive: MemoryArchive = memory) { this.archive = archive }

  async open(profileIds: string[], scope: MemoryScope, signal: AbortSignal, fresh = false): Promise<StoredSession> {
    const request = ++this.opened
    signal.throwIfAborted()
    const profiles = [...new Set(profileIds)].sort()
    if (!fresh && this.current?.scope === scope && JSON.stringify(this.current.profileIds) === JSON.stringify(profiles)) return this.current
    const saved = fresh ? null : await this.archive.latest(profiles, scope)
    signal.throwIfAborted()
    if (request !== this.opened) throw new DOMException('A different conversation was opened', 'AbortError')
    this.current = saved ?? { id: crypto.randomUUID(), profileIds: profiles, scope, title: '', updatedAt: Date.now(), revision: 0, lines: [] }
    return this.current
  }

  async select(id: string, profiles: string[], scope: MemoryScope): Promise<StoredSession> {
    const request = ++this.opened, session = await this.archive.session(id)
    if (request !== this.opened) throw new DOMException('A different conversation was opened', 'AbortError')
    if (!session || session.scope !== scope || JSON.stringify([...session.profileIds].sort()) !== JSON.stringify([...new Set(profiles)].sort())) throw new Error('This conversation belongs to a different cast or mode')
    this.current = session
    return session
  }

  invalidate() { if (this.current) this.current = { ...this.current, summary: undefined } }

  async save(lines: Line[], summary = this.current?.summary): Promise<void> {
    if (!this.current) return
    const session: StoredSession = {
      ...this.current, lines: structuredClone(lines), summary,
      title: lines.find((line) => line.human && !line.audience)?.text.slice(0, 60) ?? this.current.title,
      updatedAt: Date.now(), revision: this.current.revision + 1,
    }
    this.current = session
    const stored = await this.archive.saveSession(session)
    if (this.current?.id === session.id && this.current.revision === session.revision) this.current = stored
  }

  async context(profileId: string, lines: Line[], scope: MemoryScope) {
    if (!this.current || this.current.scope !== scope) throw new Error('The conversation was deleted or changed; start a new conversation')
    const context = await this.archive.context([profileId], scope)
    const excluded = new Set(context.exclusions.filter((entry) => entry.sessionId === this.current?.id).flatMap((entry) => entry.lineIds))
    const summary = this.current?.summary
    const usable = summary && (summary.memoryRevision ?? 0) === context.revision && (context.enabled || !summary.memoryIds?.length)
      && !summary.sourceIds.some((id) => excluded.has(id)) ? summary : undefined
    return { ...context, lines: lines.filter((line) => !excluded.has(line.id)), summary: usable }
  }

  async summarize(text: string, sourceIds: string[], memoryIds: string[], memoryRevision: number, sessionId: string, lines: Line[]) {
    if (this.current?.id !== sessionId || !sourceIds.every((id) => lines.some((line) => line.id === id))) return
    const summary: SessionSummary = { text, sourceIds, memoryIds, memoryRevision }
    await this.save(lines, summary)
  }

  reset() { this.opened++; this.current = null }
}

export const chatHistory = new ChatHistory()
