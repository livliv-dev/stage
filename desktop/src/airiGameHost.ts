import { randomUUID } from 'node:crypto'
import { open } from 'node:fs/promises'
import { basename } from 'node:path'
import type { ExternalAction, ExternalSelection } from './neuroProtocol'
import type { AiriGameConfig, AiriGameConnection, AiriGameEvent, AiriGameFrame, AiriGameMessage, AiriGameSnapshot } from './airiGameProtocol'
import { validGamePort } from './airiGameProtocol'

const minecraftResources = ['WOOD_LOGS', 'DIRT', 'COBBLESTONE', 'COAL', 'RAW_IRON', 'RAW_COPPER', 'RAW_GOLD', 'DIAMOND', 'EMERALD', 'REDSTONE', 'LAPIS_LAZULI', 'QUARTZ']
const quantity = { type: 'integer', minimum: 1, maximum: 32 }
const name = { type: 'string', pattern: '^[a-z0-9_-]{1,80}$' }
const actions = {
  minecraft: [
    { name: 'collect_resource', description: 'Collect a supported Minecraft resource until inventory holds at least count units.', schema: { type: 'object', additionalProperties: false, required: ['resource', 'count'], properties: { resource: { type: 'string', enum: minecraftResources }, count: quantity } } },
    { name: 'obtain_item', description: 'Obtain a Minecraft item until inventory holds at least count units.', schema: { type: 'object', additionalProperties: false, required: ['item', 'count'], properties: { item: { type: 'string', description: 'A vanilla item ID such as minecraft:oak_planks' }, count: quantity } } },
  ],
  factorio: [
    { name: 'walk_to_entity', description: 'Walk to a nearby Factorio entity.', schema: { type: 'object', additionalProperties: false, required: ['entity'], properties: { entity: name } } },
    { name: 'mine_entity', description: 'Mine a Factorio resource entity.', schema: { type: 'object', additionalProperties: false, required: ['entity', 'count'], properties: { entity: name, count: quantity } } },
    { name: 'craft_item', description: 'Craft a Factorio item from the current inventory.', schema: { type: 'object', additionalProperties: false, required: ['item', 'count'], properties: { item: name, count: quantity } } },
  ],
} satisfies Record<AiriGameConfig['game'], ExternalAction[]>

type MinecraftCredentials = { port: number; token: string; processId?: number }
type OwnedMinecraftGoal = { bridge: MinecraftCredentials; execution: string; connection: string }
type Loopback = '127.0.0.1' | '[::1]'
type Session = {
  connection: AiriGameConnection
  controller: AbortController
  publish(event: AiriGameEvent): void
} & (
  | { game: 'minecraft'; bridge: MinecraftCredentials; vision: boolean; execution?: string; capture?: Promise<AiriGameFrame>; uncertain?: boolean }
  | { game: 'factorio'; rconPort: number; rconHost: Loopback; socket: WebSocket; recent: string[] }
)

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('游戏接口返回了无效数据')
  return value as Record<string, unknown>
}

const field = (value: unknown, limit = 180) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
const countOk = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 32
const factorioName = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,80}$/.test(value)
const goalPath = '/v1/agent/action-goals'
const goalUrl = (id: string) => goalPath + '?execution-id=' + encodeURIComponent(id)
const terminalGoalStates = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'IDLE']
const notice = (text: string, ...args: (string | number)[]): AiriGameMessage => ({ text, args })

