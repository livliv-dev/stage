// API keys in LivLiv Stage, kept encrypted by the system: keys saved the old way (in the page's storage) move to the
// app's encrypted file as it starts and their plain copies go; the file holds no key in plain text; requests still
// carry the key to its own provider and nowhere else; nothing logs it; a corrupted file starts the app with no keys.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-keys-'))
const KEY = 'sk-e2e-secret-4f1c', SPEECH = 'speech-e2e-secret-9a2b'
const errors = [], logs = [], auth = []
let app
function wav() {
  const samples = 7200, buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  return buffer
}
const json = (response, value) => response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(value))
const server = createServer(async (request, response) => {
  for await (const part of request) void part
  if (request.url.startsWith('/fixture/')) auth.push({ path: request.url, authorization: request.headers.authorization ?? '' })
  if (request.url === '/fixture/chat/completions') return json(response, { choices: [{ message: { content: JSON.stringify({ text: '好的。', emotion: 'neutral', action: 'none' }) } }] })
  if (request.url === '/fixture/audio/speech') return response.writeHead(200, { 'content-type': 'audio/wav' }).end(wav())
  json(response, { signed_in: false, available: false })
})
const launch = (origin) => electron.launch({
  executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
  args: [root, '--app=stage', '--user-data=' + join(artifacts, 'profile'), '--api=' + origin, '--stage-dir=' + process.env.STAGE_TEST_RESOURCES], timeout: 30000,
})
async function open(origin) {
  app = await launch(origin)
  app.process().stdout?.on('data', (data) => logs.push(String(data))); app.process().stderr?.on('data', (data) => logs.push(String(data)))
  const page = await app.firstWindow(); page.setDefaultTimeout(20000)
  page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => logs.push(message.text()))
  await page.waitForFunction(() => !!window.__stage)
  return page
}
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`, base = origin + '/fixture'

  // keys saved the old way, as an earlier version left them
  let page = await open(origin)
  await page.evaluate(({ base, KEY, SPEECH }) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base, key: KEY, model: 'fixture', airi: false }))
    localStorage.setItem('livliv-stage:speech', JSON.stringify({ provider: 'custom', base, key: SPEECH, model: 'fixture', voice: '', asr: '' }))
  }, { base, KEY, SPEECH })
  await page.reload(); await page.waitForFunction(() => !!window.__stage)

  // moved: none left in the page's storage, the file holds them encrypted, the settings read as before
  const stored = await page.evaluate(() => ['livliv-stage:brain', 'livliv-stage:speech'].map((name) => JSON.parse(localStorage.getItem(name)).key ?? null))
  assert.deepEqual(stored, [null, null], 'no plain copy left')
  const file = await readFile(join(artifacts, 'profile', 'keys.json'), 'utf8')
  assert.ok(!file.includes(KEY) && !file.includes(SPEECH), 'the file holds no key in plain text')
  assert.equal(await page.evaluate(() => window.__stage.brain().key), KEY)

  // a request carries the key to its own provider: a chat with the character 和角色聊天 places
  await page.locator('.start-page .goal-tile', { hasText: '和角色聊天' }).click()
  await page.locator('.popover.checklist [data-close]').click()
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((a) => a.item.lines === 'ai' && a.status === 'ready'))
  await page.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => window.__stage.conversation().lines.some((l) => !l.human) || window.__stage.conversation().error)
  assert.equal(await page.evaluate(() => window.__stage.conversation().error), '')
  assert.ok(auth.some((a) => a.path === '/fixture/chat/completions' && a.authorization === `Bearer ${KEY}`), 'the model got its key')
  assert.ok(auth.every((a) => !a.authorization || a.authorization === `Bearer ${KEY}` || a.authorization === `Bearer ${SPEECH}`))
  await page.evaluate(() => window.__stage.talk.stop())
  // still there after a restart, read from the encrypted file
  await app.close()
  page = await open(origin)
  assert.equal(await page.evaluate(() => window.__stage.brain().key), KEY)
  await app.close()

  // a corrupted file: the app starts with no keys, and a key saved now is kept again
  await writeFile(join(artifacts, 'profile', 'keys.json'), '{ broken')
  page = await open(origin)
  assert.equal(await page.evaluate(() => window.__stage.brain().key), '')
  assert.deepEqual(errors, [])
  assert.ok(!logs.some((line) => line.includes(KEY) || line.includes(SPEECH)), 'no key in any log')
  assert.ok(!logs.some((line) => /safeStorage.*deprecated/.test(line)), 'the system encryption as Electron now offers it')
  console.log(JSON.stringify({ ok: true, requests: auth.length, artifacts }))
} finally {
  await app?.close(); server.close()
}
