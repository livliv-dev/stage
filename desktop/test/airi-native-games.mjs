import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
assert.ok(process.env.STAGE_TEST_RESOURCES, 'Point STAGE_TEST_RESOURCES to a development renderer build')
const native = process.env.STAGE_TEST_MINECRAFT_BRIDGE
const vision = process.env.STAGE_TEST_VISION_API
const twitch = process.env.STAGE_TEST_TWITCH
const count = native ? Number(process.env.STAGE_TEST_MINECRAFT_LOGS ?? 2) : 2
assert.ok(Number.isInteger(count) && count >= 1 && count <= 32, 'Specify 1 to 32 logs')
const out = await mkdtemp(join(tmpdir(), 'livliv-airicraft-stage-'))
const command = promisify(execFile)
const requests = [], audio = [], errors = []
const key = 'test-airicraft-stage-token'
let app, worldTask, actionSelected, transcription = 0
const fakeFrame = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ZkAAAAASUVORK5CYII='
const json = (res, value) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value))

async function speech(text, name) {
  const file = join(out, name)
  await command('/usr/bin/say', ['-v', 'Samantha', '-r', '158', '-o', file + '.aiff', text])
  await command('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', file + '.aiff', file + '.wav'])
  return file + '.wav'
}
const recordedMic = await speech('What can you see near me now?', 'mic')

