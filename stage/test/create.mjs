// The ways back to making a character on livliv.ai (openCreate, siteUrl), on the site's build with the site faked: the
// top bar's 创建角色 (its label, an icon alone when the bar is narrow), the add card's link, the logo to the home page,
// the GitHub mark at the bar's far end, and on a phone the intro's link; each opens in a new tab, so the stage stays.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
let server, browser
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_STAGE_HOST: 'livliv' } })
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(t); resolve() } }); server.once('exit', (c) => { clearTimeout(t); reject(new Error('Vite exited ' + c)) }) })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const open = async (locale, size = { width: 1440, height: 900 }, phone = false) => {
    const context = await browser.newContext({ viewport: size, isMobile: phone, hasTouch: phone })
    await context.addInitScript((l) => {
      localStorage.setItem('livliv-stage:locale', l); localStorage.setItem('livliv-stage:coached', '1')
      window.opened = []
      window.open = (url, target) => { window.opened.push([String(url), target]); return null }
    }, locale)
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 10, plan: 'free', stage_line_points: 0.3 } })
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(origin + '/', { waitUntil: 'networkidle' })
    await page.locator('.site-welcome .close').click().catch(() => {})
    return { page, context }
  }
  const opened = (page) => page.evaluate(() => window.opened)

  for (const [locale, label] of [['zh-Hans', '创建角色'], ['en', 'Create an avatar']]) {
    const { page, context } = await open(locale)
    const create = page.locator('.topbar .create-button')
    assert.equal((await create.innerText()).trim(), label, `the top bar says ${label}`)
    await create.click()
    assert.deepEqual(await opened(page), [['/discover?new=1', '_blank']], "the site's create page, in a new tab")
    const logo = page.locator('.topbar a.mark-link')
    assert.deepEqual([await logo.getAttribute('href'), await logo.getAttribute('target')], ['/', '_blank'], "the logo: the site's home, in a new tab")
    const github = page.locator('.topbar a.github-link')
    assert.deepEqual([await github.getAttribute('href'), await github.getAttribute('target')], ['https://github.com/livliv-dev/stage', '_blank'], 'the code on GitHub, in a new tab')
    // the add card: 从 livliv.ai 增加, and making one on the site
    await page.locator('.rail button.tool').first().click()  // the first of the rail's tools: add a character
    await page.locator('.popover.add .create-link').click()
    assert.deepEqual((await opened(page)).at(-1), ['/discover?new=1', '_blank'], 'the add card leads there too')
    await context.close()
  }

  // a narrow bar: the icon alone
  {
    const { page, context } = await open('zh-Hans', { width: 1024, height: 800 })
    assert.equal(await page.locator('.topbar .create-button').isVisible(), true)
    assert.equal(await page.locator('.topbar .create-button .create-label').isVisible(), false, 'icon only when the bar is narrow')
    assert.equal(await page.locator('.topbar a.github-link').isVisible(), true, 'GitHub at the far end at 1024 px too')
    assert.equal(await page.evaluate(() => document.querySelector('.topbar').scrollWidth <= document.querySelector('.topbar').clientWidth), true, 'the bar still fits')
    await context.close()
  }

  // a phone: the intro's link
  {
    const { page, context } = await open('zh-Hans', { width: 390, height: 844 }, true)
    await page.locator('.phone-intro button', { hasText: '在 livliv.ai 创建新角色' }).click()
    assert.deepEqual((await opened(page)).at(-1), ['/discover?new=1', '_blank'], 'a phone can go and make one')
    await context.close()
  }

  assert.deepEqual(errors, [])
  console.log('test:create passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
