// livliv.ai's text turned off mid-session: on the web build a chat with one AI character runs on AIRI, which keeps the
// model it started with, so the chat stops at once (saying why) and nothing more is asked of livliv.ai; the next chat
// answers from the model of one's own. A game
// action asked during a realtime call (the Neuro bridge) is decided by the model set up. On the site's build, signed
// in (the site is faked: nothing is spent).
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = [], paid = [], own = []
/** a streamed reply, as an OpenAI-compatible API sends one (AIRI asks for these) */
const sse = (content) => {
  const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'm', object: 'chat.completion.chunk', model: 'm', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
  return chunk({ role: 'assistant', content }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 10, plan: 'plus', record_seconds: 300, record_mark: false, stage_line_points: 0.5, stage_silent_free: true } })
    if (url.pathname === '/api/stage/v1/chat/completions') {
      const body = req.postDataJSON(); paid.push(body)
      if (body.stream) return route.fulfill({ contentType: 'text/event-stream', body: sse('这一句来自 LivLiv。') })
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '这一句来自 LivLiv。', emotion: 'neutral', action: 'none', to: null, look: null }) } }] } })
    }
    if (url.pathname === '/fixture-ai/chat/completions') {
      const body = req.postData() ?? ''; own.push(body)
      if (JSON.parse(body).stream) return route.fulfill({ contentType: 'text/event-stream', body: sse('这一句来自自己的模型。') })
      const content = body.includes('选择一个可用动作') ? JSON.stringify({ name: 'jump', data: {} }) : JSON.stringify({ text: '这一句来自自己的模型。', emotion: 'neutral', action: 'none', to: null, look: null })
      return route.fulfill({ json: { choices: [{ message: { content } }] } })
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    if (url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
  // one AI character, in the system voice (no voice is paid for here)
  const characterId = await page.evaluate(() => {
    const { store } = window.__stage, cast = store.get().items.filter((i) => i.kind === 'character')
    cast.forEach((c, i) => store.patch(c.id, i ? { lines: 'none' } : { lines: 'ai', voice: { ...c.voice, source: 'system' } }))
    return cast[0].id
  })
  const brain = (config) => page.evaluate(async (config) => (await import('/src/brain.ts')).saveBrainConfig(config), config)
  const aiLines = () => page.evaluate(() => window.__stage.conversation().lines.filter((l) => !l.human).map((l) => l.text))
  const answered = (n) => page.waitForFunction((n) => { const c = window.__stage.conversation(); return c.waitingInput && !c.speaking && c.lines.filter((l) => !l.human).length >= n }, n)

  // a chat on livliv.ai's text, on AIRI; livliv.ai's text turned off mid-chat (a model of one's own saved): the chat stops
  // at once, saying why, and nothing more is paid; the next chat answers from the model of one's own
  await brain({ kind: 'livliv' })
  await page.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.equal(await page.evaluate(() => window.__stage.conversation().engine), 'airi', 'one AI character on the web build: AIRI')
  await page.evaluate(() => window.__stage.talk.say('你好'))
  await answered(2)
  const paidBefore = paid.length
  assert.ok(paidBefore >= 2 && paid.every((p) => p.stream), 'livliv.ai answered, streamed, while it gave the text: ' + paidBefore)
  await brain({ kind: 'openai', provider: 'custom', base: `http://127.0.0.1:${port}/fixture-ai`, key: 'test-only', model: 'fixture-model' })
  await page.waitForFunction(() => !window.__stage.conversation().running)
  assert.equal(await page.evaluate(() => window.__stage.conversation().ended), 'livliv.ai 的文字已关闭，本次会话已停止')
  assert.equal(await page.locator('.console .talk-note').innerText(), 'livliv.ai 的文字已关闭，本次会话已停止', 'the console says why it stopped')
  await page.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  await page.evaluate(() => window.__stage.talk.say('换个话题吧'))
  await answered(2)
  assert.equal((await aiLines()).at(-1), '这一句来自自己的模型。', 'the next chat answers from the model of one\'s own')
  assert.equal(paid.length, paidBefore, 'nothing more asked of livliv.ai')
  await page.evaluate(() => window.__stage.talk.stop())

  // a game action asked during a realtime call: decided by the model set up
  const decision = await page.evaluate(async (characterId) => {
    const { talk, store } = window.__stage
    const character = store.get().items.find((i) => i.id === characterId)
    const controls = { stop() {}, pause() {}, interrupt() {}, say() {}, event: () => true }
    const call = await talk.realtime(controls, Date.now() + 600_000, character, 'public')
    if (!call) throw new Error('no call')
    try {
      return await talk.decideExternalAction({ character: characterId, source: 'Neuro', query: 'jump?', priority: 'medium', actions: [{ name: 'jump', description: 'jump' }] }, new AbortController().signal)
    } finally { talk.stop() }
  }, characterId)
  assert.deepEqual(decision, { name: 'jump', data: {} })
  assert.ok(own.some((body) => body.includes('选择一个可用动作')), 'the decision was asked of the model set up')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, paid: paid.length, own: own.length, decision }))
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
