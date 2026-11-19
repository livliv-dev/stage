// The console's main start button and Space: Space begins what the main button begins. Model calls go to a fixture.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-start-'))
const errors = [], calls = [], report = { artifacts }
let server, browser, page
try {
  const socket = createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port; await new Promise((resolve) => socket.close(resolve))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start: ' + output)), 20000)
    server.stdout.on('data', (bytes) => { output += String(bytes); if (output.includes('Local:')) { clearTimeout(timer); resolve() } })
    server.stderr.on('data', (bytes) => { output += String(bytes) })
    server.once('exit', (code) => { clearTimeout(timer); reject(new Error('Vite exited ' + code + ': ' + output)) })
  })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-ai/chat/completions') {
      calls.push(route.request().postDataJSON())
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '我们开始吧。', emotion: 'happy', action: 'nod', cues: [] }) } }] } }).catch(() => {})
      return
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  const conv = () => page.evaluate(() => { const c = window.__stage.conversation(); return { running: c.running, mode: c.mode, error: c.error } })
  const stop = async () => { await page.evaluate(() => window.__stage.talk.stop()); await page.waitForFunction(() => !window.__stage.conversation().running) }
  const space = async () => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Space') }
  /** what is running once a start has had time to begin: its kind */
  const started = async () => { await page.waitForFunction(() => window.__stage.conversation().running); return (await conv()).mode }

  // one AI character, a model of one's own: the main button says 持续聊天, and Space starts the same chat
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts'), { saveBrainConfig } = await import('/src/brain.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。'); character.muted = true; store.add(character); store.select(null)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  const main = page.locator('.console .run .primary')
  assert.equal((await main.innerText()).trim(), '持续聊天')
  await main.click()
  const byButton = await started(); await stop()
  await space()
  const bySpace = await started(); await stop()
  assert.equal(byButton, 'chat'); assert.equal(bySpace, byButton, 'Space starts what the main button starts')
  report.oneCharacter = { button: byButton, space: bySpace }

  // show mode: Space begins what the show controls' button begins
  await page.evaluate(() => window.__stage.store.setMode('show'))
  await page.locator('.show-controls .primary').waitFor({ state: 'attached' })
  assert.equal((await page.locator('.show-controls .primary').innerText()).trim(), '开始对谈')
  await space()
  assert.equal(await started(), 'conversation', 'in show mode Space follows the show controls')
  await stop(); await page.evaluate(() => window.__stage.store.setMode('edit'))

  // a session running: Space pauses and resumes it
  await main.click(); await started()
  await space(); await page.waitForFunction(() => window.__stage.conversation().paused)
  await space(); await page.waitForFunction(() => !window.__stage.conversation().paused)
  await stop()
  report.pause = 'Space pauses and resumes a running session'

  // nobody AI on the stage: Space calibrates, starts nothing
  await page.evaluate(() => { const c = window.__stage.store.get().items.find((i) => i.kind === 'character'); window.__stage.store.patch(c.id, { lines: 'me' }) })
  await space(); await page.waitForTimeout(500)
  assert.equal((await conv()).running, false, 'with no AI character Space starts nothing')

  await page.screenshot({ path: join(artifacts, 'start.png') })
  assert.deepEqual(errors, [])
  report.modelCalls = calls.length
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  server?.kill()
}
