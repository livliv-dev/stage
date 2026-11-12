import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-audience-'))
let server, browser, page
const report = { artifacts }, errors = [], requests = []
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:coached', '1'); if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans') })
  await context.route('**/*', (route) => { const url = new URL(route.request().url()); if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue(); requests.push(url.origin); return route.abort() })
  page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', (e) => errors.push(e.message))
  const origin = 'http://127.0.0.1:' + port
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), scene = emptyScene()
    const { modelFiles } = await import('/node_modules/.vite/deps/@livliv-dev_player.js')
    const files = await modelFiles('/characters/k01/'), manifest = JSON.parse(await files.get('model.json').text())
    const longId = 'custom_expression_identifier_with_more_than_forty_characters'
    manifest.expressions = [...(manifest.expressions ?? []), { id: '42', label: 'Number ID' }, { id: longId, label: 'Long ID' }]
    files.set('model.json', new Blob([JSON.stringify(manifest)], { type: 'application/json' }))
    const { localModels } = await import('/src/scene.ts'); localModels.set('audience-model', files)
    await (await import('/src/vault.ts')).keep({ key: 'audience-model', name: 'Stella', at: Date.now(), format: 'livliv' }, files)
    const c = { ...newCharacter(scene, 'Stella', { type: 'files', key: 'audience-model', format: 'livliv' }), id: 'stella', driver: 'auto', lines: 'none' }
    store.replace({ ...scene, name: 'Audience test', items: [c] }); store.select(null)
  })
  await page.waitForFunction(() => window.__stage.actors.get('stella')?.status === 'ready')
  await page.evaluate(() => { const a = window.__stage.actors.get('stella'), act = a.player.act.bind(a.player); window.moves = []; a.player.act = (id) => { window.moves.push(id); return act(id) } })
  await page.getByRole('button', { name: '观众弹幕', exact: true }).click()
  await page.locator('.audience-actions > summary').click()
  await page.getByRole('button', { name: '添加弹幕动作', exact: true }).click()
  const message = (text) => page.evaluate(async (text) => (await import('/src/danmaku.ts')).simulate('Viewer', text), text)
  await message('!hi'); assert.equal(await page.evaluate(() => window.moves.length), 0)
  await page.getByLabel('启用弹幕动作', { exact: true }).locator('..').click()
  await page.getByLabel('规则 1 冷却', { exact: true }).fill('1')
  await message(' ！ＨＩ '); assert.equal(await page.evaluate(() => window.moves.length), 1)
  await message('!hi'); assert.equal(await page.evaluate(() => window.moves.length), 1)
  await page.waitForTimeout(1050); await message('!hi'); assert.equal(await page.evaluate(() => window.moves.length), 2)
  report.cooldown = 'commands bypass AI text dedup, match normalized text, and respect their own cooldown'
  await page.getByRole('button', { name: '测试动作', exact: true }).click(); assert.equal(await page.evaluate(() => window.moves.length), 3)
  await page.getByLabel('启用规则 1', { exact: true }).locator('..').click(); await page.waitForTimeout(1050); await message('!hi'); assert.equal(await page.evaluate(() => window.moves.length), 3)
  await page.getByLabel('启用规则 1', { exact: true }).locator('..').click()
  await page.evaluate(async () => (await import('/src/danmaku.ts')).blockUser('Viewer'))
  await message('!hi'); assert.equal(await page.evaluate(() => window.moves.length), 3)
  await page.evaluate(async () => (await import('/src/danmaku.ts')).blockUser('Viewer'))
  await page.getByLabel('规则 1 关键词', { exact: true }).fill('欢迎')
  await page.getByLabel('规则 1 匹配方式', { exact: true }).selectOption('contains')
  await message('欢迎新朋友'); assert.equal(await page.evaluate(() => window.moves.length), 4)
  const expression = await page.evaluate(() => window.__stage.actors.get('stella').player.expressions[0].id)
  await page.getByLabel('规则 1 反应', { exact: true }).selectOption('expr:' + expression)
  await page.getByLabel('规则 1 保持时间', { exact: true }).fill('.5')
  await page.getByRole('button', { name: '测试动作', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__stage.actors.get('stella').expression), expression)
  await page.waitForFunction(() => window.__stage.actors.get('stella').expression === null)
  const supersede = await page.evaluate(async (id) => {
    const a = window.__stage.actors.get('stella'), { performStageCommand } = await import('/src/control.ts')
    performStageCommand({ do: 'expr', id, character: 'stella', duration: .5 }); a.setExpression(id)
    await new Promise((r) => setTimeout(r, 650)); return a.expression
  }, expression)
  assert.equal(supersede, expression)
  report.expression = 'temporary expressions clear; a newer manual expression supersedes expiry'
  for (const id of ['42', 'custom_expression_identifier_with_more_than_forty_characters']) {
    await page.getByLabel('规则 1 反应', { exact: true }).selectOption('expr:' + id)
    await page.getByLabel('规则 1 保持时间', { exact: true }).fill('.5')
    await page.getByRole('button', { name: '测试动作', exact: true }).click()
    assert.equal(await page.evaluate(() => window.__stage.actors.get('stella').expression), id)
    await page.waitForFunction(() => window.__stage.actors.get('stella').expression === null)
  }
  const project = await page.evaluate(async () => {
    const { store } = await import('/src/scene.ts'), { projectFile, openProject } = await import('/src/project.ts')
    const id = store.addScene(true), old = store.get().talk.triggers
    const file = new File([await projectFile(store.project())], 'audience.livstage'), reopened = await openProject(file)
    const rules = reopened.project.scenes.map((s) => s.talk.triggers)
    const { unpackFiles, packFiles } = await import('/src/archive.ts')
    const entries = await unpackFiles(file), manifest = JSON.parse(await entries.get('project.json').text())
    manifest.scenes[0].talk.triggers[0].cooldown = 0
    entries.set('project.json', new Blob([JSON.stringify(manifest)]))
    let packedRejected = false, legacyRejected = false
    try { await openProject(new File([await packFiles(entries)], 'bad.livstage')) } catch { packedRejected = true }
    const legacy = { format: 'livliv-stage', scene: structuredClone(store.get()) }
    legacy.scene.talk.triggers[0].cooldown = 0
    try { await openProject(new File([JSON.stringify(legacy)], 'bad.livstage.json')) } catch { legacyRejected = true }
    store.remove('stella'); const removed = store.project().scenes.every((s) => !s.talk.triggers.length)
    store.undo(); return { shots: reopened.project.scenes.length, rules, expected: old, packedRejected, legacyRejected, removed, undo: store.get().talk.triggers.length, id }
  })
  report.project = project
  for (const rules of project.rules) assert.deepEqual(rules, project.expected)
  assert.equal(project.packedRejected, true); assert.equal(project.legacyRejected, true); assert.equal(project.shots, 2); assert.equal(project.removed, true); assert.equal(project.undo, 1); report.project = project
  await page.evaluate(() => window.__stage.store.switchScene(window.__stage.store.project().scenes[0].id))
  await page.reload(); await page.waitForFunction(() => window.__stage.actors.get('stella')?.status === 'ready')
  assert.equal(await page.evaluate(() => window.__stage.store.get().talk.triggers.length), 1)
  await page.getByRole('button', { name: '观众弹幕', exact: true }).click()
  await page.locator('.audience-actions > summary').click()
  report.locales = []
  await page.setViewportSize({ width: 1100, height: 700 })
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.evaluate(async (locale) => (await import('/src/i18n.ts')).setLocale(locale), locale)
    await page.locator('.audience-rule').scrollIntoViewIfNeeded(); await page.screenshot({ path: join(artifacts, locale + '.png') })
    const over = await page.locator('.audience-rule').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, inputs: [...el.querySelectorAll('input,select,button')].filter((e) => e.getBoundingClientRect().right > el.getBoundingClientRect().right + 1).length }))
    assert.ok(over.scroll <= over.client + 1, JSON.stringify(over)); assert.equal(over.inputs, 0); report.locales.push(locale)
  }
  assert.ok(!requests.some((url) => /openai|anthropic|generativelanguage/.test(url)), JSON.stringify(requests)); assert.deepEqual(errors, [])
  report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { if (page) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, errors, error: error.stack }, null, 2)); console.error(error); console.error(artifacts); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
