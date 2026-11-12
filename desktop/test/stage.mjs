import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const artifacts = await mkdtemp(join(tmpdir(), 'livliv-stage-electron-'))
const pending = new Map(), closed = new Set(), errors = [], report = { artifacts }
const server = createServer((req, res) => {
  if (req.url.includes('stream')) {
    pending.set(req.url, true); res.writeHead(200, { 'content-type': 'text/plain' }); res.write('first piece')
    const timer = setInterval(() => res.write('next piece'), 100)
    res.on('close', () => { clearInterval(timer); closed.add(req.url) })
  } else if (req.url.includes('hold')) {
    pending.set(req.url, true)
    const timer = setTimeout(() => res.end('too late'), 15000)
    res.on('close', () => { clearTimeout(timer); closed.add(req.url) })
  } else if (req.url.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false })) }
  else res.end('fixture')
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
let app
const until = async (condition, message) => { for (let n = 0; n < 100; n++) { if (condition()) return; await new Promise((r) => setTimeout(r, 25)) } throw new Error(message) }
try {
  app = await electron.launch({ executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [process.env.STAGE_TEST_APP || root, ...(process.env.STAGE_TEST_RESOURCES ? ['--stage-dir=' + process.env.STAGE_TEST_RESOURCES] : []), '--app=stage', `--user-data=${join(artifacts, 'profile')}`, `--api=${origin}`, '--mute'], timeout: 30000 })
  const page = await app.firstWindow(); await page.addInitScript(() => localStorage.setItem('livliv-stage:locale', 'zh-Hans')); await page.reload(); page.on('pageerror', (e) => errors.push(e.message))
  await page.waitForSelector('.topbar')
  assert.match(page.url(), /^livliv-stage:\/\/app/)
  for (const [path, target] of [['/hold-model', '/__ai?u=' + encodeURIComponent(origin + '/hold-model')], ['/api/hold-account', '/api/hold-account']]) {
    await page.evaluate(async (target) => { const id = await window.livlivDesktop.requests.begin(), ctrl = new AbortController(); ctrl.signal.addEventListener('abort', () => void window.livlivDesktop.requests.cancel(id)); window.abortProbe = { ctrl, done: fetch(target, { signal: ctrl.signal, headers: { 'x-livliv-request': id, 'x-livliv-ai': '1' } }).then(() => 'done', (e) => e.name) } }, target)
    await until(() => pending.has(path), 'upstream request did not arrive')
    assert.equal(await page.evaluate(async () => { window.abortProbe.ctrl.abort(); return window.abortProbe.done }), 'AbortError')
    await until(() => closed.has(path), 'cancel did not reach upstream ' + path)
  }
  await page.evaluate(async (target) => { const id = await window.livlivDesktop.requests.begin(), ctrl = new AbortController(); ctrl.signal.addEventListener('abort', () => void window.livlivDesktop.requests.cancel(id)); const response = await fetch(target, { signal: ctrl.signal, headers: { 'x-livliv-request': id, 'x-livliv-ai': '1' } }); const reader = response.body.getReader(); await reader.read(); window.abortProbe = { ctrl, done: reader.read().then(() => 'done', (e) => e.name) } }, '/__ai?u=' + encodeURIComponent(origin + '/stream-model'))
  await page.evaluate(() => window.abortProbe.ctrl.abort()); await until(() => closed.has('/stream-model'), 'body cancellation did not reach upstream')
  report.cancellation = 'model and LivLiv HTTP connections close when renderer aborts'
  assert.ok((await page.evaluate(() => window.livlivDesktop.hotkeys.list())).every((b) => !b.ok), 'global hotkeys start off')
  const hotkeys = await page.evaluate(() => window.livlivDesktop.hotkeys.enable(true))
  assert.ok(hotkeys.some((b) => b.do === 'mute' && b.ok))
  assert.ok(!hotkeys.some((b) => b.accelerator.endsWith('+Space')))
  assert.ok(await app.evaluate(({ globalShortcut }) => globalShortcut.isRegistered('Control+Alt+M')))
  report.hotkeys = { total: hotkeys.length, registered: hotkeys.filter((b) => b.ok).length }
  // the empty stage offers its workflows directly; the checklist only shows once something is on the stage
  await page.getByRole('button', { name: /^AI 主播/ }).click()
  await page.waitForFunction(() => document.querySelector('canvas.character') && !document.querySelector('.badge'))
  // Use the same dispatch entry point the registered OS shortcut calls, with the editor unfocused.
  await app.evaluate(async ({ app, BrowserWindow }) => { const main = BrowserWindow.getAllWindows()[0]; main.blur(); const load = process.getBuiltinModule('node:module').createRequire(app.getAppPath() + '/package.json'); load('./dist/mainWindow.js').deliverMain({ do: 'mute' }) })
  await page.waitForFunction(() => document.querySelector('.panel input[type="checkbox"]').checked)
  report.backgroundCommand = 'mute reaches the Stage renderer without focusing the editor'
  await page.evaluate((origin) => localStorage.setItem('livliv-stage:brain', JSON.stringify({ kind: 'openai', provider: 'custom', base: origin + '/hold-ai', key: 'test-only', model: 'fixture-model' })), origin)
  await page.reload(); await page.waitForFunction(() => !document.querySelector('.badge'))
  await page.getByRole('button', { name: 'AI 直播', exact: true }).click()
  await page.locator('.live-settings').getByText('仅字幕（不生成声音）', { exact: true }).click()
  await page.locator('.live-settings .test-chat summary').click()
  await page.getByRole('button', { name: '开始 AI 直播', exact: true }).click()
  await page.getByLabel('模拟一条弹幕').fill('test desktop cancellation'); await page.locator('.live-settings').getByRole('button', { name: '发送', exact: true }).click()
  await until(() => pending.has('/hold-ai/chat/completions'), 'live model request did not arrive')
  await page.getByRole('button', { name: '停止 AI', exact: true }).click()
  await until(() => closed.has('/hold-ai/chat/completions'), 'AI stop did not cancel the actual upstream request')
  report.liveCancellation = 'the AI stop button cancels the actual model HTTP request'
  await page.screenshot({ path: join(artifacts, 'ai-setup.png') })
  await page.locator('.live-settings button[aria-label="关闭"]').click()
  await page.getByRole('button', { name: '输出到 OBS', exact: true }).click()
  const opened = app.waitForEvent('window'); await page.getByRole('button', { name: '打开输出窗口', exact: true }).click()
  const output = await opened; output.on('pageerror', (e) => errors.push('output: ' + e.message))
  await output.waitForSelector('canvas.character'); await output.waitForFunction(() => !document.querySelector('.badge,.output-wait'))
  await output.screenshot({ path: join(artifacts, 'transparent-output.png') })
  report.output = await app.evaluate(({ BrowserWindow }) => { const output = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('output=1')); return { title: output.getTitle(), background: output.getBackgroundColor(), content: output.getContentSize() } })
  const png = await readFile(join(artifacts, 'transparent-output.png')), idat = []
  for (let at = 8; at < png.length;) { const length = png.readUInt32BE(at); if (png.toString('ascii', at + 4, at + 8) === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length)); at += length + 12 }
  assert.equal(png[25], 6); report.output.cornerAlpha = inflateSync(Buffer.concat(idat))[4]
  assert.equal(report.output.cornerAlpha, 0); await output.close()
  await page.locator('.output-settings button[aria-label="关闭"]').click()
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ width: 1100, height: 700 }))
  await page.waitForTimeout(300); await page.screenshot({ path: join(artifacts, 'minimum-1100.png') })
  report.clipped = await page.locator('.topbar button,.talkbar button,.panel,.cast').evaluateAll((elements) => elements.filter((el) => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.bottom > innerHeight }).map((el) => el.textContent.trim()))
  assert.deepEqual(report.clipped, []); assert.deepEqual(errors, [])
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ error: String(error), errors, report, pending: [...pending.keys()], closed: [...closed] }, null, 2))
  for (const page of app?.windows() ?? []) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  throw error
} finally { await app?.close(); server.closeAllConnections(); server.close() }
