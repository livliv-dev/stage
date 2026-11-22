// AIRI on livliv.ai/stage, for 持续聊天 only, checked on the site's build: built as `npm run build:site` builds it (base
// /stage/, VITE_STAGE_HOST=livliv, code-split), in development mode for the test hook (as the desktop checks build it),
// and served with the Content-Security-Policy livliv.ai sends with it. One AI character's chat runs on AIRI with
// livliv.ai's text (streamed, each reply voiced by livliv.ai as one line) and with a model of one's own that the page's
// policy lets it call; AIRI's core loads only on the first AIRI turn, and nothing it does is refused by the policy.
// livliv.ai's own refusals read in its words (an account under 18), a key refused by one's own model in a few, from the
// model card's 测试 too. AI 直播 stays on the standard engine, and its 直播间 card offers no window or game. The site
// and the model are faked: nothing is spent. A copy hosted elsewhere (the dev server) runs 持续聊天 on AIRI too.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = [], refused = []
// livliv.ai's Content-Security-Policy for /stage/ (the site's stage_web.py)
const CONNECT = ['https://dashscope.aliyuncs.com', 'https://api.openai.com', 'https://api.deepseek.com', 'https://api.moonshot.cn',
  'https://api.siliconflow.cn', 'https://openrouter.ai', 'https://*.maas.aliyuncs.com', 'wss://irc-ws.chat.twitch.tv']
const CSP = ["default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "media-src 'self' data: blob:", "font-src 'self' data:", `connect-src 'self' data: blob: ${CONNECT.join(' ')}`, "worker-src 'self' blob:",
  "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'self'"].join('; ')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8' }

