// LivLiv Stage on the desktop holds more characters than Chromium's 16 WebGL contexts (main.ts): 20 on one stage,
// none lost, and all 20 still there after a video of them is made. Then a character that loses its context: it says
// so, the stage says it once, and both go when it is removed, hidden, or another character leaves room. Runs the app
// on Stage's dev server, for its __stage hooks.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createServer as createSocket } from 'node:net'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const COUNT = 20
const root = fileURLToPath(new URL('..', import.meta.url)), stage = join(root, '..', 'stage')
const artifacts = await mkdtemp(join(tmpdir(), 'livliv-stage-contexts-'))
const errors = [], report = { artifacts }
// LivLiv's /api, signed out (the dev server passes /api on to LM_API_PORT)
const api = createServer((req, res) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false })))
await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve))
const socket = createSocket(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port; await new Promise((resolve) => socket.close(resolve))
let vite, app
try {
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: stage, env: { ...process.env, LM_API_PORT: String(api.address().port) }, stdio: ['ignore', 'pipe', 'pipe'] })
  vite.stderr.on('data', () => {})
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 20000); vite.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); vite.once('exit', (code) => reject(new Error('Vite exited ' + code))) })
  const origin = `http://127.0.0.1:${port}`
  app = await electron.launch({ executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [root, '--app=stage', `--url=${origin}`, `--user-data=${join(artifacts, 'profile')}`, `--api=http://127.0.0.1:${api.address().port}`], timeout: 30000 })
  report.switch = await app.evaluate(({ app }) => app.commandLine.getSwitchValue('max-active-webgl-contexts'))
  assert.equal(report.switch, '32')
  const page = await app.firstWindow(); page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await page.reload(); await page.waitForSelector('.topbar')

  await page.evaluate(async (count) => {
    const { samples } = await import('/src/library.ts'), { newCharacter } = await import('/src/scene.ts'), s = window.__stage.store, picks = samples()
    for (let i = 0; i < count; i++) { const pick = picks[i % picks.length], c = newCharacter(s.get(), pick.name, pick.model); c.lines = 'none'; s.add(c) }
  }, COUNT)
  await page.waitForFunction((count) => window.__stage.actors.size === count && [...window.__stage.actors.values()].every((a) => a.status !== 'loading'), COUNT, { timeout: 180000 })
  await page.waitForTimeout(2000)  // a context taken for room goes a moment after the one that took it
  const actors = () => page.evaluate(() => [...window.__stage.actors.values()].map((a) => ({ id: a.item.id, status: a.status, lost: a.player.contextLost })))
  const all = await actors()
  report.characters = { on: all.length, ready: all.filter((a) => a.status === 'ready').length, contextsLost: all.filter((a) => a.lost).length }
  report.fps = await page.evaluate(async () => {
    const { onFrame } = await import('/src/actors.ts'), drawn = new Map()
    let frames = 0, on = true
    const tick = () => { frames++; if (on) requestAnimationFrame(tick) }; requestAnimationFrame(tick)
    const off = onFrame((a) => drawn.set(a.item.id, (drawn.get(a.item.id) ?? 0) + 1)), t0 = performance.now()
    await new Promise((resolve) => setTimeout(resolve, 4000)); off(); on = false
    const seconds = (performance.now() - t0) / 1000, each = [...drawn.values()].map((n) => n / seconds)
    return { page: Math.round(frames / seconds), drawing: each.length, slowest: Math.round(Math.min(...each)), mean: Math.round(each.reduce((x, y) => x + y, 0) / each.length) }
  })
  await page.screenshot({ path: join(artifacts, 'twenty.png') })
  assert.deepEqual(report.characters, { on: COUNT, ready: COUNT, contextsLost: 0 })
  assert.equal(await page.locator('.badge.err, .crowd-notice').count(), 0)

  // a short video of all of them: its players need as many contexts again, more than fit beside the stage's, so the
  // stage lends its own while the video is made (a still of each meanwhile), and all draw again after it
  await page.evaluate(() => window.__stage.rec.start({ mic: false, talk: false }))
  await page.waitForTimeout(2000)
  await page.evaluate(() => { void window.__stage.rec.stop() })
  await page.waitForFunction(() => { const r = window.__stage.recording(); return r.phase !== 'recording' && (r.phase !== 'making' || window.__stage.actors.size === 0) }, null, { polling: 50 })
  report.lent = await page.evaluate(() => window.__stage.recording().phase === 'making' && window.__stage.actors.size === 0)
  await page.screenshot({ path: join(artifacts, 'making.png') })
  await page.waitForFunction(() => ['done', 'error'].includes(window.__stage.recording().phase), null, { timeout: 180000 })
  report.video = await page.evaluate(() => { const r = window.__stage.recording(); return { phase: r.phase, error: r.error, bytes: r.made?.file.size ?? 0, seconds: r.made?.seconds } })
  assert.equal(report.video.phase, 'done', report.video.error)
  assert.ok(report.video.bytes > 0)
  assert.equal(report.lent, true)
  await page.waitForFunction((count) => [...window.__stage.actors.values()].filter((a) => a.status === 'ready' && !a.player.contextLost).length === count, COUNT, { timeout: 60000 })
  await page.waitForTimeout(2000)  // as above: a context taken would go a moment later
  const back = await actors()
  report.afterVideo = { on: back.length, ready: back.filter((a) => a.status === 'ready').length, contextsLost: back.filter((a) => a.lost).length }
  assert.deepEqual(report.afterVideo, { on: COUNT, ready: COUNT, contextsLost: 0 })
  assert.equal(await page.locator('.badge.err, .crowd-notice').count(), 0)
  await page.screenshot({ path: join(artifacts, 'after-video.png') })
  await page.evaluate(() => window.__stage.rec.reset())

  // a character loses its context while the others draw
  const notice = page.locator('.crowd-notice'), crowdedBadge = page.locator('.badge.err', { hasText: '角色太多' })
  const lose = (i) => page.evaluate((i) => { const a = [...window.__stage.actors.values()][i]; a.player.canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(); return a.item.id }, i)
  const ready = (id) => page.waitForFunction((id) => window.__stage.actors.get(id)?.status === 'ready' && !window.__stage.actors.get(id).player.contextLost, id)
  let id = await lose(0)
  await notice.waitFor(); assert.equal(await crowdedBadge.count(), 1)
  report.notice = await notice.innerText()
  assert.match(report.notice, /角色太多.*桌面版大约 30 个.*隐藏或移除/)
  await page.screenshot({ path: join(artifacts, 'notice.png') })
  await page.evaluate((id) => window.__stage.store.remove(id), id)
  await notice.waitFor({ state: 'detached' }); assert.equal(await crowdedBadge.count(), 0)
  report.removed = 'notice gone when the character is removed'
  // hidden, it gives up nothing more and the notice goes; shown again, it starts on a new canvas
  id = await lose(0)
  await notice.waitFor()
  await page.evaluate((id) => window.__stage.store.patch(id, { hidden: true }), id)
  await notice.waitFor({ state: 'detached' })
  await page.evaluate((id) => window.__stage.store.patch(id, { hidden: false }), id)
  await ready(id); assert.equal(await page.locator('.badge.err, .crowd-notice').count(), 0)
  report.hidden = 'notice gone when the character is hidden; shown again, it draws'
  // another character leaves: the one without a context starts again in its room
  id = await lose(0)
  await notice.waitFor()
  await page.evaluate((id) => { const other = [...window.__stage.actors.keys()].find((x) => x !== id); window.__stage.store.remove(other) }, id)
  await ready(id); await notice.waitFor({ state: 'detached' }); assert.equal(await crowdedBadge.count(), 0)
  report.room = 'a character removed: the crowded one draws again, notice gone'
  report.end = (await actors()).filter((a) => a.status === 'ready' && !a.lost).length
  assert.equal(report.end, COUNT - 2)
  assert.deepEqual(errors, [])
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ error: String(error), errors, report }, null, 2))
  for (const page of app?.windows() ?? []) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  throw error
} finally { await app?.close(); vite?.kill(); api.closeAllConnections(); api.close() }