async function discovery(path: string): Promise<MinecraftCredentials> {
  let file
  try { file = await open(path) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('找不到 Airicraft 的 bridge-state.json，请先启动 Fabric 客户端')
    throw error
  }
  try {
    const info = await file.stat()
    if (!info.isFile() || info.size > 4096) throw new Error('Airicraft 连接文件格式无效')
    const buffer = Buffer.alloc(4097)
    const { bytesRead } = await file.read(buffer)
    if (bytesRead > 4096) throw new Error('Airicraft 连接文件格式无效')
    const { port, token, processId } = object(JSON.parse(buffer.toString('utf8', 0, bytesRead)))
    if (!validGamePort(port) || typeof token !== 'string' || !/^[A-Za-z0-9_=.-]{16,256}$/.test(token)) {
      throw new Error('Airicraft 连接文件格式无效')
    }
    const pid = typeof processId === 'number' && Number.isInteger(processId) && processId > 0 && processId <= 0x7fffffff ? processId : undefined
    return { port, token, processId: pid }
  } finally { await file.close() }
}

async function json(port: number, path: string, signal: AbortSignal, options: { method?: string; token?: string; body?: object; host?: Loopback } = {}) {
  const { method = 'GET', token, body, host = '127.0.0.1' } = options
  const response = await fetch('http://' + host + ':' + port + path, {
    method, signal, redirect: 'error',
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const maxBytes = 12 * 1024 * 1024
  if (!response.body) throw new Error('游戏接口没有返回数据')
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = response.body.getReader()
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.length
      if (size > maxBytes) throw new Error('游戏接口返回的数据过大')
      chunks.push(part.value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const data = object(JSON.parse(Buffer.concat(chunks).toString('utf8')))
  if (!response.ok || data.error === true || typeof data.error === 'string') {
    throw new Error(field(data.message) || field(data.error) || '游戏接口响应错误', { cause: response.status })
  }
  return data
}

async function loopback<T>(signal: AbortSignal, connect: (host: Loopback) => Promise<T>): Promise<T> {
  try { return await connect('127.0.0.1') }
  catch (firstError) {
    signal.throwIfAborted()
    try { return await connect('[::1]') }
    catch { throw firstError }
  }
}

async function factorioSocket(port: number, host: Loopback, parent: AbortSignal) {
  const socket = new WebSocket('ws://' + host + ':' + port)
  const signal = AbortSignal.any([parent, AbortSignal.timeout(2500)])
  try {
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true, signal })
      socket.addEventListener('error', () => reject(new Error('连不上 Factorio Wrapper 的日志端口')), { once: true, signal })
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
    parent.throwIfAborted()
    return socket
  } catch (error) {
    socket.close()
    throw error
  }
}

function minecraft(bridge: MinecraftCredentials, path: string, signal: AbortSignal, method = 'GET', body?: object) {
  return json(bridge.port, path, AbortSignal.any([signal, AbortSignal.timeout(8000)]), { token: bridge.token, method, body })
}

function minecraftExited(bridge: MinecraftCredentials) {
  if (!bridge.processId) return false
  try { process.kill(bridge.processId, 0); return false }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH' }
}

async function minecraftFrame(bridge: MinecraftCredentials, signal: AbortSignal): Promise<AiriGameFrame> {
  const frame = await minecraft(bridge, '/v1/camera/screenshot', signal, 'POST')
  if (frame.format !== 'png' || typeof frame.imageBase64 !== 'string' || frame.imageBase64.length === 0) throw new Error('Airicraft 未返回有效画面')
  return { mimeType: 'image/png', data: frame.imageBase64 }
}

function send(session: Session, status: AiriGameEvent['status'], message: AiriGameMessage) {
  session.publish({ connection: session.connection.id, status, ...message })
}

function factorioLog(session: Extract<Session, { game: 'factorio' }>, data: unknown) {
  if (typeof data !== 'string' || data.length > 12_000) return
  // Factorio Wrapper broadcasts the vanilla stdout lines consumed by upstream's agent parser.
  const chat = data.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[CHAT\] (.+?): (.+)$/)
  if (chat) {
    if (chat[1] !== '<server>') send(session, 'chat', { text: field(chat[1], 32) + ': ' + field(chat[2], 250) })
    return
  }
  const log = data.match(/^\s*\d+(?:\.\d{3})? Script @__autorio__\/control\.lua:\d+: \[AUTORIO\] (.+)$/)?.[1]
  if (!log) return
  session.recent = [...session.recent, field(log, 220)].slice(-6)
  if (log === 'All operations completed') send(session, 'context', notice('Autorio 队列已清空，日志未提供单项结果'))
  else if (/\[ERROR\]|^Failed |^Cannot |^No .+ found/i.test(log)) send(session, 'context', { text: field(log, 240) })
}

