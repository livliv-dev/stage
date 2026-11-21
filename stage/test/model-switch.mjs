// The model set up answers the next line, even mid-session: a chat on LivLiv's points (each line paid) whose model is
// switched to one of one's own answers the next line from that model, and nothing more is asked of livliv.ai. A game
// action asked during a realtime call (the Neuro bridge) is decided by the model set up. On the site's build, signed
// in (the site is faked: nothing is spent).
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = [], paid = [], own = []
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 10, plan: 'plus', record_seconds: 300, record_mark: false, stage_line_points: 0.5, stage_silent_free: true } })
    if (/^\/api\/chat\/[^/]+\/stage-line$/.test(url.pathname)) {
      paid.push(req.postDataJSON())
      return route.fulfill({ json: { text: '这一句来自 LivLiv。', emotion: 'neutral', action: 'none', to: null, look: null, audio: null, points: 9 } })
    }
    if (url.pathname === '/fixture-ai/chat/completions') {
      const body = req.postData() ?? ''; own.push(body)
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

  // a chat on LivLiv's points; the model is switched to one's own mid-chat: the next line is from it, and nothing more is paid
  await brain({ kind: 'livliv' })
  await page.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  await page.evaluate(() => window.__stage.talk.say('你好'))
  await answered(2)
  const paidBefore = paid.length
  assert.ok(paidBefore >= 2, 'LivLiv answered while it was the model: ' + paidBefore)
  await brain({ kind: 'openai', provider: 'custom', base: `http://127.0.0.1:${port}/fixture-ai`, key: 'test-only', model: 'fixture-model' })
  await page.evaluate(() => window.__stage.talk.say('换个话题吧'))
  await answered(3)
  assert.equal((await aiLines()).at(-1), '这一句来自自己的模型。', 'the next line is from the model set up now')
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
