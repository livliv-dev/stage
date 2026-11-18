import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const command = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))
assert.ok(process.env.STAGE_TEST_RESOURCES, 'Point STAGE_TEST_RESOURCES to a Stage development build')
const artifacts = await mkdtemp(join(tmpdir(), 'livliv-airi-live-'))
const turns = [], synthesis = [], errors = []
const memoryCalls = [], gameCalls = [], sparkCalls = [], gameMessages = []
const fact = 'Private setting for Rally Nana. The owner has made this note just long enough to check that the complete text comes from the memory tool after reopening the session. Secret marker: APRICOT771.'
let app, gameSocket

// An actual rendered game page supplies frames. Only the OS window enumeration seam is replaced for reproducibility.
const game = 'data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><title>AIRI Rally</title>
<style>body{margin:0;background:#111827;color:white;font:700 38px system-ui}canvas{width:100vw;height:100vh}</style>
<canvas width="800" height="450"></canvas><script>
const c = document.querySelector('canvas').getContext('2d')
let red = 2, blue = 1
function draw() {
  c.fillStyle='#111827';c.fillRect(0,0,800,450);c.fillStyle='white';c.font='bold 48px system-ui';
  c.fillText('AIRI RALLY',240,75);c.fillText('RED '+red+'  :  '+blue+' BLUE',160,160);
  c.fillStyle='#f54b50';c.fillRect(150+red*90,240,120,50);
  c.fillStyle='#4384ff';c.fillRect(150+blue*90,330,120,50);
}
window.score = () => { blue++; draw(); return blue }
addEventListener('keydown',event=>{ if (event.code==='Space') window.score() });draw()
</script>`)

function voiceWav() {
  const rate = 16000, samples = rate * 2, buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(6000 * Math.sin(i * 0.08) * Math.sin(i * 0.0009) ** 2), 44 + i * 2)
  return buffer
}
const wav = voiceWav()
const chunk = (res, delta, finish_reason = null) => res.write('data: ' + JSON.stringify({
  id: 'chatcmpl-rally', object: 'chat.completion.chunk', model: 'rally-fixture', created: 1,
  choices: [{ index: 0, delta, finish_reason }],
}) + '\n\n')
const event = (res, content) => chunk(res, { content })
const finish = (res, reason = 'stop') => { chunk(res, {}, reason); res.end('data: [DONE]\n\n') }
const call = (res, name, args) => {
  chunk(res, { tool_calls: [{ index: 0, id: 'rally-tool', type: 'function', function: { name, arguments: JSON.stringify(args) } }] })
  finish(res, 'tool_calls')
}
const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) return res.setHeader('content-type', 'application/json').end('{"signed_in":false}')
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (req.url.endsWith('/audio/transcriptions')) return res.setHeader('content-type', 'application/json').end('{"text":"Hold on, what is the score now?"}')
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
    if (req.url.endsWith('/audio/speech')) {
      synthesis.push({ text: body.input, at: Date.now() })
      let speech = wav
      if (process.env.STAGE_TEST_VOICES === '1') {
        const file = join(artifacts, 'voice-' + synthesis.length)
        await command('/usr/bin/say', ['-v', 'Samantha', '-r', '168', '-o', file + '.aiff', body.input])
        await command('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', file + '.aiff', file + '.wav'])
        speech = await readFile(file + '.wav')
      }
      return res.writeHead(200, { 'content-type': 'audio/wav' }).end(speech)
    }
    if (!req.url.endsWith('/chat/completions')) return res.writeHead(404).end()
    const prompt = JSON.stringify(body.messages)
    const tools = body.tools?.map(({ function: tool }) => tool.name) ?? []
    assert.equal(body.stream, true)
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    if (prompt.includes('in a private LivLiv Stage conversation')) {
      memoryCalls.push(body)
      const last = body.messages.at(-1)
      if (last.role === 'tool') {
        assert.match(last.content, /APRICOT771/)
        event(res, 'I remember the private detail.')
      } else if (JSON.stringify(last).includes('Recall my private detail')) {
        assert.deepEqual(tools, ['builtIn_readMemory'])
        assert.doesNotMatch(prompt, /APRICOT771/)
        const id = prompt.match(/([0-9a-f-]{36}) Private setting for Rally Nana/)?.[1]
        assert.ok(id, 'The memory index must contain the durable ID')
        return call(res, 'builtIn_readMemory', { ids: [id] })
      } else event(res, 'I have your note.')
      return finish(res)
    }
    assert.doesNotMatch(prompt, /private-scope-fixture|APRICOT771|OldCardName/)
    if (tools.includes('select_game_action')) {
      gameCalls.push(body)
      assert.equal(body.tool_choice.function.name, 'select_game_action')
      assert.match(prompt, /Blue can use a boost/)
      return call(res, 'select_game_action', { name: 'boost', data: { team: 'blue' } })
    }
    if (prompt.includes('Another module "livliv-stage/game"') || tools.includes('builtIn_sparkNoResponse')) {
      sparkCalls.push(body)
      assert.match(prompt, /Race telemetry may be ignored/)
      if (body.messages.at(-1).role !== 'tool') {
        assert.deepEqual(tools, ['builtIn_sparkNoResponse'])
        return call(res, 'builtIn_sparkNoResponse', {})
      }
      event(res, 'This optional line must stay silent.')
      return finish(res)
    }
    const turn = { at: Date.now(), messages: body.messages, closed: null, finished: false }
    turns.push(turn)
    res.on('close', () => { turn.closed = Date.now() })
    if (turns.length === 1) {
      event(res, '<|ACT {"emotion":"happy","motion":"nod"}|> Red takes the lead. ')
      event(res, 'This unfinished sentence must never be recalled. ')
      event(res, 'The provider is still generating')
      return // The user interrupts while the provider is still generating.
    }
    if (turns.length === 2) {
      event(res, 'Blue ties the race. ')
      return finish(res)
    }
    event(res, 'Old character output. ')
  } catch (error) {
    errors.push(error.message)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const origin = 'http://127.0.0.1:' + server.address().port
const audioInput = join(artifacts, 'microphone.wav')
await writeFile(audioInput, wav)
const until = async (condition, message) => {
  for (let i = 0; i < 400; i++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error(message)
}

try {
  app = await electron.launch({
    executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
    args: [root, '--app=stage', '--user-data=' + join(artifacts, 'profile'), '--api=' + origin,
      '--stage-dir=' + process.env.STAGE_TEST_RESOURCES,
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + audioInput],
    timeout: 30000,
  })
  const page = await app.firstWindow()
  page.on('pageerror', (error) => errors.push(error.message))
  await app.evaluate(async ({ BrowserWindow, desktopCapturer }, url) => {
    BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true)
    const fixture = new BrowserWindow({ show: false, width: 800, height: 450, webPreferences: { backgroundThrottling: false } })
    await fixture.loadURL(url)
    globalThis.airiRally = fixture
    desktopCapturer.getSources = async () => [{ id: 'window:37422:0', name: 'AIRI Rally', thumbnail: await fixture.webContents.capturePage() }]
  }, game)
  await page.addInitScript((base) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans')
    localStorage.setItem('livliv-stage:coached', '1')
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base, key: '', model: 'rally-fixture', airi: true }))
    localStorage.setItem('livliv-stage:speech', JSON.stringify({ provider: 'custom', base, key: '', model: 'fixture', asr: 'fixture', voice: 'fixture' }))
  }, origin)
  await page.reload()
  await page.getByRole('button', { name: /^AI 主播/ }).click()
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((actor) => actor.status === 'ready'))
  const actorId = await page.evaluate(async () => {
    const stage = window.__stage
    const actor = [...stage.actors.values()][0]
    stage.store.patch(actor.item.id, {
      name: 'Rally Nana', cardName: 'OldCardName', persona: 'OldCardName follows the race.',
      voice: { ...actor.item.voice, source: 'api' },
    })
    await stage.talk.restore()
    await stage.talk.setScope('private')
    stage.talk.say('private-scope-fixture', { respond: false })
    return actor.item.id
  })
  const blockedPrivate = await page.evaluate(async () => {
    const output = new BroadcastChannel('livliv-stage')
    output.postMessage({ t: 'hello' })
    try {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await window.__stage.talk.startChat('private')
      return ''
    } catch (error) {
      return error.message
    } finally {
      output.postMessage({ t: 'bye' })
      output.close()
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  })
  assert.match(blockedPrivate, /请先关闭直播输出/)
  await page.getByRole('button', { name: '持续聊天', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.match(await page.evaluate(async () => {
    await window.__stage.rec.start({ mic: false, talk: false })
    return window.__stage.recording().error
  }), /请先结束 AIRI 私聊/)
  const ownerSays = async (text, reply) => {
    await page.getByLabel('你说的话').fill(text)
    await page.getByLabel('你说的话').press('Enter')
    await page.waitForFunction((text) => window.__stage.conversation().lines.some((line) => line.text === text), reply)
    await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  }
  await ownerSays('Remember ' + fact, 'I have your note.')
  assert.equal(memoryCalls.length, 1)
  await page.evaluate(async () => {
    const { talk } = window.__stage
    talk.stop()
    await talk.newChat()
    talk.say('New session after the remembered note.', { respond: false })
  })
  await page.getByRole('button', { name: '持续聊天', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  await ownerSays('Recall my private detail', 'I remember the private detail.')
  assert.equal(memoryCalls.length, 3)
  assert.ok(await page.evaluate(() => window.__stage.conversation().lines.some((line) => line.text === 'I remember the private detail.')))
  await page.evaluate(() => window.__stage.talk.stop())
  if (!await page.locator('.live-settings').count()) {
    await page.locator('.start-modes > summary').click()
    await page.getByRole('button', { name: 'AI 直播', exact: true }).click()
  }
  assert.equal(await page.getByLabel('内置 AIRI', { exact: true }).isChecked(), true)
  await page.getByRole('button', { name: '选择游戏窗口' }).click()
  await page.getByLabel('游戏画面').selectOption({ label: 'AIRI Rally' })
  await page.locator('.test-chat summary').click()
  await page.getByRole('button', { name: '开始 AI 直播', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().scope === 'public' && !!window.__stage.conversation().sessionId)
  await page.evaluate(() => {
    window.airiPlayback = []
    window.__stage.onHeard((sound) => { window.airiPlayback.push({ sound, at: Date.now() }) })
  })
  await page.evaluate(async () => { await window.__stage.rec.start({ mic: false, talk: false }) })
  assert.equal(await page.evaluate(() => window.__stage.recording().phase), 'recording')
  const recAt = await page.evaluate(() => performance.timeOrigin + window.__stage.recording().started)

  const send = async (text) => {
    await page.getByLabel('模拟一条弹幕').fill(text)
    await page.locator('.test-chat').getByRole('button', { name: '发送', exact: true }).click()
  }
  await send('Who is winning this race?')
  await page.waitForFunction(() => window.__stage.conversation().speaking?.text === 'Red takes the lead.')
  await page.waitForFunction(() => window.airiPlayback.length > 0)
  assert.equal(turns[0].closed, null, 'The first segment must play before the provider stream closes')
  const firstSoundMs = (await page.evaluate(() => window.airiPlayback[0].at)) - turns[0].at
  await page.waitForFunction(() => window.__stage.conversation().speaking?.text.includes('unfinished sentence'))
  await page.waitForFunction(() => window.airiPlayback.length > 1)
  await app.evaluate(async () => { await globalThis.airiRally.webContents.executeJavaScript('window.score()') })
  const scoreChange = Date.now() - recAt
  const mic = page.getByRole('button', { name: '按住说话', exact: true })
  await mic.hover()
  const interruptAt = Date.now()
  await page.mouse.down()
  await page.waitForFunction(() => document.querySelector('button.mic.listening'))
  await until(() => !!turns[0].closed, 'The microphone did not cancel the provider stream')
  await page.waitForFunction(() => window.airiPlayback[1].sound.stop !== null)
  await page.waitForTimeout(700)
  await page.mouse.up()

  await until(() => turns.length === 2, 'The transcribed interruption did not start a new turn')
  const prompt = JSON.stringify(turns[1].messages)
  assert.match(prompt, /You are .*Rally Nana/)
  assert.match(prompt, /Rally Nana follows the race/)
  assert.match(prompt, /Hold on, what is the score now/)
  assert.match(prompt, /Red takes the lead/)
  assert.doesNotMatch(prompt, /private-scope-fixture|OldCardName|unfinished sentence/)
  const image = (turn) => turn.messages.flatMap(({ content }) => Array.isArray(content) ? content : []).find((part) => part.type === 'image_url')?.image_url.url
  const firstFrame = image(turns[0]), secondFrame = image(turns[1])
  assert.match(firstFrame, /^data:image\/jpeg;base64,/)
  assert.match(secondFrame, /^data:image\/jpeg;base64,/)
  assert.notEqual(firstFrame, secondFrame)
  await writeFile(join(artifacts, 'game-before.jpg'), Buffer.from(firstFrame.split(',')[1], 'base64'))
  await writeFile(join(artifacts, 'game.jpg'), Buffer.from(secondFrame.split(',')[1], 'base64'))

  await page.waitForFunction(() => window.__stage.conversation().waitingAudience)
  const address = await page.evaluate(async (id) => {
    const { talk, actors } = window.__stage
    await talk.startChat('public', id)
    const { name, profileId } = actors.get(id).item
    return (await window.livlivDesktop.neuro.set({ enabled: true, port: 0, character: { id, name, profileId } })).url
  }, actorId)
  gameSocket = new WebSocket(address)
  gameSocket.addEventListener('message', ({ data }) => gameMessages.push(JSON.parse(String(data))))
  await once(gameSocket, 'open')
  const gameSend = (name, data) => gameSocket.send(JSON.stringify({ command: name, game: 'AIRI Rally', ...(data === undefined ? {} : { data }) }))
  gameSend('startup')
  await until(() => gameMessages.some((message) => message.command === 'startup'), 'The game did not connect to Stage')
  gameSend('actions/register', { actions: [{ name: 'boost', description: 'Boost one team', schema: {
    type: 'object', required: ['team'], additionalProperties: false, properties: { team: { type: 'string', enum: ['blue'] } },
  } }] })
  gameSend('actions/force', { query: 'Blue can use a boost', action_names: ['boost'], priority: 'high', silent: true })
  await until(() => gameMessages.some((message) => message.command === 'action'), 'AIRI did not choose a registered game action')
  const action = gameMessages.find((message) => message.command === 'action').data
  assert.equal(action.name, 'boost')
  assert.deepEqual(JSON.parse(action.data), { team: 'blue' })
  assert.equal(gameCalls.length, 1)
  assert.match(image(gameCalls[0]), /^data:image\/jpeg;base64,/)
  assert.equal(await app.evaluate(() => globalThis.airiRally.webContents.executeJavaScript('window.score()')), 3)
  const gameActionAt = Date.now() - recAt
  const actionFrame = await app.evaluate(async () => (await globalThis.airiRally.webContents.capturePage()).toJPEG(86).toString('base64'))
  await writeFile(join(artifacts, 'game-action.jpg'), Buffer.from(actionFrame, 'base64'))
  gameSend('action/result', { id: action.id, success: true, message: 'Blue is ahead 3–2.' })
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.text === 'boost: succeeded — Blue is ahead 3–2.'))
  gameSend('context', { message: 'Race telemetry may be ignored.', silent: false })
  await until(() => sparkCalls.length === 2, 'The game event did not run through AIRI Spark and its no-response tool')
  await page.waitForFunction(() => !window.__stage.conversation().thinking)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some((line) => line.text.includes('optional line'))), false)
  await page.evaluate(async () => { await window.__stage.rec.stop() })
  await page.waitForFunction(() => ['done', 'error'].includes(window.__stage.recording().phase), null, { timeout: 90_000 })
  const recording = await page.evaluate(async () => {
    const state = window.__stage.recording()
    if (state.phase !== 'done') return { error: state.error }
    const file = state.made.file
    return { missing: state.made.missing, data: [...new Uint8Array(await file.arrayBuffer())] }
  })
  assert.ok(recording.data?.length > 10_000, recording.error)
  assert.deepEqual(recording.missing, { sounds: 0, pictures: 0 })
  await writeFile(join(artifacts, 'stage.mp4'), Buffer.from(recording.data))

  await send('Cast change test')
  await until(() => turns.length === 3, 'Third model request did not start')
  await page.evaluate((id) => window.__stage.store.patch(id, { lines: 'me' }), actorId)
  await page.waitForFunction(() => !window.__stage.conversation().running)
  await until(() => !!turns[2].closed, 'The old actor request was not cancelled')
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking), null)
  assert.deepEqual(errors, [])
  const result = {
    artifacts, firstSoundMs, interruptMs: turns[0].closed - interruptAt, imageFrames: 2, liveTurns: turns.length,
    voice: process.env.STAGE_TEST_VOICES === '1' ? 'macOS Samantha' : 'fixture PCM',
    memoryRead: true, publicScope: true, privateOutputBlocked: true, gameAction: action.name, sparkQuiet: true,
    scoreChangeMs: Math.round(scoreChange), gameActionMs: Math.round(gameActionAt),
  }
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error('AIRI acceptance artifacts:', artifacts)
  await app?.windows()[0]?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  throw error
} finally {
  gameSocket?.close()
  await app?.close()
  server.closeAllConnections()
  server.close()
}
