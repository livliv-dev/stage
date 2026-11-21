import { randomUUID } from 'node:crypto'
import { createNeuroServer, type ForceRequest, type Json, type NeuroEvent, type NeuroServer, type NeuroServerOptions, type NeuroSession } from '@livliv-dev/neuro-bridge'
import { readNeuroAnswer, type ExternalSelection, type NeuroCharacter, type NeuroConfig, type NeuroMessage, type NeuroSpeech, type NeuroState } from '#protocol/neuro'

type Editor = {
  readonly id: number
  isDestroyed(): boolean
  isLoadingMainFrame(): boolean
  send(channel: string, value: unknown): void
  on(event: 'destroyed' | 'did-start-loading', listener: () => void): unknown
}
type Pending = { owner: Editor; resolve(value: ExternalSelection | null): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout>; clean(): void }
export type NeuroHostDeps = { editor(): Editor | null; server?: (options: NeuroServerOptions) => NeuroServer; decisionTimeoutMs?: number }

/** A local protocol server has no editor privileges; only this adapter talks to the owning Stage editor. */
export class NeuroHost {
  private deps: NeuroHostDeps
  private server: NeuroServer | null = null
  private port: number | null = null
  private character: NeuroCharacter | null = null
  private error: string | null = null
  private owner: Editor | null = null
  private pending = new Map<string, Pending>()
  private watched = new WeakSet<Editor>()
  private queue = Promise.resolve()

  constructor(deps: NeuroHostDeps) { this.deps = deps }

  state(): NeuroState {
    return { enabled: this.server !== null && this.port !== null, port: this.port, url: this.port === null ? null : `ws://127.0.0.1:${this.port}`, character: this.character,
      connections: this.server?.sessions().map((session) => ({ id: session.id, game: session.game, actions: session.actions.length, speaking: session.speaking })) ?? [], error: this.error }
  }

  configure(config: NeuroConfig): Promise<NeuroState> {
    const work = this.queue.then(async () => {
      await this.stop()
      this.error = null
      if (!config.enabled) { this.publish(); return }
      const editor = this.deps.editor()
      if (!editor || editor.isDestroyed() || editor.isLoadingMainFrame()) throw new Error('Stage editor is not ready')
      this.owner = editor; this.character = config.character
      if (!this.watched.has(editor)) {
        this.watched.add(editor)
        const gone = () => { if (this.owner === editor) void this.close().catch((error: unknown) => console.error('[Neuro close]', error)) }
        editor.on('destroyed', gone); editor.on('did-start-loading', gone)
      }
      let server: NeuroServer
      try {
        server = (this.deps.server ?? createNeuroServer)({
          character: { id: `stage:${config.character.profileId ?? config.character.id}`, name: config.character.name },
          // the spec retries a forced action the game turned down (success: false); three tries, each one decision
          maxForceAttempts: 3,
          onEvent: (event, session) => { if (this.server === server) this.receive(event, session) },
          decideAction: (request, session, signal) => this.server === server ? this.decide(request, session, signal) : null,
          onError: (error) => { if (this.server === server) { this.error = error.message; this.publish() } },
        })
        this.server = server
        const address = await server.listen(config.port); this.port = address.port
      }
      catch (error) { await this.stop(); throw error }
      this.publish()
    })
    this.queue = work.catch((error: unknown) => { this.error = error instanceof Error ? error.message : String(error); this.publish() })
    return work.then(() => this.state())
  }

  close() { return this.configure({ enabled: false }) }

  answer(owner: number, id: unknown, raw: unknown) {
    if (typeof id !== 'string') return false
    const request = this.pending.get(id)
    if (!request || request.owner.id !== owner || this.deps.editor() !== request.owner || this.owner !== request.owner) return false
    const answer = readNeuroAnswer(raw)
    this.pending.delete(id); request.clean()
    if (!answer) { request.reject(new Error('Stage returned an invalid game decision')); return true }
    if (answer.ok) request.resolve(answer.action)
    else request.reject(new Error(answer.error))
    return true
  }

