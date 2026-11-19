import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const WebSocket = createRequire(new URL('../../neuro/package.json', import.meta.url))('ws')

// Exercise the production renderer, IPC adapter and actual local protocol server together.
const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-neuro-native-'))
const errors = [], requests = [], messages = [], report = { artifacts }
let app, game
const backend = createServer(async (request, response) => {
  if (request.url === '/fixture/chat/completions') {
    const chunks = []; for await (const chunk of request) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString()); requests.push(body)
    const action = body.messages[0].content.includes('选择一个可用动作')
    const content = action ? JSON.stringify({ name: 'move', data: { direction: 'left' } }) : JSON.stringify({ text: '看到了，我们继续。', emotion: 'happy', action: 'nod', to: null, look: 'camera' })
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ choices: [{ message: { content } }] }))
  } else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false }))
})
const until = async (read, predicate, message) => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) { const value = await read(); if (predicate(value)) return value; await new Promise((resolve) => setTimeout(resolve, 40)) }
  throw new Error(message)
}
try {
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${backend.address().port}`
  app = await electron.launch({ executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [root, '--app=stage', '--stage-dir=' + (process.env.STAGE_TEST_RESOURCES || fileURLToPath(new URL('../../stage/dist', import.meta.url))), '--user-data=' + join(artifacts, 'profile'), '--api=' + origin, '--mute'], timeout: 30000 })
  let page = await app.firstWindow(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.message))
  await page.locator('.topbar').waitFor()
  await page.evaluate((origin) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    // Stage's own engine: one desktop character would otherwise go to AIRI, whose game decisions airi-stage.mjs checks
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base: origin + '/fixture', key: 'fixture-only', model: 'fixture-model', airi: false }))
  }, origin)
  await page.reload(); await page.getByRole('button', { name: /^AI 主播/ }).click()
  await page.waitForFunction(() => document.querySelector('canvas.character') && !document.querySelector('.badge'))
  await page.locator('.panel label.switch').filter({ hasText: '静音角色声音' }).click()
  assert.equal((await page.evaluate(() => window.livlivDesktop.neuro.get())).enabled, false)
  await page.locator('.topbar button:has(svg.lucide-settings)').click()
  const panel = page.locator('.neuro-panel'); await panel.locator(':scope > details > summary').click()
  await panel.locator('.neuro-connection > summary').click(); await panel.getByLabel('本机端口（0 为自动）').fill('0')
  await panel.getByRole('button', { name: '开始游戏互动', exact: true }).click()
  const state = await until(() => page.evaluate(() => window.livlivDesktop.neuro.get()), (value) => value.enabled && value.port, 'local game interface did not open')
  assert.ok(state.url.startsWith('ws://127.0.0.1:'))
  await page.locator('.chat-status').filter({ hasText: '等你说话' }).waitFor()
  const initialCalls = requests.length
  game = new WebSocket(state.url); game.on('message', (data) => messages.push(JSON.parse(data.toString()))); await once(game, 'open')
  const send = (command, data) => game.send(JSON.stringify({ command, game: 'Local journey game', ...(data === undefined ? {} : { data }) }))
  send('startup')
  const startup = await until(() => messages.find((value) => value.command === 'startup'), Boolean, 'no startup response')
  assert.equal(startup.data.session.displayName, state.character.name)
  send('actions/register', { actions: [{ name: 'move', description: 'Choose a direction', schema: { type: 'object', required: ['direction'], additionalProperties: false, properties: { direction: { type: 'string', enum: ['left', 'right'] } } } }] })
  await until(() => page.evaluate(() => window.livlivDesktop.neuro.get()), (value) => value.connections[0]?.actions === 1, 'game actions did not reach desktop settings')
  send('context', { message: 'The key is on the left.', silent: true })
  send('actions/force', { query: 'Pick the key', action_names: ['move'], priority: 'high', silent: true })
  const action = await until(() => messages.find((value) => value.command === 'action'), Boolean, 'renderer did not return a game decision')
  assert.equal(action.data.name, 'move'); assert.deepEqual(JSON.parse(action.data.data), { direction: 'left' })
  send('action/result', { id: action.data.id, success: true, message: 'Key collected.' })
  await page.locator('.settings-head button[data-close]').click()
  await page.getByRole('button', { name: '对话记录', exact: true }).click()
  await page.getByText('move: succeeded — Key collected.', { exact: true }).waitFor()
  assert.equal(requests.length, initialCalls + 1); assert.equal(JSON.parse(requests.at(-1).messages[1].content).actions[0].name, 'move')
  report.integration = 'settings → public chat → local WebSocket → IPC → model decision → validated game action → result in conversation'
  await page.screenshot({ path: join(artifacts, 'game-result.png') })
  await page.locator('.topbar button:has(svg.lucide-settings)').click(); await panel.getByRole('button', { name: '关闭游戏接口', exact: true }).click()
  await until(() => game.readyState, (value) => value === WebSocket.CLOSED, 'disabling the integration did not close the game connection')
  assert.equal((await page.evaluate(() => window.livlivDesktop.neuro.get())).enabled, false)
  await page.reload(); assert.equal((await page.evaluate(() => window.livlivDesktop.neuro.get())).enabled, false)
  report.shutdown = 'closing the interface disconnects the game and a reload keeps the service off'
  assert.deepEqual(errors, []); report.errors = errors
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ report, errors, messages, requests, error: String(error) }, null, 2))
  throw error
} finally { game?.terminate(); await app?.close(); backend.closeAllConnections(); backend.close() }
