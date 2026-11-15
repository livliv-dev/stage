import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { record, validateSchema, validateData } from './schema.js'

const text = (value, max, empty = false) => typeof value === 'string' && (empty || value.length > 0) && value.length <= max
const names = value => Array.isArray(value) && value.length <= 128 && value.every(name => text(name, 80))
const clone = value => structuredClone(value)
const abortError = message => new DOMException(message, 'AbortError')
const local = address => address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
const abortable = (value, signal) => new Promise((resolve, reject) => {
  const abort = () => reject(signal.reason)
  if (signal.aborted) { reject(signal.reason); return }
  signal.addEventListener('abort', abort, { once: true })
  Promise.resolve(value).then(result => { signal.removeEventListener('abort', abort); resolve(result) }, error => { signal.removeEventListener('abort', abort); reject(error) })
})

/** Creating a bridge does not open a port. The host supplies the intelligence; this module owns the wire protocol. */
export function createNeuroServer(options) {
  if (!record(options) || !text(options.character?.id, 200) || !text(options.character?.name, 200)) throw new Error('A character id and name are required')
  if (['neuro', 'evil'].includes(options.character.id)) throw new Error('Use your own character id, not the Neuro twins\' ids')
  const maxConnections = options.maxConnections ?? 1, actionTimeoutMs = options.actionTimeoutMs ?? 20_000
  const maxForceAttempts = options.maxForceAttempts ?? 1, dialogueGraceMs = options.dialogueGraceMs ?? 100
  if (!Number.isInteger(maxConnections) || maxConnections < 1 || maxConnections > 16 || !Number.isInteger(actionTimeoutMs) || actionTimeoutMs < 1 || actionTimeoutMs > 120_000 || !Number.isInteger(maxForceAttempts) || maxForceAttempts < 1 || maxForceAttempts > 3 || !Number.isInteger(dialogueGraceMs) || dialogueGraceMs < 0 || dialogueGraceMs > 1000) throw new Error('Invalid bridge limits')
  const origins = options.allowedOrigins ?? []
  if (!Array.isArray(origins) || origins.some(origin => !text(origin, 2048))) throw new Error('Invalid allowed origins')
  const connections = new Map(), games = new Map()
  const http = createServer((_request, response) => { response.writeHead(404); response.end() })
  const ws = new WebSocketServer({ noServer: true, maxPayload: 65_536, perMessageDeflate: false })
  let listening = false, starting = null, closing = null
  const report = (error, sessionId) => {
    const value = error instanceof Error ? error : new Error(String(error))
    if (options.onError) options.onError(value, sessionId)
    else console.error('[neuro-bridge]', value.message)
  }
  http.on('upgrade', (request, socket, head) => {
    let host
    try { host = new URL(`http://${request.headers.host}`).hostname } catch { /* Rejected below. */ }
    const path = request.url?.split('?')[0]
    if (!local(socket.remoteAddress) || !['localhost', '127.0.0.1', '[::1]'].includes(host) || request.headers.origin !== undefined && !origins.includes(request.headers.origin) || !['/', '/game'].includes(path) || closing || connections.size >= maxConnections) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return
    }
    ws.handleUpgrade(request, socket, head, client => ws.emit('connection', client))
  })
  function gameState(game) {
    if (!games.has(game)) games.set(game, { active: new Map(), ended: new Set(), replyTimer: null })
    return games.get(game)
  }
  ws.on('connection', socket => {
    const id = randomUUID(), actions = new Map(), pending = new Map()
    let game = '', force = null, closed = false, queuedEvents = 0, eventQueue = Promise.resolve()
    const publish = event => {
      if (queuedEvents >= 128 && event.type !== 'disconnect') {
        report(new Error('Host event queue is full'), id)
        socket.close(1008, 'Host event queue is full')
        return Promise.resolve()
      }
      queuedEvents++
      // Keep context and registration events ordered without blocking the socket's result/cancellation path.
      eventQueue = eventQueue.then(() => {
        if (closed && !['disconnect', 'force-complete'].includes(event.type)) return
        return options.onEvent?.(clone(event), session)
      }).catch(error => report(error, id)).finally(() => { queuedEvents-- })
      return eventQueue
    }
    const send = message => {
      if (closed || socket.readyState !== WebSocket.OPEN) throw new Error('Game connection is closed')
      socket.send(JSON.stringify(message))
    }
    const cancelPending = reason => {
      force?.controller.abort(reason)
      force = null
      for (const item of pending.values()) item.finish(reason)
    }
    const session = {
      id,
      get game() { return game },
      get actions() { return clone([...actions.values()]) },
      get speaking() { return !!game && gameState(game).active.size > 0 },
      async perform(name, data, request = {}) {
        request.signal?.throwIfAborted()
        if (!game || closed) throw new Error('Game has not started or is disconnected')
        if (pending.size) throw new Error('An action is already waiting for a result')
        const action = actions.get(name)
        if (!action) throw new Error('Action is not registered')
        if (data !== undefined && !record(data)) throw new Error('Action data must be an object')
        validateData(action.schema ?? {}, data ?? {})
        let encoded
        if (data !== undefined) {
          encoded = JSON.stringify(data)
          if (Buffer.byteLength(encoded) > 32_768) throw new Error('Action data is too large')
          // Validate the serialized value too: custom serialization cannot bypass the declared schema.
          validateData(action.schema ?? {}, JSON.parse(encoded))
        }
        const timeoutMs = request.timeoutMs ?? actionTimeoutMs
        if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('Invalid action timeout')
        const actionId = randomUUID()
        return new Promise((resolve, reject) => {
          let timer
          const abort = () => finish(request.signal.reason)
          const finish = (error, result) => {
            if (!pending.delete(actionId)) return
            clearTimeout(timer); request.signal?.removeEventListener('abort', abort)
            if (error) reject(error); else resolve(result)
          }
          pending.set(actionId, { finish, name })
          request.signal?.addEventListener('abort', abort, { once: true })
          timer = setTimeout(() => finish(new Error('Game action result timed out')), timeoutMs)
          try { send({ command: 'action', data: { id: actionId, name, ...(encoded === undefined ? {} : { data: encoded }) } }) }
          catch (error) { finish(error) }
        })
      },
      speechFinished(status = { isFinal: true }) {
        if (typeof status.isFinal !== 'boolean' || status.cancelled !== undefined && typeof status.cancelled !== 'boolean' || status.reason !== undefined && !text(status.reason, 256, true)) throw new Error('Invalid speech completion')
        send({ command: 'speech_finished', data: clone(status) })
      },
    }
    connections.set(id, session)
    function endSpeech(speechId, reason) {
      const state = gameState(game), line = state.active.get(speechId)
      if (!line) return
      clearTimeout(line.timer); state.active.delete(speechId); state.ended.add(speechId)
      if (state.ended.size > 512) state.ended.delete(state.ended.values().next().value)
      void line.publish({ type: 'dialogue', speaking: false, line: line.data, reason })
      clearTimeout(state.replyTimer)
      if (!state.active.size && reason !== 'disconnected' && line.data.reply !== 'never' && (!line.data.responder || line.data.responder === options.character.id)) {
        state.replyTimer = setTimeout(() => {
          state.replyTimer = null
          if (!closed && !state.active.size) void publish({ type: 'reply', reply: line.data.reply, line: line.data })
        }, dialogueGraceMs)
      }
    }
    async function handleForce(data) {
      if (force) { report(new Error('Only one action force may run at a time'), id); return }
      const request = {
        id: randomUUID(), query: data.query, state: data.state ?? '', actionNames: [...new Set(data.action_names)],
        availableActions: session.actions.filter(action => data.action_names.includes(action.name)),
        ephemeralContext: data.ephemeral_context ?? false, priority: data.priority ?? 'low', silent: data.silent ?? false,
      }
      const active = { controller: new AbortController(), phase: 'deciding', names: request.actionNames }
      force = active
      try {
        await eventQueue
        for (let attempt = 1; attempt <= maxForceAttempts; attempt++) {
          active.controller.signal.throwIfAborted()
          const availableActions = session.actions.filter(action => request.actionNames.includes(action.name))
          if (!availableActions.length) throw new Error('No requested actions remain registered')
          active.phase = 'deciding'
          const selected = await abortable(options.decideAction?.({ ...clone(request), availableActions, attempt }, session, active.controller.signal), active.controller.signal)
          active.controller.signal.throwIfAborted()
          if (selected == null) { await publish({ type: 'force-complete', requestId: request.id, status: 'declined' }); return }
          if (!record(selected) || !request.actionNames.includes(selected.name)) throw new Error('Decision selected an unavailable action')
          active.phase = 'performing'
          const result = await session.perform(selected.name, selected.data, { signal: active.controller.signal })
          await publish({ type: 'action-result', requestId: request.id, attempt, ...result })
          if (result.success || attempt === maxForceAttempts) {
            await publish({ type: 'force-complete', requestId: request.id, status: result.success ? 'succeeded' : 'failed' }); return
          }
        }
      } catch (error) {
        if (!active.controller.signal.aborted) report(error, id)
        await publish({ type: 'force-complete', requestId: request.id, status: active.controller.signal.aborted ? 'cancelled' : 'error', error: error instanceof Error ? error.message : String(error) })
      } finally { if (force === active) force = null }
    }
    socket.on('message', (raw, binary) => {
      if (binary || closed) return
      let message
      try { message = JSON.parse(raw.toString()) } catch { return }
      if (!record(message) || !text(message.game, 200) || !text(message.command, 80)) return
      if (message.command === 'startup') {
        if (game && message.game !== game) return
        if (game) {
          const state = gameState(game)
          clearTimeout(state.replyTimer); state.replyTimer = null
          for (const [speechId, line] of state.active) {
            line.owners.delete(id)
            if (!line.owners.size) endSpeech(speechId, 'disconnected')
          }
        }
        cancelPending(abortError('Game restarted')); actions.clear(); game = message.game
        send({ command: 'startup', data: { session: { sessionId: id, characterId: options.character.id, displayName: options.character.name } } })
        void publish({ type: 'startup', game }); return
      }
      if (!game || message.game !== game || !record(message.data)) return
      const data = message.data
      switch (message.command) {
        case 'context':
          if (text(data.message, 32_768) && typeof data.silent === 'boolean') void publish({ type: 'context', message: data.message, silent: data.silent })
          break
        case 'actions/register': {
          if (!Array.isArray(data.actions) || data.actions.length > 128) return
          const next = new Map(actions)
          try {
            for (const action of data.actions) {
              if (!record(action) || !/^[a-z][a-z0-9_-]{0,79}$/.test(action.name) || !text(action.description, 4000, true)) throw new Error('Invalid action registration')
              if (action.schema !== undefined) {
                validateSchema(action.schema)
                if (Object.keys(action.schema).length && action.schema.type !== 'object') throw new Error('Top-level action schema must be an object')
              }
              next.set(action.name, clone({ name: action.name, description: action.description, ...(action.schema === undefined ? {} : { schema: action.schema }) }))
            }
            if (next.size > 128) throw new Error('Too many actions')
          } catch (error) { report(error, id); return }
          actions.clear(); for (const [name, action] of next) actions.set(name, action)
          void publish({ type: 'actions', actions: session.actions }); break
        }
        case 'actions/unregister':
          if (!names(data.action_names)) return
          for (const name of data.action_names) actions.delete(name)
          if (force?.phase === 'deciding' && !force.names.some(name => actions.has(name))) force.controller.abort(abortError('Requested actions were unregistered'))
          void publish({ type: 'actions', actions: session.actions }); break
        case 'actions/force':
          if (!text(data.query, 16_384) || data.state !== undefined && !text(data.state, 32_768, true) || !names(data.action_names) || !data.action_names.length || data.ephemeral_context !== undefined && typeof data.ephemeral_context !== 'boolean' || data.silent !== undefined && typeof data.silent !== 'boolean' || data.priority !== undefined && !['low', 'medium', 'high', 'critical'].includes(data.priority)) return
          void handleForce(data); break
        case 'action/result': {
          if (!text(data.id, 256) || typeof data.success !== 'boolean' || data.message !== undefined && !text(data.message, 4000, true)) return
          const item = pending.get(data.id)
          item?.finish(null, { id: data.id, name: item.name, success: data.success, ...(data.message === undefined ? {} : { message: data.message }) }); break
        }
        case 'speech/started': {
          if (!text(data.id, 256) || !text(data.speaker, 200) || data.text !== undefined && !text(data.text, 4000, true) || data.expected_duration_ms !== undefined && (!Number.isInteger(data.expected_duration_ms) || data.expected_duration_ms < 0 || data.expected_duration_ms > 600_000) || data.reply !== undefined && !['never', 'maybe', 'always'].includes(data.reply) || data.responder !== undefined && !text(data.responder, 200)) return
          const state = gameState(game), existing = state.active.get(data.id)
          if (state.ended.has(data.id)) return
          if (existing) { existing.owners.add(id); return }
          if (state.active.size >= 32) return
          clearTimeout(state.replyTimer); state.replyTimer = null
          const line = { id: data.id, speaker: data.speaker, ...(data.text === undefined ? {} : { text: data.text }), reply: data.reply ?? 'maybe', ...(data.responder === undefined ? {} : { responder: data.responder }) }
          const timer = setTimeout(() => endSpeech(data.id, 'timeout'), (data.expected_duration_ms ?? 30_000) + 1000)
          state.active.set(data.id, { data: line, timer, owners: new Set([id]), publish })
          void publish({ type: 'dialogue', speaking: true, line }); break
        }
        case 'speech/ended':
          if (text(data.id, 256)) endSpeech(data.id, 'ended')
          break
      }
    })
    socket.on('error', error => report(error, id))
    socket.on('close', () => {
      closed = true; cancelPending(abortError('Game disconnected')); connections.delete(id)
      if (game) {
        const state = gameState(game)
        clearTimeout(state.replyTimer); state.replyTimer = null
        for (const [speechId, line] of state.active) {
          line.owners.delete(id)
          if (!line.owners.size) endSpeech(speechId, 'disconnected')
        }
        if (![...connections.values()].some(other => other.game === game)) games.delete(game)
      }
      actions.clear(); void publish({ type: 'disconnect' })
    })
  })
  return {
    sessions: () => [...connections.values()],
    listen(port = 0) {
      if (closing || listening || !Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('Invalid port or server state')
      listening = true
      starting = (async () => {
        try {
          await new Promise((resolve, reject) => {
            const error = failure => { http.off('listening', ready); reject(failure) }
            const ready = () => { http.off('error', error); resolve() }
            http.once('error', error); http.once('listening', ready); http.listen(port, '127.0.0.1')
          })
        } catch (error) { listening = false; throw error }
        const address = http.address()
        return { host: '127.0.0.1', port: address.port, url: `ws://127.0.0.1:${address.port}/game` }
      })()
      return starting
    },
    close() {
      closing ??= (async () => {
        if (starting) await starting.catch(() => {}) // A failed listen has no socket to close.
        for (const client of ws.clients) client.terminate()
        for (const state of games.values()) { clearTimeout(state.replyTimer); for (const line of state.active.values()) clearTimeout(line.timer) }
        await new Promise(resolve => ws.close(resolve))
        if (listening) await new Promise((resolve, reject) => http.close(error => error ? reject(error) : resolve()))
        listening = false
      })()
      return closing
    },
  }
}
