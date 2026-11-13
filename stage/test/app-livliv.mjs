// LivLiv's points AI in the desktop app (livliv.ts livlivHere, brain.ts, App.tsx ModelForm), on Stage's own build with the
// app's bridge stood in for (window.livlivDesktop) and the site faked. Signed out: LivLiv is the first option, chosen it
// says the site's price and offers 登录 livliv.ai, which starts the connect code (shown in the form, the site's page
// opened), and once allowed LivLiv becomes the model. Signed in (a kept token): LivLiv is the model from the start and a
// line is asked of the site with the app's token, voice true in its LivLiv voice, false on the system voice. A copy
// hosted anywhere else offers no LivLiv. Nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const TOKEN = 'app.test-token'
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
let server, browser
const asked = []
let allowAfter = Infinity, polls = 0
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_STAGE_HOST: '' } })
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(t); resolve() } }); server.once('exit', (c) => { clearTimeout(t); reject(new Error('Vite exited ' + c)) }) })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })

  /** a page of the app (app: the desktop bridge stood in for), signed in with a kept token or not */
  const open = async ({ app = true, token = '' } = {}, path = '/') => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.addInitScript(({ app, token }) => {
      localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
      if (token) localStorage.setItem('livliv-stage:session', token)
      window.opened = []
      window.open = (url) => { window.opened.push(String(url)); return null }
      if (app) window.livlivDesktop = { version: 'test', platform: 'darwin', requests: { begin: async () => 'r', cancel: async () => {} },
        hotkeys: { list: async () => [], set: async () => [], reset: async () => [] }, onCommand: () => () => {} }
    }, { app, token })
    await context.route('**/*', async (route) => {
      const req = route.request(), url = new URL(req.url()), auth = req.headers()['authorization'] || ''
      const member = auth === `Bearer ${TOKEN}`
      if (url.pathname === '/api/me') return route.fulfill({ json: member ? { signed_in: true, email: 'member@example.test', name: '', points: 10, stage_line_points: 0.3 } : { signed_in: false } })
      if (url.pathname === '/api/connect/start') return route.fulfill({ json: { code: 'ABCD-1234', poll: 'poll-1', url: 'https://livliv.ai/connect?code=ABCD1234', expires_in: 600, interval: 1 } })
      if (url.pathname === '/api/connect/poll') { polls += 1; return route.fulfill({ json: polls >= allowAfter ? { status: 'ok', token: TOKEN } : { status: 'pending' } }) }
      if (/^\/api\/chat\/[^/]+\/stage-line$/.test(url.pathname)) {
        const body = req.postDataJSON(); asked.push({ who: url.pathname.split('/')[3], voice: body.voice, auth })
        return route.fulfill(member ? { json: { text: '今天的风好舒服。', emotion: 'happy', action: 'none', to: null, look: null, audio: body.voice ? '/api/chat/say/line.mp3' : null, points: 10 } } : { status: 402, json: { detail: '登录后即可使用' } })
      }
      if (url.pathname === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
      if (/^\/api\/chat\/[^/]+\/voices$/.test(url.pathname)) return route.fulfill({ json: { voices: [{ id: 'Cherry', name: 'Cherry', desc: '' }], voice: 'Cherry', own: null } })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(origin + path, { waitUntil: 'networkidle' })
    return { page, context }
  }
  const row = (page) => page.locator('.model-form .providers button').allInnerTexts()
  const chip = (page) => page.locator('.model-btn').innerText()

  // the desktop app, signed out, nothing chosen: LivLiv first, the price, sign in with a code; allowed, it is the model
  let { page, context } = await open({ app: true }, '/?c=k01&as=ai')
  await page.locator('.model-btn').click()
  assert.equal((await row(page))[0], 'LivLiv', 'LivLiv is the first option in the app')
  await page.locator('.model-form .providers button', { hasText: 'LivLiv' }).click()
  assert.match(await page.locator('.model-form .hint').first().innerText(), /每句台词 0\.3 积分/)
  allowAfter = 2
  await page.locator('.model-form button', { hasText: '登录 livliv.ai' }).click()
  await page.locator('.model-form .connect-wait', { hasText: 'ABCD-1234' }).waitFor()
  assert.deepEqual(await page.evaluate(() => window.opened), ['https://livliv.ai/connect?code=ABCD1234'], "the site's page is opened in the browser")
  await page.waitForFunction(() => !document.querySelector('.model-form .connect-wait'), null, { timeout: 15000 })
  assert.equal(await page.evaluate(() => localStorage.getItem('livliv-stage:session')), TOKEN, 'the connect token is kept')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('.model-btn')?.textContent?.includes('LivLiv'))
  assert.match(await chip(page), /LivLiv/, 'signed in with nothing chosen yet: LivLiv is the model')
  await context.close()

  // the desktop app, signed in (a kept token): LivLiv from the start; a line asked with the app's token
  ;({ page, context } = await open({ app: true, token: TOKEN }, '/?c=k01&as=ai'))
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((a) => a.status === 'ready'), null, { timeout: 60000 })
  await page.waitForFunction(() => document.querySelector('.model-btn')?.textContent?.includes('LivLiv'))
  const first = async (start) => {
    asked.length = 0
    await page.evaluate(start)
    for (let i = 0; i < 200 && !asked.length; i++) await page.waitForTimeout(100)
    await page.evaluate(() => window.__stage.talk.stop())
    assert.ok(asked.length, 'a line was asked for')
    return asked[0]
  }
  const voiced = await first(() => window.__stage.talk.start())
  assert.deepEqual(voiced, { who: 'k01', voice: true, auth: `Bearer ${TOKEN}` }, "with the app's token, its LivLiv voice")
  await page.evaluate(() => { for (const c of window.__stage.store.get().items.filter((i) => i.kind === 'character')) window.__stage.store.patch(c.id, { voice: { ...c.voice, source: 'system' } }) })
  const system = await first(() => window.__stage.talk.start())
  assert.deepEqual(system, { who: 'k01', voice: false, auth: `Bearer ${TOKEN}` }, 'on the system voice: no voice asked of the site')
  await context.close()

  // a copy of Stage hosted anywhere else (neither the site nor the app): no LivLiv
  ;({ page, context } = await open({ app: false }, '/?c=k01&as=ai'))
  await page.locator('.model-btn').click()
  assert.ok(!(await row(page)).includes('LivLiv'), 'no LivLiv outside the site and the app')
  await context.close()

  assert.deepEqual(errors, [])
  console.log('test:app-livliv passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
