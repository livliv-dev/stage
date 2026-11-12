import { createSocket, type Socket } from 'node:dgram'
import { networkInterfaces } from 'node:os'
import { MotionDecoder, MotionPacketError } from './motionCodec'
import { defaultMotionSettings, lanIP, type MotionEvent, type MotionFrame, type MotionSettings, type MotionState } from './trackingProtocol'

export const IFACIAL_START = 'iFacialMocap_sahuasouryya9218sauhuiayeta91555dy3719|sendDataVersion=v2'
function addresses(scope: MotionSettings['scope']) {
  return scope === 'local' ? ['127.0.0.1'] : [...new Set(Object.values(networkInterfaces()).flatMap((list) => (list ?? []).filter((x) => x.family === 'IPv4' && !x.internal).map((x) => x.address)))].slice(0, 16)
}
const errorInfo = (error: unknown) => ({ code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'TRACKING_ERROR', message: error instanceof Error ? error.message : String(error) })

/** Optional UDP input, owned by the desktop shell. It sends only normalized motion to the editor. */
export class MotionInput {
  private config = defaultMotionSettings()
  private socket: Socket | null = null
  private listening = false
  private error: MotionState['error'] = null
  private peer: string | null = null
  private decoder = new MotionDecoder()
  private frame: MotionFrame | null = null
  private latestAt = 0
  private generation = 0
  private sequence = 0
  private packets = 0
  private discarded = 0
  private timer: NodeJS.Timeout | null = null
  private budgetAt = 0
  private budgetUsed = 0
  private queue = Promise.resolve()

  constructor(private emit: (event: MotionEvent) => void) {}
  state(): MotionState {
    return { settings: { ...this.config }, listening: this.listening, addresses: addresses(this.config.scope), source: this.peer, packets: this.packets, discarded: this.discarded,
      frame: this.frame && { ...this.frame, params: { ...this.frame.params } }, error: this.error && { ...this.error } }
  }
  configure(config: MotionSettings): Promise<MotionState> {
    const next = { ...config }
    const apply = async () => {
      await this.stopSocket()
      this.config = next; this.error = null; this.peer = null; this.frame = null; this.decoder = new MotionDecoder(); this.packets = 0; this.discarded = 0; this.sequence = 0; this.latestAt = 0
      if (next.enabled) {
        const generation = this.generation, socket = createSocket('udp4'); this.socket = socket
        let bound = false
        socket.on('message', (data, from) => { if (generation === this.generation && this.listening) this.receive(data, from.address, generation) })
        try {
          await new Promise<void>((resolve, reject) => {
            socket.on('error', (error) => {
              if (!bound) reject(error)
              else if (generation === this.generation) {
                this.error = errorInfo(error)
                void this.stopSocket().then(() => this.emit({ type: 'state', state: this.state() }), (cause) => { this.error = errorInfo(new Error('Tracking socket could not close', { cause })); this.emit({ type: 'state', state: this.state() }) })
              }
            })
            socket.once('listening', () => { bound = true; resolve() })
            socket.bind(next.port, next.scope === 'local' ? '127.0.0.1' : '0.0.0.0')
          })
          this.listening = true; socket.unref()
          if (next.kind === 'ifacial') await new Promise<void>((resolve, reject) => socket.send(IFACIAL_START, 49983, next.phone, (error) => error ? reject(error) : resolve()))
        } catch (error) { this.error = errorInfo(error); await this.stopSocket() }
      }
      this.emit({ type: 'state', state: this.state() })
    }
    const task = this.queue.then(apply, apply); this.queue = task
    return task.then(() => this.state())
  }
  private receive(data: Uint8Array, peer: string, generation: number) {
    const now = Date.now(), expected = this.config.kind === 'ifacial' ? this.config.phone : this.config.sender
    if (!lanIP(peer)) { this.discarded++; return }
    if (expected && peer !== expected) { this.discarded++; return }
    if (this.peer && peer !== this.peer && now - this.latestAt < 2000) { this.discarded++; return }
    if (now - this.budgetAt >= 1000) { this.budgetAt = now; this.budgetUsed = 0 }
    if (++this.budgetUsed > 12000 || !data.length || data.length > 16384) { this.discarded++; return }
    const decoder = this.peer && this.peer !== peer ? new MotionDecoder() : this.decoder
    let changed: boolean
    try { changed = this.config.kind === 'ifacial' ? decoder.ifacial(data) : decoder.osc(data) }
    catch (error) {
      if (!(error instanceof MotionPacketError)) { this.error = errorInfo(error); this.emit({ type: 'state', state: this.state() }) }
      this.discarded++; return
    }
    if (!changed || !Object.keys(decoder.pose).length) { this.discarded++; return }
    const first = this.peer !== peer
    this.peer = peer; this.decoder = decoder; this.latestAt = now; this.packets++
    if (first) this.emit({ type: 'state', state: this.state() })
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null
        if (generation !== this.generation || !this.listening || !this.peer) return
        this.frame = { source: this.config.kind + ':' + this.peer + ':' + generation, at: this.latestAt, sequence: ++this.sequence, params: this.decoder.pose, available: this.decoder.available }
        this.emit({ type: 'frame', frame: this.frame })
      }, 16)
      this.timer.unref()
    }
  }
  private async stopSocket() {
    this.generation++; this.listening = false
    if (this.timer) clearTimeout(this.timer); this.timer = null
    const socket = this.socket; this.socket = null
    if (!socket) return
    await new Promise<void>((resolve, reject) => {
      try { socket.close(() => resolve()) }
      catch (error) { if (errorInfo(error).code === 'ERR_SOCKET_DGRAM_NOT_RUNNING') resolve(); else reject(error) }
    })
  }
  async close() { await this.queue; await this.stopSocket(); this.frame = null; this.peer = null; this.emit({ type: 'state', state: this.state() }) }
}
