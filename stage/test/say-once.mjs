// A livliv.ai voice is paid by the line, however the session says it: on the site's build, signed in (the site is faked:
// nothing is spent), a chat with a model of one's own in the characters' livliv.ai voices says each reply sentence by
// sentence, the /say calls of one reply sharing its line id and each reply a line id of its own; the same chat in the
// system voice says it sentence by sentence too and makes no /say; a 对谈 on livliv.ai's text makes one text call and
// one /say per line, each its own line.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
const REPLY = '你好呀。今天想聊点什么？我们慢慢说。', SENTENCES = ['你好呀。', '今天想聊点什么？', '我们慢慢说。']
const said = [], lines = []
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  browser = await chromium.launch({ args: FLAGS })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans') })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 10, plan: 'plus', record_seconds: 300, record_mark: false, stage_line_points: 0.5, stage_silent_free: true } })
    if (url.pathname === '/api/stage/v1/chat/completions') {
      lines.push(req.postDataJSON())
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: REPLY, emotion: 'happy', action: 'none', to: null, look: null }) } }] } })
    }
    if (url.pathname === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
    if (/^\/api\/chat\/[^/]+\/say$/.test(url.pathname)) {
      said.push(req.postDataJSON())
      return route.fulfill({ json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 9 } })
    }
    if (url.pathname === '/fixture-ai/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: REPLY, emotion: 'happy', action: 'none', to: null, look: null }) } }] } })
    if (/^\/api\/chat\/[^/]+\/voices$/.test(url.pathname)) return route.fulfill({ json: { voices: [{ id: 'Cherry', name: 'Cherry', desc: '' }], voice: 'Cherry', own: null } })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    if (url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
  // the first visit: the demo's three on the stage, signed in
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
  const voices = (source) => page.evaluate((source) => { const { store } = window.__stage; for (const c of store.get().items.filter((i) => i.kind === 'character')) store.patch(c.id, { voice: { ...c.voice, source } }) }, source)
  const aiLines = () => page.evaluate(() => window.__stage.conversation().lines.filter((l) => !l.human).map((l) => l.text))
  /** a fresh chat: the character greets, you say a line, it answers; then it stops */
  async function chat() {
    await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); await talk.startChat('private') })
    await page.waitForFunction(() => window.__stage.conversation().waitingInput)
    await page.evaluate(() => window.__stage.talk.say('那就聊聊周末吧'))
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && c.lines.filter((l) => !l.human).length >= 2 && !c.speaking })
    await page.evaluate(() => window.__stage.talk.stop())
  }

  // a model of one's own, the characters' livliv.ai voices: a /say a sentence, one line id a reply
  await page.evaluate(async () => (await import('/src/brain.ts')).saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' }))
  await voices('livliv')
  said.length = 0
  await chat()
  const livliv = await aiLines()
  assert.ok(livliv.length >= 2, 'the character spoke twice: ' + JSON.stringify(livliv))
  assert.deepEqual(livliv.slice(0, 3), SENTENCES, 'said sentence by sentence')
  assert.equal(said.length, livliv.length, 'a /say a sentence: ' + JSON.stringify(said))
  assert.deepEqual(said.map((call) => call.lines.map((line) => line.text)), livliv.map((text) => [text]), 'each /say carries its sentence')
  const ids = said.map((call) => call.line)
  assert.ok(ids.every(Boolean) && new Set(ids).size === livliv.length / SENTENCES.length && ids.slice(0, 3).every((id) => id === ids[0]), 'one line id a reply: ' + JSON.stringify(ids))

  // the same chat in the system voice: said sentence by sentence, nothing asked of /say
  await voices('system')
  said.length = 0
  await chat()
  const system = await aiLines()
  assert.deepEqual(system.slice(0, 3), SENTENCES, 'a reply in another voice is said sentence by sentence')
  assert.equal(said.length, 0, 'no /say without the LivLiv voice')

  // a 对谈 on livliv.ai's text, in the livliv.ai voices: one text call and one /say a line
  await page.evaluate(async () => (await import('/src/brain.ts')).saveBrainConfig({ kind: 'livliv' }))
  await voices('livliv')
  said.length = 0; lines.length = 0
  await page.evaluate(() => { window.__stage.talk.setLimit(2); window.__stage.talk.start() })
  await page.waitForFunction(() => !window.__stage.conversation().running && window.__stage.conversation().turns >= 2, null, { timeout: testTimeout(60000) })
  assert.equal(lines.length, 2, 'two lines from livliv.ai\'s text: ' + lines.length)
  assert.equal(said.length, 2, 'each voiced whole by one /say: ' + JSON.stringify(said))
  assert.equal(new Set(said.map((call) => call.line)).size, 2, 'each its own line')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, livliv: { sentences: livliv.length, lines: new Set(ids).size }, system: { lines: system.length }, duet: { lines: lines.length, say: said.length } }))
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