export class AiriGameHost {
  private path: string
  private session: Session | null = null
  private opening: { id: string; controller: AbortController } | null = null
  private action: Promise<AiriGameMessage> | null = null
  private closing: Promise<void> | null = null
  private pendingGoal: OwnedMinecraftGoal | null = null

  constructor(path: string) { this.path = path }
  selectBridge(path: string) {
    this.path = path
    return basename(path)
  }

  needsClose() { return !!(this.session || this.opening || this.action || this.closing || this.pendingGoal) }

  async connect(config: AiriGameConfig, publish: Session['publish'], id: string = randomUUID()): Promise<AiriGameConnection> {
    if (this.session || this.opening || this.closing) throw new Error('请先断开当前游戏')
    const controller = new AbortController()
    const connection = { id, game: config.game, actions: actions[config.game] }
    const opening = { id, controller }
    this.opening = opening
    try {
      if (config.game === 'minecraft' && this.pendingGoal) await this.stop(this.pendingGoal.connection)
      controller.signal.throwIfAborted()
      if (config.game === 'minecraft') {
        const bridge = await discovery(this.path)
        controller.signal.throwIfAborted()
        const status = await minecraft(bridge, '/v1/status', controller.signal)
        if (status.worldLoaded !== true) throw new Error('请先在 Minecraft 进入游戏世界')
        controller.signal.throwIfAborted()
        this.session = { game: config.game, bridge, vision: config.vision, connection, controller, publish }
      } else {
        const signal = controller.signal
        const rconHost = await loopback(signal, async (host) => {
          await json(config.rconPort, '/api/v2/factorio/console/command/version', AbortSignal.any([signal, AbortSignal.timeout(2500)]), { host })
          return host
        })
        signal.throwIfAborted()
        const socket = await loopback(signal, (host) => factorioSocket(config.eventsPort, host, signal))
        const session = { game: config.game, rconPort: config.rconPort, rconHost, recent: [], socket, connection, controller, publish }
        socket.addEventListener('message', (message) => { if (this.session === session) factorioLog(session, message.data) })
        socket.addEventListener('close', () => {
          if (this.session !== session) return
          this.session = null
          controller.abort()
          send(session, 'disconnected', notice('Factorio Wrapper 已断开'))
        })
        this.session = session
      }
      return connection
    } finally { if (this.opening === opening) this.opening = null }
  }

  private current(id: string): Session {
    if (this.session?.connection.id !== id) throw new Error('游戏连接已关闭')
    return this.session
  }

  async snapshot(id: string, image: boolean): Promise<AiriGameSnapshot> {
    const session = this.current(id)
    if (session.game === 'factorio') return { state: session.recent.join('\n') }
    const { bridge, controller: { signal } } = session
    const status = await minecraft(bridge, '/v1/status', signal)
    if (status.worldLoaded !== true) throw new Error('Minecraft 已退出游戏世界')
    const state = [field(status.dimension), typeof status.focus === 'object' && status.focus ? JSON.stringify(status.focus).slice(0, 400) : ''].filter(Boolean).join(' · ')
    if (!image || !session.vision) return { state }
    const capture = session.capture ??= minecraftFrame(bridge, signal)
    try { return { state, frame: await capture } }
    finally { if (session.capture === capture) session.capture = undefined }
  }

  execute(id: string, choice: ExternalSelection): Promise<AiriGameMessage> {
    const session = this.current(id)
    if (session.game === 'minecraft' && session.uncertain) throw new Error('Minecraft 任务状态未知，请先在游戏内确认')
    if (this.action || (session.game === 'minecraft' && session.execution)) throw new Error('游戏正在执行一项任务')
    const action = this.executeOne(session, choice)
    this.action = action
    return action.finally(() => { if (this.action === action) this.action = null })
  }

