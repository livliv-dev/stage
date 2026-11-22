// AIRI on livliv.ai/stage (the site's build, VITE_STAGE_HOST=livliv), for 持续聊天 only: one AI character's chat runs on
// AIRI with livliv.ai's text (streamed, its voice by livliv.ai a line at a time) and with a model of one's own that a
// web page can call; the status line says AIRI for the chat and 标准（网页版） for AI 直播, which stays on the standard
// engine here (no window, no game: the 直播间 card offers neither). The site is faked: nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
const asked = []  // { where: 'livliv' | 'own', stream, body }
const said = []
const sse = (content) => {
  const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'w', object: 'chat.completion.chunk', model: 'm', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
  return chunk({ role: 'assistant', content }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    if (path === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 100, plan: 'free' } })
    if (path === '/api/stage/v1/chat/completions' || path === '/own/chat/completions') {
      const body = req.postDataJSON()
      asked.push({ where: path.startsWith('/api/') ? 'livliv' : 'own', stream: !!body.stream, body })
      const text = '<|ACT {"emotion":"happy","motion":"nod"}|>你好呀。今天想聊点什么？'
      if (body.stream) return route.fulfill({ contentType: 'text/event-stream', body: sse(text) })
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '你好呀。', emotion: 'happy', action: 'none', to: null, look: null }) } }] } })
    }
    if (/^\/api\/chat\/([^/]+\/)?say$/.test(path)) { said.push(req.postDataJSON()); return route.fulfill({ json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 99 } }) }
    if (path === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
    if (/\/voices$/.test(path)) return route.fulfill({ json: { voices: [], voice: '', own: null } })
    if (path.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.locator('.start-overlay .start-page [data-close]').click()
  await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
  // one AI character
  await page.evaluate(() => { const { store } = window.__stage; store.get().items.filter((i) => i.kind === 'character').forEach((c, i) => { if (i) store.patch(c.id, { lines: 'none' }) }) })
  const engineTag = () => page.locator('.status-line .st-tag', { hasText: '引擎' }).innerText()
  /** a chat: the character opens, you say a line, it answers; the engine it ran on */
  async function chat() {
    await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); await talk.startChat('private') })
    await page.waitForFunction(() => window.__stage.conversation().waitingInput)
    const engine = await page.evaluate(() => window.__stage.conversation().engine)
    await page.evaluate(() => window.__stage.talk.say('你好'))
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && c.lines.filter((l) => !l.human).length >= 2 && !c.speaking })
    await page.evaluate(() => window.__stage.talk.stop())
    return engine
  }

  // livliv.ai's text (on by default, signed in on the site): AIRI, streamed; its voice by livliv.ai, a line at a time
  await page.evaluate(() => window.__stage.store.setTalk({ goal: 'chat', audience: 'me', you: 'type' }))
  assert.match(await engineTag(), /AIRI/, 'the status line says AIRI for the chat')
  asked.length = 0; said.length = 0
  assert.equal(await chat(), 'airi', 'the chat runs on AIRI with livliv.ai\'s text')
  assert.ok(asked.length >= 2 && asked.every((a) => a.where === 'livliv' && a.stream), 'streamed from livliv.ai: ' + JSON.stringify(asked.map((a) => [a.where, a.stream])))
  assert.ok(said.length >= 2 && said.every((s) => s.stage === true && s.line), 'voiced by livliv.ai, as Stage\'s, by the line')
  const lines = new Set(said.map((s) => s.line))
  assert.ok(lines.size <= 2, 'a reply\'s sentences one line: ' + JSON.stringify([...lines]))

  // a model of one's own a web page can call: AIRI too
  await page.evaluate(async () => {
    const { saveBrainConfig } = await import('/src/brain.ts')
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/own', key: 'test-only', model: 'own-model' })
    const { store } = window.__stage, c = store.get().items.find((i) => i.kind === 'character' && i.lines === 'ai'); store.patch(c.id, { muted: true })
  })
  asked.length = 0
  assert.equal(await chat(), 'airi', 'the chat runs on AIRI with a key of one\'s own')
  assert.ok(asked.length >= 2 && asked.every((a) => a.where === 'own' && a.stream), 'streamed from your own model: ' + JSON.stringify(asked.map((a) => [a.where, a.stream])))

  // AI 直播 on the web build: the standard engine, said so; the 直播间 card offers no window or game
  await page.evaluate(() => window.__stage.store.setTalk({ goal: 'live', audience: 'live' }))
  assert.match(await engineTag(), /标准（网页版）/, 'AI 直播: 标准（网页版）')
  assert.equal(await page.evaluate(async () => (await import('/src/core/platform.ts')).features.vision), false)
  assert.deepEqual(errors, [])
  console.log('test:airi-web passed')
} catch (e) {
  console.error(e); process.exitCode = 1
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
