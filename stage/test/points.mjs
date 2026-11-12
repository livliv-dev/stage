// LivLiv's points AI on the site's build (VITE_STAGE_HOST=livliv): what Stage asks the site for. A line is asked for
// with its voice (voice: true) only when it will be heard in the character's LivLiv voice; 仅字幕, a character on the
// system voice and a muted one ask for none, and no line is voiced a second time (no /say call). Space never starts
// paid lines: with the demo's three on the stage it plays the free demo. The site is faked: nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
let server, browser, page
const asked = [], said = []
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_STAGE_HOST: 'livliv' } })
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(t); resolve() } }); server.once('exit', (c) => { clearTimeout(t); reject(new Error('Vite exited ' + c)) }) })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: FLAGS })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 10, plan: 'plus', record_seconds: 300, record_mark: false, stage_line_points: 0.5, stage_silent_free: true } })
    if (/^\/api\/chat\/[^/]+\/stage-line$/.test(url.pathname)) {
      const body = req.postDataJSON(); asked.push({ who: url.pathname.split('/')[3], voice: body.voice })
      return route.fulfill({ json: { text: '今天的风好舒服。', emotion: 'happy', action: 'none', to: null, look: null, audio: body.voice ? '/api/chat/say/line.mp3' : null, points: 10 } })
    }
    if (url.pathname === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
    if (/^\/api\/chat\/[^/]+\/say$/.test(url.pathname)) { said.push(url.pathname); return route.fulfill({ status: 500, json: { detail: 'not expected' } }) }
    if (/^\/api\/chat\/[^/]+\/voices$/.test(url.pathname)) return route.fulfill({ json: { voices: [{ id: 'Cherry', name: 'Cherry', desc: '' }], voice: 'Cherry', own: null } })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    if (url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(origin + '/', { waitUntil: 'networkidle' })
  // the first visit: the demo's three on the stage, signed in, LivLiv the AI's model
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: 60000 })
  await page.locator('.site-welcome .close').click().catch(() => {})
  await page.locator('.model-btn', { hasText: 'LivLiv' }).waitFor()
  const conv = () => page.evaluate(() => { const c = window.__stage.conversation(); return { running: c.running, error: c.error } })
  const ai = () => page.evaluate(() => window.__stage.store.get().items.filter((i) => i.kind === 'character' && i.lines === 'ai').map((i) => i.id))
  const patchAll = (p) => page.evaluate(({ ids, p }) => { for (const id of ids) { const c = window.__stage.store.get().items.find((i) => i.id === id); window.__stage.store.patch(id, typeof p === 'string' ? { voice: { ...c.voice, source: p } } : p) } }, { ids: p.ids, p: p.patch })
  /** starts a run, waits for its first ask of the site, stops it: what it asked */
  async function first(start) {
    asked.length = 0
    await page.evaluate(start)
    for (let i = 0; i < 200 && !asked.length; i++) await page.waitForTimeout(100)
    await page.evaluate(() => window.__stage.talk.stop())
    assert.ok(asked.length, 'a line was asked for: ' + JSON.stringify(await conv()))
    return asked[0]
  }
  const ids = await ai()
  assert.equal(ids.length, 3)

  // Space with the demo's three: the free demo, nothing asked of the site
  await page.locator('.stage').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.keyboard.press('Space')
  await page.waitForTimeout(1500)
  assert.equal(asked.length, 0, 'Space asks for no paid line')
  assert.equal(await page.evaluate(() => window.__stage.conversation().running), true, 'Space plays the demo')
  await page.evaluate(() => window.__stage.talk.stop())
  // the demo set the brain to the demo for this run: back to LivLiv, as the model card's LivLiv does
  await page.evaluate(async () => (await import('/src/brain.ts')).playDemo(false))

  // 对谈, the LivLiv voice: the voice comes with the line
  const talkLine = await first(() => window.__stage.talk.start())
  assert.equal(talkLine.voice, true, '对谈 with the LivLiv voice asks for it')
  // AI 直播, 仅字幕: no voice
  const textOnly = await first(async () => {
    window.__stage.talk.startLive({ minutes: 5, maxGenerations: 3, warmupSeconds: 0, textOnly: true })
    await new Promise((r) => setTimeout(r, 300));
    (await import('/src/danmaku.ts')).simulate('Viewer', '你们好呀')
  })
  assert.equal(textOnly.voice, false, '仅字幕 asks for no voice')
  // the system voice: said by the browser, the site's not asked for
  await patchAll({ ids, patch: 'system' })
  const system = await first(() => window.__stage.talk.start())
  assert.equal(system.voice, false, 'a character on the system voice asks for no LivLiv voice')
  // muted: not heard, so not voiced (and not voiced again by /say)
  await patchAll({ ids, patch: 'livliv' }); await patchAll({ ids, patch: { muted: true } })
  const muted = await first(() => window.__stage.talk.start())
  assert.equal(muted.voice, false, 'a muted character asks for no voice')
  await page.waitForTimeout(500)
  assert.deepEqual(said, [], 'no line is voiced a second time through /say')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ talk: talkLine, textOnly, system, muted, say: said.length }))
} catch (e) {
  console.error(e); process.exitCode = 1
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
