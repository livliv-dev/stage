import type { Line } from './core/lines'

export type MemoryScope = 'private' | 'public'
export type SessionSummary = { text: string; sourceIds: string[]; memoryIds?: string[]; memoryRevision?: number }
export type StoredSession = {
  id: string
  profileIds: string[]
  scope: MemoryScope
  title: string
  updatedAt: number
  /** Increased by the conversation owner whenever it changes the saved snapshot. */
  revision: number
  lines: Line[]
  /** IDs keep their original position after transcript deletion, without retaining the deleted text. */
  lineOrder?: string[]
  summary?: SessionSummary
  /** Kept in the transcript, but excluded from future model context after a memory correction. */
  excludedLineIds?: string[]
  /** Earlier AI continuations can paraphrase a fact without retaining its direct memory ID. */
  exclusionStarts?: { lineId: string; revision: number }[]
}
export type MemoryRecord = {
  id: string
  profileId: string
  scope: MemoryScope
  text: string
  sourceSessionId?: string
  sourceLineIds?: string[]
  createdAt: number
  updatedAt: number
}
export type RememberInput = Pick<MemoryRecord, 'profileId' | 'scope' | 'text' | 'sourceSessionId' | 'sourceLineIds'>
export type MemoryContext = {
  enabled: boolean
  revision: number
  memories: MemoryRecord[]
  exclusions: { sessionId: string; lineIds: string[] }[]
}

export type ArchiveData = {
  sessions: Record<string, StoredSession>
  memories: Record<string, MemoryRecord>
  settings: { enabled: boolean; deletedSessions: Record<string, number>; memoryRevision: number; invalidatedMemories?: Record<string, number> }
}
/** The browser uses one IndexedDB transaction for an edit, including dependent summaries. */
export interface MemoryDatabase {
  read(): Promise<ArchiveData>
  update<T>(change: (data: ArchiveData) => T): Promise<T>
}

export const emptyArchive = (): ArchiveData => ({ sessions: {}, memories: {}, settings: { enabled: true, deletedSessions: {}, memoryRevision: 0, invalidatedMemories: {} } })
const clone = <T>(value: T): T => structuredClone(value)
const scopeOf = (scope: unknown): scope is MemoryScope => scope === 'private' || scope === 'public'
const string = (value: unknown, max = 4096): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => string(item, 256))
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const stamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const unique = (values: string[]) => [...new Set(values)]
const sameProfiles = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))
const accessible = (entry: MemoryRecord, profiles: string[], scope: MemoryScope) => profiles.includes(entry.profileId) && (scope === 'private' || entry.scope === 'public')
const invalid = () => new Error('Saved conversation or memory data is invalid')

function validSummary(value: unknown): value is SessionSummary {
  return record(value) && typeof value.text === 'string' && value.text.length <= 12_000 && strings(value.sourceIds) && (value.memoryIds === undefined || strings(value.memoryIds)) && (value.memoryRevision === undefined || stamp(value.memoryRevision))
}
function validSession(value: unknown): value is StoredSession {
  if (!record(value) || !string(value.id, 256) || !strings(value.profileIds) || !scopeOf(value.scope) || typeof value.title !== 'string' || value.title.length > 512 || !stamp(value.updatedAt) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !Array.isArray(value.lines)) return false
  if (value.summary !== undefined && !validSummary(value.summary)) return false
  if (value.excludedLineIds !== undefined && !strings(value.excludedLineIds)) return false
  if (value.lineOrder !== undefined && !strings(value.lineOrder)) return false
  if (value.exclusionStarts !== undefined && (!Array.isArray(value.exclusionStarts) || !value.exclusionStarts.every((start) => record(start) && string(start.lineId, 256) && stamp(start.revision)))) return false
  return value.lines.every((line) => record(line) && string(line.id, 256) && typeof line.who === 'string' && typeof line.name === 'string' && typeof line.text === 'string'
    && (line.memoryIds === undefined || strings(line.memoryIds)) && (line.memoryRevision === undefined || stamp(line.memoryRevision)))
}
function validMemory(value: unknown): value is MemoryRecord {
  return record(value) && string(value.id, 256) && string(value.profileId, 256) && scopeOf(value.scope) && string(value.text, 2000) && stamp(value.createdAt) && stamp(value.updatedAt)
    && (value.sourceSessionId === undefined || string(value.sourceSessionId, 256)) && (value.sourceLineIds === undefined || strings(value.sourceLineIds))
}
function validate(data: ArchiveData) {
  if (!record(data.settings) || typeof data.settings.enabled !== 'boolean' || !record(data.settings.deletedSessions) || !Object.values(data.settings.deletedSessions).every(stamp) || !stamp(data.settings.memoryRevision)
    || (data.settings.invalidatedMemories !== undefined && (!record(data.settings.invalidatedMemories) || !Object.values(data.settings.invalidatedMemories).every(stamp)))
    || !Object.values(data.sessions).every(validSession) || !Object.values(data.memories).every(validMemory)) throw invalid()
}