const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
const asked = []  // { where: 'livliv' | 'own', stream }
const said = []
let refuse = 0    // livliv.ai's text answers with this refusal while set
let ownRefuse = 0 // the model of one's own, likewise
const sse = (content) => {
  const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'w', object: 'chat.completion.chunk', model: 'm', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
  return chunk({ role: 'assistant', content }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}
const reply = (body) => body.stream
  ? { contentType: 'text/event-stream', body: sse('<|ACT {"emotion":"happy","motion":"nod"}|>你好呀。今天想聊点什么？') }
  : { json: { choices: [{ message: { content: JSON.stringify({ text: '你好呀。', emotion: 'happy', action: 'none', to: null, look: null }) } }] } }
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' }

let out, server, browser, vite
try {
  // the site's build
  out = await mkdtemp(join(tmpdir(), 'stage-airi-web-'))
  await new Promise((resolve, reject) => {
    const build = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--base', '/stage/', '--outDir', out, '--emptyOutDir', '--logLevel', 'warn'],
      { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development', VITE_STAGE_HOST: 'livliv' } })
    build.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`vite build exited ${code}`)))
  })
  // served as livliv.ai serves /stage/: its files, with the site's policy
  const port = await freePort()
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (!path.startsWith('/stage/')) { res.writeHead(404).end(); return }
    const file = normalize(join(out, path.slice('/stage/'.length) || 'index.html'))
    if (!file.startsWith(out) || !(await stat(file).catch(() => null))?.isFile()) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': CSP })
    createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${port}`

  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    window.__refused = []
    document.addEventListener('securitypolicyviolation', (e) => window.__refused.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    if (url.origin === origin && path === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 100, plan: 'free' } })
    if (url.origin === origin && path === '/api/stage/v1/chat/completions') {
      const body = req.postDataJSON()
      asked.push({ where: 'livliv', stream: !!body.stream, body })
      if (refuse) return route.fulfill({ status: refuse, json: { detail: '聊天功能仅面向年满 18 周岁的用户' } })
      return route.fulfill(reply(body))
    }
    // a model of one's own, at an address the page's policy allows
    if (url.origin === 'https://api.deepseek.com') {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
      if (path !== '/v1/chat/completions') return route.fulfill({ status: 404, headers: CORS, json: { error: { message: 'none' } } })
      const body = req.postDataJSON()
      asked.push({ where: 'own', stream: !!body.stream })
      if (ownRefuse) return route.fulfill({ status: ownRefuse, headers: CORS, json: { error: { message: 'Authentication Fails, Your api key is invalid' } } })
      return route.fulfill({ ...reply(body), headers: CORS })
    }
    if (url.origin === origin && /^\/api\/chat\/([^/]+\/)?say$/.test(path)) { said.push(req.postDataJSON()); return route.fulfill({ json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 99 } }) }
    if (url.origin === origin && path === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
    if (url.origin === origin && /\/voices$/.test(path)) return route.fulfill({ json: { voices: [], voice: '', own: null } })
    if (url.origin === origin && path.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    return url.origin === origin || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000))
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (/Content Security Policy|unsafe-eval/i.test(m.text())) refused.push(m.text()) })
  const core = []  // AIRI's core chunk, when it was asked for
  page.on('request', (r) => { if (/\/stage\/assets\/core-[\w-]+\.js$/.test(new URL(r.url()).pathname)) core.push(r.url()) })
  await page.goto(`${origin}/stage/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.locator('.start-overlay .start-page [data-close]').click()
  // one AI character
  await page.evaluate(() => { const { store } = window.__stage; store.get().items.filter((i) => i.kind === 'character').forEach((c, i) => { if (i) store.patch(c.id, { lines: 'none' }) }) })
  await page.evaluate(() => window.__stage.store.setTalk({ goal: 'chat', audience: 'me', you: 'type' }))
  const tag = (name) => page.locator('.status-line .st-tag', { hasText: name })
  // signed in on the site: livliv.ai's text, on by default
  await tag('模型').filter({ hasText: 'livliv.ai' }).waitFor()
  assert.equal(core.length, 0, 'AIRI\'s core is not part of the page load')

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

  // livliv.ai's text: AIRI, streamed; each reply voiced by livliv.ai as one line
  assert.match(await tag('引擎').innerText(), /AIRI/, 'the status line says AIRI for the chat')
  asked.length = 0; said.length = 0
  assert.equal(await chat(), 'airi', 'the chat runs on AIRI with livliv.ai\'s text')
  assert.equal(core.length, 1, 'AIRI\'s core loaded for the first AIRI turn, once')
  assert.ok(asked.length >= 2 && asked.every((a) => a.where === 'livliv' && a.stream), 'streamed from livliv.ai: ' + JSON.stringify(asked))
  assert.ok(said.length >= 4 && said.every((s) => s.stage === true && s.line), 'voiced by livliv.ai, as Stage\'s, by the line: ' + JSON.stringify(said))
  const lines = new Set(said.map((s) => s.line))
  assert.equal(lines.size, 2, 'two replies (the opening and the answer), each one line however many sentences: ' + JSON.stringify([...lines]))

  // an output comes on (a recording) in a private AIRI chat: the next turn is public, with public memories only
  await page.evaluate(async () => {
    const { store, memory } = window.__stage, c = store.get().items.find((i) => i.kind === 'character' && i.lines === 'ai')
    await memory.remember({ profileId: c.profileId ?? c.id, scope: 'private', text: '私下的暗号是木瓜' })
    await memory.remember({ profileId: c.profileId ?? c.id, scope: 'public', text: '公开的爱好是猫' })
  })
  asked.length = 0
  await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && !c.speaking })
  const system = (a) => JSON.stringify(a.body.messages[0])
  assert.equal(await page.evaluate(() => window.__stage.conversation().engine), 'airi')
  assert.ok(asked.length && /私下的暗号是木瓜/.test(system(asked[0])) && /公开的爱好是猫/.test(system(asked[0])), 'private: both memories')
  await page.evaluate(() => window.__stage.rec.start({ mic: false, talk: false }))
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.scope === 'public' && !!c.sessionId && c.waitingInput && !c.speaking && !c.thinking })
  asked.length = 0
  await page.evaluate(() => window.__stage.talk.say('现在在录像'))
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && !c.speaking && c.lines.some((l) => l.human && l.text === '现在在录像') && !c.lines.at(-1).human })
  assert.ok(asked.length, 'AIRI answered in public')
  assert.ok(asked.every((a) => /公开的爱好是猫/.test(system(a)) && !/私下的暗号是木瓜/.test(system(a)) && !JSON.stringify(a.body.messages).includes('in a private LivLiv Stage conversation')), 'public: the public memory only')
  await page.evaluate(async () => { const { talk, rec } = window.__stage; talk.stop(); await rec.stop() })
  await page.waitForFunction(() => !['starting', 'recording', 'making'].includes(window.__stage.recording().phase), null, { timeout: testTimeout(60000) })
  // the record back to a fresh private one (the recording left the public one open)
  await page.evaluate(() => window.__stage.talk.detach())

  // livliv.ai refusing an account under 18: its words, not a key error; nothing voiced
  refuse = 403; said.length = 0
  await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); void talk.startChat('private') })
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return !c.running && !!(c.error || c.ended) })
  const under18 = await page.evaluate(() => { const c = window.__stage.conversation(); return `${c.error} ${c.ended}` })
  assert.match(under18, /年满 18 周岁/, 'livliv.ai\'s own reason: ' + under18)
  assert.doesNotMatch(under18, /密钥/, 'not a key error: ' + under18)
  assert.equal(said.length, 0)
  refuse = 0

  // a model of one's own that the page's policy lets it call: AIRI too
  await page.evaluate(() => {
    window.__stage.keys.saveBrain({ kind: 'openai', provider: 'deepseek', base: 'https://api.deepseek.com/v1', key: 'test-only', model: 'own-model' })
    const { store } = window.__stage, c = store.get().items.find((i) => i.kind === 'character' && i.lines === 'ai'); store.patch(c.id, { muted: true })
  })
  await tag('模型').filter({ hasText: 'own-model' }).waitFor()
  asked.length = 0
  assert.equal(await chat(), 'airi', 'the chat runs on AIRI with a model of one\'s own')
  assert.ok(asked.length >= 2 && asked.every((a) => a.where === 'own' && a.stream), 'streamed from your own model: ' + JSON.stringify(asked))
  // the model card's 测试 on AIRI, the key refused: a few words, not AIRI's own error text
  ownRefuse = 401
  await tag('模型').click()
  const form = page.locator('.model-form')
  await form.getByRole('button', { name: '测试', exact: true }).click()
  const said401 = await form.locator('.error, [role=alert]').first().innerText()
  assert.match(said401, /密钥无效（401）/, 'the 测试 failure, readable: ' + said401)
  assert.doesNotMatch(said401, /Remote sent/)
  ownRefuse = 0
  await page.keyboard.press('Escape')

  // AI 直播: the standard engine, said so; its 直播间 card (from the status line, while it runs, and once it has
  // stopped) offers no window or game
  await page.evaluate(() => window.__stage.store.setTalk({ goal: 'live', audience: 'live' }))
  assert.match(await tag('引擎').innerText(), /标准（网页版）/, 'AI 直播: 标准（网页版）')
  await page.locator('.console .start-button').click()
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.mode === 'live' })
  await tag('直播间').click()
  const room = page.locator('.live-settings')
  await room.waitFor()
  assert.equal(await room.locator('.live-game').count(), 0)
  await page.evaluate(() => window.__stage.talk.stop())
  await page.waitForFunction(() => !window.__stage.conversation().running)
  assert.ok(await room.isVisible(), 'the card stays open once the 直播 stops')
  assert.equal(await room.locator('.live-game').count(), 0, 'no game or window section')
  assert.equal(await room.getByText('游戏连接').count() + await room.getByText('选择游戏窗口').count(), 0)

  assert.deepEqual([...refused, ...await page.evaluate(() => window.__refused)], [], 'nothing refused by the page\'s policy')

  // a copy hosted elsewhere (no livliv.ai): 持续聊天 on AIRI with a model of one's own
  const vitePort = await freePort(); vite = await startVite({ port: vitePort })
  const elsewhere = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await elsewhere.addInitScript((base) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base: base + '/own', key: 'test-only', model: 'own-model' }))
  }, `http://127.0.0.1:${vitePort}`)
  const ownAsked = []
  await elsewhere.route('**/*', (route) => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/own/chat/completions') { const body = req.postDataJSON(); ownAsked.push(!!body.stream); return route.fulfill(reply(body)) }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
  })
  const other = await elsewhere.newPage(); other.setDefaultTimeout(testTimeout(30000)); other.on('pageerror', (e) => errors.push(e.message))
  await other.goto(`http://127.0.0.1:${vitePort}/`, { waitUntil: 'networkidle' })
  // its start page: 和角色聊天 puts the characters on the stage
  await other.locator('.start-page .goal-tile', { hasText: '和角色聊天' }).first().click()
  await other.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length > 0 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await other.evaluate(async () => (await import('/src/shell/ui.ts')).ui.setPop(null))
  await other.evaluate(() => { const { store } = window.__stage; store.get().items.filter((i) => i.kind === 'character').forEach((c, i) => store.patch(c.id, i ? { lines: 'none' } : { muted: true })) })
  await other.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await other.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.equal(await other.evaluate(() => window.__stage.conversation().engine), 'airi', 'a copy hosted elsewhere: the chat on AIRI')
  assert.ok(ownAsked.length >= 1 && ownAsked.every(Boolean), 'streamed from your own model: ' + JSON.stringify(ownAsked))
  await other.evaluate(() => window.__stage.talk.stop())
  assert.deepEqual(errors, [])
  console.log('test:airi-web passed')
} catch (e) {
  console.error(e); process.exitCode = 1
} finally {
  await browser?.close(); server?.close(); vite?.kill('SIGTERM')
  if (out) await rm(out, { recursive: true, force: true })
}