function sse(res, delta, finish_reason = null) {
  res.write('data: ' + JSON.stringify({ id: 'test-airicraft', model: 'visual-test', choices: [{ index: 0, delta, finish_reason }] }) + '\n\n')
}
const server = createServer(async (req, res) => {
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (req.url.endsWith('/audio/transcriptions')) { transcription++; return json(res, { text: 'What can you see near me now?' }) }
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
    if (req.url.startsWith('/api/')) return json(res, { signed_in: false })
    if (req.url.endsWith('/audio/speech')) {
      audio.push(body.input)
      return res.writeHead(200, { 'Content-Type': 'audio/wav' }).end(await readFile(await speech(body.input, 'voice-' + audio.length)))
    }
    if (req.url === '/v1/status') {
      assert.equal(req.headers.authorization, 'Bearer ' + key)
      return json(res, { worldLoaded: true, dimension: 'minecraft:overworld', focus: { type: 'block', blockId: 'minecraft:oak_log' } })
    }
    if (req.url === '/v1/agent/session') return json(res, { session: { mode: 'REMOTE_MULTIPLAYER', playerLifecycleState: 'ALIVE' } })
    if (req.url === '/v1/camera/screenshot') return json(res, { format: 'png', imageBase64: fakeFrame })
    if (req.url.startsWith('/v1/agent/action-goals')) {
      if (req.method === 'POST') {
        worldTask = Date.now()
        assert.deepEqual(body, { kind: 'resource_collection', resourceKind: 'WOOD_LOGS', quantity: count })
        return json(res, { admission: 'started', accepted: false, state: 'RESOLVING', executionId: 'game-1' })
      }
      return json(res, { state: req.method === 'DELETE' ? 'CANCELLED' : Date.now() - worldTask > 5000 ? 'SUCCEEDED' : 'WAITING_PRIMITIVE', executionId: 'game-1' })
    }
    if (!req.url.endsWith('/chat/completions')) return res.writeHead(404).end()
    const text = JSON.stringify(body.messages)
    const latest = JSON.stringify(body.messages.findLast(({ role }) => role === 'user')?.content)
    const tool = body.tools?.find((entry) => entry.function.name === 'select_game_action')
    const image = body.messages.flatMap(({ content }) => Array.isArray(content) ? content : []).find((part) => part.type === 'image_url')?.image_url?.url
    const request = { started: Date.now(), image: !!image, tool: !!tool, closed: 0, viewer: /Viewer [^":]+:/.test(latest), owner: latest?.includes('What can you see near me now') === true }
    requests.push(request)
    res.on('close', () => { request.closed = Date.now() })
    assert.doesNotMatch(text, /private-airicraft-marker/)
    if (image && request.viewer && requests.filter((entry) => entry.image && entry.viewer).length === 1) {
      await writeFile(join(out, 'minecraft-frame.png'), Buffer.from(image.split(',')[1], 'base64'))
      if (vision) await writeFile(join(out, 'viewer-request.json'), JSON.stringify(body))
    }
    if (tool) {
      assert.match(text, /Rally Nana|WOOD_LOGS/)
      actionSelected = Date.now()
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      sse(res, { tool_calls: [{ index: 0, id: 'action-1', type: 'function', function: { name: 'select_game_action',
        arguments: JSON.stringify({ name: 'collect_resource', data: { resource: 'WOOD_LOGS', count } }) } }] })
      sse(res, {}, 'tool_calls')
      return res.end('data: [DONE]\n\n')
    }
    if (vision) {
      const abort = new AbortController()
      res.on('close', () => abort.abort())
      const result = await fetch(vision.replace(/\/$/, '') + '/chat/completions', { method: 'POST',
        body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, signal: abort.signal })
      res.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/json' })
      if (result.body) Readable.fromWeb(result.body).on('error', () => res.end()).pipe(res)
      else res.end()
      return
    }
    if (body.tools?.length) return res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":{"message":"This model does not support tools"}}')
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    if (!request.owner) {
      sse(res, { content: 'We are near an oak tree. The path continues into the grass. ' })
      sse(res, { content: 'I can keep looking for more.' })
      return // The push-to-talk test must stop this response.
    }
    sse(res, { content: 'I can see a tree from here.' })
    sse(res, {}, 'stop')
    res.end('data: [DONE]\n\n')
  } catch (error) {
    if (!res.destroyed) {
      errors.push(error.message)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }
  }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const { port } = server.address()
const origin = 'http://127.0.0.1:' + port
const path = native || join(out, 'bridge-state.json')
if (!native) await writeFile(path, JSON.stringify({ port, token: key }))

try {
  app = await electron.launch({
    executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
    env: { ...process.env, AIRICRAFT_BRIDGE_STATE_FILE: path },
    args: [root, '--app=stage', '--user-data=' + join(out, 'profile'), '--api=' + origin, '--stage-dir=' + process.env.STAGE_TEST_RESOURCES,
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + recordedMic],
    timeout: 30_000,
  })
  const page = await app.firstWindow()
  page.on('pageerror', (error) => errors.push(error.message))
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true))
  await page.addInitScript((base) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base, key: '', model: 'visual-test' }))
    localStorage.setItem('livliv-stage:speech', JSON.stringify({ provider: 'custom', base, key: '', model: 'local-voice', asr: 'test', voice: 'Samantha' }))
  }, origin)
  await page.reload()
  // the start page's AI 来开播: its stage and checklist
  await page.locator('.start-page .goal-tile', { hasText: 'AI 来开播' }).locator('.goal-main').click()
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((actor) => actor.status === 'ready'))
  await page.evaluate(async () => {
    const { actors, store, talk, onHeard } = window.__stage
    const actor = [...actors.values()][0]
    store.patch(actor.item.id, { name: 'Rally Nana', voice: { ...actor.item.voice, source: 'api' } })
    await talk.setScope('private')
    talk.say('private-airicraft-marker', { respond: false })
    window.playback = []
    onHeard((sound) => window.playback.push({ at: Date.now(), sound }))
  })
  // the game: the checklist's 游戏 opens the 直播间 card; 开播 is the console's; while live the card (the status
  // line's 直播间) shows the game, its task and the viewers' messages
  const liveButton = page.locator('.status-line .st-tag', { hasText: '直播间' })
  await page.locator('.popover.checklist .check', { hasText: '游戏' }).getByRole('button', { name: '去设置', exact: true }).click()
  const panel = page.locator('.desktop-live-settings')
  await page.locator('.status-line .st-tag', { hasText: 'AIRI' }).waitFor()
  await panel.getByLabel('游戏连接').selectOption('minecraft')
  await panel.getByText('发送 Minecraft 画面给模型', { exact: true }).click()
  await page.screenshot({ path: join(out, 'airi-entry.png') })
  await page.locator('.console .start-button', { hasText: '开播' }).click()
  await liveButton.click()
  await page.getByText('游戏已连接', { exact: true }).waitFor()
  await page.screenshot({ path: join(out, 'airi-connected.png') })
  await panel.getByLabel('游戏指令').fill('Use Airicraft to bring the inventory up to ' + count + ' wood logs.')
  if (twitch) {
    await panel.getByLabel('Twitch 频道名').fill(twitch)
    await panel.getByRole('button', { name: '连接', exact: true }).click()
    await panel.locator('.chat li').first().waitFor({ timeout: 60_000 })
  } else {
    await panel.locator('.test-chat summary').click()
    await panel.getByLabel('模拟一条弹幕').fill('Describe the Minecraft scene in English.')
    await panel.locator('.test-chat').getByRole('button', { name: '发送', exact: true }).click()
  }
  await page.waitForFunction(() => window.playback.length > 0, null, { timeout: 45_000 })
  const firstPlayback = await page.evaluate(() => window.playback[0].at)
  assert.ok(requests.some((request) => request.viewer && request.image))
  await panel.getByRole('button', { name: '执行', exact: true }).click()
  await page.getByText(/Airicraft 已接受任务/).first().waitFor()
  assert.ok(actionSelected)
  const gameDuringSpeech = await page.evaluate(() => window.playback[0].sound.stop === null && window.__stage.conversation().game?.status === 'playing')
  assert.equal(gameDuringSpeech, true, 'A live game task was admitted while the role was still speaking')
  const mic = page.getByRole('button', { name: '按住说话', exact: true })
  await mic.hover()
  const interruptAt = Date.now()
  await page.mouse.down()
  await page.waitForFunction(() => document.querySelector('button.mic.listening'))
  await page.waitForFunction(() => window.playback[0].sound.stop !== null)
  const audioCutMs = Date.now() - interruptAt
  await page.waitForTimeout(650)
  await page.mouse.up()
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === 'What can you see near me now?'))
  await page.waitForFunction(() => window.playback.length > 1)
  await page.waitForFunction(() => window.__stage.conversation().game?.status === 'ready', null, { timeout: 125_000 })
  assert.ok(transcription)
  assert.ok(requests.some((request) => request.owner && request.image))
  const viewerRequest = requests.find((request) => request.viewer && request.image)
  if (!await panel.count()) await liveButton.click()
  const evidence = await page.evaluate(() => ({ gameResult: window.__stage.conversation().game?.text,
    spoken: window.__stage.conversation().lines.filter((line) => !line.human).map((line) => line.text).slice(-4) }))
  const report = { out, game: native ? 'Airicraft' : 'protocol fixture', replies: vision ? 'visual model' : 'stream fixture',
    viewer: twitch || 'simulated', gameDecision: 'tool-call fixture', firstPlaybackMs: firstPlayback - viewerRequest.started,
    interruptMs: viewerRequest.closed >= interruptAt ? viewerRequest.closed - interruptAt : null, microphoneInput: 'recorded voice with transcript fixture',
    audioCutMs, gameDuringSpeech, images: requests.filter((request) => request.image).length, ...evidence }
  await page.screenshot({ path: join(out, 'airi-live.png') })
  await writeFile(join(out, 'results.json'), JSON.stringify(report, null, 2))
  assert.match(evidence.gameResult, /Airicraft 已完成任务/)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error('AIRI test output:', out)
  await app?.windows()[0]?.screenshot({ path: join(out, 'failure.png') }).catch(() => {})
  throw error
} finally {
  await app?.close()
  server.closeAllConnections()
  server.close()
}