function sessionSnapshot(session: StoredSession, memoryRevision: number, invalidated: Record<string, number>, previous?: StoredSession): StoredSession {
  const lineOrder = unique([...(previous?.lineOrder ?? previous?.lines.map((line) => line.id) ?? []), ...(session.lineOrder ?? []), ...session.lines.map((line) => line.id)])
  const starts = new Map<string, number>()
  for (const start of [...(previous?.exclusionStarts ?? []), ...(session.exclusionStarts ?? [])]) starts.set(start.lineId, Math.max(starts.get(start.lineId) ?? 0, start.revision))
  for (const line of session.lines) {
    if (line.human) continue
    for (const id of line.memoryIds ?? []) if (Object.hasOwn(invalidated, id) && (line.memoryRevision ?? 0) < invalidated[id]) {
      starts.set(line.id, Math.max(starts.get(line.id) ?? 0, invalidated[id]))
    }
  }
  const continuations: string[] = []
  let cutoff = 0
  const lines = new Map(session.lines.map((line) => [line.id, line]))
  for (const id of lineOrder) {
    cutoff = Math.max(cutoff, starts.get(id) ?? 0)
    const line = lines.get(id)
    if (line && !line.human && (line.memoryRevision ?? 0) < cutoff) continuations.push(id)
  }
  const excludedLineIds = unique([...(previous?.excludedLineIds ?? []), ...(session.excludedLineIds ?? []), ...continuations])
  const exclusionStarts = [...starts].map(([lineId, revision]) => ({ lineId, revision }))
  // Old snapshots may be queued when a source is forgotten. They must not restore the old summary.
  const summary = session.summary && (session.summary.memoryRevision ?? 0) === memoryRevision && !session.summary.sourceIds.some((id) => excludedLineIds.includes(id)) ? clone(session.summary) : undefined
  return { ...clone(session), lineOrder, profileIds: unique(session.profileIds).sort(), excludedLineIds, exclusionStarts, summary }
}

function invalidateMemory(data: ArchiveData, memory: MemoryRecord) {
  const revision = data.settings.memoryRevision + 1
  data.settings = { ...data.settings, memoryRevision: revision, invalidatedMemories: { ...data.settings.invalidatedMemories, [memory.id]: revision } }
  for (const session of Object.values(data.sessions)) {
    if (!session.profileIds.includes(memory.profileId)) continue
    const source = session.id === memory.sourceSessionId ? memory.sourceLineIds ?? [] : []
    const order = session.lineOrder ?? session.lines.map((line) => line.id)
    const derived = session.lines.filter((line) => !line.human && line.memoryIds?.includes(memory.id)).map((line) => line.id)
    // Older archives cannot recover an already deleted source's position. A later direct reference cannot locate it.
    const start = source.some((id) => !order.includes(id)) ? order[0] : order.find((id) => source.includes(id) || derived.includes(id))
    // A recap may have used a remembered fact without repeating the original source line.
    // Clear these recaps rather than asking a model to edit an untraceable paraphrase.
    data.sessions[session.id] = sessionSnapshot({
      ...session, summary: undefined,
      excludedLineIds: unique([...(session.excludedLineIds ?? []), ...source]),
      exclusionStarts: [...(session.exclusionStarts ?? []), ...(start ? [{ lineId: start, revision }] : [])],
    }, revision, data.settings.invalidatedMemories ?? {}, session)
  }
}

