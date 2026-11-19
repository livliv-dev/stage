import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { freePort, startVite } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
let server, browser
const modelCalls = [], errors = []
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans')
    localStorage.setItem('livliv-stage:coached', '1')
  })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/fixture-ai/')) modelCalls.push(url.pathname)
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    const { store } = await import('/src/scene.ts')
    const { buildTemplate } = await import('/src/templates.ts')
    const { saveBrainConfig } = await import('/src/brain.ts')
    const scene = await buildTemplate('trio')
    const profileIds = scene.items.filter(c => c.kind === 'character' && c.lines === 'ai').map(c => c.profileId ?? c.id)
    await memory.saveSession({ id: 'existing-user-chat', profileIds, scope: 'private', title: 'Before the demo', revision: 1, updatedAt: 1,
      lines: [{ id: 'original-user-line', who: 'narrator', name: '我', human: true, text: 'Keep my existing conversation.', emotion: 'neutral', action: 'none', to: null }] })
    window.originalLatest = memory.latest.bind(memory)
    window.pendingHistoryReads = []
    memory.latest = async (...args) => {
      const saved = await window.originalLatest(...args)
      await new Promise(resolve => window.pendingHistoryReads.push(resolve))
      return saved
    }
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
    store.replace(scene)
  })
  await page.waitForFunction(() => window.pendingHistoryReads.length > 0)
  await page.locator('.model-btn').click()
  await page.locator('.demo-launch button').click()
  await page.waitForFunction(async () => (await import('/src/brain.ts')).loadBrainConfig().kind === 'demo' && window.__stage.conversation().running)
  await page.evaluate(async () => {
    window.pendingHistoryReads.forEach(resolve => resolve())
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  const demoState = await page.evaluate(() => ({ storageError: window.__stage.conversation().storageError, error: window.__stage.conversation().error }))
  console.log(JSON.stringify({ scenario: 'open demo while history is restoring', ...demoState }))
  assert.equal(demoState.storageError, '', 'An obsolete restore must not show a conversation save failure in the demo')
  assert.equal(demoState.error, '')
  await page.waitForFunction(() => window.__stage.conversation().lines.some(line => line.demo === 0))
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some(line => line.id === 'original-user-line')), false)
  await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    window.__stage.talk.stop()
    memory.latest = window.originalLatest
  })
  const saved = await page.evaluate(async () => (await import('/src/memory.ts')).memory.session('existing-user-chat'))
  assert.deepEqual(saved.lines.map(line => line.text), ['Keep my existing conversation.'])

  // A second automatic restore owns its result, even if an earlier read finishes last.
  const overlap = await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    const { chatHistory } = await import('/src/chatHistory.ts')
    const { playDemo } = await import('/src/brain.ts')
    const { talk, conversation } = await import('/src/conversation.ts')
    playDemo(false); chatHistory.reset()
    let release, pending
    const started = new Promise(resolve => { pending = resolve })
    let reads = 0
    memory.latest = async (...args) => {
      const session = await window.originalLatest(...args)
      if (++reads === 1) { pending(); await new Promise(resolve => { release = resolve }) }
      return session
    }
    const earlier = talk.restore()
    await started
    await talk.restore()
    release(); await earlier
    return { storageError: conversation().storageError, sessionId: conversation().sessionId }
  })
  assert.equal(overlap.storageError, '')
  assert.equal(overlap.sessionId, 'existing-user-chat')

  // A selected public scope supersedes private restoration without restoring private lines.
  const switched = await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    const { chatHistory } = await import('/src/chatHistory.ts')
    const { talk, conversation } = await import('/src/conversation.ts')
    chatHistory.reset()
    let release, pending
    const started = new Promise(resolve => { pending = resolve })
    memory.latest = async (...args) => {
      const session = await window.originalLatest(...args)
      if (args[1] === 'private') { pending(); await new Promise(resolve => { release = resolve }) }
      return session
    }
    const earlier = talk.restore()
    await started
    await talk.setScope('public')
    release(); await earlier
    return { storageError: conversation().storageError, scope: conversation().scope, lines: conversation().lines }
  })
  assert.equal(switched.storageError, '')
  assert.equal(switched.scope, 'public')
  assert.equal(switched.lines.length, 0)

  const failure = await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    const { chatHistory } = await import('/src/chatHistory.ts')
    chatHistory.reset()
    memory.latest = async () => { throw new DOMException('fixture storage transaction failed', 'AbortError') }
    await window.__stage.talk.restore()
    return window.__stage.conversation().storageError
  })
  assert.match(failure, /fixture storage transaction failed/, 'A real IndexedDB AbortError must remain visible')
  assert.deepEqual(modelCalls, [])
  assert.deepEqual(errors, [])
  console.log('PASS: demo restoration race; overlapping restores; public/private isolation; original chat preserved; real storage errors visible; no model calls')
} finally {
  await browser?.close()
  server?.kill()
}
