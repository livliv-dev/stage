import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-shots-'))
let server, browser, page
const report = { artifacts }, errors = []
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
  await context.addInitScript(() => {
    if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans')
    localStorage.setItem('livliv-stage:coached', '1')
    const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); window.cameraStarts = 0
    navigator.mediaDevices.getUserMedia = (c) => { if (c.video) window.cameraStarts++; return gum(c) }
  })
  await context.route('**/api/**', (route) => route.fulfill({ status: route.request().url().endsWith('/me') ? 200 : 404, json: { signed_in: false } }))
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('http://127.0.0.1:' + port, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^面捕出镜/ }).click()
  await page.waitForFunction(() => [...window.__stage.actors.values()][0]?.inputPhase === 'on')
  await page.getByLabel('舞台名字').fill('Opening')
  await page.evaluate(() => {
    const s = window.__stage.store, a = [...window.__stage.actors.values()][0]
    window.avatarId = a.item.id; window.originalActor = a; window.originalCanvas = a.player.canvas; window.originalVideo = a.faceVideo
    window.firstScene = s.get().id; window.initialStarts = window.cameraStarts; window.firstX = a.item.x
    window.poseFrames = 0; const callback = a.player.onFrame; a.player.onFrame = (p) => { window.poseFrames++; callback(p) }
  })
  await page.getByRole('button', { name: '切换镜头' }).click(); await page.getByRole('button', { name: '复制当前镜头' }).click()
  await page.getByLabel('舞台名字').fill('Close-up')
  await page.evaluate(() => {
    const s = window.__stage.store, a = s.get().items.find((i) => i.id === window.avatarId)
    window.secondScene = s.get().id
    s.patch(a.id, { x: a.x + 200, mirror: true, tuning: { ...a.tuning, volume: .6, view: { ...a.tuning.view, zoom: 1.8 } } })
  })
  await page.getByRole('button', { name: '切换镜头' }).click(); await page.getByRole('button', { name: /Opening/ }).click()
  const continuity = await page.evaluate(() => {
    const a = window.__stage.actors.get(window.avatarId)
    return { actor: a === window.originalActor, canvas: a.player.canvas === window.originalCanvas, video: a.faceVideo === window.originalVideo, starts: window.cameraStarts, initial: window.initialStarts, x: a.item.x, firstX: window.firstX, mirror: a.item.mirror, zoom: a.item.tuning.view.zoom, volume: a.item.tuning.volume }
  })
  assert.equal(continuity.actor, true); assert.equal(continuity.canvas, true); assert.equal(continuity.video, true); assert.equal(continuity.starts, continuity.initial)
  assert.equal(continuity.x, continuity.firstX); assert.equal(continuity.mirror, false); assert.equal(continuity.zoom, 1); assert.equal(continuity.volume, .6)
  report.continuity = continuity
  const output = await context.newPage(); output.on('pageerror', (e) => errors.push(e.message)); await output.goto('http://127.0.0.1:' + port + '/?output=1')
  await output.waitForFunction(() => [...window.__stage.actors.values()][0]?.status === 'ready')
  await output.evaluate(() => { window.firstCanvas = [...window.__stage.actors.values()][0].player.canvas })
  await page.evaluate(() => window.__stage.store.patch(window.avatarId, { hidden: true }))
  const before = await page.evaluate(() => window.poseFrames); await page.waitForTimeout(300)
  assert.ok(await page.evaluate(() => window.poseFrames) > before + 2, 'hidden avatars still publish final poses')
  assert.equal(await page.locator('.placed.character').evaluate((e) => getComputedStyle(e).visibility), 'hidden')
  const cut = await page.evaluate(async () => { const { performStageCommand, stageState } = await import('/src/control.ts'); return { result: performStageCommand({ do: 'scene', id: window.secondScene }), state: stageState() } })
  assert.equal(cut.result.ok, true); assert.equal(cut.state.scene.id, cut.result.scene); assert.equal(cut.state.scenes.length, 2)
  await output.waitForFunction(() => window.__stage.store.get().name === 'Close-up')
  assert.equal(await output.evaluate(() => [...window.__stage.actors.values()][0].player.canvas === window.firstCanvas), true)
  assert.equal(await page.evaluate(() => window.__stage.actors.get(window.avatarId).player.canvas === window.originalCanvas), true)
  report.output = 'hidden poses and independent output retain the same canvas across API cuts'
  const missing = await page.evaluate(async () => (await import('/src/control.ts')).performStageCommand({ do: 'scene', id: 'missing' })); assert.equal(missing.status, 404)
  // A cut requested outside the editor commits the focused text before unmounting it.
  await page.evaluate(() => {
    const s = window.__stage.store
    s.add({ kind: 'text', id: 'draft-text', text: 'Before', size: 42, color: '#222', bg: 'transparent', x: 50, y: 40, w: 550, h: 130 })
  })
  await page.locator('.placed.text').dblclick(); await page.locator('.text-item[contenteditable=true]').fill('After cut')
  await page.evaluate(async () => (await import('/src/control.ts')).performStageCommand({ do: 'scene', id: window.firstScene }))
  await page.evaluate(() => window.__stage.store.switchScene(window.secondScene))
  assert.equal(await page.evaluate(() => window.__stage.store.get().items.find((i) => i.id === 'draft-text').text), 'After cut')
  report.draft = 'external cuts commit the current text draft'
  await page.evaluate(() => {
    const s = window.__stage.store, a = s.get().items.find((i) => i.id === window.avatarId)
    s.setRemote({ ...a, id: 'remote-history', remote: { peer: 'history-peer', person: 'Friend' }, driver: 'auto' })
    s.removeScene(window.firstScene); s.undo()
    s.dropRemote('history-peer'); s.undo(); s.redo()
  })
  assert.equal(await page.evaluate(() => window.__stage.store.project().scenes.some((s) => s.items.some((i) => i.id === 'remote-history'))), false)
  await page.evaluate(() => { const s = window.__stage.store; s.remove(window.avatarId); s.undo() })
  assert.equal(await page.evaluate(() => window.__stage.store.project().scenes.every((s) => s.items.some((i) => i.id === window.avatarId))), true)
  report.history = 'whole-project undo and friend departure do not resurrect departed friends'
  await output.close()
  // Demo audio and AI turns continue while switching to a shot that visually hides the cast.
  await page.evaluate(async () => {
    const { buildTemplate } = await import('/src/templates.ts'), { playDemo } = await import('/src/brain.ts')
    const s = window.__stage.store; s.replace(await buildTemplate('duo')); playDemo(true)
    window.demoScene = s.get().id; window.emptyShot = s.addScene(true)
    s.switchScene(window.demoScene)
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 2 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
  await page.getByRole('button', { name: '对谈', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().speaking !== null)
  const active = await page.evaluate(() => { const c = window.__stage.conversation(); window.speakingId = c.speaking.id; window.__stage.store.switchScene(window.emptyShot); return { running: c.running, id: c.speaking.id } })
  assert.equal(active.running, true)
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking?.id), active.id)
  assert.equal(await page.getByRole('button', { name: '暂停', exact: true }).count(), 1)
  await page.evaluate(() => window.__stage.talk.stop())
  report.ai = 'a cut to a visually empty shot keeps the same running AI turn and transport controls'
  await page.waitForTimeout(500); const bank = await page.evaluate(() => ({ active: window.__stage.store.get().id, count: window.__stage.store.project().scenes.length })); await page.reload({ waitUntil: 'networkidle' })
  assert.deepEqual(await page.evaluate(() => ({ active: window.__stage.store.get().id, count: window.__stage.store.project().scenes.length })), bank)
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.evaluate(async (value) => (await import('/src/i18n.ts')).setLocale(value), locale)
    await page.setViewportSize({ width: 1100, height: 700 })
    await page.locator('.scene-switcher > button').click(); await page.screenshot({ path: join(artifacts, 'shots-' + locale + '.png') })
    assert.equal(await page.locator('.shots-menu').evaluate((e) => e.scrollWidth > e.clientWidth), false)
    await page.locator('.scene-switcher > button').click()
  }
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(error); console.error(artifacts); await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
