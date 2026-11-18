import { airiModuleName, airiReply, announcedSelf, parseAiriEvent, stringifyAiriEvent, type AiriEvent, type AiriReply } from './airiProtocol'

export type AiriLinkPhase = 'connecting' | 'ready' | 'closed' | 'failed'

export class AiriClient {
  private socket: WebSocket | null = null
  private identity = ''
  private stopped = false
  private turn = 0
  ready = false
  currentBinding = ''
  private readonly options: {
    url: string
    token?: string
    timeoutMs?: number
    onReply: (reply: AiriReply) => void
    onSend?: (event: AiriEvent) => void
    onStatus?: (status: { phase: AiriLinkPhase; error?: string }) => void
  }

  constructor(options: AiriClient['options']) { this.options = options }

  connect() {
    this.identity = crypto.randomUUID()
    this.ready = false
    this.stopped = false
    this.options.onStatus?.({ phase: 'connecting' })
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.options.url)
      this.socket = socket
      let settled = false
      let timer = 0
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this.ready = false
        this.stopped = true
        this.options.onStatus?.({ phase: 'failed', error: error.message })
        reject(error)
        socket.close()
      }
      timer = setTimeout(() => fail(new Error('AIRI connection timed out')), this.options.timeoutMs ?? 8_000)
      const succeed = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        this.ready = true
        this.options.onStatus?.({ phase: 'ready' })
        resolve()
      }
      socket.addEventListener('open', () => {
        if (this.options.token) this.sendEvent({ type: 'module:authenticate', data: { token: this.options.token } })
        else this.announce()
      })
      socket.addEventListener('message', (message) => {
        if (typeof message.data !== 'string') return
        const event = parseAiriEvent(message.data)
        if (!event) return
        if (event.type === 'error') {
          const text = typeof event.data.message === 'string' ? event.data.message : 'AIRI rejected the connection'
          if (!this.ready) fail(new Error(text))
          else this.options.onStatus?.({ phase: 'failed', error: text })
          return
        }
        if (!this.ready && event.type === 'module:authenticated') {
          if (event.data.authenticated === true) this.announce()
          else fail(new Error('AIRI did not accept the token'))
          return
        }
        if (!this.ready && announcedSelf(event, this.identity)) { succeed(); return }
        if (event.type === 'transport:connection:heartbeat' && event.data.kind === 'ping') {
          this.sendEvent({ type: 'transport:connection:heartbeat', data: { kind: 'pong', message: '💛', at: Date.now() } })
          return
        }
        if (!this.ready) return
        const reply = airiReply(event)
        if (reply) this.options.onReply(reply)
      })
      socket.addEventListener('error', () => { if (!settled) fail(new Error('AIRI connection failed')) })
      socket.addEventListener('close', () => {
        clearTimeout(timer)
        this.ready = false
        if (!settled) fail(new Error('AIRI connection closed'))
        else if (!this.stopped) this.options.onStatus?.({ phase: 'closed' })
      })
    })
  }

  sendText(text: string) {
    const trimmed = text.trim()
    if (!this.ready || !trimmed) return false
    this.turn += 1
    this.currentBinding = `livliv-stage:${this.turn}`
    return this.sendEvent({ type: 'input:text', data: { text: [...trimmed].slice(0, 4000).join(''), overrides: { binding: this.currentBinding } } })
  }

  close() {
    this.stopped = true
    this.ready = false
    this.socket?.close()
    this.socket = null
  }

  private announce() {
    this.sendEvent({
      type: 'extension:module:announce',
      data: {
        name: airiModuleName(),
        identity: { id: this.identity, extension: { id: airiModuleName() } },
        possibleEvents: ['output:gen-ai:chat:complete', 'input:text'],
        dependencies: [],
      },
    })
  }

  private sendEvent(event: { type: string; data: Record<string, unknown> }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false
    const payload: AiriEvent = {
      type: event.type,
      data: event.data,
      metadata: {
        source: { kind: 'plugin', id: this.identity, extension: { id: airiModuleName() }, plugin: { id: airiModuleName() } },
        event: { id: crypto.randomUUID() },
      },
    }
    this.options.onSend?.(payload)
    this.socket.send(stringifyAiriEvent(payload))
    return true
  }
}
