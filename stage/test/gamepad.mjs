import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-gamepad-'))
let server, browser, page, output
const report = { artifacts }, errors = []
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    localStorage.setItem('livliv-stage:coached', '1'); if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans')
    window.pads = []; window.mediaRequests = 0; window.padListeners = new Map()
    navigator.getGamepads = () => window.pads
    navigator.mediaDevices.getUserMedia = async () => { window.mediaRequests++; throw new Error('No camera in this test') }
    const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window)
    window.addEventListener = (type, fn, ...args) => { if (type.startsWith('gamepad')) { if (!window.padListeners.has(type)) window.padListeners.set(type, new Set()); window.padListeners.get(type).add(fn) } return add(type, fn, ...args) }
    window.removeEventListener = (type, fn, ...args) => { if (type.startsWith('gamepad')) window.padListeners.get(type)?.delete(fn); return remove(type, fn, ...args) }
  })
  await context.route('**/*', (route) => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) || /^(blob|data):/.test(route.request().url()) ? route.continue() : route.abort())
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (e) => errors.push(e.message)); const origin = 'http://127.0.0.1:' + port
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.evaluate(async () => { const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), scene = { ...emptyScene(), width: 640, height: 360 }, c = { ...newCharacter(scene, 'Stella', { type: 'url', url: '/characters/k01/' }), id: 'pad-avatar', driver: 'auto', lines: 'none', shadow: false }; c.tuning.idle = false; store.replace({ ...scene, items: [c] }); store.select(c.id) })
  await page.waitForFunction(() => window.__stage.actors.get('pad-avatar')?.status === 'ready')
  await page.locator('details.advanced > summary').filter({ hasText: '动作与更多设置' }).click()
  await page.getByRole('button', { name: '手柄', exact: true }).click()
  await page.getByText('连接手柄后，按一下任意按钮', { exact: true }).waitFor()
  if (process.env.STAGE_GAMEPAD_LAYOUT_ONLY) await page.locator('.pad-mappings > summary').click()
  if (!process.env.STAGE_GAMEPAD_LAYOUT_ONLY) {
  await page.evaluate(() => {
    const a = window.__stage.actors.get('pad-avatar'); window.originalCanvas = a.player.canvas; window.moves = []
    const act = a.player.act.bind(a.player); a.player.act = (id) => { window.moves.push(id); return act(id) }
    a.player.use({ order: -15, update(f) { f.params.eyeLOpen = .1 } })
    window.pads = [{ id: 'Test controller', index: 0, connected: true, axes: [.575, -.575, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })) }]
  })
  await page.waitForFunction(() => window.__stage.actors.get('pad-avatar').inputPhase === 'on' && Math.abs(window.__stage.actors.get('pad-avatar').lastPose.params.angleX - 15) < .1)
  assert.equal(await page.evaluate(() => window.moves.length), 0)
  assert.equal(await page.evaluate(() => window.__stage.actors.get('pad-avatar').lastPose.params.eyeLOpen), .1)
  await page.evaluate(() => { window.pads[0].buttons[0] = { pressed: false, value: 0 } }); await page.waitForTimeout(60)
  await page.evaluate(() => { window.pads[0].buttons[0] = { pressed: true, value: 1 } }); await page.waitForTimeout(300)
  assert.deepEqual(await page.evaluate(() => window.moves), ['nod'])
  // Disconnect/reconnect occurs between two polls; its held button must not fire.
  await page.evaluate(() => { const pad = { ...window.pads[0], buttons: window.pads[0].buttons.map((b, i) => ({ pressed: i === 1, value: i === 1 ? 1 : 0 })) }; window.pads = [pad]; for (const type of ['gamepaddisconnected', 'gamepadconnected']) { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: pad }); window.dispatchEvent(e) } })
  await page.waitForTimeout(250); assert.deepEqual(await page.evaluate(() => window.moves), ['nod'])
  report.buttons = 'one action per press; held buttons do not fire on connection or reconnect'
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: '把摇杆现在的位置设为中心', exact: true }).click()
  await page.waitForFunction(() => Math.abs(window.__stage.actors.get('pad-avatar').lastPose.params.angleX) < .1)
  await page.getByLabel('手柄灵敏度', { exact: true }).focus(); await page.getByLabel('手柄灵敏度', { exact: true }).press('End')
  await page.waitForTimeout(300); assert.ok(Math.abs(await page.evaluate(() => window.__stage.actors.get('pad-avatar').lastPose.params.angleX)) < .1)
  await page.evaluate(() => { window.pads[0].axes[0] = 1 })
  await page.waitForFunction(() => window.__stage.actors.get('pad-avatar').lastPose.params.angleX > 19)
  await page.evaluate(() => { const s = window.__stage.store, c = s.get().items[0]; s.patch(c.id, { tuning: { ...c.tuning, tracking: { angleX: { input: [-30, 30], output: [30, -30], smoothing: 0, curve: 1 } } } }) })
  await page.waitForFunction(() => window.__stage.actors.get('pad-avatar').lastPose.params.angleX < -19)
  assert.equal(await page.evaluate(() => window.__stage.actors.get('pad-avatar').player.canvas === window.originalCanvas), true)
  report.calibration = 'raw-axis calibration survives sensitivity changes; live profile inversion retains the canvas'
  await page.locator('.tracking-adjustments > summary').click()
  const parts = await page.getByLabel('调节部位', { exact: true }).locator('option').allTextContents(); assert.ok(parts.includes('左眼开合') && parts.includes('张嘴'), 'shared motion tuning also covers idle blink and speech while using a gamepad')
  await page.locator('.pad-mappings > summary').click()
  await page.getByLabel('按钮 1', { exact: true }).selectOption('expr:smile')
  await page.evaluate(() => { window.pads[0].buttons[0] = { pressed: false, value: 0 } }); await page.waitForTimeout(70)
  await page.evaluate(() => { window.pads[0].buttons[0] = { pressed: true, value: 1 } })
  await page.waitForFunction(() => window.__stage.actors.get('pad-avatar').expression === 'smile')
  await page.waitForFunction(() => window.__stage.actors.get('pad-avatar').expression === null)
  const project = await page.evaluate(async () => { const s = window.__stage.store, { projectFile, openProject } = await import('/src/project.ts'), p = await openProject(new File([await projectFile(s.project())], 'pad.livstage')); return { actual: p.project.scenes[0].items[0].tuning.gamepad, expected: s.get().items[0].tuning.gamepad } }); assert.deepEqual(project.actual, project.expected)
  output = await context.newPage(); await output.goto(origin + '/?output=1')
  await output.waitForFunction(() => window.__stage.actors.get('pad-avatar')?.status === 'ready')
  await page.evaluate(() => { window.pads[0].axes[0] = .575 })
  await output.waitForFunction(() => Math.abs(window.__stage.actors.get('pad-avatar').lastPose.params.angleX) < .1)
  await page.evaluate(() => { const s = window.__stage.store; window.firstShot = s.get().id; s.addScene(true) })
  await page.evaluate(() => { window.pads[0].axes[0] = 1 })
  await output.waitForFunction(() => window.__stage.actors.get('pad-avatar').lastPose.params.angleX < -19)
  await page.evaluate(() => window.__stage.store.switchScene(window.firstShot))
  await output.close(); output = null; report.output = 'gamepad poses continue through an empty shot and synchronize to output'
  }
  await page.setViewportSize({ width: 1100, height: 700 }); report.locales = []
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) { await page.evaluate(async (locale) => (await import('/src/i18n.ts')).setLocale(locale), locale); await page.locator('.gamepad-panel').scrollIntoViewIfNeeded(); await page.screenshot({ path: join(artifacts, locale + '.png') }); const size = await page.locator('.gamepad-panel').evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth, offenders: [...el.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).map((e) => ({ tag: e.tagName, cls: e.className, width: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right, text: e.textContent.slice(0, 60) })).slice(0, 20) })); assert.ok(size.scroll <= size.client + 1, locale + JSON.stringify(size)); report.locales.push(locale) }
  await page.evaluate(() => { window.pads = [] }); await page.waitForFunction(() => window.__stage.actors.get('pad-avatar').inputPhase === 'opening')
  await page.waitForTimeout(450); assert.ok(Math.abs(await page.evaluate(() => window.__stage.actors.get('pad-avatar').lastPose.params.angleX)) < .1)
  await page.evaluate(() => window.__stage.store.patch('pad-avatar', { driver: 'auto' }))
  await page.waitForFunction(() => [...window.padListeners.values()].reduce((n, x) => n + x.size, 0) === 0)
  assert.equal(await page.evaluate(() => window.mediaRequests), 0)
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, errors, error: error.stack }, null, 2)); console.error(error); console.error(artifacts); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
