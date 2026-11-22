// livliv.ai/stage (the site's build, VITE_STAGE_HOST=livliv) at a phone's width and a computer's. A page opened narrow
// starts on show with the phone's intro; widened to a computer's size it goes to editing once, and opens the character
// it was linked to (?c=). Narrowing never changes the mode: an editing page keeps its editor and what is open in it (the
// add card here), and a preview chosen with 预览 stays one through a narrow window and back. The site is faked: signed
// out, nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = []
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const narrow = { width: 700, height: 820 }, wide = { width: 1440, height: 900 }
  const open = async (path) => {
    const context = await browser.newContext({ viewport: narrow })
    await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans') })
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: false } })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' })
    return { context, page }
  }
  const mode = (page) => page.evaluate(() => window.__stage.store.mode())
  const editing = (page) => page.waitForFunction(() => window.__stage.store.mode() === 'edit' && !!document.querySelector('.topbar'))

  {
    // opened at a phone's width: on show, the phone's intro
    const { context, page } = await open('/')
    await page.locator('.phone-intro').waitFor()
    assert.equal(await mode(page), 'show')
    assert.equal(await page.locator('.topbar').count(), 0)
    // widened to a computer's: editing, with the top bar, and no phone intro
    await page.setViewportSize(wide)
    await editing(page)
    assert.equal(await page.locator('.phone-intro').count(), 0)

    // editing with the add card open, narrowed: still editing, the card still open; widened again: the same
    await page.locator('.start-overlay [data-close]').click().catch(() => {})
    await page.locator('.rail button.tool', { hasText: '角色' }).click()
    await page.locator('.popover.add').waitFor()
    await page.setViewportSize(narrow)
    await page.waitForFunction(() => document.querySelector('.app')?.classList.contains('narrow'))
    assert.equal(await mode(page), 'edit', 'narrowing keeps the editor')
    assert.equal(await page.locator('.popover.add').count(), 1, 'and what is open in it')
    await page.setViewportSize(wide)
    await page.waitForFunction(() => !document.querySelector('.app')?.classList.contains('narrow'))
    assert.equal(await mode(page), 'edit')
    assert.equal(await page.locator('.popover.add').count(), 1)
    await page.keyboard.press('Escape')

    // a preview chosen with 预览 stays one, through a narrow window (the phone's intro shows) and back
    await page.locator('.topbar .seg.mode button', { hasText: '预览' }).click()
    await page.waitForFunction(() => window.__stage.store.mode() === 'show')
    await page.setViewportSize(narrow)
    await page.locator('.phone-intro').waitFor()
    await page.setViewportSize(wide)
    await page.waitForFunction(() => !document.querySelector('.phone-intro'))
    assert.equal(await mode(page), 'show', 'a preview of one\'s own is kept')
    await context.close()
  }

  {
    // a link to a character (as AI) opened at a phone's width: on show; widened, editing, and the link opens its checklist
    const { context, page } = await open('/?c=k01&as=ai')
    await page.locator('.phone-intro').waitFor()
    assert.equal(await page.locator('.popover.checklist').count(), 0)
    await page.setViewportSize(wide)
    await editing(page)
    await page.locator('.popover.checklist').waitFor()
    assert.equal(await page.evaluate(() => window.__stage.store.get().talk.goal), 'live', 'the link\'s AI 来开播')
    await context.close()
  }

  assert.deepEqual(errors, [])
  console.log('test:site-phone passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
