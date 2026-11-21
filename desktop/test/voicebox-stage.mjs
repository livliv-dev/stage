// Voicebox on this computer, as LivLiv Stage finds and uses it (against a stand-in Voicebox): not running, the 声音 item
// offers it; started, it is found and is the characters' voice with no other voice set, in a voice of an open engine
// (never HumeAI TADA unasked), each line in its language; a slow line still arrives; what you say is heard by its
// Whisper (the recording sent as `file`), which counts as your own recognition.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-voicebox-'))
const errors = [], generated = [], heard = []
let app, slow = 0
function wav(seconds = 0.6) {
  const samples = Math.round(24000 * seconds), buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 12) * 6000), 44 + i * 2)
  return buffer
}
const read = async (request) => { const parts = []; for await (const part of request) parts.push(part); return Buffer.concat(parts) }
const json = (response, value, status = 200) => response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(value))
// the model (a model of one's own) and LivLiv's API, signed out
const model = createServer(async (request, response) => {
  await read(request)
  if (request.url === '/fixture/chat/completions') return json(response, { choices: [{ message: { content: JSON.stringify({ text: '你好，我们开始吧。', emotion: 'happy', action: 'none' }) } }] })
  json(response, { signed_in: false, available: false })
})
// the stand-in Voicebox: a TADA voice listed first, then an open preset
const voicebox = createServer(async (request, response) => {
  const body = await read(request)
  if (request.url === '/profiles') return json(response, [
    { id: 'tada', name: 'Tada me', language: 'en', voice_type: 'cloned', default_engine: 'tada' },
    { id: 'lily', name: 'Lily', language: 'zh', voice_type: 'preset', preset_engine: 'kokoro' },
  ])
  if (request.url === '/generate/stream' && request.method === 'POST') {
    generated.push({ ...JSON.parse(body.toString()), at: Date.now() })
    if (slow) await new Promise((resolve) => setTimeout(resolve, slow))
    return response.writeHead(200, { 'content-type': 'audio/wav' }).end(wav())
  }
  if (request.url === '/transcribe' && request.method === 'POST') { heard.push(body.includes('name="file"')); return json(response, { text: '你好 Voicebox', duration: 1 }) }
  json(response, { detail: 'Not Found' }, 404)
})
const listen = (server, port = 0) => new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server.address().port)))
try {
  const origin = `http://127.0.0.1:${await listen(model)}`
  // Voicebox's address, known before it runs
  const port = await listen(voicebox); await new Promise((resolve) => voicebox.close(resolve))
  app = await electron.launch({
    executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
    args: [root, '--app=stage', '--user-data=' + join(artifacts, 'profile'), '--api=' + origin, '--stage-dir=' + process.env.STAGE_TEST_RESOURCES],
    env: { ...process.env, VOICEBOX_URL: `http://127.0.0.1:${port}` }, timeout: 30000,
  })
  const page = await app.firstWindow(); page.setDefaultTimeout(20000); page.on('pageerror', (error) => errors.push(error.message))
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true))
  await page.addInitScript((base) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    // Stage's own engine (AIRI off): this is about the voice
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base, key: '', model: 'fixture', airi: false }))
  }, origin + '/fixture')
  await page.reload()
  const voice = () => page.evaluate(() => { const v = window.__stage.voice, s = v.voicebox(); return { status: s.status, error: s.error, profiles: s.profiles.length, provider: v.activeSpeech().provider } })

  // not running: no voice for the characters, and the 声音 item offers Voicebox
  await page.locator('.start-page .goal-tile', { hasText: '和角色聊天' }).click()
  await page.waitForFunction(() => window.__stage.voice.voicebox().status === 'off')
  assert.deepEqual(await voice(), { status: 'off', error: 'not-running', profiles: 0, provider: '' })
  const voiceItem = page.locator('.popover.checklist .check', { hasText: '声音' })
  await voiceItem.locator('a.check-link[href="https://voicebox.sh"]', { hasText: '用 Voicebox' }).waitFor()

  // started: found, and the characters' voice; the 声音 item says which
  await listen(voicebox, port)
  await page.evaluate(() => window.__stage.voice.detectVoicebox())
  assert.deepEqual(await voice(), { status: 'on', error: null, profiles: 2, provider: 'voicebox' })
  await voiceItem.locator('small', { hasText: 'Voicebox · Lily' }).waitFor()
  assert.equal(await voiceItem.locator('a.check-link').count(), 0)
  await page.locator('.popover.checklist [data-close]').click()

  // a chat: the greeting said in Lily (an open engine), in Chinese
  await page.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && !c.speaking && c.lines.some((l) => !l.human) })
  assert.deepEqual(generated.map(({ profile_id, language, text }) => ({ profile_id, language, text })), [{ profile_id: 'lily', language: 'zh', text: '你好，我们开始吧。' }])
  const actorError = () => page.evaluate(() => [...window.__stage.actors.values()].find((a) => a.item.lines === 'ai')?.voiceError ?? '')
  assert.equal(await actorError(), '')

  // a slow Voicebox: the line waits for its voice, then is said
  slow = 2500
  const before = Date.now()
  await page.evaluate(() => window.__stage.talk.say('再说一句'))
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && !c.speaking && c.lines.filter((l) => !l.human).length >= 2 }, null, { timeout: 30000 })
  assert.ok(Date.now() - before >= 2500, 'the line waited for its voice')
  assert.equal(generated.length, 2); assert.equal(await actorError(), '')
  slow = 0
  await page.evaluate(() => window.__stage.talk.stop())

  // what you say, heard by its Whisper: your own recognition
  const said = await page.evaluate(async () => {
    const v = window.__stage.voice, wav = new Blob([new Uint8Array(44)], { type: 'audio/wav' })
    return { own: v.asrReady(v.activeSpeech()), text: await v.transcribeApi(v.activeSpeech(), wav) }
  })
  assert.deepEqual(said, { own: true, text: '你好 Voicebox' })
  assert.deepEqual(heard, [true], 'the recording went as `file`')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, generated: generated.length, heard: heard.length, artifacts }))
} finally {
  await app?.close()
  model.close(); voicebox.close()
}
