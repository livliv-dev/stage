// livliv.ai/stage's guests (GuestGate.tsx), on the site's build with the site faked and the page's clock faked: signed
// out, nothing for the first three minutes, then the sign-in prompt, with what is playing going on behind it; it leads
// to the site's sign-in or sign-up and back; 先逛逛, Esc or a click outside closes it for the rest of the visit, and a new
// visit asks again after three minutes; signing in (another tab: the page asks again on focus) takes it away; a member
// never sees it (nor while the site hasn't said yet), nor does the output window (what OBS captures) or OBS's own browser.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = []
let server, browser
let signedIn = false
let meHeld = null  // a promise /api/me waits on (the site slow to say who is there)
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  /** app: the desktop app showing livliv.ai/stage (its bridge on the page) */
  const open = async (path, userAgent, waitUntil = 'networkidle', { app = false } = {}) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(userAgent ? { userAgent } : {}) })
    await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
    if (app) await context.addInitScript(() => {
      window.livlivDesktop = { version: 'test', platform: 'darwin', requests: { begin: async () => 'r', cancel: async () => {} }, onCommand: () => () => {},
        hotkeys: { list: async () => [], set: async () => [], enabled: async () => false, enable: async () => [], reset: async () => [] } }
    })
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/me' && meHeld) await meHeld
      if (url.pathname === '/api/me') return route.fulfill({ json: signedIn ? { signed_in: true, email: 'member@example.test', points: 10, plan: 'free' } : { signed_in: false } })
      if (url.pathname === '/login') return route.fulfill({ contentType: 'text/html', body: '<p>the site sign-in</p>' })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
    await page.clock.install()
    await page.goto(origin + path, { waitUntil })
    if (waitUntil !== 'networkidle') await page.waitForFunction(() => !!window.__stage, null, { timeout: testTimeout(30000) })
    return { page, context }
  }
  const gate = (page) => page.locator('.guest-gate')

  // a guest: three minutes to look around, then the prompt, with the demo going on behind it
  signedIn = false
  let { page, context } = await open('/')
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.clock.fastForward(120_000)
  assert.equal(await gate(page).count(), 0, 'not after a minute or two')
  await page.clock.fastForward(50_000)  // the clock also runs in real time while the page loads: a few seconds' room
  assert.equal(await gate(page).count(), 0, 'not before three minutes')
  // the free demo from the start page (a guest has no model: since livliv.ai's switch, Space opens 连接 instead)
  await page.locator('.start-overlay .start-page .welcome-demo').click()
  await page.waitForFunction(() => window.__stage.conversation().running)
  await page.clock.fastForward(11_000)
  await gate(page).waitFor()
  assert.equal(await page.evaluate(() => window.__stage.conversation().running), true, 'what was playing goes on')
  assert.equal(await page.evaluate(() => window.__stage.conversation().paused), false, 'and is not paused')
  // the prompt holds the focus, not 登录: Enter or Space, pressed for what plays behind it, signs nobody in
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('guest-gate')), true, 'the prompt has the focus')
  await page.keyboard.press('Enter'); await page.keyboard.press('Space'); await page.keyboard.press('Space')
  await page.waitForTimeout(300)
  assert.equal(new URL(page.url()).pathname, '/', 'still on the stage')
  await gate(page).getByRole('button', { name: '注册' }).click()
  await page.waitForURL((u) => u.pathname === '/login')
  assert.equal(new URL(page.url()).searchParams.get('mode'), 'signup')
  assert.equal(new URL(page.url()).searchParams.get('next'), '/', 'sign-up comes back to the page')
  await context.close()

  // 先逛逛: closed for the rest of the visit; a new visit (the page loaded again) asks again after three minutes
  ;({ page, context } = await open('/'))
  await page.clock.fastForward(181_000)
  await gate(page).waitFor()
  await gate(page).getByRole('button', { name: '先逛逛' }).click()
  await gate(page).waitFor({ state: 'detached' })
  await page.clock.fastForward(600_000)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'not again on this visit')
  await page.reload({ waitUntil: 'networkidle' })
  await page.clock.fastForward(120_000)
  assert.equal(await gate(page).count(), 0, 'a new visit: not at once')
  await page.clock.fastForward(61_000)
  await gate(page).waitFor()
  // Esc closes it too, and so does a click outside it
  await page.keyboard.press('Escape')
  await gate(page).waitFor({ state: 'detached' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.clock.fastForward(181_000)
  await gate(page).waitFor()
  await page.mouse.click(8, 450)
  await gate(page).waitFor({ state: 'detached' })
  await context.close()

  // 登录, and signing in elsewhere takes it away
  ;({ page, context } = await open('/'))
  await page.clock.fastForward(181_000)
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
  await page.clock.fastForward(240_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'a member never sees it')
  await context.close()

  // a member whose /api/me is slow: nothing while the site hasn't said, and nothing once it says signed in
  signedIn = true
  let answer; meHeld = new Promise((r) => { answer = r })
  ;({ page, context } = await open('/', undefined, 'load'))
  await page.clock.fastForward(120_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'not while /api/me is on its way')
  answer(); meHeld = null
  await page.clock.fastForward(120_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'a member, once the site says so')
  await context.close()

  // the desktop app showing livliv.ai/stage: never (it is the app, with a sign-in of its own)
  signedIn = false
  ;({ page, context } = await open('/', undefined, 'networkidle', { app: true }))
  await page.clock.fastForward(240_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'never in the desktop app')
  await context.close()

  // OBS's own browser (a browser source): never
  signedIn = false
  ;({ page, context } = await open('/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OBS/31.0.2'))
  await page.clock.fastForward(240_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'never in OBS')
  await context.close()

  // the output window: never, whoever opened it
  signedIn = false
  ;({ page, context } = await open('/?output=1'))
  await page.clock.fastForward(240_000)
  await page.waitForTimeout(300)
  assert.equal(await gate(page).count(), 0, 'never in the output window')
  await context.close()

  assert.deepEqual(errors, [])
  console.log('test:guest passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
