// livliv.ai/stage (the site's build, VITE_STAGE_HOST=livliv) at a phone's width and then a computer's: a page opened
// narrow shows the demo's stage with the phone's intro; widened to a computer's size it goes back to editing (the top
// bar, the editor). A page put on show for a phone after editing comes back the same way, while a preview chosen with
// 预览 stays a preview through a narrow window and back. The site is faked: signed out, nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = []
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 700, height: 820 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans') })
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: false } })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  const mode = () => page.evaluate(() => window.__stage.store.mode())
  const editing = () => page.waitForFunction(() => window.__stage.store.mode() === 'edit' && !!document.querySelector('.topbar'))
  const showing = () => page.waitForFunction(() => window.__stage.store.mode() === 'show')

  // opened at a phone's width: the stage on show, the phone's intro
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
  await page.locator('.phone-intro').waitFor()
  assert.equal(await mode(), 'show')
  assert.equal(await page.locator('.topbar').count(), 0)
  // widened to a computer's: editing, with the top bar, and no phone intro
  await page.setViewportSize({ width: 1440, height: 900 })
  await editing()
  assert.equal(await page.locator('.phone-intro').count(), 0)

  // editing, then a narrow window and back: on show for the phone, then editing again
  await page.setViewportSize({ width: 700, height: 820 })
  await showing()
  await page.locator('.phone-intro').waitFor()
  await page.setViewportSize({ width: 1440, height: 900 })
  await editing()

  // a preview chosen with 预览 stays one, through a narrow window and back
  await page.locator('.start-overlay [data-close]').click().catch(() => {})
  await page.locator('.topbar .seg.mode button', { hasText: '预览' }).click()
  await showing()
  await page.setViewportSize({ width: 700, height: 820 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(500)
  assert.equal(await mode(), 'show', 'a preview of one\'s own is kept')

  assert.deepEqual(errors, [])
  console.log('test:site-phone passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
