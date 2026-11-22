// A recording is an output: the moment one starts, the private record in front gives way to the public one, in the
// same change that starts the take (not at the once-a-second look at the outputs). Model calls go to a fixture.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = []
let server, browser
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-ai/chat/completions') return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '好的。', emotion: 'neutral', action: 'none', cues: [] }) } }] } })
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(20000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts'), { saveBrainConfig } = await import('/src/brain.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#7bb6e8'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, ''); character.muted = true; store.add(character); store.select(null)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  assert.equal(await page.evaluate(() => window.__stage.conversation().scope), 'private')
  // the scope as the take starts: read in the recording's own change, before any timer could run
  const atStart = await page.evaluate(async () => {
    const { onRecording, recording } = await import('/src/recording.ts')
    return new Promise((resolve) => {
      const off = onRecording(() => { if (['starting', 'recording'].includes(recording().phase)) { off(); const c = window.__stage.conversation(); resolve({ phase: recording().phase, scope: c.scope, output: c.output }) } })
      void window.__stage.rec.start({ mic: false, talk: false })
    })
  })
  assert.deepEqual(atStart, { phase: 'starting', scope: 'public', output: true }, 'the session is public as the take starts')
  await page.evaluate(async () => { await window.__stage.rec.stop() })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, atStart }))
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
