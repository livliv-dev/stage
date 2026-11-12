import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { zipSync, unzipSync } from 'fflate'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-projects-'))
let server, browser, page
const report = { artifacts }, errors = []
const ready = (p) => p.waitForFunction(() => window.__stage.actors.size > 0 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'), null, { timeout: 45000 })
const state = (p) => p.evaluate(() => ({ active: window.__stage.store.get().id, scenes: window.__stage.store.project().scenes.map((s) => s.id) }))
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  async function context() {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
    await c.addInitScript(() => { if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
    await c.route('**/api/**', (route) => route.fulfill({ status: route.request().url().endsWith('/me') ? 200 : 404, json: { signed_in: false } }))
    return c
  }
  const origin = 'http://127.0.0.1:' + port, first = await context()
  page = await first.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (e) => errors.push(e.message)); await page.goto(origin, { waitUntil: 'networkidle' })
  if (!process.env.STAGE_PROJECT_RECORD_ONLY) {
    await page.getByRole('button', { name: '模板', exact: true }).click(); await page.getByRole('button', { name: /^双人对谈/ }).click(); await ready(page)
    const image = await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(80, 120), g = canvas.getContext('2d'); g.fillStyle = '#3388ee'; g.fillRect(0, 0, 80, 120)
      const blob = await canvas.convertToBlob(), { fromPngs } = await import('/src/library.ts'), { newCharacter } = await import('/src/scene.ts')
      const pick = await fromPngs({ closed: new File([blob], 'closed.png'), open: new File([blob], 'open.png') }, 'Pixel avatar')
      const c = newCharacter(window.__stage.store.get(), pick.name, pick.model); c.lines = 'none'; window.__stage.store.add(c)
      return [...new Uint8Array(await blob.arrayBuffer())]
    })
    const vrm = [...await readFile(join(root, 'test/fixtures/avatar.vrm'))]
    await page.evaluate(async (bytes) => {
      const { fromFiles } = await import('/src/library.ts'), { newCharacter } = await import('/src/scene.ts'), s = window.__stage.store
      const pick = await fromFiles([new File([new Uint8Array(bytes)], 'avatar.vrm')]), c = newCharacter(s.get(), pick.name, pick.model); c.lines = 'none'; s.add(c)
    }, vrm)
    await ready(page)
    const picture = { name: 'sticker.png', mimeType: 'image/png', buffer: Buffer.from(image) }
    await page.locator('.rail input[type=file]').setInputFiles(picture)
    await page.waitForFunction(() => window.__stage.store.get().items.some((i) => i.kind === 'image' && !!i.asset))
    await page.evaluate(() => window.__stage.store.select(null))
    await page.locator('.panel input[type=file]').setInputFiles({ ...picture, name: 'background.png' })
    await page.waitForFunction(() => !!window.__stage.store.get().backgroundAsset)
    await page.getByLabel('舞台名字').fill('Opening')
    await page.getByRole('button', { name: '切换镜头' }).click(); await page.getByRole('button', { name: '空白镜头' }).click()
    await page.getByLabel('舞台名字').fill('Close-up')
    await page.evaluate(async () => {
      const s = window.__stage.store, c = s.get().items.find((i) => i.kind === 'character' && i.model.type === 'files' && i.model.format === 'png')
      s.patch(c.id, { hidden: false, x: 120, tuning: { ...c.tuning, view: { ...c.tuning.view, zoom: 1.5 } } })
      const { saveBrainConfig } = await import('/src/brain.ts')
      saveBrainConfig({ kind: 'openai', provider: 'custom', base: 'https://never-call.test/v1', key: 'test-only-never-export-this-key', model: 'fixture' })
      const own = s.get().items.find((i) => i.kind === 'character'); s.setRemote({ ...own, id: 'friend-only', remote: { peer: 'friend-peer', person: 'Friend' } })
    })
    const downloads = page.waitForEvent('download'); await page.getByRole('button', { name: '保存项目', exact: true }).click(); const download = await downloads
    const bytes = await readFile(await download.path()), archive = unzipSync(bytes), manifest = JSON.parse(new TextDecoder().decode(archive['project.json']))
    await writeFile(join(artifacts, download.suggestedFilename()), bytes)
    assert.equal(manifest.scenes.length, 2); assert.equal(manifest.models.length, 4); assert.equal(manifest.pictures.length, 2)
    assert.equal(manifest.scenes.some((s) => s.items.some((i) => i.id === 'friend-only')), false)
    assert.equal(Buffer.from(archive['project.json']).includes(Buffer.from('test-only-never-export-this-key')), false)
    assert.equal(bytes.includes(Buffer.from('test-only-never-export-this-key')), false)
    for (const scene of manifest.scenes) for (const item of scene.items) if (item.kind === 'character') assert.equal(item.model.type, 'files')
    const sourceManifest = await page.evaluate(async () => await (await fetch('/characters/k01/model.json')).text())
    const sample = manifest.models.find((m) => manifest.scenes[0].items.some((i) => i.kind === 'character' && i.model.key === m.id && i.model.sampleId === 'k01'))
    assert.ok(sample); assert.equal(new TextDecoder().decode(archive[sample.files.find((f) => f.path === 'model.json').entry]), sourceManifest)
    report.package = { bytes: bytes.length, scenes: 2, models: manifest.models.map((m) => m.format), pictures: 2, originalManifest: true, secrets: false, remoteAssets: false }

    // Import into a fresh storage partition with all model endpoints blocked.
    const fresh = await context(); await fresh.route('**/characters/**', (r) => r.abort()); await fresh.route('**/models/**', (r) => r.abort())
    const restored = await fresh.newPage(); restored.setDefaultTimeout(20000); restored.on('pageerror', (e) => errors.push(e.message)); await restored.goto(origin, { waitUntil: 'networkidle' }); page = restored
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'test.livstage', mimeType: 'application/zip', buffer: bytes })
    await page.locator('.project-progress').waitFor({ state: 'hidden' }); await ready(page)
    const loaded = await page.evaluate(async () => {
      const s = window.__stage.store, { modelId } = await import('/src/livliv.ts'), { demoFor } = await import('/src/demo.ts'), { kept } = await import('/src/vault.ts')
      return { name: s.get().name, scenes: s.project().scenes.length, formats: [...window.__stage.actors.values()].map((a) => a.format).sort(), demo: !!demoFor(s.get().items.filter((i) => i.kind === 'character')), siteIds: s.get().items.filter((i) => i.kind === 'character').map(modelId), library: (await kept()).length }
    })
    assert.equal(loaded.name, 'Close-up'); assert.equal(loaded.scenes, 2); assert.deepEqual(loaded.formats, ['livliv', 'livliv', 'png', 'vrm']); assert.equal(loaded.demo, true); assert.ok(loaded.siteIds.includes('k01')); assert.equal(loaded.library, 4)
    report.freshImport = loaded
    await page.getByRole('button', { name: '切换镜头' }).click(); await page.getByRole('button', { name: /Opening/ }).click()
    await page.locator('img.image-item').waitFor(); await page.waitForFunction(() => document.querySelector('img.image-item')?.naturalWidth === 80)
    const before = await state(page); await page.waitForTimeout(500); await page.reload({ waitUntil: 'networkidle' }); await ready(page)
    await page.waitForFunction(() => document.querySelector('img.image-item')?.naturalWidth === 80)
    assert.deepEqual(await state(page), before)
    await page.screenshot({ path: join(artifacts, 'restored-project.png') })
    const output = await fresh.newPage(); output.on('pageerror', (e) => errors.push(e.message)); await output.goto(origin + '/?output=1'); await ready(output)
    await output.waitForFunction(() => document.querySelector('img.image-item')?.naturalWidth === 80); await output.close()
    report.restore = 'fresh import, reload and independent output work with original model endpoints blocked'

    // Missing assets never change the active project or publish a partial library.
    const broken = { ...archive }; delete broken[manifest.pictures[0].entry]
    const checkpoint = await state(page), libraryBefore = await page.evaluate(async () => (await (await import('/src/vault.ts')).kept()).map((m) => m.key).sort())
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'broken.livstage', mimeType: 'application/zip', buffer: Buffer.from(zipSync(broken, { level: 0 })) })
    await page.getByText('项目内容无效或缺少素材', { exact: true }).waitFor()
    assert.deepEqual(await state(page), checkpoint)
    assert.deepEqual(await page.evaluate(async () => (await (await import('/src/vault.ts')).kept()).map((m) => m.key).sort()), libraryBefore)
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'cancelled.livstage', mimeType: 'application/zip', buffer: bytes })
    await page.locator('.project-progress button').waitFor(); await page.keyboard.press('Tab')
    assert.equal(await page.locator('.project-progress button').evaluate((e) => e === document.activeElement), true)
    await page.keyboard.press('Escape'); await page.locator('.project-progress').waitFor({ state: 'hidden' }); await page.waitForTimeout(200)
    assert.deepEqual(await state(page), checkpoint)
    assert.deepEqual(await page.evaluate(async () => (await (await import('/src/vault.ts')).kept()).map((m) => m.key).sort()), libraryBefore)
    let cancelledDownloads = 0; page.on('download', () => cancelledDownloads++)
    await page.getByRole('button', { name: '保存项目', exact: true }).click(); await page.locator('.project-progress button').waitFor(); await page.keyboard.press('Escape')
    await page.locator('.project-progress').waitFor({ state: 'hidden' }); await page.waitForTimeout(200); assert.equal(cancelledDownloads, 0)
    report.failure = 'missing-resource and cancelled imports preserve the project/library; cancelled exports do not download'


    // Image decoding may finish after an external cut; the image belongs to its originating shot.
    await page.evaluate(() => {
      window.pictureA = window.__stage.store.get().id
      window.pictureB = window.__stage.store.project().scenes.find((s) => s.id !== window.pictureA).id
      window.imageCounts = window.__stage.store.project().scenes.map((s) => ({ id: s.id, count: s.items.filter((i) => i.kind === 'image').length }))
      const Native = window.Image
      window.Image = class extends Native {
        set src(value) { const onload = this.onload; this.onload = (event) => { window.releasePicture = () => { window.Image = Native; onload.call(this, event) } }; super.src = value }
        get src() { return super.src }
      }
    })
    await page.locator('.rail input[type=file]').setInputFiles(picture); await page.waitForFunction(() => !!window.releasePicture)
    await page.evaluate(async () => { (await import('/src/control.ts')).performStageCommand({ do: 'scene', id: window.pictureB }); window.releasePicture() })
    await page.waitForFunction(() => window.__stage.store.project().scenes.find((s) => s.id === window.pictureA).items.filter((i) => i.kind === 'image').length === window.imageCounts.find((s) => s.id === window.pictureA).count + 1)
    assert.equal(await page.evaluate(() => window.__stage.store.project().scenes.find((s) => s.id === window.pictureB).items.filter((i) => i.kind === 'image').length === window.imageCounts.find((s) => s.id === window.pictureB).count), true)
    await page.evaluate(() => { const s = window.__stage.store; s.switchScene(window.pictureA); const image = s.get().items.filter((i) => i.kind === 'image').at(-1); s.remove(image.id) })
    report.imageRace = 'a picture that finishes decoding after an API cut is added only to its originating shot'

    let unexpectedRequests = 0
    await fresh.route('https://unexpected.test/**', (route) => { unexpectedRequests++; return route.abort() })
    const invalidImage = structuredClone(manifest); invalidImage.pictures[0].type = 'image/svg+xml'
    const oversized = { ...archive, 'project.json': new TextEncoder().encode(JSON.stringify(invalidImage)), [invalidImage.pictures[0].entry]: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="20000" height="10"><rect width="20000" height="10" fill="red"/></svg>') }
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'oversized-image.livstage', mimeType: 'application/zip', buffer: Buffer.from(zipSync(oversized, { level: 0 })) })
    await page.getByText('图片尺寸过大，请缩小后再导入', { exact: true }).waitFor(); await page.locator('.project-progress').waitFor({ state: 'hidden' })
    assert.deepEqual(await state(page), checkpoint)
    const external = structuredClone(manifest)
    for (const scene of external.scenes) { delete scene.backgroundAsset; scene.background = '#fff URL("https://unexpected.test/background.svg")' }
    const externalZip = { ...archive, 'project.json': new TextEncoder().encode(JSON.stringify(external)) }
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'external-background.livstage', mimeType: 'application/zip', buffer: Buffer.from(zipSync(externalZip, { level: 0 })) })
    await page.getByText('项目内容无效或缺少素材', { exact: true }).waitFor(); await page.locator('.project-progress').waitFor({ state: 'hidden' })
    assert.deepEqual(await state(page), checkpoint); assert.equal(unexpectedRequests, 0)
    assert.deepEqual(await page.evaluate(async () => (await (await import('/src/vault.ts')).kept()).map((m) => m.key).sort()), libraryBefore)
    report.assetBoundary = 'oversized project images are rejected before storage and external CSS backgrounds never issue a request'

    // A real asynchronous IDB constraint failure must surface its cause and abort the entire import.
    await page.evaluate(async () => {
      window.storagePut = IDBObjectStore.prototype.put
      window.existingModel = (await (await import('/src/vault.ts')).kept())[0].key
      IDBObjectStore.prototype.put = function(value, ...args) { return this.name === 'packages' ? this.add({ ...value, key: window.existingModel }) : window.storagePut.call(this, value, ...args) }
    })
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'storage-failure.livstage', mimeType: 'application/zip', buffer: bytes })
    await page.waitForFunction(() => !document.querySelector('.project-progress') && /key|constraint/i.test(document.querySelector('.toast')?.textContent ?? ''))
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.storagePut })
    assert.deepEqual(await state(page), checkpoint)
    assert.deepEqual(await page.evaluate(async () => (await (await import('/src/vault.ts')).kept()).map((m) => m.key).sort()), libraryBefore)
    report.storageFailure = 'asynchronous ConstraintError is visible and the original project/library remain intact'

    const legacy = await page.evaluate(async () => { const { emptyScene } = await import('/src/scene.ts'); const scene = emptyScene(); delete scene.id; scene.name = 'Legacy'; scene.items = [{ id: 'old-text', kind: 'text', text: 'Old scene', size: 50, color: '#111', bg: 'transparent', x: 50, y: 60, w: 500, h: 120 }]; return { format: 'livliv-stage', version: 1, scene } })
    await page.locator('.topbar input[type=file]').setInputFiles({ name: 'old.livstage.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) })
    await page.waitForFunction(() => window.__stage.store.get().name === 'Legacy'); assert.equal(await page.locator('.text-item').innerText(), 'Old scene')
    report.legacy = 'older single-scene JSON opens and receives a stable scene ID'
  }

  // The real encoded video keeps the same framing after a hidden interval and a 2x stage resize.
  report.recording = await page.evaluate(async () => {
    const { fromPngs } = await import('/src/library.ts'), { emptyScene, newCharacter, reshape } = await import('/src/scene.ts'), { record } = await import('/src/tape.ts'), { renderTake, FPS } = await import('/src/render.ts')
    const canvas = new OffscreenCanvas(80, 120), g = canvas.getContext('2d'); g.fillStyle = '#3388ee'; g.fillRect(0, 0, 80, 120); const blob = await canvas.convertToBlob()
    const pick = await fromPngs({ closed: new File([blob], 'closed.png'), open: new File([blob], 'open.png') }, 'Resize')
    const s = window.__stage.store; s.replace({ ...emptyScene(), width: 320, height: 240, background: '#fff' }); const c = newCharacter(s.get(), pick.name, pick.model)
    Object.assign(c, { x: 80, y: 60, w: 80, h: 120, lines: 'none', shadow: false }); c.tuning.idle = false; s.add(c)
    await new Promise((resolve) => { const timer = setInterval(() => { if (window.__stage.actors.get(c.id)?.status === 'ready') { clearInterval(timer); resolve() } }, 20) })
    const recorder = await record(false)
    await new Promise((r) => setTimeout(r, 300)); const blank = s.addScene(true)
    await new Promise((r) => setTimeout(r, 300)); const scene = s.get(); s.set({ width: 640, height: 480, items: reshape(scene.items, 320, 240, 640, 480) })
    await new Promise((r) => setTimeout(r, 300)); s.patch(c.id, { hidden: false })
    await new Promise((r) => setTimeout(r, 300)); const take = await recorder.stop()
    const prototype = Object.getPrototypeOf(window.__stage.actors.get(c.id).player), descriptor = Object.getOwnPropertyDescriptor(prototype, 'renderPose'), method = prototype.renderPose; let replayFrames = 0
    prototype.renderPose = function(...args) { replayFrames++; return method.apply(this, args) }
    let made
    try { made = await renderTake(take, 'shots-and-resize', () => {}, new AbortController().signal) }
    finally { if (descriptor) Object.defineProperty(prototype, 'renderPose', descriptor); else delete prototype.renderPose }
    const reader = await (await import('/test/media.ts')).videoFrames(made.file)
    const out = document.createElement('canvas'); out.width = 320; out.height = 240; const ctx = out.getContext('2d')
    const bounds = async (at) => {
      ctx.drawImage(await reader.frame(at), 0, 0)
      const p = ctx.getImageData(0, 0, 320, 240).data; let minX = 320, maxX = -1, minY = 240, maxY = -1
      for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4; if (p[i] < 100 && p[i + 1] > 100 && p[i + 2] > 170) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) } }
      return { minX, maxX, minY, maxY, image: out.toDataURL() }
    }
    const first = await bounds(0), hidden = await bounds(.55), last = await bounds(reader.duration - .04); reader.close()
    return { bytes: made.file.size, frames: Math.max(1, Math.round(take.seconds * FPS)), replayFrames, first, hidden, last, video: [...new Uint8Array(await made.file.arrayBuffer())], blank }
  })
  await writeFile(join(artifacts, 'shots-and-resize.mp4'), new Uint8Array(report.recording.video)); delete report.recording.video
  for (const key of ['first', 'hidden', 'last']) { await writeFile(join(artifacts, key + '.png'), Buffer.from(report.recording[key].image.split(',')[1], 'base64')); delete report.recording[key].image }
  assert.equal(report.recording.hidden.maxX, -1)
  for (const key of ['minX', 'maxX', 'minY', 'maxY']) assert.ok(Math.abs(report.recording.first[key] - report.recording.last[key]) <= 2, key + ' changes after resize')
  assert.ok(report.recording.replayFrames >= 30 + report.recording.frames, 'hidden characters advance their renderer during replay')
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await writeFile(join(artifacts, 'partial.json'), JSON.stringify(report, null, 2)); console.error(error); console.error(artifacts); await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
