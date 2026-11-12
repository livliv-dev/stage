import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { createServer as httpServer } from 'node:http'

const root = fileURLToPath(new URL('..', import.meta.url))
const artifacts = await mkdtemp(join(tmpdir(), 'livliv-stage-browser-'))
let server, browser, voiceServer
let interruptedVoice = 0
const errors = [], calls = [], report = { artifacts }
let replyMode = 'ok', voiceMode = 'ok', asrSlow = false, asrCalls = 0
function wav(seconds = .7) {
  const rate = 24000, samples = Math.round(rate * seconds), data = Buffer.alloc(44 + samples * 2)
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22)
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin(i / rate * 440 * Math.PI * 2) * 6000 * Math.sin(i / samples * Math.PI)), 44 + i * 2)
  return data
}
async function serve() {
  if (process.env.STAGE_TEST_URL) return process.env.STAGE_TEST_URL
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--host', '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start')), 15000)
    server.stdout.on('data', (chunk) => { if (String(chunk).includes('Local:')) { clearTimeout(timer); resolve() } })
    server.once('exit', (code) => { clearTimeout(timer); reject(new Error('Vite exited ' + code)) })
  })
  return `http://127.0.0.1:${port}`
}
try {
  voiceServer = httpServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type')
    if (req.method === 'OPTIONS') { res.end(); return }
    res.writeHead(200, { 'content-type': 'audio/wav' })
    const bytes = wav(5); let at = 0
    const timer = setInterval(() => { const end = Math.min(bytes.length, at + 4800); res.write(bytes.subarray(at, end)); at = end; if (at === bytes.length) { clearInterval(timer); res.end() } }, 100)
    res.on('close', () => { clearInterval(timer); if (at < bytes.length) interruptedVoice++ })
  })
  await new Promise((resolve) => voiceServer.listen(0, '127.0.0.1', resolve))
  const voiceBase = `http://127.0.0.1:${voiceServer.address().port}`
  const origin = await serve()
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
  await context.addInitScript(() => localStorage.setItem('livliv-stage:locale', 'zh-Hans'))
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/fixture-ai/')) {
      if (url.pathname.endsWith('/chat/completions')) {
        const body = route.request().postDataJSON()
        calls.push(body)
        if (replyMode === 'slow') await new Promise((r) => setTimeout(r, 1500))
        await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '收到你的弹幕了，一起聊聊吧。', emotion: 'happy', action: 'nod', to: null, look: '观众' }) } }] } }).catch(() => {})
      } else if (url.pathname.endsWith('/audio/transcriptions')) { asrCalls++; if (asrSlow) await new Promise((r) => setTimeout(r, 1200)); await route.fulfill({ json: { text: 'fixture human voice' } }).catch(() => {})
      } else if (url.pathname.endsWith('/audio/speech')) {
        if (voiceMode === 'error') await route.fulfill({ status: 503, json: { error: { message: 'fixture voice failure' } } })
        else await route.fulfill({ status: 200, contentType: 'audio/wav', body: wav() })
      } else await route.fulfill({ json: { data: [{ id: 'fixture-model' }] } })
      return
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
  const state = () => page.evaluate(() => window.__stage.conversation())
  await page.goto(origin, { waitUntil: 'networkidle' })
  if (await page.locator('.coach button').count()) await page.getByRole('button', { name: '关闭上手引导', exact: true }).click()
  await page.getByRole('button', { name: /^面捕出镜/ }).click()
  await page.waitForFunction(() => window.__stage.actors.size === 1 && [...window.__stage.actors.values()].every((a) => a.status === 'ready' && a.inputPhase === 'on'), null, { timeout: 30000 })
  assert.equal(await page.locator('video.camera-preview').count(), 1)
  assert.equal(await page.locator('.console').count(), 0)
  assert.equal(calls.length, 0)
  await page.screenshot({ path: join(artifacts, 'solo-1440.png') })
  await page.setViewportSize({ width: 1280, height: 800 }); await page.screenshot({ path: join(artifacts, 'solo-1280.png') })
  await page.setViewportSize({ width: 1440, height: 900 })
  report.solo = 'sample, camera preview and no AI prerequisite'
  // Exercise graphical recovery through the visible reload action.
  await page.evaluate(() => { const a = [...window.__stage.actors.values()][0]; a.player.canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext() })
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await page.waitForFunction(() => [...window.__stage.actors.values()][0]?.status === 'ready')
  report.recovery = 'lost WebGL context reloads on a fresh canvas'
  await page.getByRole('button', { name: '模板', exact: true }).click()
  await page.getByRole('button', { name: /^AI 主播/ }).click()
  await page.waitForFunction(() => window.__stage.actors.size === 1 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
  await page.evaluate(async () => {
    const { saveBrainConfig } = await import('/src/brain.ts'); const { saveSpeech } = await import('/src/voiceApi.ts')
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
    saveSpeech({ provider: 'openai', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-tts', voice: 'alloy', asr: 'fixture-asr' })
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
  await page.getByRole('button', { name: 'AI 直播', exact: true }).click()
  const live = page.locator('.live-settings')
  await live.locator('.test-chat summary').click()
  await live.getByLabel('生成次数上限', { exact: true }).fill('0')
  assert.equal(await live.getByRole('button', { name: '开始 AI 直播', exact: true }).isEnabled(), false)
  await live.getByLabel('生成次数上限', { exact: true }).fill('2')
  await live.getByRole('button', { name: '开始 AI 直播', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().waitingAudience)
  await page.waitForTimeout(400); assert.equal(calls.length, 0, 'no audience means no paid model call')
  await live.getByRole('button', { name: '暂停', exact: true }).click()
  await live.getByLabel('模拟一条弹幕').fill('fixture message one')
  await live.getByRole('button', { name: '发送', exact: true }).click()
  await page.waitForTimeout(400); assert.equal(calls.length, 0, 'paused session does not generate')
  await live.getByRole('button', { name: '继续', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().turns === 1 && !window.__stage.conversation().speaking, null, { timeout: 15000 })
  assert.equal(calls.length, 1)
  assert.ok(!calls[0].messages[0].content.includes('fixture message one'))
  assert.ok(calls[0].messages[1].content.includes('fixture message one'))
  await live.getByLabel('模拟一条弹幕').fill('fixture message one'); await live.getByRole('button', { name: '发送', exact: true }).click()
  await page.waitForTimeout(300); assert.equal(calls.length, 1)
  await live.getByLabel('模拟一条弹幕').fill('fixture message two'); await live.getByRole('button', { name: '发送', exact: true }).click()
  await page.waitForFunction(() => !window.__stage.conversation().running && window.__stage.conversation().generations === 2, null, { timeout: 15000 })
  assert.equal(calls.length, 2); assert.match((await state()).ended, /次数上限/)
  await page.screenshot({ path: join(artifacts, 'ai-session.png') })
  report.live = 'wait, pause/resume, deduplication, separated audience input, voice and generation limit'
  // A model request stopped in flight cannot publish a late reply.
  replyMode = 'slow'
  await live.getByRole('button', { name: '开始 AI 直播', exact: true }).click()
  await live.getByLabel('模拟一条弹幕').fill('fixture stop in flight'); await live.getByRole('button', { name: '发送', exact: true }).click()
  await page.waitForFunction(() => !!window.__stage.conversation().thinking)
  const before = (await state()).lines.length
  await live.getByRole('button', { name: '停止 AI', exact: true }).click()
  await page.waitForTimeout(1800); assert.equal((await state()).lines.length, before); assert.equal((await state()).running, false)
  replyMode = 'ok'; voiceMode = 'error'
  await live.getByRole('button', { name: '开始 AI 直播', exact: true }).click()
  // a line whose voice fails was still answered: each failure needs a new message; the session goes on after a
  // wait (5 s, then 15 s) and stops at the third failure in a row or at its generation limit, the error kept visible
  for (const text of ['fixture voice fails 1', 'fixture voice fails 2', 'fixture voice fails 3']) { await live.getByLabel('模拟一条弹幕').fill(text); await live.getByRole('button', { name: '发送', exact: true }).click() }
  await page.waitForFunction(() => !window.__stage.conversation().running && !!window.__stage.conversation().error, null, { timeout: 60000 })
  assert.match((await state()).error, /服务/); assert.ok(await page.evaluate(() => window.__stage.conversation().ended)); voiceMode = 'ok'
  report.failures = 'stop cancels late model replies; a failing voice is counted per line and the live session stops visibly'
  await page.evaluate(async (base) => { const { saveSpeech } = await import('/src/voiceApi.ts'); saveSpeech({ provider: 'openai', base, key: 'test-only', model: 'fixture-tts', voice: 'alloy', asr: 'fixture-asr' }); await window.__stage.rec.start({ mic: false, talk: false }) }, voiceBase)
  await live.getByRole('button', { name: '开始 AI 直播', exact: true }).click()
  await live.getByLabel('模拟一条弹幕').fill('fixture partial recording'); await live.getByRole('button', { name: '发送', exact: true }).click()
  await page.waitForFunction(() => !!window.__stage.conversation().speaking)
  await page.waitForTimeout(700)
  await live.getByRole('button', { name: '停止 AI', exact: true }).click()
  report.interruptedRecording = await page.evaluate(async () => { await window.__stage.rec.stop(); const r = window.__stage.recording(); return { phase: r.phase, error: r.error, voiceError: [...window.__stage.actors.values()][0].voiceError, size: r.made?.file.size } })
  assert.equal(report.interruptedRecording.phase, 'done'); assert.equal(report.interruptedRecording.voiceError, ''); assert.ok(interruptedVoice > 0)
  await page.evaluate(async () => { const { saveSpeech } = await import('/src/voiceApi.ts'); saveSpeech({ provider: 'openai', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-tts', voice: 'alloy', asr: 'fixture-asr' }) })
  await live.getByRole('button', { name: '关闭', exact: true }).click()
  // Synthetic local assets exercise the same import and persistence path as user files.
  const vrm = [...await readFile(new URL('./fixtures/avatar.vrm', import.meta.url))]
  const imported = await page.evaluate(async (bytes) => {
    const { fromPngs, fromFiles } = await import('/src/library.ts'); const { store, newCharacter } = await import('/src/scene.ts')
    const canvas = new OffscreenCanvas(160, 240), ctx = canvas.getContext('2d'); ctx.fillStyle = '#77aadd'; ctx.fillRect(0, 0, 160, 240)
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const png = await fromPngs({ closed: new File([blob], 'closed.png'), open: new File([blob], 'open.png') }, 'PNG fixture')
    const vrm = await fromFiles([new File([new Uint8Array(bytes)], 'avatar.vrm')])
    return [png, vrm].map((pick, index) => { const c = newCharacter(store.get(), pick.name, pick.model, '', .22 + index * .56); c.lines = 'none'; c.driver = 'auto'; store.add(c); return c.id })
  }, vrm)
  await page.waitForFunction((ids) => ids.every((id) => window.__stage.actors.get(id)?.status === 'ready'), imported, { timeout: 20000 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction((ids) => ids.every((id) => window.__stage.actors.get(id)?.status === 'ready'), imported, { timeout: 20000 })
  report.formats = await page.evaluate(() => [...window.__stage.actors.values()].map((a) => ({ format: a.format, status: a.status })))
  assert.deepEqual(report.formats.map((x) => x.format).sort(), ['livliv', 'png', 'vrm'])
  await page.getByRole('button', { name: '输出到 OBS', exact: true }).click()
  const popup = page.waitForEvent('popup'); await page.getByRole('button', { name: '打开输出窗口', exact: true }).click()
  const output = await popup; output.on('pageerror', (e) => errors.push('output: ' + e.message))
  await output.waitForSelector('canvas.character'); await output.waitForTimeout(1000)
  assert.equal(await output.locator('canvas.character').count(), 3); assert.equal(await output.locator('.topbar').count(), 0)
  await output.screenshot({ path: join(artifacts, 'output-three-formats.png'), omitBackground: true }); await output.close()
  await page.evaluate(async () => { await window.__stage.rec.start({ mic: false, talk: false }) })
  await page.waitForTimeout(1200)
  await page.evaluate(async () => { const a = [...window.__stage.actors.values()].find((a) => a.item.lines === 'ai'); await a.speak('录制测试', 'happy', 'nod') })
  await page.waitForTimeout(400)
  report.recording = await page.evaluate(async () => { await window.__stage.rec.stop(); const r = window.__stage.recording(); return { phase: r.phase, error: r.error, size: r.made?.file.size, seconds: r.made?.seconds, type: r.made?.file.type } })
  assert.equal(report.recording.phase, 'done'); assert.ok(report.recording.size > 10000)
  await page.setViewportSize({ width: 1280, height: 800 }); await page.screenshot({ path: join(artifacts, 'workspace-1280.png') })
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  await page.waitForSelector('button.mic.listening')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  assert.equal(await page.locator('button.mic.listening').count(), 1, 'toggle recording keeps listening when the editor loses focus')
  await page.waitForTimeout(600)
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.text === 'fixture human voice'))
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ai-stop' }) })
  const linesBefore = (await state()).lines.length, callsBefore = asrCalls
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  await page.waitForSelector('button.mic.listening'); await page.waitForTimeout(500)
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }); command({ do: 'ai-stop' }) })
  await page.waitForTimeout(400); assert.equal(asrCalls, callsBefore, 'stop before recorder onstop prevents recognition')
  asrSlow = true
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  await page.waitForSelector('button.mic.listening'); await page.waitForTimeout(500)
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }); window.dispatchEvent(new Event('blur')) })
  for (let n = 0; asrCalls === callsBefore && n < 60; n++) await page.waitForTimeout(50)
  assert.equal(asrCalls, callsBefore + 1, 'recognition continues when returning to the game')
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ai-stop' }) })
  await page.waitForTimeout(1400); assert.equal((await state()).lines.length, linesBefore, 'late recognition cannot restart AI')
  asrSlow = false
  await page.evaluate(async () => {
    const native = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); let first = true
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (first) { first = false; await new Promise((resolve) => { window.releaseLateMic = resolve }); const stream = await native(constraints); window.lateTracks = stream.getTracks(); return stream }
      return native(constraints)
    }
    const { command } = await import('/src/desktop.ts'), { setInput } = await import('/src/devices.ts')
    setInput({ microphone: 'default' }); command({ do: 'ptt' }); command({ do: 'ai-stop' }); command({ do: 'ptt' })
    window.restoreMic = () => { navigator.mediaDevices.getUserMedia = native }
  })
  await page.waitForSelector('button.mic.listening')
  await page.evaluate(() => window.releaseLateMic())
  await page.waitForFunction(() => window.lateTracks?.every((track) => track.readyState === 'ended'))
  assert.equal(await page.locator('button.mic.listening').count(), 1, 'an old microphone opening cannot replace the new capture')
  await page.evaluate(async () => { window.restoreMic(); const { command } = await import('/src/desktop.ts'); command({ do: 'ai-stop' }) })
  report.ptt = 'global toggle records in the background and the second press transcribes'
  const manualCalls = calls.length, manualLines = (await state()).lines.length
  const humanId = await page.evaluate(() => { const c = [...window.__stage.actors.values()].find((a) => a.item.lines === 'ai').item; window.__stage.store.patch(c.id, { lines: 'me', driver: 'auto', readAloud: false }); return c.id })
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  await page.getByRole('button', { name: '结束语音输入', exact: true }).waitFor()
  await page.waitForTimeout(600); await page.getByRole('button', { name: '结束语音输入', exact: true }).click()
  await page.waitForFunction((before) => window.__stage.conversation().lines.length > before && !window.__stage.conversation().running, manualLines)
  assert.equal(calls.length, manualCalls); assert.equal((await state()).error, '')
  await page.evaluate((id) => window.__stage.store.patch(id, { lines: 'ai' }), humanId)
  report.manualCaptions = 'speech input adds a human caption without requiring or calling an AI model'
  await page.clock.install()
  await page.evaluate(() => window.__stage.talk.startLive({ minutes: 1, maxGenerations: 100, warmupSeconds: 0, textOnly: true }))
  asrSlow = true
  const deadlineLines = (await state()).lines.length, deadlineAsr = asrCalls
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  await page.waitForSelector('button.mic.listening'); await page.waitForTimeout(600)
  await page.evaluate(async () => { const { command } = await import('/src/desktop.ts'); command({ do: 'ptt' }) })
  for (let n = 0; asrCalls === deadlineAsr && n < 60; n++) await page.waitForTimeout(50)
  assert.equal(asrCalls, deadlineAsr + 1)
  await page.clock.fastForward(60_001)
  await page.waitForTimeout(1400)
  assert.equal((await state()).running, false); assert.match((await state()).ended, /时长上限/)
  assert.equal((await state()).lines.length, deadlineLines, 'recognition cannot restart an automatically ended live session')
  report.deadline = 'duration limit also cancels pending speech recognition'
  assert.deepEqual(errors, [])
  report.errors = errors
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  for (const context of browser?.contexts() ?? []) for (const page of context.pages()) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ error: String(error), errors, calls: calls.length, report }, null, 2))
  throw error
} finally { await browser?.close(); server?.kill('SIGTERM'); voiceServer?.closeAllConnections(); voiceServer?.close() }
