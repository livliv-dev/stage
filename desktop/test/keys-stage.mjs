// API keys and the sign-in in LivLiv Stage, kept encrypted by the system: those saved the old way (in the page's
// storage) move to the app's encrypted file as it starts, each removed from the page's storage once written; the file
// holds none in plain text; requests still carry the key to its own provider and nowhere else; a save whose write fails
// keeps its plain copy, which moves on the next start; 清除 in the settings deletes a key from the file; signing out and
// clearing a key stick even when the delete fails to write (the old ones never come back from the file, and are deleted
// on a later start); a key the app can't decrypt any more is reported; nothing logs them; a corrupted file starts the
// app with no keys.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-keys-'))
const KEY = 'sk-e2e-secret-4f1c', SPEECH = 'speech-e2e-secret-9a2b', TOKEN = 'app.e2e-session-77c1', SECOND = 'sk-e2e-second-7d3e'
const errors = [], logs = [], auth = [], me = []
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
  if (request.url === '/api/me') { me.push(request.headers.authorization ?? ''); return json(response, request.headers.authorization === `Bearer ${TOKEN}` ? { signed_in: true, email: 'e2e@example.test', points: 0 } : { signed_in: false }) }
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

  // moved: none left in the page's storage once written, the file holds them encrypted, the settings read as before
  await page.waitForFunction(() => ['livliv-stage:brain', 'livliv-stage:speech'].every((name) => JSON.parse(localStorage.getItem(name)).key === undefined))
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

  // 清除 in Settings › 连接: each key goes from the encrypted file (the delete the app does for any key emptied); the model
  // and the speech API stay chosen; after a restart neither key comes back
  page = await open(origin)
  await page.locator('.topbar button[title="设置"]').click()
  await page.locator('.settings-tabs button', { hasText: '连接' }).click()
  for (const section of ['model', 'speech']) await page.locator(`[data-section="${section}"] button.clear-key`).click()
  const stored = async () => Object.keys(JSON.parse(await readFile(join(artifacts, 'profile', 'keys.json'), 'utf8')).values)
  for (let i = 0; i < 50 && (await stored()).some((name) => ['livliv-stage:brain', 'livliv-stage:speech'].includes(name)); i++) await new Promise((resolve) => setTimeout(resolve, 100))
  assert.deepEqual((await stored()).filter((name) => ['livliv-stage:brain', 'livliv-stage:speech'].includes(name)), [], '清除 deletes them from the encrypted file')
  assert.equal(await page.evaluate(() => localStorage.getItem('livliv-stage:keys-cleared')), null, 'the deletes were written: no marks left')
  await app.close()
  page = await open(origin)
  assert.deepEqual(await page.evaluate(() => [window.__stage.brain().key, window.__stage.brain().model, window.__stage.voice.activeSpeech().key]), ['', 'fixture', ''], 'after a restart: no key, the model still chosen')
  await app.close()

  // the sign-in saved the old way moves too, and still signs in after a restart
  page = await open(origin)
  await page.evaluate((TOKEN) => localStorage.setItem('livliv-stage:session', TOKEN), TOKEN)
  await page.reload(); await page.waitForFunction(() => !!window.__stage)
  await page.waitForFunction(() => localStorage.getItem('livliv-stage:session') === null)
  assert.ok(!(await readFile(join(artifacts, 'profile', 'keys.json'), 'utf8')).includes(TOKEN), 'the file holds no sign-in in plain text')
  await app.close(); me.length = 0
  page = await open(origin)
  await page.waitForFunction(() => window.__stage.brain().key !== undefined)
  for (let i = 0; i < 100 && !me.length; i++) await new Promise((resolve) => setTimeout(resolve, 100))
  assert.equal(me[0], `Bearer ${TOKEN}`, 'signed in from the encrypted file')

  // a save whose write fails (a file in the way): the plain copy stays, and moves on the next start
  await mkdir(join(artifacts, 'profile', 'keys.json.tmp'))
  await page.evaluate((key) => { const b = window.__stage.brain(); window.__stage.keys.saveBrain({ ...b, key }) }, SECOND)
  await new Promise((resolve) => setTimeout(resolve, 1500))
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('livliv-stage:brain')).key), SECOND, 'not written: kept in the page\'s storage')
  await app.close()
  await rm(join(artifacts, 'profile', 'keys.json.tmp'), { recursive: true })
  page = await open(origin)
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('livliv-stage:brain')).key === undefined)
  assert.equal(await page.evaluate(() => window.__stage.brain().key), SECOND, 'moved on the next start')
  assert.ok(!(await readFile(join(artifacts, 'profile', 'keys.json'), 'utf8')).includes(SECOND))

  // signed out and the key cleared while the delete fails to write: after a restart neither comes back from the file
  await mkdir(join(artifacts, 'profile', 'keys.json.tmp'))
  await page.evaluate(async () => { await window.__stage.keys.logout(); const b = window.__stage.brain(); window.__stage.keys.saveBrain({ ...b, key: '' }) })
  await new Promise((resolve) => setTimeout(resolve, 1500))
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('livliv-stage:keys-cleared')).sort()), ['livliv-stage:brain', 'livliv-stage:session'], 'not deleted yet: marked cleared')
  await app.close(); me.length = 0
  page = await open(origin)
  await new Promise((resolve) => setTimeout(resolve, 2000))
  assert.equal(await page.evaluate(() => window.__stage.brain().key), '', 'the cleared key stays cleared')
  assert.ok(!me.includes(`Bearer ${TOKEN}`), 'not signed in again from the file')
  await app.close()
  // writing works again: deleted on this start, and the marks go
  await rm(join(artifacts, 'profile', 'keys.json.tmp'), { recursive: true })
  page = await open(origin)
  await page.waitForFunction(() => localStorage.getItem('livliv-stage:keys-cleared') === null)
  assert.equal(await page.evaluate(() => window.__stage.brain().key), '')
  await app.close(); me.length = 0
  page = await open(origin)
  await new Promise((resolve) => setTimeout(resolve, 2000))
  assert.ok(!me.includes(`Bearer ${TOKEN}`), 'deleted from the file')
  assert.equal(await page.evaluate(() => window.__stage.brain().key), '')
  await app.close()

  // a key the app can't decrypt any more (the system's keychain changed): reported, so the settings ask for it again
  const kept = JSON.parse(await readFile(join(artifacts, 'profile', 'keys.json'), 'utf8'))
  kept.values['livliv-stage:brain'] = Buffer.from('not encrypted by this system').toString('base64')
  await writeFile(join(artifacts, 'profile', 'keys.json'), JSON.stringify(kept))
  page = await open(origin)
  assert.equal(await page.evaluate(() => window.__stage.brain().key), '')
  assert.equal(await page.evaluate(() => window.__stage.keys.lostKey('livliv-stage:brain')), true)
  assert.equal(await page.evaluate(() => window.__stage.keys.lostKey('livliv-stage:session')), false)
  await app.close()

  // a corrupted file: the app starts with no keys
  await writeFile(join(artifacts, 'profile', 'keys.json'), '{ broken')
  page = await open(origin)
  assert.equal(await page.evaluate(() => window.__stage.brain().key), '')
  assert.deepEqual(errors, [])
  assert.ok(!logs.some((line) => [KEY, SPEECH, TOKEN, SECOND].some((secret) => line.includes(secret))), 'no key in any log')
  assert.ok(!logs.some((line) => /safeStorage.*deprecated/.test(line)), 'the system encryption as Electron now offers it')
  console.log(JSON.stringify({ ok: true, requests: auth.length, artifacts }))
} finally {
  await app?.close(); server.close()
}
