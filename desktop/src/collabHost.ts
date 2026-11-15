import { networkInterfaces } from 'node:os'
import { startRelay, type Relay, type RelayOptions } from 'livliv-stage-collab'
import type { CollabConfig, CollabError, CollabState } from './collabProtocol'

type Editor = {
  isDestroyed(): boolean; isLoadingMainFrame(): boolean
  send(channel: string, value: unknown): void
  on(event: 'destroyed' | 'did-start-loading', listener: () => void): unknown
}
type Deps = { editor(): Editor | null; interfaces?: typeof networkInterfaces; start?: (options: RelayOptions) => Promise<Relay> }

/** The desktop owns the listener. No renderer, external Node process or saved setting starts it implicitly. */
export class CollabHost {
  private relay: Relay | null = null
  private network = true
  private error: CollabError | null = null
  private owner: Editor | null = null
  private watched = new WeakSet<Editor>()
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private deps: Deps) {}

  state(): CollabState {
    const port = this.relay?.address.port ?? null, localUrl = port === null ? null : `ws://127.0.0.1:${port}/room`
    const addresses = Object.values((this.deps.interfaces ?? networkInterfaces)()).flatMap((list) => list ?? [])
      .filter((entry) => entry.family === 'IPv4' && !entry.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address))
      .map((entry) => `ws://${entry.address}:${port}/room`)
    return { enabled: this.relay !== null, port, network: this.network, localUrl,
      urls: localUrl ? this.network ? [...new Set(addresses)] : [localUrl] : [], error: this.error }
  }

  start(config: CollabConfig): Promise<CollabState> {
    return this.run(async () => {
      if (this.relay) return this.state()
      const owner = this.deps.editor()
      if (!owner || owner.isDestroyed() || owner.isLoadingMainFrame()) throw new Error('Stage editor is not ready')
      this.owner = owner; this.network = config.network; this.error = null
      if (!this.watched.has(owner)) {
        this.watched.add(owner)
        const closed = () => { if (this.owner === owner) void this.close().catch((error: unknown) => console.error('[collab close]', error)) }
        owner.on('destroyed', closed); owner.on('did-start-loading', closed)
      }
      try { this.relay = await (this.deps.start ?? startRelay)({ host: config.network ? '0.0.0.0' : '127.0.0.1', port: config.port }) }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        this.error = code === 'EADDRINUSE' ? 'port-in-use' : code === 'EACCES' || code === 'EPERM' ? 'permission-denied' : 'start-failed'
        console.error('[collab start]', error)
      }
      this.publish()
      return this.state()
    })
  }

  close(): Promise<CollabState> {
    return this.run(async () => {
      if (this.relay) { await this.relay.close(); this.relay = null }
      this.error = null; this.publish(); this.owner = null
      return this.state()
    })
  }

  private run<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work)
    this.queue = operation.catch(() => {})
    return operation
  }
  private publish() {
    const owner = this.owner
    if (owner && owner === this.deps.editor() && !owner.isDestroyed() && !owner.isLoadingMainFrame()) owner.send('livliv:collab-state', this.state())
  }
}
