// livliv.ai in the desktop app (core/platform.ts features.points, brain.ts, shell/Connections.tsx), on Stage's own build
// with the app's bridge stood in for (window.livlivDesktop) and the site faked. Signed out: Settings → 连接 starts with
// livliv.ai's switch, off; turned on, it starts the connect code (shown in its row, the site's page opened), and once
// allowed livliv.ai is on, its text and its voices. Signed in (a kept token): on from the start, a line is asked of
// livliv.ai's text with the app's token and voiced by /say in its own voice, and on the system voice not. A copy hosted
// anywhere else offers no livliv.ai. The app's 创建角色 opens livliv.ai's page in the browser; elsewhere there is
// none. Nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const TOKEN = 'app.test-token'
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
let server, browser
const asked = [], said = []
let allowAfter = Infinity, polls = 0
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: '' } })
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
      if (url.pathname === '/api/stage/v1/chat/completions') {
        asked.push({ model: req.postDataJSON().model, auth })
        return route.fulfill(member ? { json: { choices: [{ message: { content: JSON.stringify({ text: '今天的风好舒服。', emotion: 'happy', action: 'none', to: null, look: null }) } }] } } : { status: 402, json: { detail: '登录后即可使用' } })
      }
      if (/^\/api\/chat\/[^/]+\/say$/.test(url.pathname)) {
        said.push({ who: url.pathname.split('/')[3], auth })
        return route.fulfill(member ? { json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 9 } } : { status: 402, json: { detail: '登录后即可使用' } })
      }
      if (url.pathname === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
      if (/^\/api\/chat\/[^/]+\/voices$/.test(url.pathname)) return route.fulfill({ json: { voices: [{ id: 'Cherry', name: 'Cherry', desc: '' }], voice: 'Cherry', own: null } })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
    await page.clock.install()  // runs as usual; siteOnly moves it past the guest prompt's three minutes
    await page.goto(origin + path, { waitUntil: 'networkidle' })
    return { page, context }
  }
  const row = (page) => page.locator('.model-form .providers button').allInnerTexts()
  const livliv = (page) => page.locator('.connect-section.livliv')
  /** livliv.ai/stage's own parts in a browser (the web branch), none of which the app or a copy hosted elsewhere shows:
   *  the GitHub mark, the note on the desktop app, the guest's sign-in prompt (past its three minutes), About's 桌面版 */
  const siteOnly = async (page) => {
    await page.clock.fastForward(181_000); await page.waitForTimeout(300)
    await page.locator('.topbar button[title="设置"]').click()
    await page.locator('.settings-tabs button', { hasText: '通用' }).click()
    const about = await page.locator('.general-about button.link', { hasText: '桌面版' }).count()
    await page.keyboard.press('Escape')
    return { github: await page.locator('.topbar a.github-link').count(), notice: await page.locator('.desktop-notice').count(), prompt: await page.locator('.guest-gate').count(), about }
  }
  const none = { github: 0, notice: 0, prompt: 0, about: 0 }
  /** the console's model tag (the status line's first) and the way into Settings → 连接 */
  const chip = (page) => page.locator('.status-line .st-tag').first().innerText()
  const models = (page) => page.locator('.status-line .st-tag').first().click()

  // the desktop app, signed out, nothing chosen: livliv.ai's switch first, off; turned on, a code; allowed, it is on
  let { page, context } = await open({ app: true }, '/?c=k01&as=ai')
  await models(page)
  assert.equal(await livliv(page).locator('.switch.main input').isChecked(), false, 'signed out: off')
  assert.ok(!(await row(page)).includes('livliv.ai'), 'livliv.ai is its own switch, not a text model')
  allowAfter = 2
  await livliv(page).locator('.switch.main').click()
  await livliv(page).locator('.connect-wait', { hasText: 'ABCD-1234' }).waitFor()
  assert.deepEqual(await page.evaluate(() => window.opened), ['https://livliv.ai/connect?code=ABCD1234'], "the site's page is opened in the browser")
  await page.waitForFunction(() => !document.querySelector('.connect-section.livliv .connect-wait'), null, { timeout: 15000 })
  assert.equal(await page.evaluate(() => localStorage.getItem('livliv-stage:session')), TOKEN, 'the connect token is kept')
  await page.waitForFunction(() => document.querySelector('.connect-section.livliv .switch.main input')?.checked)
  assert.equal(await livliv(page).locator('.livliv-parts input:checked').count(), 2, 'on: its text and its voices')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => document.querySelector('.status-line .st-tag')?.textContent?.includes('livliv.ai'))
  assert.match(await chip(page), /livliv\.ai/, 'signed in: livliv.ai gives the text')
  await context.close()

  // the desktop app, signed in (a kept token): livliv.ai from the start; a line asked with the app's token, voiced in its own voice
  ;({ page, context } = await open({ app: true, token: TOKEN }, '/?c=k01&as=ai'))
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((a) => a.status === 'ready'), null, { timeout: 60000 })
  await page.waitForFunction(() => document.querySelector('.status-line .st-tag')?.textContent?.includes('livliv.ai'))
  const first = async (start) => {
    asked.length = 0; said.length = 0
    await page.evaluate(start)
    for (let i = 0; i < 300 && !(asked.length && (said.length || (await page.evaluate(() => window.__stage.conversation().lines.some((l) => !l.human))))); i++) await page.waitForTimeout(100)
    await page.waitForTimeout(300)
    await page.evaluate(() => window.__stage.talk.stop())
    assert.ok(asked.length, 'a line was asked for')
    return { text: asked[0], voice: said[0] ?? null }
  }
  const voiced = await first(() => window.__stage.talk.start())
  assert.deepEqual(voiced, { text: { model: 'livliv', auth: `Bearer ${TOKEN}` }, voice: { who: 'k01', auth: `Bearer ${TOKEN}` } }, "with the app's token, its own voice")
  await page.evaluate(() => { for (const c of window.__stage.store.get().items.filter((i) => i.kind === 'character')) window.__stage.store.patch(c.id, { voice: { ...c.voice, source: 'system' } }) })
  const system = await first(() => window.__stage.talk.start())
  assert.deepEqual(system, { text: { model: 'livliv', auth: `Bearer ${TOKEN}` }, voice: null }, 'on the system voice: no voice asked of the site')
  // making a character: livliv.ai's page, opened in the browser (the app sends outside addresses there)
  await page.locator('.topbar .create-button').click()
  assert.deepEqual((await page.evaluate(() => window.opened)).at(-1), 'https://livliv.ai/discover?new=1')
  assert.equal(await page.locator('.topbar a.mark-link').getAttribute('href'), 'https://livliv.ai/')
  await page.locator('.rail button.tool', { hasText: '角色' }).click()
  assert.equal(await page.locator('.popover.add .create-link').count(), 1, 'the add card\'s way too')
  await page.keyboard.press('Escape')
  assert.deepEqual(await siteOnly(page), none, "none of the site's own parts in the app")
  await context.close()

  // a copy of Stage hosted anywhere else (neither the site nor the app): no livliv.ai
  ;({ page, context } = await open({ app: false }, '/?c=k01&as=ai'))
  await models(page)
  assert.equal(await livliv(page).count(), 0, 'no livliv.ai outside the site and the app')
  assert.ok(!(await row(page)).includes('livliv.ai'))
  assert.equal(await page.locator('.topbar .create-button').count(), 0, 'no way to livliv.ai either')
  assert.equal(await page.locator('.topbar a.mark-link').count(), 0)
  await page.keyboard.press('Escape')
  await page.locator('.rail button.tool', { hasText: '角色' }).click()
  assert.equal(await page.locator('.popover.add .create-link').count(), 0, 'nor in the add card')
  await page.keyboard.press('Escape')
  assert.deepEqual(await siteOnly(page), none, "nor the site's own parts")
  await context.close()

  assert.deepEqual(errors, [])
  console.log('test:app-livliv passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
