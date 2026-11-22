// livliv.ai/stage's note on the desktop app (DesktopNotice.tsx), on the site's build with the site faked: on a computer's
// first visit it waits for the start page to close and for the demo to end, then says what the web version can't do (the
// browser's limits) and links the project on GitHub, with 下载桌面版 (GitHub's latest release, a new tab) and 继续用网页版; once closed it stays closed in this
// browser, and Settings › General › About opens it again. Never with the sign-in prompt, nor on a phone, nor in OBS.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const RELEASES = 'https://github.com/livliv-dev/stage/releases/latest'
const errors = []
let server, browser
let signedIn = true
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  /** app: the desktop app showing livliv.ai/stage (its bridge on the page) */
  const context = async ({ locale = 'zh-Hans', phone = false, userAgent, app = false } = {}) => {
    const c = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: phone, hasTouch: phone, ...(userAgent ? { userAgent } : {}) })
    await c.addInitScript((l) => {
      localStorage.setItem('livliv-stage:locale', l); localStorage.setItem('livliv-stage:coached', '1')
      window.opened = []
      window.open = (url, target) => { window.opened.push([String(url), target]); return null }
    }, locale)
    if (app) await c.addInitScript(() => {
      window.livlivDesktop = { version: 'test', platform: 'darwin', requests: { begin: async () => 'r', cancel: async () => {} }, onCommand: () => () => {},
        hotkeys: { list: async () => [], set: async () => [], enabled: async () => false, enable: async () => [], reset: async () => [] } }
    })
    await c.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/me') return route.fulfill({ json: signedIn ? { signed_in: true, email: 'member@example.test', points: 10, plan: 'free', stage_line_points: 0.3 } : { signed_in: false } })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    return c
  }
  const visit = async (c, { clock = false } = {}) => {
    const page = await c.newPage()
    page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
    if (clock) await page.clock.install()
    await page.goto(origin + '/', { waitUntil: 'networkidle' })
    return page
  }
  const notice = (page) => page.locator('.desktop-notice')
  const none = async (page, why) => { await page.waitForTimeout(800); assert.equal(await notice(page).count(), 0, why) }

  // a computer's first visit: not with the start page, nor while the demo plays; then what the desktop app adds
  signedIn = true
  let c = await context()
  let page = await visit(c)
  await page.locator('.start-overlay .start-page').waitFor()
  await none(page, 'not with the start page')
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.locator('.start-overlay .welcome-demo').click()
  await page.waitForFunction(() => window.__stage.conversation().running)
  await none(page, 'not while the demo plays')
  await page.evaluate(() => window.__stage.talk.stop())
  await notice(page).waitFor()
  assert.equal(await notice(page).locator('.big').innerText(), '网页版的限制')
  assert.deepEqual(await notice(page).locator('li').allInnerTexts(), ['同台角色上限为 15 个角色且数量多更容易卡顿（桌面版为 30 个）', 'OBS 只能用绿幕，输出窗口被完全挡住时画面会停',
    '没有好友联播', '不能用手机面捕（iFacialMocap）和 VMC/OSC', '没有全局热键，切到游戏里就控制不了角色', '接不了 Ollama、Voicebox 等本机的模型和声音，以及其他接口', 'AI 不能看窗口、玩游戏'],
  "the browser's limits, each still true of the web version (AIRI on the web chats, without a window or a game)")
  const project = notice(page).locator('.hint.after a')
  assert.deepEqual([await project.innerText(), await project.getAttribute('href'), await project.getAttribute('target')], ['LivLiv Stage', 'https://github.com/livliv-dev/stage', '_blank'], 'the closing line links the project on GitHub')
  assert.match(await notice(page).locator('.hint.after').innerText(), /^欢迎使用桌面端，以及关注我们的开源项目 LivLiv Stage$/)
  await notice(page).getByRole('button', { name: '下载桌面版' }).click()
  assert.deepEqual(await page.evaluate(() => window.opened), [[RELEASES, '_blank']], "GitHub's latest release, in a new tab")
  await notice(page).waitFor({ state: 'detached' })
  // the second visit: not again
  await page.reload({ waitUntil: 'networkidle' })
  await none(page, 'not on the second visit')
  // Settings › General › About: 桌面版 opens it again; Esc closes it
  await page.locator('.topbar button[title="设置"]').click()
  await page.locator('.general-about button.link', { hasText: '桌面版' }).click()
  await notice(page).waitFor()
  assert.equal(await page.locator('.popover.settings').count(), 0, 'settings closed under it')
  await page.keyboard.press('Escape')
  await notice(page).waitFor({ state: 'detached' })
  await c.close()

  // closing the start page another way, then 继续用网页版; English
  c = await context({ locale: 'en' })
  page = await visit(c)
  await page.locator('.start-overlay .start-page .close').click()
  await notice(page).waitFor()
  assert.equal(await notice(page).locator('.big').innerText(), 'Limits of the web version')
  assert.equal(await notice(page).locator('.hint.after').innerText(), 'Try the desktop app, and follow our open-source project LivLiv Stage')
  await notice(page).getByRole('button', { name: 'Keep using the web version' }).click()
  await notice(page).waitFor({ state: 'detached' })
  assert.deepEqual(await page.evaluate(() => window.opened), [])
  await page.reload({ waitUntil: 'networkidle' })
  await none(page, 'closed stays closed')
  await c.close()

  // a guest: the sign-in prompt comes alone, and the note waits behind nothing
  signedIn = false
  c = await context()
  page = await visit(c, { clock: true })
  await page.locator('.start-overlay .start-page .close').click()
  await notice(page).waitFor()
  await page.clock.fastForward(181_000)
  await page.locator('.guest-gate').waitFor()
  assert.equal(await notice(page).count(), 0, 'never with the sign-in prompt')
  signedIn = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.locator('.guest-gate').waitFor({ state: 'detached' })
  await notice(page).waitFor()
  await c.close()

  // a phone: its own intro, no note
  c = await context({ phone: true })
  page = await visit(c)
  await page.locator('.phone-intro').waitFor()
  await none(page, 'not on a phone')
  await c.close()

  // OBS's own browser: never
  c = await context({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OBS/31.0.2' })
  page = await visit(c)
  await page.locator('.start-overlay .start-page .close').click()
  await none(page, 'never in OBS')
  await c.close()

  // opened from About during the demo and closed there: not again when the demo ends
  signedIn = true
  c = await context()
  page = await visit(c)
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
  await page.locator('.start-overlay .welcome-demo').click()
  await page.waitForFunction(() => window.__stage.conversation().running)
  await page.locator('.topbar button[title="设置"]').click()
  await page.locator('.general-about button.link', { hasText: '桌面版' }).click()
  await notice(page).getByRole('button', { name: '继续用网页版' }).click()
  await notice(page).waitFor({ state: 'detached' })
  await page.evaluate(() => window.__stage.talk.stop())
  await none(page, 'closed once: not again when the demo ends')
  await c.close()

  // a first visit that picks 空白舞台: the empty stage shows the start page, and the note waits behind nothing over it
  c = await context()
  page = await visit(c)
  await page.locator('.start-overlay .start-page .link', { hasText: '空白舞台' }).click()
  await page.waitForFunction(() => window.__stage.store.get().items.length === 0)
  await page.locator('.stage-box .empty .start-page').waitFor()
  await none(page, 'not over an empty stage\'s start page')
  await c.close()

  // About › 桌面版 with the settings opened from the mixer: back to the stage, the note on it (not behind the mixer)
  c = await context()
  page = await visit(c)
  await page.locator('.start-overlay .start-page .close').click()
  await notice(page).getByRole('button', { name: '继续用网页版' }).click()
  await page.locator('.topbar button[title="调音台"]').click()
  await page.locator('.mixer-settings').click()
  await page.locator('.settings-tabs button', { hasText: '通用' }).click()
  await page.locator('.general-about button.link', { hasText: '桌面版' }).click()
  await notice(page).waitFor()
  assert.equal(await page.locator('.popover').count(), 0, 'no card left open over it')
  await c.close()

  // the desktop app showing livliv.ai/stage: never (it is the app)
  c = await context({ app: true })
  page = await visit(c)
  await page.locator('.start-overlay .start-page .close').click().catch(() => {})
  await none(page, 'never in the desktop app')
  await c.close()

  assert.deepEqual(errors, [])
  console.log('test:desktop-notice passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