  private async executeOne(session: Session, choice: ExternalSelection) {
    const data = choice.data ?? {}
    if (session.game === 'minecraft') {
      const { item, resource, count } = data
      if (!countOk(count)) throw new Error('Minecraft 任务数量应为 1 到 32')
      const goal = choice.name === 'collect_resource' && typeof resource === 'string' && minecraftResources.includes(resource)
        ? { kind: 'resource_collection', resourceKind: resource, quantity: count }
        : choice.name === 'obtain_item' && typeof item === 'string' && /^minecraft:[a-z0-9_]{1,80}$/.test(item)
          ? { kind: 'inventory_item', itemId: item, quantity: count } : null
      if (!goal) throw new Error('Minecraft 动作或参数不受支持')
      const signal = session.controller.signal
      const { session: current } = await minecraft(session.bridge, '/v1/agent/session', signal)
      const { mode, playerLifecycleState } = object(current)
      if (mode !== 'SINGLEPLAYER_LAN_HOST' && mode !== 'REMOTE_MULTIPLAYER') {
        throw new Error('Airicraft 需要连接 Minecraft 服务器或进入已开放的局域网存档才能执行任务')
      }
      if (playerLifecycleState !== 'ALIVE') throw new Error('请先让 Minecraft 玩家复活，再执行任务')
      signal.throwIfAborted()
      // Let an admitted POST return its ID even if Stage stops, so we can cancel only the task we own.
      let result
      try { result = await minecraft(session.bridge, goalPath, AbortSignal.timeout(8000), 'POST', goal) }
      catch (error) {
        session.uncertain = true
        throw new Error('Minecraft 未确认任务是否已提交，请先在游戏内检查', { cause: error })
      }
      const id = field(result.executionId, 120)
      if (result.admission !== 'started' || !id) throw new Error(field(result.message) || 'Airicraft 未接受该任务')
      const label = (typeof resource === 'string' ? resource : item) + ' × ' + count
      if (this.session !== session) {
        this.pendingGoal = { bridge: session.bridge, connection: session.connection.id, execution: id }
        await this.finishPendingGoal()
        throw new Error('游戏连接已关闭')
      }
      session.execution = id
      void this.watchGoal(session, id, label)
      return notice('Airicraft 已接受任务 {0}', label)
    }

    const { entity, item, count } = data
    let args: (string | number)[]
    if (choice.name === 'walk_to_entity' && factorioName(entity)) args = [entity, 50]
    else if (choice.name === 'mine_entity' && factorioName(entity) && countOk(count)) args = [entity, count]
    else if (choice.name === 'craft_item' && factorioName(item) && countOk(count)) args = [item, count]
    else throw new Error('Factorio 动作或参数不受支持')
    const call = [choice.name, ...args].map((arg) => JSON.stringify(arg)).join(',')
    const input = '/c if #game.connected_players ~= 1 then rcon.print("livliv_autorio_single_player"); return end; '
      + 'local r = remote.call("autorio_operations",' + call + '); '
      + 'local t = type(r) == "table"; rcon.print((r == true or (t and r[1] == true)) and "livliv_autorio_accepted" or tostring(t and r[2] or "livliv_autorio_rejected"))'
    const result = await json(session.rconPort, '/api/v2/factorio/console/command/raw', AbortSignal.any([session.controller.signal, AbortSignal.timeout(6000)]), { method: 'POST', body: { input }, host: session.rconHost })
    const output = field(result.output)
    if (output === 'livliv_autorio_single_player') throw new Error('Autorio 需要恰好一名在线玩家')
    if (output !== 'livliv_autorio_accepted') throw new Error(!output || output === 'livliv_autorio_rejected' ? 'Autorio 未确认任务' : output)
    return notice('Autorio 已接收任务 {0}', choice.name + ' ' + args.join(' '))
  }