export class MemoryArchive {
  private database: MemoryDatabase
  private pending: Promise<void> = Promise.resolve()
  private listeners = new Set<() => void>()
  private channel: BroadcastChannel | null = null
  constructor(database: MemoryDatabase) { this.database = database }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    if (!this.channel && typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('livliv-stage:memory')
      this.channel.onmessage = () => { for (const notify of this.listeners) notify() }
    }
    return () => {
      this.listeners.delete(listener)
      if (!this.listeners.size) { this.channel?.close(); this.channel = null }
    }
  }
  private async read() { await this.pending; const data = await this.database.read(); validate(data); return data }
  private edit<T>(change: (data: ArchiveData) => T): Promise<T> {
    const result = this.pending.then(() => this.database.update((data) => { validate(data); const result = change(data); validate(data); return result }))
    // A rejected edit is returned to its caller; later edits can still retry storage.
    this.pending = result.then(() => {}, () => {})
    return result.then((value) => { this.channel?.postMessage('changed'); for (const notify of this.listeners) notify(); return clone(value) })
  }

  async sessions(profileIds: string[], scope: MemoryScope): Promise<StoredSession[]> {
    const data = await this.read(), profiles = unique(profileIds)
    return clone(Object.values(data.sessions).filter((session) => session.scope === scope && sameProfiles(session.profileIds, profiles)).sort((a, b) => b.updatedAt - a.updatedAt))
  }
  async latest(profileIds: string[], scope: MemoryScope): Promise<StoredSession | null> { return (await this.sessions(profileIds, scope))[0] ?? null }
  async session(id: string): Promise<StoredSession | null> { return clone((await this.read()).sessions[id] ?? null) }
  saveSession(value: StoredSession): Promise<StoredSession | null> {
    const session = clone(value)
    if (!validSession(session)) return Promise.reject(invalid())
    return this.edit((data) => {
      if (Object.hasOwn(data.settings.deletedSessions, session.id)) return null
      const previous = Object.hasOwn(data.sessions, session.id) ? data.sessions[session.id] : undefined
      if (previous && previous.revision >= session.revision) return previous
      const next = sessionSnapshot(session, data.settings.memoryRevision, data.settings.invalidatedMemories ?? {}, previous)
      data.sessions[session.id] = next
      return next
    })
  }
  deleteSession(id: string): Promise<void> {
    return this.edit((data) => {
      delete data.sessions[id]
      data.settings = { ...data.settings, deletedSessions: { ...data.settings.deletedSessions, [id]: Date.now() } }
    })
  }
  async listMemories(profileIds: string[], scope: MemoryScope): Promise<MemoryRecord[]> {
    return clone(Object.values((await this.read()).memories).filter((entry) => accessible(entry, profileIds, scope)).sort((a, b) => b.updatedAt - a.updatedAt))
  }
  remember(input: RememberInput): Promise<MemoryRecord> {
    const now = Date.now(), entry: MemoryRecord = { ...clone(input), id: crypto.randomUUID(), text: input.text.trim(), createdAt: now, updatedAt: now }
    if (!validMemory(entry)) return Promise.reject(invalid())
    return this.edit((data) => { data.memories[entry.id] = entry; return entry })
  }
  editMemory(id: string, patch: { text?: string; scope?: MemoryScope }): Promise<MemoryRecord> {
    const change = clone(patch)
    return this.edit((data) => {
      const current = data.memories[id]
      if (!current) throw new Error('This memory no longer exists')
      const entry = { ...current, ...change, text: (change.text ?? current.text).trim(), updatedAt: Date.now() }
      if (!validMemory(entry)) throw invalid()
      if (current.text !== entry.text || current.scope !== entry.scope) invalidateMemory(data, current)
      data.memories[id] = entry
      return entry
    })
  }
  forgetMemory(id: string): Promise<void> {
    return this.edit((data) => {
      const entry = data.memories[id]
      if (!entry) return
      invalidateMemory(data, entry)
      delete data.memories[id]
    })
  }
  async context(profileIds: string[], scope: MemoryScope): Promise<MemoryContext> {
    const data = await this.read()
    return clone({
      enabled: data.settings.enabled,
      revision: data.settings.memoryRevision,
      memories: data.settings.enabled ? Object.values(data.memories).filter((entry) => accessible(entry, profileIds, scope)).sort((a, b) => b.updatedAt - a.updatedAt) : [],
      exclusions: Object.values(data.sessions).filter((session) => session.scope === scope && session.profileIds.some((id) => profileIds.includes(id)) && session.excludedLineIds?.length)
        .map((session) => ({ sessionId: session.id, lineIds: session.excludedLineIds! })),
    })
  }
  setEnabled(enabled: boolean): Promise<void> {
    return this.edit((data) => {
      if (data.settings.enabled === enabled) return
      data.settings = { ...data.settings, enabled, memoryRevision: data.settings.memoryRevision + 1 }
      for (const session of Object.values(data.sessions)) data.sessions[session.id] = { ...session, summary: undefined }
    })
  }
}

