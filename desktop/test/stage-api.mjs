import assert from 'node:assert/strict'
import { _electron as electron } from '../../stage/node_modules/playwright-core/index.mjs'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const desktop = fileURLToPath(new URL('..', import.meta.url)), stage = fileURLToPath(new URL('../../stage/dist', import.meta.url))
const artifacts = await mkdtemp(join(tmpdir(), 'stage-api-native-')), profile = join(artifacts, 'profile'), errors = [], upstream = []
const packaged = process.env.STAGE_PACKAGED_APP
const report = { artifacts, packaged: !!packaged }
let application, page, backend
const wait = async (read, predicate, message) => { const until = Date.now() + 12000; while (Date.now() < until) { const value = await read(); if (predicate(value)) return value; await new Promise((r) => setTimeout(r, 30)) } throw new Error(message) }
async function launch() {
  application = await electron.launch({ executablePath: packaged ? join(packaged, 'Contents/MacOS/LivLiv Stage') : join(desktop, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [...(packaged ? [] : [desktop, '--app=stage', '--stage-dir=' + stage]), '--user-data=' + profile, '--api=http://127.0.0.1:' + backend.address().port, '--mute'], timeout: 30000 })
  if (packaged) { const runtime = await application.evaluate(({ app }) => ({ packaged: app.isPackaged, profile: app.getPath('userData') })); assert.deepEqual(runtime, { packaged: true, profile }) }
  page = await application.firstWindow(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.message)); await page.locator('.topbar').waitFor()
  await page.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') }); await page.reload(); await page.locator('.topbar').waitFor()
}
try {
  backend = createServer((request, response) => { upstream.push(request.url); response.writeHead(request.url === '/api/me' ? 200 : 404, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ signed_in: false })) })
  await new Promise((r) => backend.listen(0, '127.0.0.1', r))
  await mkdir(profile); await writeFile(join(profile, 'settings.json'), 'null')
  await launch()
  const initial = await page.evaluate(() => window.livlivDesktop.stageApi.get())
  assert.equal(initial.enabled, false); assert.equal(initial.port, null); report.default = 'fresh or malformed settings keep Stage API off'
  await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.stage-api .switch').click()
  let credentials = await wait(() => page.evaluate(() => window.livlivDesktop.stageApi.get()), (value) => value.enabled && value.port, 'API did not start')
  let address = `http://127.0.0.1:${credentials.port}`
  const state = async () => { const response = await fetch(address + '/api/stage/state', { headers: { Authorization: 'Bearer ' + credentials.token } }); assert.equal(response.status, 200); return (await response.json()).state }
  const command = async (body) => { const response = await fetch(address + '/api/stage/command', { method: 'POST', headers: { Authorization: 'Bearer ' + credentials.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() } }
  assert.equal((await fetch(address + '/api/stage/state')).status, 403)
  assert.deepEqual((await state()).characters, [])
  await page.evaluate(() => { navigator.clipboard.writeText = async (value) => { window.copiedStageExample = value } })
  await page.getByRole('button', { name: '复制动作示例', exact: true }).click(); assert.ok((await page.evaluate(() => window.copiedStageExample)).includes('Authorization: Bearer ' + credentials.token))
  await page.locator('.settings-head button[data-close]').click()
  await page.getByRole('button', { name: '模板', exact: true }).click(); await page.getByRole('button', { name: /^双人对谈/ }).click()
  let value = await wait(state, (s) => s.characters.length === 2 && s.characters.every((c) => c.status === 'ready'), 'avatars not ready')
  const initialScene = value.scene.id
  await page.evaluate(() => { window.initialNativeCanvas = document.querySelector('canvas.character') })
  await page.getByRole('button', { name: '切换镜头' }).click(); await page.getByRole('button', { name: '复制当前镜头' }).click()
  value = await wait(state, (s) => s.scenes.length === 2 && s.scene.id !== initialScene, 'second shot was not created')
  const secondScene = value.scene.id
  assert.equal((await command({ do: 'scene', id: initialScene })).status, 200)
  await wait(state, (s) => s.scene.id === initialScene, 'HTTP scene cut did not apply')
  assert.equal(await page.evaluate(() => window.initialNativeCanvas === document.querySelector('canvas.character')), true)
  assert.equal((await command({ do: 'scene', id: 'missing-scene' })).status, 404)
  assert.equal((await command({ do: 'scene', id: secondScene })).status, 200)
  await wait(state, (s) => s.scene.id === secondScene, 'second HTTP cut did not apply')
  assert.equal(await page.evaluate(() => window.initialNativeCanvas === document.querySelector('canvas.character')), true)
  report.scenes = 'native HTTP cuts switch stable scene IDs and preserve the avatar canvas'
  let ids = value.characters.map((c) => c.id); const target = value.characters[1], expressions = target.expressions
  assert.ok(expressions.length > 1)
  assert.equal((await command({ do: 'act', id: 'nod', character: target.id })).status, 200)
  assert.equal((await command({ do: 'act', id: 'nod', character: 'missing' })).status, 404)
  assert.equal((await command({ do: 'expr', id: 'unknown-expression', character: target.id, on: false })).status, 404)
  assert.equal((await command({ do: 'expr', id: expressions[0].id, character: target.id, weight: .4 })).status, 200)
  assert.equal((await state()).characters[1].expression, expressions[0].id)
  assert.equal((await command({ do: 'expr', id: expressions[1].id, character: target.id, on: false })).status, 200)
  assert.equal((await state()).characters[1].expression, expressions[0].id)
  await command({ do: 'clear', character: target.id }); assert.equal((await state()).characters[1].expression, null)
  await command({ do: 'mute', character: target.id, on: true }); assert.equal((await state()).characters[1].muted, true)
  assert.equal((await command({ do: 'ptt' })).status, 409); assert.equal((await state()).voiceInput.phase, 'idle')
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Fixture permission refusal', 'NotAllowedError') } })
  const pending = await command({ do: 'mic', character: target.id }); assert.equal(pending.status, 202); assert.equal(pending.body.pending, 'microphone')
  await wait(state, (s) => s.characters[1].input === 'error', 'microphone failure not observable')
  await command({ do: 'mic', character: target.id }); await wait(state, (s) => s.characters[1].input === 'idle', 'microphone recovery not observable')
  await page.getByRole('button', { name: '对谈', exact: true }).click(); await page.getByRole('button', { name: '打开演示舞台', exact: true }).click(); await wait(state, (s) => s.conversation.running, 'demo conversation did not start')
  assert.equal((await command({ do: 'ai-pause', on: true })).status, 200); assert.equal((await state()).conversation.paused, true)
  await command({ do: 'ai-pause', on: false }); assert.equal((await state()).conversation.paused, false)
  await command({ do: 'ai-stop' }); assert.equal((await state()).conversation.running, false)
  assert.equal((await command({ do: 'ai-pause', on: true })).status, 409)
  ids = (await state()).characters.map((c) => c.id);assert.equal(ids.length,3)
  report.control = 'real HTTP → IPC → selected avatar, expressions, mute, failed speech input, mic status, AI pause/resume/stop'
  await page.getByRole('button', { name: '输出到 OBS', exact: true }).click(); const popup = page.waitForEvent('popup'); await page.getByRole('button', { name: '打开输出窗口', exact: true }).click(); const output = await popup; await output.locator('canvas.character').first().waitFor()
  const access = await output.evaluate(async () => {
    const bridge = window.livlivDesktop, denied = async (f) => { try { await f(); return false } catch { return true } }
    return { local: await bridge.localPort(), get: await denied(() => bridge.stageApi.get()), set: await denied(() => bridge.stageApi.set(false)), rotate: await denied(() => bridge.stageApi.rotate()), hotkeys: await denied(() => bridge.hotkeys.reset()) }
  })
  assert.deepEqual(access, { local: null, get: true, set: true, rotate: true, hotkeys: true }); report.output = 'read-only output cannot acquire tokens or change API/hotkey settings'; await output.close(); await page.locator('.output-settings button[data-close]').click()
  await application.evaluate(({ BrowserWindow }, id) => { BrowserWindow.getAllWindows()[0].webContents.send('livliv:control', { id: 'expired-fixture', expires: Date.now() - 1000, command: { do: 'expr', id, character: undefined } }) }, expressions[0].id)
  await new Promise((r) => setTimeout(r, 80)); assert.equal((await state()).characters[0].expression, null)
  await page.locator('.topbar button:has(svg.lucide-settings)').click()
  const oldToken = credentials.token; await page.getByRole('button', { name: '更换令牌', exact: true }).click(); credentials = await wait(() => page.evaluate(() => window.livlivDesktop.stageApi.get()), (s) => s.token !== oldToken, 'token did not rotate')
  assert.equal((await fetch(address + '/api/stage/state', { headers: { Authorization: 'Bearer ' + oldToken } })).status, 403); assert.equal((await state()).characters.length, 3)
  await page.screenshot({ path: join(artifacts, 'native-api.png') })
  await page.locator('.stage-api .switch').click(); await wait(() => page.evaluate(() => window.livlivDesktop.stageApi.get()), (s) => !s.enabled && s.port === null, 'API did not close')
  await assert.rejects(fetch(address + '/api/health'))
  await page.waitForTimeout(550); await application.close(); application = null
  await launch(); const restored = await page.evaluate(() => window.livlivDesktop.stageApi.get()); assert.equal(restored.enabled, false); assert.equal(restored.port, null)
  await page.locator('canvas.character').first().waitFor(); assert.equal(await page.locator('canvas.character').count(), 3)
  const savedIds = await page.evaluate(() => JSON.parse(localStorage.getItem('livliv-stage:scene')).items.filter((i) => i.kind === 'character').map((c) => c.id)); assert.deepEqual(savedIds, ids)
  assert.equal(upstream.some((url) => /\/say|\/audio\/|\/chat\/completions/.test(url)), false)
  report.lifecycle = 'expired commands ignored; token replacement, disable, restart and stable avatar IDs verified; no paid calls'
  if (packaged) {
    assert.equal(await page.evaluate(() => typeof window.__stage), 'undefined')
    await page.evaluate(() => { window.packagedCanvas = document.querySelector('canvas.character') })
    await page.getByRole('button', { name: '收起舞台内容', exact: true }).click()
    assert.equal(await page.locator('.cast').count(), 0)
    assert.equal(await page.locator('.rail .tool').count(), 0)
    assert.equal(await page.locator('canvas.character:visible').count(), 3)
    await page.keyboard.press('Meta+Backslash'); assert.equal(await page.locator('.panel').count(), 0)
    assert.equal(await page.locator('canvas.character:visible').count(), 3)
    await page.keyboard.press('Meta+Backslash'); await page.locator('.panel').waitFor()
    await page.getByRole('button', { name: '预览', exact: true }).click(); await page.locator('.app.show').waitFor()
    assert.equal(await page.locator('canvas.character:visible').count(), 3)
    await page.keyboard.press('Escape'); await page.locator('.app.edit').waitFor()
    assert.equal(await page.evaluate(() => window.packagedCanvas === document.querySelector('canvas.character')), true)
    await page.getByRole('button', { name: '展开舞台内容', exact: true }).click(); await page.locator('.cast').waitFor()
    for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
      await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.language-select').selectOption(locale); await page.locator('.settings-head button[data-close]').click()
      await page.setViewportSize({ width: 1100, height: 760 }); await page.locator('.model-btn').click(); await page.locator('.demo-launch').waitFor()
      assert.equal(await page.locator('.popover.model').evaluate((e) => e.scrollWidth > e.clientWidth), false)
      await page.screenshot({ path: join(artifacts, 'demo-' + locale + '.png') }); await page.locator('.popover.model button[data-close]').click()
    }
    await page.locator('.topbar button:has(svg.lucide-settings)').click(); await page.locator('.language-select').selectOption('zh-Hans'); await page.locator('.settings-head button[data-close]').click()
    await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: join(artifacts, 'packaged-workspace.png') })
    report.packagedUI = 'actual packaged app and isolated profile; unified left fold, right fold, preview retain all three canvases; one-click demo and four locale layouts'
  }
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); console.error(error); console.error(artifacts); process.exitCode = 1 }
finally { await application?.close(); await new Promise((r) => backend?.close(r) ?? r()) }