  private async cancelGoal(bridge: MinecraftCredentials, id: string) {
    const result = await minecraft(bridge, goalUrl(id), AbortSignal.timeout(3500), 'DELETE')
    const state = field(result.state)
    if (!terminalGoalStates.includes(state)) throw new Error('Airicraft 未确认任务已结束')
    return state
  }

  private async finishPendingGoal() {
    const goal = this.pendingGoal
    if (!goal) return
    try { await this.cancelGoal(goal.bridge, goal.execution) }
    catch (error) { if (!minecraftExited(goal.bridge)) throw error }
    if (this.pendingGoal === goal) this.pendingGoal = null
  }

  private async watchGoal(session: Extract<Session, { game: 'minecraft' }>, id: string, label: string) {
    let status: AiriGameEvent['status'] = 'failed'
    let message = notice('无法确认 Airicraft 任务结果 {0}', label)
    try {
      const signal = AbortSignal.any([session.controller.signal, AbortSignal.timeout(120_000)])
      for (;;) {
        const result = await minecraft(session.bridge, goalUrl(id), signal)
        const state = field(result.state)
        if (state === 'SUCCEEDED') { status = 'done'; message = notice('Airicraft 已完成任务 {0}', label); break }
        if (terminalGoalStates.includes(state)) {
          message = { ...notice('Airicraft 任务结束 {0}', label), detail: field(result.message) || state }
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 1200))
        signal.throwIfAborted()
      }
    } catch (error) {
      if (session.execution === id && this.session === session) {
        try {
          if (await this.cancelGoal(session.bridge, id) === 'SUCCEEDED') {
            status = 'done'; message = notice('Airicraft 已完成任务 {0}', label)
          }
        }
        catch (cancelError) {
          status = 'unknown'
          message.detail = field((cancelError as Error).message)
        }
      }
      if (status === 'failed' && !(error instanceof Error && error.name === 'TimeoutError')) message.detail = field((error as Error).message)
    } finally {
      if (session.execution === id) {
        if (status !== 'unknown') session.execution = undefined
        if (this.session === session) send(session, status, message)
      }
    }
  }

  async cancel(id: string) {
    const session = this.current(id)
    if (session.game !== 'minecraft' || !session.execution) return
    const execution = session.execution
    const state = await this.cancelGoal(session.bridge, execution)
    if (this.session === session && session.execution === execution) {
      session.execution = undefined
      if (state === 'SUCCEEDED') send(session, 'done', notice('Airicraft 已完成当前任务'))
      else send(session, 'failed', state === 'CANCELLED' ? notice('Airicraft 已停止当前任务') : { ...notice('Airicraft 当前任务已结束'), detail: state })
    }
  }

  async stop(id?: string) {
    if (this.opening && (!id || this.opening.id === id)) {
      const opening = this.opening
      this.opening = null
      opening.controller.abort()
    }
    if (this.closing) { if (!id || this.pendingGoal?.connection === id) return this.closing; return }
    const session = this.session
    if (id && session?.connection.id !== id && (session || this.pendingGoal?.connection !== id)) return
    if (!session && !this.pendingGoal) return
    this.session = null
    session?.controller.abort()
    const action = this.action
    const closing = (async () => {
      if (session?.game === 'factorio') session.socket.close()
      else if (session?.execution) {
        this.pendingGoal = { bridge: session.bridge, connection: session.connection.id, execution: session.execution }
        session.execution = undefined
      }
      if (!id || this.pendingGoal?.connection === id) await this.finishPendingGoal()
      // An in-flight Minecraft POST still returns its own ID and cancels before settling.
      await action?.catch((error: unknown) => { if ((error as Error).message !== '游戏连接已关闭' && session?.game === 'minecraft') throw error })
    })()
    this.closing = closing
    try { await closing } finally { if (this.closing === closing) this.closing = null }
  }
}