const DB = 'livliv-stage-memory', SESSIONS = 'sessions', MEMORIES = 'memories', META = 'meta'
/** No account, provider key, character file or scene state is persisted in this database. */
export function indexedMemoryDatabase(): MemoryDatabase {
  let opened: Promise<IDBDatabase> | null = null
  const open = () => {
    opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('Conversation storage is unavailable in this browser')); return }
      const request = indexedDB.open(DB, 1)
      let blocked = false
      request.onupgradeneeded = () => {
        for (const name of [SESSIONS, MEMORIES]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' })
        if (!request.result.objectStoreNames.contains(META)) request.result.createObjectStore(META)
      }
      request.onblocked = () => { blocked = true; reject(new Error('Close other Stage windows to update conversation storage')) }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (blocked) { request.result.close(); return }
        request.result.onversionchange = () => { request.result.close(); opened = null }
        resolve(request.result)
      }
    })
    opened.catch(() => { opened = null })
    return opened
  }
  const transact = async <T>(mode: IDBTransactionMode, change: (data: ArchiveData) => T): Promise<T> => {
    const db = await open()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction([SESSIONS, MEMORIES, META], mode)
      const sessions = transaction.objectStore(SESSIONS), memories = transaction.objectStore(MEMORIES), meta = transaction.objectStore(META)
      const requests = [sessions.getAll(), memories.getAll(), meta.get('settings')] as const
      let ready = 0, result: T, failure: unknown
      for (const request of requests) request.onsuccess = () => {
        if (++ready !== requests.length) return
        try {
          const previous = {
            sessions: Object.fromEntries((requests[0].result as StoredSession[]).map((entry) => [entry.id, entry])),
            memories: Object.fromEntries((requests[1].result as MemoryRecord[]).map((entry) => [entry.id, entry])),
            settings: requests[2].result ?? emptyArchive().settings,
          }
          validate(previous)
          const data: ArchiveData = { sessions: { ...previous.sessions }, memories: { ...previous.memories }, settings: previous.settings }
          result = change(data)
          if (mode === 'readwrite') {
            validate(data)
            for (const [store, before, after] of [[sessions, previous.sessions, data.sessions], [memories, previous.memories, data.memories]] as const) {
              for (const id of Object.keys(before)) if (!(id in after)) store.delete(id)
              for (const [id, entry] of Object.entries(after)) if (before[id] !== entry) store.put(entry)
            }
            if (previous.settings !== data.settings) meta.put(data.settings, 'settings')
          }
        } catch (error) { failure = error; transaction.abort() }
      }
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Conversation storage transaction was aborted'))
    })
  }
  return { read: () => transact('readonly', (data) => clone(data)), update: (change) => transact('readwrite', change) }
}

export const memory = new MemoryArchive(indexedMemoryDatabase())
