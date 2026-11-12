// livliv.ai/stage's guests (GuestGate.tsx), on the site's build with the site faked and the page's clock faked: signed
// out, nothing for the first minute, then the sign-in prompt, which stops what was playing and leads to the site's
// sign-in or sign-up and back; signing in (another tab: the page asks again on focus) takes it away; a member never
// sees it (nor while the site hasn't said yet), nor does the output window (what OBS captures) or OBS's own browser.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
let server, browser
let signedIn = false
let meHeld = null  // a promise /api/me waits on (the site slow to say who is there)
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_STAGE_HOST: 'livliv' } })
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(t); resolve() } }); server.once('exit', (c) => { clearTimeout(t); reject(new Error('Vite exited ' + c)) }) })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const open = async (path, userAgent, waitUntil = 'networkidle') => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(userAgent ? { userAgent } : {}) })
    await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/me' && meHeld) await meHeld
      if (url.pathname === '/api/me') return route.fulfill({ json: signedIn ? { signed_in: true, email: 'member@example.test', points: 10, plan: 'free' } : { signed_in: false } })
      if (url.pathname === '/login') return route.fulfill({ contentType: 'text/html', body: '<p>the site sign-in</p>' })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
    await page.clock.install()
    await page.goto(origin + path, { waitUntil })
    if (waitUntil !== 'networkidle') await page.waitForFunction(() => !!window.__stage, null, { timeout: 30000 })
    return { page, context }
  }
  const gate = (page) => page.locator('.guest-gate')

  // a guest: a minute to look around, the demo playing, then the prompt
  signedIn = false
  let { page, context } = await open('/')
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: 60000 })
  await page.locator('.site-welcome .close').click().catch(() => {})
  await page.locator('.stage').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.keyboard.press('Space')  // the free demo
  await page.waitForFunction(() => window.__stage.conversation().running)
  await page.clock.fastForward(30_000)
  assert.equal(await gate(page).count(), 0, 'not before a minute')
  await page.clock.fastForward(31_000)
  await gate(page).waitFor()
  assert.equal(await page.evaluate(() => window.__stage.conversation().running), false, 'what was playing stopped')
  assert.equal(await gate(page).locator('[data-close], .close').count(), 0, 'it has no close')
  await gate(page).getByRole('button', { name: '注册' }).click()
  await page.waitForURL((u) => u.pathname === '/login')
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'signup')
  assert.equal(new URL(page.url()).searchParams.get('next'), '/', 'sign-up comes back to the page')
  await context.close()

  // 登录, and signing in elsewhere takes it away
  ;({ page, context } = await open('/'))
  await page.clock.fastForward(61_000)
  await gate(page).waitFor()
  const signIn = gate(page).getByRole('button', { name: '登录' })
  signedIn = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await gate(page).waitFor({ state: 'detached' })
  signedIn = false
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await gate(page).waitFor()
  await signIn.click()
  await page.waitForURL((u) => u.pathname === '/login')
  assert.equal(new URL(page.url()).searchParams.get('next'), '/', 'sign-in comes back here')
  await context.close()

  // a member: never
  signedIn = true
  ;({ page, context } = await open('/'))
  await page.clock.fastForward(180_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'a member never sees it')
  await context.close()

  // a member whose /api/me is slow: nothing while the site hasn't said, and nothing once it says signed in
  signedIn = true
  let answer; meHeld = new Promise((r) => { answer = r })
  ;({ page, context } = await open('/', undefined, 'load'))
  await page.clock.fastForward(90_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'not while /api/me is on its way')
  answer(); meHeld = null
  await page.clock.fastForward(90_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'a member, once the site says so')
  await context.close()

  // OBS's own browser (a browser source): never
  signedIn = false
  ;({ page, context } = await open('/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OBS/31.0.2'))
  await page.clock.fastForward(180_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'never in OBS')
  await context.close()

  // the output window: never, whoever opened it
  signedIn = false
  ;({ page, context } = await open('/?output=1'))
  await page.clock.fastForward(180_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'never in the output window')
  await context.close()

  assert.deepEqual(errors, [])
  console.log('test:guest passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
