import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-handsfree-native-'))
const requests = [], errors = [], report = { artifacts }
let app
function wav() {
  const samples = 7200, buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  return buffer
}
const backend = createServer(async (request, response) => {
  requests.push(request.url)
  if (request.url === '/fixture/chat/completions') {
    for await (const chunk of request) void chunk
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ text: '我听见了，我们继续。', emotion: 'happy', action: 'nod' }) } }] }))
  } else if (request.url === '/fixture/audio/speech') {
    for await (const chunk of request) void chunk
    response.writeHead(200, { 'content-type': 'audio/wav' }).end(wav())
  } else if (request.url === '/fixture/audio/transcriptions') {
    for await (const chunk of request) void chunk
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ text: '后台语音测试' }))
  } else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false }))
})
try {
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${backend.address().port}`
  app = await electron.launch({ executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [root, '--app=stage', '--stage-dir=' + (process.env.STAGE_TEST_RESOURCES || fileURLToPath(new URL('../../stage/dist', import.meta.url))), '--user-data=' + join(artifacts, 'profile'), '--api=' + origin, '--mute'], timeout: 30000 })
  const page = await app.firstWindow(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.message))
  await page.locator('.topbar').waitFor()
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext(), gain = context.createGain(), wave = context.createOscillator(), destination = context.createMediaStreamDestination()
      gain.gain.value = 0; wave.frequency.value = 220; wave.connect(gain); gain.connect(destination); wave.start(); await context.resume()
      window.microphone = { context, gain, stream: destination.stream }
      const track = destination.stream.getAudioTracks()[0], stop = track.stop.bind(track)
      track.stop = () => { stop(); void context.close() }
      return destination.stream
    }
    navigator.mediaDevices.enumerateDevices = async () => []
  })
  await page.evaluate((origin) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base: origin + '/fixture', key: 'fixture-only', model: 'fixture' }))
    localStorage.setItem('livliv-stage:speech', JSON.stringify({ provider: 'openai', base: origin + '/fixture', key: 'fixture-only', model: 'fixture', voice: 'fixture', asr: 'fixture' }))
  }, origin)
  await page.reload(); await page.getByRole('button', { name: /^AI 主播/ }).click()
  await page.waitForFunction(() => document.querySelector('canvas.character') && !document.querySelector('.badge'))
  const toggle = page.getByRole('button', { name: '免按键语音', exact: true })
  await toggle.click(); await page.waitForFunction(() => !!window.microphone)
  await page.locator('.chat-status').filter({ hasText: '等你说话' }).waitFor()
  await app.evaluate(async ({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; await new Promise((resolve) => { window.once('minimize', resolve); window.minimize() }) })
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized()), true)
  await page.evaluate(() => window.microphone.gain.gain.setValueAtTime(.12, window.microphone.context.currentTime))
  await new Promise((resolve) => setTimeout(resolve, 650))
  await page.evaluate(() => window.microphone.gain.gain.setValueAtTime(0, window.microphone.context.currentTime))
  await page.waitForFunction(() => document.body.textContent.includes('后台语音测试'))
  assert.equal(requests.filter((path) => path === '/fixture/audio/transcriptions').length, 1)
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true')
  report.background = 'minimized native Stage keeps capturing, transcribes through HTTP/IPC and saves the utterance'
  await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.restore(); window.focus() })
  await toggle.click(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')
  await page.screenshot({ path: join(artifacts, 'native-handsfree.png') })
  await page.reload(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  report.shutdown = 'closing releases the microphone and reloading leaves hands-free off'
  assert.deepEqual(errors, []); report.errors = errors
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ report, requests, errors, error: String(error) }, null, 2)); throw error
} finally { await app?.close(); backend.closeAllConnections(); backend.close() }
