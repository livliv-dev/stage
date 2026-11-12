import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-props-'))
let server, browser, page, output
const report = { artifacts }, errors = []
const near = (a, b, epsilon = .01) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`)
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:coached', '1'); if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans') })
  await context.route('**/*', (route) => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) || /^(blob|data):/.test(route.request().url()) ? route.continue() : route.abort())
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (e) => errors.push(e.message)); const origin = 'http://127.0.0.1:' + port
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter, localModels } = await import('/src/scene.ts'), { keep, putAsset } = await import('/src/vault.ts'), { cacheAsset } = await import('/src/assets.tsx')
    const picture = async (w, h, color, stripe = false) => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, w, h); if (stripe) { g.fillStyle = '#ffd744'; for (let x = 0; x < w; x += 2) g.fillRect(x, 0, 1, h) } return c.convertToBlob() }
    const png = await picture(8, 12, '#3388ee', true), files = new Map([['closed.png', png], ['open.png', png]])
    localModels.set('pixel', files); await keep({ key: 'pixel', name: 'Pixel', format: 'png', at: Date.now() }, files)
    const vrm = new Map([['model.vrm', await (await fetch('/test/fixtures/avatar.vrm')).blob()]])
    localModels.set('vrm', vrm); await keep({ key: 'vrm', name: 'VRM', format: 'vrm', at: Date.now() }, vrm)
    const scene = { ...emptyScene(), width: 800, height: 450, background: '#fff', name: 'Props' }
    const refs = [{ type: 'files', key: 'pixel', format: 'png' }, { type: 'url', url: '/characters/k01/' }, { type: 'files', key: 'vrm', format: 'vrm' }]
    scene.items = refs.map((model, i) => ({ ...newCharacter(scene, ['Pixel', 'Stella', 'VRM'][i], model), id: 'c' + i, driver: 'auto', lines: 'none', shadow: false, x: 20 + 260 * i, y: 100, w: 220, h: 330, tuning: { ...newCharacter(scene, '', model).tuning, idle: false } }))
    const asset = { key: 'hat', name: 'Hat', blob: await picture(90, 30, '#ed244a') }; await putAsset(asset); const url = cacheAsset(asset)
    scene.items.push({ id: 'hat', kind: 'image', name: 'Hat', asset: 'hat', url, x: 85, y: 150, w: 90, h: 30 })
    store.replace(scene); store.select('hat')
  })
  await page.waitForFunction(() => window.__stage.actors.size === 3 && [...window.__stage.actors.values()].every((a) => a.status === 'ready' && a.player.getAnchor('head') && a.player.getAnchor('body')))
  await page.evaluate(() => { for (const a of window.__stage.actors.values()) a.player.pause() })
  const geometry = (target = page) => target.evaluate(async () => { const { imageGeometry } = await import('/src/attachments.ts'); const s = window.__stage.store.get(); return imageGeometry(s.items.find((i) => i.id === 'hat'), s, (id) => window.__stage.actors.get(id)?.player) })
  const original = await geometry()
  await page.getByLabel('跟随角色', { exact: true }).selectOption('c0')
  const bound = await geometry(); for (const key of ['x', 'y', 'w', 'h']) near(bound[key], original[key])
  const pose = async (index, values, move = {}) => page.evaluate(({ index, values, move }) => { const a = window.__stage.actors.get('c' + index), p = a.player.getPose(); Object.assign(p.params, values); Object.assign(p.move, move); a.player.renderPose(p, 1 / 30) }, { index, values, move })
  await pose(0, { angleX: 20, angleY: 10, angleZ: 30, bodyX: 5, bodyZ: 5, breath: 0 }, { x: .1, y: .05, s: 1.1 })
  await page.waitForFunction(() => document.querySelector('.placed.image').style.transform !== 'rotate(0rad) scaleX(1)')
  const moved = await geometry(); assert.ok(Math.abs(moved.x - bound.x) > 1); assert.ok(Math.abs(moved.rotation) > .01)
  output = await context.newPage(); output.on('pageerror', (e) => errors.push(e.message)); await output.goto(origin + '/?output=1&clear=1')
  await output.waitForFunction(() => window.__stage.actors.size === 3 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
  // A new pose, without a scene mutation, must move both the output prop and its canvas.
  await pose(0, { angleX: -20, angleZ: -30, bodyZ: -5 }, { x: -.1 })
  const hostGeometry = await geometry()
  await output.waitForFunction((x) => Math.abs(parseFloat(document.querySelector('.placed.image').style.left) - x) < .1, hostGeometry.x)
  const outGeometry = await geometry(output); for (const key of ['x', 'y', 'w', 'h', 'rotation']) near(outGeometry[key], hostGeometry[key], .2)
  report.output = 'props follow final frames without a scene change in both editor and output'
  // Dragging and arrow keys use stage directions even when the prop has a rotated parent.
  const box = await page.locator('.placed.image').boundingBox(), stageScale = await page.locator('.stage').evaluate((el) => el.getBoundingClientRect().width / el.offsetWidth)
  const beforeDrag = await geometry(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 28, box.y + box.height / 2 + 14, { steps: 3 }); await page.mouse.up()
  const afterDrag = await geometry(); near(afterDrag.x - beforeDrag.x, 28 / stageScale, 1); near(afterDrag.y - beforeDrag.y, 14 / stageScale, 1)
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('Shift+ArrowLeft'); const keyed = await geometry(); near(keyed.x - afterDrag.x, -10); near(keyed.y, afterDrag.y)
  const handle = await page.locator('.handle.se').boundingBox(), beforeResize = await geometry()
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down(); await page.mouse.move(handle.x + handle.width / 2 + 25, handle.y + handle.height / 2 + 20, { steps: 3 }); await page.mouse.up()
  const resized = await geometry(); assert.ok(resized.w > beforeResize.w); near(resized.w / resized.h, beforeResize.w / beforeResize.h)
  report.drag = { movedX: afterDrag.x - beforeDrag.x, movedY: afterDrag.y - beforeDrag.y, width: resized.w }
  await page.evaluate(() => { const s = window.__stage.store, c = s.get().items.find((i) => i.id === 'c0'); s.patch(c.id, { mirror: true }) })
  const mirrored = await geometry(); assert.equal(mirrored.flip, true)
  await page.getByLabel('跟随角色', { exact: true }).selectOption('')
  const free = await geometry(); for (const key of ['x', 'y', 'w', 'h', 'rotation']) near(free[key], mirrored[key]); assert.equal(free.flip, true)
  report.mirror = 'mirroring and detaching retain the displayed prop position, angle and flip'
  report.formats = []
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('跟随角色', { exact: true }).selectOption('c' + i)
    await page.getByLabel('跟随部位', { exact: true }).selectOption('body')
    await pose(i, { angleX: 20, angleZ: 20, bodyZ: 8 }, { x: .05, s: 1.15 })
    const r = await geometry(); assert.ok(Object.values(r.parent).filter((v) => typeof v === 'number').every(Number.isFinite)); assert.equal(r.hidden, false); report.formats.push(i)
  }
  // Back-to-front drawing uses the same attachment; hiding the parent also hides its prop.
  await page.evaluate(() => { const s = window.__stage.store, items = s.get().items; s.set({ items: [items.find((i) => i.id === 'hat'), ...items.filter((i) => i.id !== 'hat')] }); s.patch('c2', { hidden: true }) })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.placed.image')).visibility === 'hidden')
  await page.evaluate(() => window.__stage.store.patch('c2', { hidden: false }))
  const beforeShape = await geometry()
  await page.evaluate(async () => { const s = window.__stage.store, scene = s.get(), { reshape } = await import('/src/scene.ts'); s.set({ width: 1600, height: 900, items: reshape(scene.items, 800, 450, 1600, 900) }) })
  await page.waitForTimeout(150); const afterShape = await geometry(); near(afterShape.w, beforeShape.w * 2, 1)
  const roundtrip = await page.evaluate(async () => {
    const { projectFile, openProject } = await import('/src/project.ts'), { unpackFiles, packFiles } = await import('/src/archive.ts'), s = window.__stage.store
    s.addScene(); const file = new File([await projectFile(s.project())], 'props.livstage'), opened = await openProject(file), before = s.get().items.find((i) => i.kind === 'image')
    const result = { expected: before.attachment, actual: opened.project.scenes[1].items.find((i) => i.kind === 'image').attachment, scenes: opened.project.scenes.length }
    const archive = await unpackFiles(file), raw = JSON.parse(await archive.get('project.json').text())
    raw.scenes[0].items.find((i) => i.kind === 'image').attachment.width = 0
    archive.set('project.json', new Blob([JSON.stringify(raw)]))
    result.badPacked = false; try { await openProject(new File([await packFiles(archive)], 'bad.livstage')) } catch { result.badPacked = true }
    const legacy = { format: 'livliv-stage', scene: structuredClone(s.get()) }; legacy.scene.items.find((i) => i.kind === 'image').attachment.width = 0
    result.badLegacy = false; try { await openProject(new File([JSON.stringify(legacy)], 'bad.json')) } catch { result.badLegacy = true }
    s.remove('c2'); result.removed = s.project().scenes.every((scene) => !scene.items.some((i) => i.kind === 'image' && i.attachment?.of === 'c2'))
    s.undo(); result.undo = s.project().scenes.every((scene) => scene.items.some((i) => i.kind === 'image' && i.attachment?.of === 'c2'))
    return result
  })
  assert.deepEqual(roundtrip.actual, roundtrip.expected); assert.equal(roundtrip.scenes, 2); assert.equal(roundtrip.badPacked, true); assert.equal(roundtrip.badLegacy, true); assert.equal(roundtrip.removed, true); assert.equal(roundtrip.undo, true); report.roundtrip = roundtrip
  await output.close(); output = null
  await page.evaluate(() => window.__stage.store.switchScene(window.__stage.store.project().scenes[0].id))
  await page.reload(); await page.waitForFunction(() => window.__stage.actors.size === 3 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
  await page.evaluate(() => window.__stage.store.select('hat'))
  assert.equal(await page.getByLabel('跟随角色', { exact: true }).inputValue(), 'c2')
  await page.evaluate(() => window.__stage.store.select('c0'))
  await page.locator('details.advanced > summary').filter({ hasText: '外观' }).click()
  await page.getByLabel('像素风格', { exact: true }).locator('..').click()
  await page.waitForFunction(() => window.__stage.actors.get('c0').player.body.pixelated === true)
  assert.equal(await page.locator('.placed.character').first().locator('canvas').evaluate((el) => getComputedStyle(el).imageRendering), 'pixelated')
  output = await context.newPage(); await output.goto(origin + '/?output=1')
  await output.waitForFunction(() => window.__stage.actors.get('c0')?.status === 'ready' && window.__stage.actors.get('c0').player.body.pixelated === true)
  assert.equal(await output.locator('.placed.character').first().locator('canvas').evaluate((el) => getComputedStyle(el).imageRendering), 'pixelated')
  await output.close(); output = null
  await page.evaluate(() => window.__stage.store.select('hat'))
  report.pixelUi = 'pixel filtering updates from the avatar control in editor and output'
  report.locales = []
  await page.setViewportSize({ width: 1100, height: 700 })
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) { await page.evaluate(async (locale) => (await import('/src/i18n.ts')).setLocale(locale), locale); await page.screenshot({ path: join(artifacts, locale + '.png') }); assert.equal(await page.locator('.prop-settings').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true); report.locales.push(locale) }
  // Small deterministic take, decoded from the actual MP4. The prop is behind its moving PNG avatar.
  report.video = await page.evaluate(async () => {
    const { store, emptyScene, newCharacter, localModels } = await import('/src/scene.ts'), { bindImage, imageGeometry } = await import('/src/attachments.ts'), { renderTake } = await import('/src/render.ts'), { makePlayer, setPixelated } = await import('/src/bodies/index.ts')
    const old = store.get().items.find((i) => i.id === 'hat'), scene = { ...emptyScene(), width: 320, height: 240, background: '#fff' }, c = { ...newCharacter(scene, 'Pixel', { type: 'files', key: 'pixel', format: 'png' }), id: 'pixel-video', x: 100, y: 60, w: 80, h: 120, shadow: false, lines: 'none' }; c.tuning.pixelated = true
    const cv = document.createElement('canvas'), player = makePlayer(cv, 'png', { autoplay: false, idle: false }); await player.load(localModels.get('pixel')); setPixelated(player, true)
    const pose = player.getPose(); Object.assign(pose.params, { breath: 0, angleX: 0, angleY: 0, angleZ: 0, bodyX: 0, bodyZ: 0 }); player.renderPose(pose, 0, [80, 120])
    scene.items = [c]; const image = bindImage({ ...old, id: 'video-hat', x: 60, y: 70, w: 60, h: 15, rotation: 0, flip: false, attachment: undefined }, scene, () => player, c.id, 'head'); scene.items = [image, c]
    const keys = Object.keys(pose.params), a = { t: 0, params: new Float32Array(keys.map((k) => pose.params[k])), move: [0, 0, 1], expr: {}, view: { ...pose.view } }, b = { ...a, t: .3, move: [.4, 0, 1] }
    const take = { t0: 0, cuts: [], seconds: .6, tracks: new Map([[c.id, { source: localModels.get('pixel'), keys, view: pose.view, poses: [a, b] }]]), scenes: [{ t: 0, scene }], convs: [{ t: 0, lines: [], speaking: null }], clips: [], mic: null, remote: [] }
    const made = await renderTake(take, 'prop-follow', () => {}, new AbortController().signal), reader = await (await import('/test/media.ts')).videoFrames(made.file), out = document.createElement('canvas'); out.width = 320; out.height = 240; const g = out.getContext('2d')
    const bounds = async (at) => { g.drawImage(await reader.frame(at), 0, 0); const p = g.getImageData(0, 0, 320, 240).data; let minX = 320, maxX = -1, minY = 240, maxY = -1; for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4; if (p[i] > 150 && p[i + 1] < 100 && p[i + 2] < 130) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) } } return { minX, maxX, minY, maxY, image: out.toDataURL() } }
    const first = await bounds(0), last = await bounds(.5); reader.close()
    const ctx = cv.getContext('2d'), colors = new Set(); const data = ctx.getImageData(0, 0, 80, 120).data; for (let x = 0; x < 80; x++) { const i = (60 * 80 + x) * 4; colors.add([data[i], data[i + 1], data[i + 2]].join(',')) }
    player.dispose({ release: true }); return { bytes: made.file.size, first, last, colors: colors.size, video: [...new Uint8Array(await made.file.arrayBuffer())] }
  })
  assert.ok(report.video.first.maxX > report.video.first.minX); near(report.video.last.minX - report.video.first.minX, 16, 2); assert.equal(report.video.colors, 2)
  await writeFile(join(artifacts, 'prop-follow.mp4'), new Uint8Array(report.video.video)); delete report.video.video
  for (const key of ['first', 'last']) { await writeFile(join(artifacts, key + '.png'), Buffer.from(report.video[key].image.split(',')[1], 'base64')); delete report.video[key].image }
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, errors, error: error.stack }, null, 2)); console.error(error); console.error(artifacts); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
