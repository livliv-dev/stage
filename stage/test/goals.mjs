// Each goal from the start page, with a model already set up, counting the actions it takes (a click, or a line typed
// and sent with Enter): 我来演 to its output window (≤ 3), AI 来开播 to a running 直播间 (≤ 5), 和角色聊天 to a chat
// answering your first line (≤ 2), 做一段视频 to a finished video (≤ 4). Prints the counts.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const LIMITS = { perform: 3, live: 5, chat: 2, video: 4 }
const counts = {}, errors = []
let server, browser
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
  /** a fresh page on the start page, the model set up (a fixture behind it), and a click that counts */
  const open = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
    await context.addInitScript((base) => {
      if (sessionStorage.getItem('goals-ready')) return
      sessionStorage.setItem('goals-ready', '1')
      localStorage.setItem('livliv-stage:locale', 'zh-Hans')
      localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base: base + '/fixture-ai', key: 'test-only', model: 'fixture-model' }))
    }, `http://127.0.0.1:${port}`)
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/fixture-ai/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '你好，我们开始吧。', emotion: 'happy', action: 'nod', cues: [] }) } }] } })
      if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: false } })
      if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue()
      return route.abort()
    })
    const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.start-page .goal-tile')
    let clicks = 0
    const click = async (locator) => { await locator.click(); clicks++ }
    const type = async (locator, text) => { await locator.fill(text); await locator.press('Enter'); clicks++ }
    const loaded = () => page.waitForFunction(() => [...window.__stage.actors.values()].length > 0 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'), null, { timeout: testTimeout(60000) })
    return { context, page, click, type, clicks: () => clicks, loaded }
  }
  const goal = (page, label) => page.locator('.start-page .goal-tile', { hasText: label }).first()
  const footer = (page) => page.locator('.popover.checklist footer .primary')

  // 我来演: the goal (your character, its camera), then 输出到 OBS and its window
  {
    const { context, page, click, clicks, loaded } = await open()
    await click(goal(page, '我来演').locator('.goal-main'))
    await page.waitForSelector('.popover.checklist'); await loaded()
    await page.waitForFunction(() => [...window.__stage.actors.values()].some((a) => a.item.lines === 'me' && a.inputPhase === 'on'))
    await click(page.locator('.topbar .output-button'))
    const popup = page.waitForEvent('popup')
    await click(page.locator('.output-settings').getByRole('button', { name: '打开输出窗口', exact: true }))
    await (await popup).waitForLoadState()
    counts.perform = clicks(); await context.close()
  }
  // AI 来开播: the goal, then 开播 (no chat connected: it waits for viewers)
  {
    const { context, page, click, clicks, loaded } = await open()
    await click(goal(page, 'AI 来开播').locator('.goal-main'))
    await page.waitForSelector('.popover.checklist'); await loaded()
    assert.equal((await footer(page).innerText()).trim(), '开播')
    await click(footer(page))
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.mode === 'live' })
    assert.equal(await page.evaluate(() => window.__stage.conversation().scope), 'public', 'a 直播间 is public')
    counts.live = clicks(); await page.evaluate(() => window.__stage.talk.stop()); await context.close()
  }
  // 和角色聊天: the goal, then your first line typed in the console and sent: the chat starts with it and answers it
  {
    const { context, page, click, type, clicks, loaded } = await open()
    await click(goal(page, '和角色聊天'))
    await page.waitForSelector('.popover.checklist'); await loaded()
    assert.equal((await footer(page).innerText()).trim(), '开始聊天')
    await type(page.locator('.console .run-bar input.first-line'), '你好，今天想聊什么？')
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.mode === 'chat' && c.waitingInput && c.lines[0]?.human && c.lines[0].text === '你好，今天想聊什么？' && c.lines.some((l) => !l.human) })
    counts.chat = clicks(); await page.evaluate(() => window.__stage.talk.stop()); await context.close()
  }
  // 做一段视频: the goal, then 开录 (the recording starts the characters talking), 结束 and 停止录制: the video
  {
    const { context, page, click, clicks, loaded } = await open()
    await click(goal(page, '做一段视频'))
    await page.waitForSelector('.popover.checklist'); await loaded()
    assert.equal((await footer(page).innerText()).trim(), '开录')
    await click(footer(page))
    await page.waitForFunction(() => window.__stage.recording().phase === 'recording' && window.__stage.conversation().running && window.__stage.conversation().mode === 'conversation')
    await page.waitForFunction(() => window.__stage.conversation().lines.length > 0)
    await click(page.locator('.topbar .rec.live'))
    await page.waitForFunction(() => window.__stage.recording().phase === 'done', null, { timeout: testTimeout(60000) })
    counts.video = clicks(); await context.close()
  }
  for (const [id, limit] of Object.entries(LIMITS)) assert.ok(counts[id] <= limit, `${id}: ${counts[id]} clicks, at most ${limit}`)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, clicks: counts, limits: LIMITS }))
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
