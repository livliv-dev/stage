import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { networkInterfaces, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPackage, extractFile } from '@electron/asar'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'

// A test archive with production dependencies, run by the existing Electron runtime. No installer is built.
const root = fileURLToPath(new URL('..', import.meta.url)), stage = fileURLToPath(new URL('../../stage/dist', import.meta.url))
const artifacts = await mkdtemp(join(tmpdir(), 'stage-collab-native-')), source = join(artifacts, 'app'), archive = join(artifacts, 'app.asar')
const errors = [], apps = [], report = { artifacts }
const backend = createServer((_request, response) => response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false })))
const until = async (read, check, message) => {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) { const value = await read(); if (check(value)) return value; await new Promise((resolve) => setTimeout(resolve, 50)) }
  throw new Error(message)
}
let host, guest
try {
  await mkdir(source)
  await cp(join(root, 'dist'), join(source, 'dist'), { recursive: true, filter: (file) => !file.includes('/dist/test') && !file.endsWith('.map') })
  await cp(join(root, 'assets'), join(source, 'assets'), { recursive: true })
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  metadata.main = 'test-entry.cjs'
  await writeFile(join(source, 'package.json'), JSON.stringify(metadata))
  // Keep automated resizing and language changes out of the user's desktop. The production entry and renderer
  // are unchanged; this test archive hides its windows and delays service startup to check pending controls.
  await writeFile(join(source, 'test-entry.cjs'), "const { BrowserWindow } = require('electron'); BrowserWindow.prototype.show = function () {}; BrowserWindow.prototype.showInactive = function () {}; const Module = require('node:module'), load = Module._load; Module._load = function (name, ...args) { const value = load.call(this, name, ...args); return name === 'livliv-stage-collab' ? { ...value, async startRelay(options) { await new Promise((resolve) => setTimeout(resolve, 750)); return value.startRelay(options) } } : value }; require('./dist/main.js')")
  for (const name of ['@livliv-dev/neuro-bridge', 'livliv-stage-collab', 'ws']) {
    await mkdir(join(source, 'node_modules', name, '..'), { recursive: true })
    await cp(join(root, 'node_modules', name), join(source, 'node_modules', name), { recursive: true, dereference: true })
  }
  await createPackage(source, archive)
  for (const file of ['node_modules/livliv-stage-collab/server.mjs', 'node_modules/livliv-stage-collab/protocol.mjs', 'node_modules/ws/lib/websocket-server.js']) assert.ok(extractFile(archive, file).length)
  report.archive = 'production desktop and dependencies in a test archive; windows stay hidden; relay has no Stage source or external Node dependency'
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve))
  const launch = async (name) => {
    const app = await electron.launch({ executablePath: join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [archive, '--app=stage', '--stage-dir=' + stage, '--user-data=' + join(artifacts, name), '--api=http://127.0.0.1:' + backend.address().port, '--mute', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'], timeout: 30000 })
    apps.push(app)
    const page = await app.firstWindow(); page.setDefaultTimeout(20000); page.on('pageerror', (error) => errors.push(error.message))
    await page.locator('.topbar').waitFor()
    await page.evaluate(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
    await page.reload(); await page.locator('.start-page .goal-tile', { hasText: '和角色聊天' }).click()
    await page.locator('canvas.character').first().waitFor()
    try { await page.waitForFunction(() => !document.querySelector('.badge')) }
    catch (error) {
      await page.screenshot({ path: join(artifacts, 'opening-' + name + '.png') })
      await writeFile(join(artifacts, 'opening-' + name + '.txt'), await page.locator('body').innerText()); throw error
    }
    assert.equal(await page.evaluate(() => typeof window.__stage), 'undefined', 'production renderer, no debug hooks')
    assert.equal((await page.evaluate(() => window.livlivDesktop.collab.get())).enabled, false)
    await page.locator('.cast-friend').click(); await page.getByLabel('你的名字', { exact: true }).fill(name)
    await page.locator('.collab-microphone').click()
    assert.equal(await page.getByLabel('分享麦克风', { exact: true }).isChecked(), false)
    return page
  }
  host = await launch('Host')
  // The same UI remains usable in all four languages and at a narrow window width.
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await host.setViewportSize({ width: 1440, height: 900 })
    await host.locator('.collab-panel button[data-close]').click()
    await host.locator('.topbar button:has(svg.lucide-settings)').click()
    await host.locator('.general-language .language-select').selectOption(locale)
    await host.locator('.settings-head button[data-close]').click(); await host.locator('.cast-friend').click()
    await host.setViewportSize({ width: 390, height: 844 })
    const box = await host.locator('.collab-panel').boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 391, JSON.stringify({ locale, box }))
    assert.equal(await host.locator('.collab-host').evaluate((element) => element.scrollWidth > element.clientWidth), false)
    await host.screenshot({ path: join(artifacts, 'service-' + locale + '-390.png') })
  }
  await host.setViewportSize({ width: 1440, height: 900 })
  await host.locator('.collab-panel button[data-close]').click(); await host.locator('.topbar button:has(svg.lucide-settings)').click()
  await host.locator('.general-language .language-select').selectOption('zh-Hans'); await host.locator('.settings-head button[data-close]').click(); await host.locator('.cast-friend').click()
  await host.getByLabel('你的名字', { exact: true }).fill('Host')
  if (await host.getByLabel('分享麦克风', { exact: true }).isChecked()) await host.locator('.collab-microphone').click()
  await host.locator('.collab-panel').screenshot({ path: join(artifacts, 'self-hosting-panel.png') })
  await host.locator('.collab-host-options summary').click(); await host.getByLabel('本机端口（0 为自动）').fill('0')
  const hasNetwork = Object.values(networkInterfaces()).flatMap((items) => items ?? []).some((item) => item.family === 'IPv4' && !item.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))
  if (!hasNetwork) await host.locator('.collab-host-options .switch').click()
  await host.getByRole('button', { name: '分享并创建好友联播', exact: true }).click()
  assert.equal(await host.getByLabel('分享麦克风', { exact: true }).isDisabled(), true, 'submitted microphone choice is locked while the native service starts')
  await host.locator('.collab-microphone').click({ force: true })
  assert.equal(await host.getByLabel('分享麦克风', { exact: true }).isChecked(), false, 'a click while starting cannot change the submitted microphone choice')
  await host.getByLabel('邀请码', { exact: true }).waitFor()
  assert.equal(await host.getByRole('button', { name: '麦克风已关闭', exact: true }).count(), 1)
  let invite = await host.getByLabel('邀请码', { exact: true }).inputValue()
  const decoded = JSON.parse(Buffer.from(invite.slice(5), 'base64url').toString())
  let running = await host.evaluate(() => window.livlivDesktop.collab.get())
  assert.equal(running.enabled, true); assert.equal(new URL(decoded.server).port, String(running.port))
  if (hasNetwork) assert.notEqual(new URL(decoded.server).hostname, '127.0.0.1', 'a network invite must point to the host computer')
  assert.equal((await fetch(`http://127.0.0.1:${running.port}/health`)).status, 200)
  await host.screenshot({ path: join(artifacts, 'hosting.png') })
  report.networkInvite = hasNetwork ? 'LAN address advertised; owner connects through loopback; cross-device reachability not verified' : 'no network interface; loopback only'
  if (hasNetwork) {
    await host.getByRole('button', { name: '停止服务', exact: true }).click()
    await host.locator('.collab-host-options summary').click(); await host.locator('.collab-host-options .switch').click()
    await host.getByRole('button', { name: '分享并创建好友联播', exact: true }).click()
    await host.getByLabel('邀请码', { exact: true }).waitFor()
    invite = await host.getByLabel('邀请码', { exact: true }).inputValue()
    running = await host.evaluate(() => window.livlivDesktop.collab.get())
    assert.equal(running.network, false)
  }
  guest = await launch('Guest')
  await guest.getByRole('button', { name: '加入好友联播', exact: true }).click(); await guest.getByLabel('朋友的邀请码', { exact: true }).fill(invite)
  await guest.getByRole('button', { name: '分享并申请加入', exact: true }).click(); await guest.getByText('等待房主接纳', { exact: true }).waitFor()
  await host.locator('.collab-pending .room-member').filter({ hasText: 'Guest' }).getByRole('button', { name: '接纳', exact: true }).click()
  for (const page of [host, guest]) await until(() => page.locator('.room-members').innerText(), (value) => value.includes('已同台'), 'WebRTC peers did not share their characters')
  assert.equal((await guest.evaluate(() => window.livlivDesktop.collab.get())).enabled, false, 'the guest does not start another server')
  report.journey = 'application archive → automatic native start → real service → invitation → second application → admission → WebRTC character transfer'
  await host.screenshot({ path: join(artifacts, 'joined.png') })
  await host.getByRole('button', { name: '停止服务', exact: true }).click()
  await until(() => host.evaluate(() => window.livlivDesktop.collab.get()), (value) => !value.enabled, 'server did not stop')
  await until(() => guest.locator('.room-members').count(), (value) => value === 0, 'guest remained connected')
  await assert.rejects(fetch(`http://127.0.0.1:${running.port}/health`))
  assert.equal(await host.locator('.collab-panel [role=alert]').count(), 0, 'intentional stop is not reported as a connection error')
  await host.locator('.collab-host-options summary').click()
  if (await host.getByLabel('允许同一网络的朋友加入').isChecked()) await host.locator('.collab-host-options .switch').click()
  await host.getByRole('button', { name: '启动服务', exact: true }).click()
  await until(() => host.evaluate(() => window.livlivDesktop.collab.get()), (value) => value.enabled && !value.network, 'loopback choice did not apply')
  await host.getByRole('button', { name: '停止服务', exact: true }).click()
  await host.locator('.collab-panel button[data-close]').click(); await host.locator('.cast-friend').click()
  await host.locator('.collab-host-options summary').click()
  await until(() => host.getByLabel('允许同一网络的朋友加入').isChecked(), (value) => !value, 'reopening the panel changed local-only hosting back to LAN')
  await host.getByLabel('本机端口（0 为自动）').fill('0')
  await host.getByRole('button', { name: '启动服务', exact: true }).click()
  const restarted = await until(() => host.evaluate(() => window.livlivDesktop.collab.get()), (value) => value.enabled, 'server did not restart')
  await host.reload()
  assert.equal((await host.evaluate(() => window.livlivDesktop.collab.get())).enabled, false, 'reload stops the listener and does not auto-start it again')
  await assert.rejects(fetch(`http://127.0.0.1:${restarted.port}/health`))
  report.lifecycle = 'explicit stop disconnects peers and releases port; restart works; reload keeps service off'
  assert.deepEqual(errors, [])
  await writeFile(join(artifacts, 'results.json'), JSON.stringify({ ...report, errors }, null, 2)); console.log(JSON.stringify({ ...report, errors }, null, 2))
} catch (error) {
  await host?.screenshot({ path: join(artifacts, 'failure-host.png') }).catch(() => {})
  await guest?.screenshot({ path: join(artifacts, 'failure-guest.png') }).catch(() => {})
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, errors, error: String(error) }, null, 2)); throw error
} finally { for (const app of apps.reverse()) await app.close().catch(() => {}); backend.closeAllConnections(); backend.close() }