  speech(status: NeuroSpeech) {
    if (status.character !== this.character?.id) return
    for (const session of this.server?.sessions() ?? []) session.speechFinished({ isFinal: status.isFinal, ...(status.cancelled ? { cancelled: true, reason: 'interrupted' } : {}) })
  }

  private ready() { const owner = this.owner; return owner && this.deps.editor() === owner && !owner.isDestroyed() && !owner.isLoadingMainFrame() ? owner : null }
  private send(message: NeuroMessage) { this.ready()?.send('livliv:neuro-message', message) }
  private publish() { this.ready()?.send('livliv:neuro-state', this.state()) }
  private receive(event: NeuroEvent, session: NeuroSession) {
    const character = this.character?.id
    if (!character) return
    const source = session.game || 'Game', connection = session.id
    const context = (message: string, reply: 'never' | 'maybe' | 'always', id: string = randomUUID()) => this.send({ kind: 'context', id: `${connection}:${id}`, connection, character, source, message, reply })
    if (event.type === 'context') context(event.message, event.silent ? 'never' : 'maybe')
    else if (event.type === 'dialogue') {
      this.send({ kind: 'dialogue', id: `${connection}:${event.line.id}`, connection, character, started: event.speaking })
      if (event.speaking && event.line.text) context(`${event.line.speaker}: ${event.line.text}`, 'never', event.line.id)
    } else if (event.type === 'reply') context(`${event.line.speaker}: ${event.line.text ?? '(finished speaking)'}`, event.reply, `${event.line.id}:reply`)
    else if (event.type === 'action-result') context(`${event.name}: ${event.success ? 'succeeded' : 'failed'}${event.message ? ` — ${event.message}` : ''}`, 'never', event.id)
    else if (event.type === 'disconnect') this.send({ kind: 'disconnect', connection })
    this.publish()
  }

  private decide(request: ForceRequest, session: NeuroSession, signal: AbortSignal): Promise<{ name: string; data?: Record<string, Json> } | null> {
    const owner = this.ready(), character = this.character?.id
    if (!owner || !character || signal.aborted) return Promise.reject(signal.aborted ? signal.reason : new Error('Stage editor is not ready'))
    if (this.pending.size >= 4) return Promise.reject(new Error('Stage has too many pending game decisions'))
    if (!request.ephemeralContext) this.send({ kind: 'context', id: `${session.id}:${request.id}:context`, connection: session.id, character, source: session.game, message: [request.state, request.query].filter(Boolean).join('\n'), reply: 'never' })
    return new Promise((resolve, reject) => {
      const id = randomUUID(), timeout = this.deps.decisionTimeoutMs ?? 45_000, expires = Date.now() + timeout
      const cancel = (error: unknown) => { if (!this.pending.delete(id)) return; pending.clean(); this.send({ kind: 'cancel', id }); reject(error) }
      const abort = () => cancel(signal.reason)
      const pending: Pending = { owner, resolve: (value) => resolve(value as { name: string; data?: Record<string, Json> } | null), reject,
        timer: setTimeout(() => cancel(new Error('Stage game decision timed out')), timeout),
        clean: () => { clearTimeout(pending.timer); signal.removeEventListener('abort', abort) } }
      this.pending.set(id, pending); signal.addEventListener('abort', abort, { once: true })
      try { owner.send('livliv:neuro-message', { kind: 'decision', id, expires, connection: session.id,
        request: { character, source: session.game, state: request.state, query: request.query, actions: request.availableActions, priority: request.priority, silent: request.silent } } satisfies NeuroMessage) }
      catch (error) { cancel(error) }
      if (signal.aborted) abort()
    })
  }

  private async stop() {
    for (const [id, request] of this.pending) { request.clean(); this.send({ kind: 'cancel', id }); request.reject(new Error('Game integration stopped')) }
    this.pending.clear()
    const server = this.server
    for (const session of server?.sessions() ?? []) this.send({ kind: 'disconnect', connection: session.id })
    this.server = null; this.port = null
    try { await server?.close() }
    finally { this.character = null; this.publish(); this.owner = null }
  }
}
