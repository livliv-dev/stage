import assert from 'node:assert/strict'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'
import { createServer } from 'node:http'
import { createSocket } from 'node:dgram'
import { mkdtemp, mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const desktop = fileURLToPath(new URL('..', import.meta.url)), stage = fileURLToPath(new URL('../../stage/dist', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-tracking-native-')), profile = join(artifacts, 'profile'), downloads = join(artifacts, 'downloads')
const errors = [], upstream = [], report = { artifacts }
let application, page, backend, output, timer
const sender = createSocket('udp4'), blocker = createSocket('udp4')
const wait = async (read, predicate, message) => { const end = Date.now() + 15000; while (Date.now() < end) { const value = await read(); if (predicate(value)) return value; await new Promise((r) => setTimeout(r, 40)) } throw new Error(message) }
function osc(address, types, args = []) { const str = (s) => { const value = Buffer.from(s), out = Buffer.alloc(Math.ceil((value.length + 1) / 4) * 4); value.copy(out); return out }, parts = [str(address), str(',' + types)]; for (const [i, type] of [...types].entries()) { if (type === 's') parts.push(str(String(args[i]))); else { const out = Buffer.alloc(4); if (type === 'i') out.writeInt32BE(args[i]); else out.writeFloatBE(args[i]); parts.push(out) } } return Buffer.concat(parts) }
const bundle = (...messages) => Buffer.concat([Buffer.from('#bundle\0'), Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]), ...messages.flatMap((m) => { const size = Buffer.alloc(4); size.writeInt32BE(m.length); return [size, m] })])
const bone = (yaw) => { const a = yaw * Math.PI / 360; return osc('/VMC/Ext/Bone/Pos', 'sfffffff', ['Head', 0, 0, 0, 0, Math.sin(a), 0, Math.cos(a)]) }
const vmc = (yaw) => bundle(bone(yaw), osc('/VMC/Ext/Blend/Val', 'sf', ['jawOpen', .8]), osc('/VMC/Ext/Blend/Val', 'sf', ['Blink_L', .65]), osc('/VMC/Ext/Blend/Apply', ''))
const send = (packet, port) => { clearInterval(timer); sender.send(packet, port, '127.0.0.1'); timer = setInterval(() => sender.send(packet, port, '127.0.0.1'), 50) }
async function freePort() { const s = createSocket('udp4'); await new Promise((r) => s.bind(0, '127.0.0.1', r)); const port = s.address().port; await new Promise((r) => s.close(r)); return port }
try {
  backend = createServer((request, response) => { upstream.push(request.url); response.writeHead(request.url === '/api/me' ? 200 : 404, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ signed_in: false })) }); await new Promise((r) => backend.listen(0, '127.0.0.1', r))
  await mkdir(profile); await mkdir(downloads)
  application = await electron.launch({ executablePath: join(desktop, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [desktop, '--app=stage', '--stage-dir=' + stage, '--user-data=' + profile, '--api=http://127.0.0.1:' + backend.address().port, '--mute'], timeout: 30000 })
  await application.evaluate(({ app, shell }, path) => { app.setPath('downloads', path); shell.showItemInFolder = () => {} }, downloads)
  page = await application.firstWindow(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
  await page.locator('.topbar').waitFor()
  await page.addInitScript(() => { if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') }); await page.reload(); await page.locator('.topbar').waitFor()
  const initial = await page.evaluate(() => window.livlivDesktop.tracking.get()); assert.equal(initial.settings.enabled, false); assert.equal(initial.listening, false)
  await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.stage-api .switch').click()
  const api = await wait(() => page.evaluate(() => window.livlivDesktop.stageApi.get()), (s) => s.enabled && s.port, 'test API did not open')
  const state = async () => { const r = await fetch('http://127.0.0.1:' + api.port + '/api/stage/state', { headers: { Authorization: 'Bearer ' + api.token } }); assert.equal(r.status, 200); return (await r.json()).state }
  await page.locator('.settings-head button[data-close]').click(); await page.getByRole('button', { name: '模板', exact: true }).click(); await page.getByRole('button', { name: /^双人对谈/ }).click()
  const cast = (await wait(state, (s) => s.characters.length === 2 && s.characters.every((c) => c.status === 'ready'), 'characters did not load')).characters, id = cast[0].id
  const avatar = async () => (await state()).characters.find((c) => c.id === id)
  await page.locator('.actor-select').first().click(); await page.locator('details.advanced > summary').filter({ hasText: '动作与更多设置' }).click(); await page.getByRole('button', { name: '手机 / OSC', exact: true }).click()
  const panel = page.locator('.panel .network-panel'), port = await freePort()
  await panel.getByLabel('接收端口', { exact: true }).fill(String(port)); await panel.getByRole('button', { name: '开始接收', exact: true }).click()
  await wait(() => page.evaluate(() => window.livlivDesktop.tracking.get()), (s) => s.listening && s.settings.port === port, 'UDP did not open')
  await page.evaluate(() => { navigator.clipboard.writeText = async (value) => { window.copiedAddress = value }; window.originalCanvas = document.querySelector('canvas.character') })
  await panel.getByRole('button', { name: '复制地址 127.0.0.1', exact: true }).click(); assert.equal(await page.evaluate(() => window.copiedAddress), '127.0.0.1')
  send(vmc(0), port); await wait(avatar, (a) => a.input === 'on' && a.parameters.mouthOpen > .7, 'neutral VMC frame did not reach Player')
  send(vmc(17), port); await wait(avatar, (a) => Math.abs(a.parameters.angleX - 17) < .2 && Math.abs(a.parameters.eyeLOpen - .35) < .02, 'VMC pose did not reach the avatar')
  assert.equal(await page.evaluate(() => window.originalCanvas === document.querySelector('canvas.character')), true)
  await panel.getByRole('button', { name: '校准正面', exact: true }).click(); await wait(avatar, (a) => Math.abs(a.parameters.angleX) < .1, 'calibration did not centre the avatar')
  send(vmc(22), port); await wait(avatar, (a) => Math.abs(a.parameters.angleX - 5) < .2, 'calibration did not preserve later motion')
  await page.locator('.tracking-adjustments > summary').click(); await page.locator('.tracking-adjustments').getByText('反向', { exact: true }).click(); await wait(avatar, (a) => Math.abs(a.parameters.angleX + 5) < .2, 'live profile inversion did not apply')
  report.vmc = 'actual UDP → native decoder → trusted IPC → Player; head, blink, mouth, calibration, live profile and stable canvas'
  await page.getByRole('button', { name: '输出到 OBS', exact: true }).click(); const popup = page.waitForEvent('popup'); await page.getByRole('button', { name: '打开输出窗口', exact: true }).click(); output = await popup; await output.locator('canvas.character').first().waitFor()
  assert.equal(await output.evaluate(() => window.livlivDesktop.tracking === undefined && window.livlivDesktop.onMotion === undefined), true); await output.screenshot({ path: join(artifacts, 'network-output.png'), omitBackground: true }); await output.close(); output = null; await page.locator('.output-settings button[data-close]').click()
  // Record through the actual product controls without opening the microphone or starting an AI conversation.
  await page.getByRole('button', { name: '录制', exact: true }).click(); const record = page.locator('.popover.record'); await record.getByLabel('同时开始对话', { exact: true }).locator('..').click()
  await record.getByRole('button', { name: /录无声视频|开始录制/ }).click(); await page.waitForTimeout(650); send(vmc(10), port); await page.waitForTimeout(650)
  await page.locator('.topbar button.rec.live').click(); await page.locator('video.made-video').waitFor({ timeout: 120000 })
  const made = await page.locator('video.made-video').evaluate(async (video) => { await new Promise((resolve, reject) => { if (video.readyState >= 2) resolve(); else { video.addEventListener('loadeddata', resolve, { once: true }); video.addEventListener('error', reject, { once: true }) } }); const blob = await (await fetch(video.src)).blob(); return { size: blob.size, width: video.videoWidth, height: video.videoHeight, duration: video.duration } }); assert.ok(made.size > 10000); report.recording = made
  await record.getByRole('button', { name: '存到电脑', exact: true }).click(); const filename = await record.locator('.made b').textContent(); await wait(async () => { try { return (await stat(join(downloads, filename))).size } catch { return 0 } }, (n) => n === made.size, 'native video save failed'); report.saved = filename
  await record.locator('button[data-close]').click(); clearInterval(timer); timer = null; await panel.getByRole('button', { name: '停止接收', exact: true }).click(); await wait(avatar, (a) => a.input === 'opening', 'disabled input did not return to waiting')
  await new Promise((r) => blocker.bind(port, '127.0.0.1', r)); await panel.getByRole('button', { name: '开始接收', exact: true }).click(); await panel.getByRole('alert').filter({ hasText: '端口' }).waitFor(); const busy = await page.evaluate(() => window.livlivDesktop.tracking.get()); assert.equal(busy.listening, false); assert.equal(busy.error.code, 'EADDRINUSE'); await new Promise((r) => blocker.close(r))
  await panel.getByRole('button', { name: '开始接收', exact: true }).click(); await wait(() => page.evaluate(() => window.livlivDesktop.tracking.get()), (s) => s.listening, 'retry after port release failed'); await panel.getByRole('button', { name: '停止接收', exact: true }).click()
  report.recovery = 'disabled receiver releases UDP port; in-use error is visible and manual retry recovers'
  await panel.getByLabel('追踪来源', { exact: true }).selectOption('ifacial'); await panel.getByLabel('手机 IP 地址', { exact: true }).fill('8.8.8.8'); assert.equal(await panel.getByRole('button', { name: '连接手机', exact: true }).isDisabled(), true)
  await panel.getByLabel('手机 IP 地址', { exact: true }).fill('127.0.0.1')
  const probe = createSocket('udp4'); let phonePortFree = false
  try { await new Promise((resolve, reject) => { probe.once('error', reject); probe.bind(49983, '0.0.0.0', resolve) }); phonePortFree = true } catch (error) { if (error.code !== 'EADDRINUSE') throw error } finally { try { await new Promise((r) => probe.close(r)) } catch (error) { if (error.code !== 'ERR_SOCKET_DGRAM_NOT_RUNNING') throw error } }
  if (phonePortFree) {
    // A simulated phone on loopback exercises the real iFacialMocap UDP receive path; no physical device is used.
    await panel.getByRole('button', { name: '连接手机', exact: true }).click(); await wait(() => page.evaluate(() => window.livlivDesktop.tracking.get()), (s) => s.listening && s.settings.kind === 'ifacial', 'phone receiver did not open')
    send(Buffer.from('jawOpen&80|eyeBlink_L&65|=head#0,0,0,0,0,0|'), 49983); await wait(avatar, (a) => a.input === 'on' && Math.abs(a.parameters.angleX) < .2, 'neutral phone frame not received')
    send(Buffer.from('jawOpen&80|eyeBlink_L&65|=head#0,12,-3,0,0,0|'), 49983); await wait(avatar, (a) => Math.abs(a.parameters.angleX + 12) < .2 && Math.abs(a.parameters.angleZ - 3) < .2, 'phone motion not received with the saved profile')
    clearInterval(timer); timer = null; await wait(avatar, (a) => a.input === 'opening', 'lost phone did not return to waiting'); await page.waitForTimeout(450)
    await panel.getByRole('button', { name: '停止接收', exact: true }).click(); report.phone = 'simulated iFacialMocap UDP v2 through the real desktop receiver, including loss and stop; physical iPhone not tested'
  } else report.phone = '49983 occupied by another app; physical phone receive path not started'
  // Translate through the actual settings selector, preserving the open network form.
  report.locales = []
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.language-select').selectOption(locale); await page.locator('.settings-head button[data-close]').click(); await panel.scrollIntoViewIfNeeded(); await page.screenshot({ path: join(artifacts, locale + '.png') }); assert.equal(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true, locale); report.locales.push(locale)
  }
  await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.language-select').selectOption('zh-Hans'); await page.locator('.stage-api .switch').click(); await page.locator('.settings-head button[data-close]').click()
  await page.waitForTimeout(550); await page.reload(); await page.locator('.topbar').waitFor(); const restored = await page.evaluate(() => window.livlivDesktop.tracking.get()); assert.equal(restored.settings.enabled, false); assert.equal(restored.listening, false); assert.equal((await page.evaluate(() => window.livlivDesktop.stageApi.get())).enabled, false)
  assert.equal(upstream.some((url) => /\/say|\/audio\/|\/chat\/completions/.test(url)), false); assert.deepEqual(errors, []); report.errors = errors
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, errors, error: error.stack }, null, 2)); console.error(error); console.error(artifacts); process.exitCode = 1 }
finally { clearInterval(timer); await output?.close().catch(() => {}); await application?.close(); await new Promise((r) => backend?.close(r) ?? r()); try { sender.close() } catch (error) { if (error.code !== 'ERR_SOCKET_DGRAM_NOT_RUNNING') throw error } try { blocker.close() } catch (error) { if (error.code !== 'ERR_SOCKET_DGRAM_NOT_RUNNING') throw error } }
