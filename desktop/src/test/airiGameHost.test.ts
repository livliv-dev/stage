import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer, type RequestListener } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { AiriGameHost } from '../airiGameHost'
import type { AiriGameEvent } from '#protocol/airiGame'

async function serve(t: TestContext, handler: RequestListener) {
  const server = createServer(handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  t.after(() => { server.closeAllConnections(); server.close() })
  return { port: address.port, server }
}

test('Airicraft uses native world state, the screenshot API, and only cancels its admitted goal', async (t) => {
  const path = join(await mkdtemp(join(tmpdir(), 'stage-airicraft-test-')), 'bridge-state.json')
  const token = 'airicraft-fixture-token-457'
  const seen: { method?: string; url?: string; body: string }[] = []
  let loaded = false, admission = 'existing', mode = 'SINGLEPLAYER_LOCAL', cancelState = 'CANCELLED'
  const { port } = await serve(t, async (req, res) => {
    const parts = []
    for await (const chunk of req) parts.push(chunk)
    seen.push({ method: req.method, url: req.url, body: Buffer.concat(parts).toString() })
    assert.equal(req.headers.authorization, 'Bearer ' + token)
    const result = req.url === '/v1/status' ? { worldLoaded: loaded, dimension: 'minecraft:overworld' }
      : req.url === '/v1/camera/screenshot' ? { format: 'png', imageBase64: 'aGVsbG8=' }
        : req.url === '/v1/agent/session' ? { session: { mode, playerLifecycleState: 'ALIVE' } }
          : req.method === 'POST' ? { admission, executionId: 'goal-17', state: 'RESOLVING', accepted: false }
            : { executionId: 'goal-17', state: req.method === 'DELETE' ? cancelState : 'WAITING_PRIMITIVE' }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result))
  })
  await writeFile(path, JSON.stringify({ port, token }))
  const host = new AiriGameHost(path), events: AiriGameEvent[] = []
  const connect = () => host.connect({ game: 'minecraft', vision: true }, (event) => events.push(event))
  await assert.rejects(connect(), /进入游戏世界/)
  loaded = true
  const connection = await connect()
  assert.doesNotMatch(JSON.stringify(connection), /fixture-token/)
  const snapshot = await host.snapshot(connection.id, true)
  assert.equal(snapshot.state, 'minecraft:overworld')
  assert.equal(snapshot.frame?.mimeType, 'image/png')
  const action = { name: 'collect_resource', data: { resource: 'WOOD_LOGS', count: 2 } }
  await assert.rejects(host.execute(connection.id, action), /连接 Minecraft 服务器/)
  assert.ok(seen.every((event) => event.url !== '/v1/agent/action-goals'))
  mode = 'REMOTE_MULTIPLAYER'
  await assert.rejects(host.execute(connection.id, action), /未接受/)
  assert.ok(seen.every((event) => event.method !== 'DELETE'))
  admission = 'started'
  assert.deepEqual(await host.execute(connection.id, action), { text: 'Airicraft 已接受任务 {0}', args: ['WOOD_LOGS × 2'] })
  assert.deepEqual(JSON.parse(seen.find((event) => event.url === '/v1/agent/action-goals')!.body),
    { kind: 'resource_collection', resourceKind: 'WOOD_LOGS', quantity: 2 })
  await host.stop('unrelated-session')
  assert.ok(seen.every((event) => event.method !== 'DELETE'))
  cancelState = 'WAITING_PRIMITIVE'
  await assert.rejects(host.stop(connection.id), /未确认任务已结束/)
  assert.equal(host.needsClose(), true)
  cancelState = 'CANCELLED'
  const replacement = await connect()
  const deletions = () => seen.filter((event) => event.method === 'DELETE').map((event) => event.url)
  assert.deepEqual(deletions(), Array(2).fill('/v1/agent/action-goals?execution-id=goal-17'))
  assert.deepEqual(events, [])
  await host.execute(replacement.id, action)
  cancelState = 'SUCCEEDED'
  await host.cancel(replacement.id)
  assert.deepEqual(events, [{ connection: replacement.id, status: 'done', text: 'Airicraft 已完成当前任务', args: [] }])
  await host.stop(replacement.id)

  const client = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  t.after(() => { if (client.exitCode === null && client.signalCode === null) client.kill() })
  assert.ok(client.pid)
  await writeFile(path, JSON.stringify({ port, token, processId: client.pid }))
  const oldClient = await connect()
  await host.execute(oldClient.id, action)
  cancelState = 'WAITING_PRIMITIVE'
  await assert.rejects(host.stop(oldClient.id), /未确认任务已结束/)
  const exited = once(client, 'exit')
  client.kill()
  await exited
  await writeFile(path, JSON.stringify({ port, token, processId: process.pid }))
  const newClient = await connect()
  await host.stop(newClient.id)
  assert.equal(host.needsClose(), false)
})

test('Factorio uses Wrapper stdout and sends only a validated Autorio operation to the official RCON endpoint', async (t) => {
  const api: { url?: string; input: string }[] = []
  const { port, server } = await serve(t, async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/v2/factorio/console/command/version') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"version":"2.0"}')
      return
    }
    const body = []
    for await (const chunk of req) body.push(chunk)
    api.push({ url: req.url, input: JSON.parse(Buffer.concat(body).toString()).input })
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"output":"livliv_autorio_accepted"}')
  })
  // ws is already the desktop's local game transport dependency.
  const sockets = new (require('ws').WebSocketServer)({ server })
  t.after(() => sockets.close())
  const host = new AiriGameHost('unused'), events: AiriGameEvent[] = []
  const connected = once(sockets, 'connection')
  const link = await host.connect({ game: 'factorio', eventsPort: port, rconPort: port }, (event) => events.push(event))
  t.after(() => host.stop(link.id))
  const [socket] = await connected
  const action = { name: 'mine_entity', data: { entity: 'iron-ore', count: 4 } }
  await assert.rejects(host.execute(link.id, { name: 'mine_entity', data: { entity: 'iron");game', count: 4 } }), /不受支持/)
  assert.equal(api.length, 0)
  assert.equal((await host.execute(link.id, action)).text, 'Autorio 已接收任务 {0}')
  assert.equal(api.at(0)?.url, '/api/v2/factorio/console/command/raw')
  assert.match(api.at(0)!.input, /remote\.call\("autorio_operations","mine_entity","iron-ore",4\)/)
  socket.send('2026-11-18 14:30:00 [CHAT] <server>: ignored')
  socket.send('2026-11-18 14:30:01 [CHAT] Player: ready')
  socket.send('42.535 Script @__autorio__/control.lua:920: [AUTORIO] All operations completed')
  for (let i = 0; i < 100 && events.length < 2; i++) await new Promise((resolve) => setTimeout(resolve, 20))
  assert.deepEqual(events.map(({ status }) => status), ['chat', 'context'])
  assert.match((await host.snapshot(link.id, false)).state, /All operations completed/)
  await host.stop(link.id)
})
