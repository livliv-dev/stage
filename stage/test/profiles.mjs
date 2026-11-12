import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-profiles-'))
const report = { artifacts }, errors = []
let server, browser, page
const range = async (locator, value) => locator.evaluate((input, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) }, value)
const ready = () => page.waitForFunction(() => window.__stage.actors.size > 0 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'], acceptDownloads: true })
  await context.addInitScript(() => { if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1'); const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); window.cameraStarts = 0; navigator.mediaDevices.getUserMedia = (constraints) => { if (constraints.video) window.cameraStarts++; return gum(constraints) } })
  await context.route('**/api/**', (route) => route.fulfill({ status: route.request().url().endsWith('/me') ? 200 : 404, json: { signed_in: false } }))
  page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle', timeout: 45000 })
  if (!process.env.STAGE_PROFILES_RECORD_ONLY) {
  await page.getByRole('button', { name: /^面捕出镜/ }).click()
  await ready(); await page.waitForFunction(() => [...window.__stage.actors.values()][0].inputPhase === 'on', null, { timeout: 30000 })
  await page.evaluate(() => { window.avatarId = [...window.__stage.actors.keys()][0]; window.initialCameraStarts = window.cameraStarts; window.cameraVideo = document.querySelector('video.camera-preview'); window.avatarCanvas = document.querySelector('canvas.character') })
  const advanced = page.locator('.panel details.advanced').last(); await advanced.locator(':scope > summary').click()
  const panel = page.locator('.tracking-adjustments'); await panel.locator(':scope > summary').click(); assert.equal(await panel.getByLabel('输入范围 · 起点').isVisible(), false); await panel.locator('.tracking-mapping > summary').click()
  await panel.getByLabel('输入范围 · 起点').fill('-15'); await panel.getByLabel('输入范围 · 起点').press('Tab')
  await panel.getByLabel('输入范围 · 终点').fill('15'); await panel.getByLabel('输入范围 · 终点').press('Tab')
  assert.equal(await page.evaluate(() => window.cameraStarts === window.initialCameraStarts), true)
  assert.equal(await page.evaluate(() => window.cameraVideo === document.querySelector('video.camera-preview')), true)
  await page.locator('.panel').getByRole('button', { name: '面捕回放', exact: true }).click()
  await page.waitForFunction(() => { const sample = window.__stage.actors.get(window.avatarId).trackingSample; return sample && Math.abs(sample.input.angleX) > 1 })
  report.mapping = await page.evaluate(() => { const a = window.__stage.actors.get(window.avatarId), sample = a.trackingSample; return { input: sample.input.angleX, output: sample.output.angleX, cameraStarts: window.cameraStarts } })
  assert.ok(Math.abs(report.mapping.output - Math.max(-30, Math.min(30, report.mapping.input * 2))) < 1e-6)
  await panel.getByLabel('输入范围 · 起点').fill('99'); await panel.getByLabel('输入范围 · 起点').press('Tab'); await panel.getByRole('alert').waitFor(); await panel.getByLabel('调节部位').selectOption('angleY'); assert.equal(await panel.getByLabel('输入范围 · 起点').inputValue(), '-30'); assert.equal(await panel.getByRole('alert').count(), 0); await panel.getByLabel('调节部位').selectOption('angleX')
  await panel.getByLabel('预设名称').fill('My tracking'); await panel.getByRole('button', { name: '保存预设' }).click()
  assert.equal(await panel.getByLabel('预设', { exact: true }).inputValue() !== '', true)
  const download = page.waitForEvent('download'); await panel.getByRole('button', { name: '导出', exact: true }).click(); const file = await download
  const exported = JSON.parse(await readFile(await file.path(), 'utf8')); assert.equal(exported.format, 'livliv-stage-tracking'); assert.deepEqual(exported.settings.profile.angleX.input, [-15, 15]); assert.equal('key' in exported, false)
  await panel.getByLabel('预设', { exact: true }).selectOption('default')
  assert.deepEqual(await page.evaluate(() => window.__stage.actors.get(window.avatarId).item.tuning.tracking), {})
  await panel.locator('input[type=file]').setInputFiles({ name: 'saved.tracking.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) })
  await page.waitForFunction(() => window.__stage.actors.get(window.avatarId).item.tuning.tracking.angleX?.input[0] === -15)
  await page.evaluate(() => { const s = window.__stage.store; s.duplicate(window.avatarId); const c = s.get().items.find((i) => i.kind === 'character' && i.id !== window.avatarId); s.patch(c.id, { driver: 'auto', tuning: { ...c.tuning, volume: .3, tracking: {} } }); window.otherId = c.id; s.select(window.avatarId) })
  await ready(); await panel.getByLabel('复制到角色').selectOption(await page.evaluate(() => window.otherId)); await panel.getByRole('button', { name: '复制配置' }).click()
  const copied = await page.evaluate(() => window.__stage.store.get().items.find((i) => i.id === window.otherId).tuning)
  assert.deepEqual(copied.tracking.angleX.input, [-15, 15]); assert.equal(copied.volume, .3)
  report.presets = 'save, export, reset, import and copy preserve unrelated avatar settings'
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.language-select').selectOption(locale); await page.locator('.settings-head button[data-close]').click()
    await page.setViewportSize({ width: 1100, height: 700 }); await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: join(artifacts, 'tracking-' + locale + '.png') })
    assert.equal(await page.locator('.panel').evaluate((e) => e.scrollWidth > e.clientWidth), false)
  }
  await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.language-select').selectOption('zh-Hans'); await page.getByLabel('画面质量').selectOption('eco'); await page.locator('.settings-head button[data-close]').click()
  assert.equal(await page.evaluate(() => [...window.__stage.actors.values()].every((a) => a.player.maxPixelRatio === 1)), true)
  const appearance = page.locator('.panel details.advanced').first(); await appearance.locator('summary').click()
  await range(appearance.getByLabel('内部缩放'), 1.3); await range(appearance.getByLabel('水平取景'), .2); await range(appearance.getByLabel('垂直取景'), .1)
  await page.waitForFunction(() => window.__stage.actors.get(window.avatarId).player.getPose().view.zoom === 1.3)
  const expression = await page.evaluate(() => window.__stage.actors.get(window.avatarId).player.expressions.find((e) => e.id !== 'smile'))
  const expressions = page.locator('.panel .chips').first()
  await range(page.getByLabel('表情强度'), .4); await expressions.getByRole('button', { name: expression.labels.zh ?? expression.labels['zh-Hans'] ?? expression.label, exact: true }).click()
  await page.waitForFunction((id) => Math.abs(window.__stage.actors.get(window.avatarId).player.getPose().expr[id] - .4) < .01, expression.id)
  await page.evaluate(async () => { const a = window.__stage.actors.get(window.avatarId); await a.perform({ text: 'ok', seconds: .1, clip: null, aloud: false }, 'neutral', 'none') })
  await expressions.getByRole('button', { name: expression.labels.zh ?? expression.labels['zh-Hans'] ?? expression.label, exact: true }).click(); await page.waitForTimeout(1400)
  assert.equal(await page.evaluate(() => window.__stage.actors.get(window.avatarId).expression), expression.id)
  report.expression = 'live strength and manual expression survive an earlier line’s delayed reset'
  assert.equal(await page.evaluate(() => window.avatarCanvas === document.querySelector('canvas.character')), true)
  await page.waitForTimeout(450); await page.reload({ waitUntil: 'networkidle' }); await ready()
  const restored = await page.evaluate(() => window.__stage.store.get().items.find((i) => i.kind === 'character').tuning)
  assert.deepEqual(restored.tracking.angleX.input, [-15, 15]); assert.equal(restored.view.zoom, 1.3); assert.equal(restored.expressionStrength, .4)
  report.restore = 'profile, framing, expression strength and global quality persist'
  }
  // Re-render a small PNG take and inspect its first and last encoded frames, not only its stored configuration.
  report.recording = await page.evaluate(async () => {
    const { fromPngs } = await import('/src/library.ts'), { emptyScene, newCharacter } = await import('/src/scene.ts'), { record } = await import('/src/tape.ts'), { renderTake } = await import('/src/render.ts')
    const canvas = new OffscreenCanvas(80, 120), g = canvas.getContext('2d'); g.fillStyle = '#3388ee'; g.fillRect(0, 0, 80, 120)
    const png = await canvas.convertToBlob(), pick = await fromPngs({ closed: new File([png], 'closed.png'), open: new File([png], 'open.png') }, 'Framing')
    const s = window.__stage.store; s.replace({ ...emptyScene(), width: 320, height: 240 }); const c = newCharacter(s.get(), pick.name, pick.model); c.lines = 'none'; c.tuning.idle = false; c.shadow = false; s.add(c)
    await new Promise((resolve) => { const timer = setInterval(() => { if (window.__stage.actors.get(c.id)?.status === 'ready') { clearInterval(timer); resolve() } }, 20) })
    const recorder = await record(false); await new Promise((r) => setTimeout(r, 300)); s.patch(c.id, { tuning: { ...c.tuning, view: { ...c.tuning.view, x: .3, zoom: .8 } } }); await new Promise((r) => setTimeout(r, 400)); const take = await recorder.stop()
    const track = take.tracks.get(c.id), views = [track.poses[0].view, track.poses.at(-1).view]; const result = await renderTake(take, 'framing', () => {}, new AbortController().signal)
    const reader = await (await import('/test/media.ts')).videoFrames(result.file)
    const out = document.createElement('canvas'); out.width = 320; out.height = 240; const ctx = out.getContext('2d')
    const bounds = async (at) => { ctx.drawImage(await reader.frame(at), 0, 0, 320, 240); const p = ctx.getImageData(0, 0, 320, 240).data; let min = 320, max = 0; for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4; if (p[i] < 100 && p[i + 1] > 100 && p[i + 2] > 170) { min = Math.min(min, x); max = Math.max(max, x) } } return { center: (min + max) / 2, width: max - min, image: out.toDataURL(), at } }
    const first = await bounds(0), last = await bounds(Math.max(0, reader.duration - .04)); reader.close(); return { bytes: result.file.size, views, first, last, video: [...new Uint8Array(await result.file.arrayBuffer())] }
  })
  await writeFile(join(artifacts, 'framing.mp4'), new Uint8Array(report.recording.video)); delete report.recording.video
  for (const key of ['first', 'last']) { await writeFile(join(artifacts, key + '.png'), Buffer.from(report.recording[key].image.split(',')[1], 'base64')); delete report.recording[key].image }
  assert.equal(report.recording.views[0].zoom, 1); assert.equal(report.recording.views[1].zoom, .8); assert.ok(report.recording.bytes > 1000); assert.ok(report.recording.first.width > 0 && report.recording.last.width > 0); assert.ok(report.recording.last.center - report.recording.first.center > 8); assert.ok(report.recording.last.width < report.recording.first.width * .9)
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await writeFile(join(artifacts, 'failure-report.json'), JSON.stringify(report, null, 2)); await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); console.error(error); console.error(artifacts); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
