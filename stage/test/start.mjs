// The console's start button and Space: Space begins what the start button begins (a start that goes out to a 直播间
// or records only opens its checklist from a key), and each template's start button starts what the template is
// named for. Model calls go to a fixture.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-start-'))
const errors = [], calls = [], report = { artifacts }
let server, browser, page
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-ai/chat/completions') {
      calls.push(route.request().postDataJSON())
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '我们开始吧。', emotion: 'happy', action: 'nod', cues: [] }) } }] } }).catch(() => {})
      return
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(20000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  const conv = () => page.evaluate(() => { const c = window.__stage.conversation(); return { running: c.running, mode: c.mode, error: c.error } })
  const stop = async () => { await page.evaluate(() => window.__stage.talk.stop()); await page.waitForFunction(() => !window.__stage.conversation().running) }
  const space = async () => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Space') }
  /** what is running once a start has had time to begin: its kind */
  const started = async () => { await page.waitForFunction(() => window.__stage.conversation().running); return (await conv()).mode }

  // one AI character, a model of one's own: the main button says 持续聊天, and Space starts the same chat
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts'), { saveBrainConfig } = await import('/src/brain.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。'); character.muted = true; store.add(character); store.select(null)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  const main = page.locator('.console .start-button')
  assert.equal((await main.innerText()).trim(), '开始聊天')
  await main.click()
  const byButton = await started(); await stop()
  await space()
  const bySpace = await started(); await stop()
  assert.equal(byButton, 'chat'); assert.equal(bySpace, byButton, 'Space starts what the start button starts')
  report.oneCharacter = { button: byButton, space: bySpace }

  // show mode: Space begins what the show controls' button begins (the stage's start, named by its goal)
  await page.evaluate(() => window.__stage.store.setMode('show'))
  await page.locator('.show-controls .primary').waitFor({ state: 'attached' })
  assert.equal((await page.locator('.show-controls .primary').innerText()).trim(), '开始聊天')
  await space()
  assert.equal(await started(), 'chat', 'in show mode Space follows the show controls')
  await stop(); await page.evaluate(() => window.__stage.store.setMode('edit'))

  // a session running: Space pauses and resumes it
  await main.click(); await started()
  await space(); await page.waitForFunction(() => window.__stage.conversation().paused)
  await space(); await page.waitForFunction(() => !window.__stage.conversation().paused)
  await stop()
  report.pause = 'Space pauses and resumes a running session'

  // nobody AI on the stage: Space calibrates, starts nothing
  await page.evaluate(() => { const c = window.__stage.store.get().items.find((i) => i.kind === 'character'); window.__stage.store.patch(c.id, { lines: 'me' }) })
  await space(); await page.waitForTimeout(500)
  assert.equal((await conv()).running, false, 'with no AI character Space starts nothing')

  // each template: its start button says and starts what the template is named for; Space starts the same, except a
  // start that goes out (a 直播间, a recording), which a key only opens the checklist of
  const checklist = page.locator('.popover.checklist')
  const stopAll = async () => {
    await page.evaluate(async () => { window.__stage.talk.stop(); if (['starting', 'recording'].includes(window.__stage.recording().phase)) await window.__stage.rec.stop() })
    await page.waitForFunction(() => !window.__stage.conversation().running && !['starting', 'recording', 'making'].includes(window.__stage.recording().phase), null, { timeout: testTimeout(30000) })
    await page.evaluate(() => window.__stage.rec.reset())
  }
  const templates = {}
  // a template's start: the characters talking among themselves (双人聊天, 三人闲聊) is 和角色聊天 with you not joining,
  // the same conversation as before, nothing recorded
  for (const [label, expected] of [['AI 来开播', { text: '开播', kind: 'live', out: true }], ['双人聊天', { text: '开始', kind: 'conversation' }],
    ['你和 AI 搭档', { text: '开始聊天', kind: 'chat' }], ['三人闲聊', { text: '开始', kind: 'conversation' }], ['面捕出镜', null], ['空白舞台', null]]) {
    await page.locator('.topbar').getByRole('button', { name: '模板' }).click()
    await page.locator('.topbar .dropdown .item').filter({ hasText: label }).click()
    await page.waitForFunction((name) => window.__stage.store.get().name === name, label === '空白舞台' ? '未命名舞台' : label)
    if (!expected) {
      assert.equal(await main.count(), 0, label + ' has no AI character and no start button')
      templates[label] = null; continue
    }
    await page.waitForFunction(() => { const cast = window.__stage.store.get().items.filter((i) => i.kind === 'character' && i.lines === 'ai'); return cast.length && cast.every((c) => window.__stage.actors.get(c.id)?.status === 'ready') }, null, { timeout: 60000 })
    assert.equal((await main.innerText()).trim(), expected.text, label)
    await main.click()
    const byButton = await started()
    if (expected.kind === 'conversation') assert.equal(await page.evaluate(() => window.__stage.recording().phase), 'idle', label + ': nothing is recorded')
    await stopAll()
    let bySpace
    if (expected.out) {
      await space(); await checklist.waitFor(); await page.waitForTimeout(500)
      assert.equal((await conv()).running, false, label + ': from a key a start that goes out only opens its checklist')
      await checklist.locator('button[data-close]').click(); await checklist.waitFor({ state: 'detached' })
      bySpace = 'checklist'
    } else { await space(); bySpace = await started(); await stopAll() }
    assert.equal(byButton, expected.kind, label); assert.equal(bySpace, expected.out ? 'checklist' : expected.kind, label + ': Space')
    templates[label] = { text: expected.text, button: byButton, space: bySpace }
  }
  report.templates = templates
  // the start options offer the other ways to run the same stage: who watches, and how you take part
  await page.locator('.topbar').getByRole('button', { name: '模板' }).click()
  await page.locator('.topbar .dropdown .item').filter({ hasText: '双人聊天' }).click()
  await page.waitForFunction(() => window.__stage.store.get().name === '双人聊天')
  await page.locator('.console .start-rows').click()
  const options = page.locator('.popover.start-options')
  await options.waitFor()
  assert.deepEqual(await options.locator('.option-row').nth(1).locator('.seg button').allInnerTexts(), ['只有我', '直播间'])
  assert.deepEqual(await options.locator('.option-row').nth(2).locator('.seg button').allInnerTexts(), ['不参与', '打字', '按住说', '免按键', '我也上镜'])
  // the button follows the start, and the limits follow who watches: the characters among themselves count lines
  // (开始), a 直播间 has its own 30 minutes, a minute at the least (开播), a chat 60 (开始聊天)
  const minutes = options.locator('.option-row.limits select'), button = page.locator('.console .start-button')
  assert.equal((await button.innerText()).trim(), '开始'); assert.equal(await minutes.count(), 0)
  await options.locator('.option-row').nth(1).getByRole('button', { name: '直播间', exact: true }).click()
  assert.equal((await button.innerText()).trim(), '开播')
  assert.equal(await minutes.inputValue(), '30'); assert.deepEqual(await minutes.locator('option').evaluateAll((all) => all.map((o) => o.value)), ['1', '15', '30', '60', '120'])
  await options.locator('.option-row').nth(1).getByRole('button', { name: '只有我', exact: true }).click()
  await options.locator('.option-row').nth(2).getByRole('button', { name: '打字', exact: true }).click()
  assert.equal((await button.innerText()).trim(), '开始聊天'); assert.equal(await minutes.inputValue(), '60')
  await options.locator('.option-row').nth(2).getByRole('button', { name: '不参与', exact: true }).click()
  await options.locator('button[data-close]').click(); await options.waitFor({ state: 'detached' })

  // the demo's end: 用你的模型重来一遍 opens the checklist with the model of one's own; a detour into 连接 and 保存
  // comes back to it, and the same three are ready to start
  await page.locator('.topbar').getByRole('button', { name: '模板' }).click()
  await page.locator('.topbar .dropdown .item').filter({ hasText: '空白舞台' }).click()
  await page.waitForFunction(() => window.__stage.store.get().name === '未命名舞台')
  await page.locator('.start-page .welcome-demo').click()
  await page.waitForFunction(() => window.__stage.conversation().turns === 6 && !window.__stage.conversation().running, null, { timeout: 120000 })
  const demoCast = await page.evaluate(() => window.__stage.store.get().items.filter((i) => i.kind === 'character').map((c) => c.id))
  await page.locator('.console').getByRole('button', { name: '再看一次', exact: true }).waitFor()
  await page.screenshot({ path: join(artifacts, 'demo-end.png') })
  await page.locator('.console').getByRole('button', { name: '用你的模型重来一遍', exact: true }).click()
  await checklist.waitFor()
  const settings = page.locator('.popover.settings')
  await checklist.locator('li.check').filter({ hasText: '文字模型' }).getByRole('button', { name: '去设置' }).click()
  await settings.waitFor(); await checklist.waitFor({ state: 'detached' })
  const model = settings.locator('.connections [data-section="model"]')
  assert.equal(await model.locator('.providers .demo').count(), 0, '连接 offers the models, not the demo')
  await model.locator('.providers').getByRole('button', { name: '其他', exact: true }).click()
  await model.getByPlaceholder('https://…/v1').fill(`http://127.0.0.1:${port}/fixture-ai`)
  await model.locator('input[type="password"]').fill('test-only')
  await model.getByPlaceholder('模型名').fill('fixture-model')
  await model.getByRole('button', { name: '保存', exact: true }).click()
  await settings.waitFor({ state: 'detached' }); await checklist.waitFor()
  assert.equal(await page.evaluate(async () => (await import('/src/brain.ts')).loadBrainConfig().kind), 'openai')
  assert.deepEqual(await page.evaluate(() => window.__stage.store.get().items.filter((i) => i.kind === 'character').map((c) => c.id)), demoCast, 'the same characters stay')
  // the characters among themselves, you not joining: 开始
  assert.equal((await checklist.locator('footer .primary').innerText()).trim(), '开始', 'ready to start the three with the model just saved')
  assert.equal((await main.innerText()).trim(), '开始')
  assert.equal((await conv()).running, false)
  // closing the form (Esc: the form in front, not the list behind it) comes back too
  await checklist.locator('li.check').filter({ hasText: '文字模型' }).getByRole('button', { name: '去设置' }).click()
  await settings.waitFor()
  await page.keyboard.press('Escape')
  await settings.waitFor({ state: 'detached' }); await checklist.waitFor()
  await checklist.locator('footer .primary').click(); assert.equal(await started(), 'conversation', 'the three talk among themselves'); await stop()
  report.demoOwnModel = 'demo end → 用你的模型重来一遍 → checklist → 连接 → 保存 / Esc → the checklist again → the same three, 开始'

  // the start options keep what was set (the limits live there), whatever opens and closes around them
  await page.locator('.topbar').getByRole('button', { name: '模板' }).click()
  await page.locator('.topbar .dropdown .item').filter({ hasText: 'AI 来开播' }).click()
  await page.waitForFunction(() => window.__stage.store.get().name === 'AI 来开播')
  await page.locator('.console .start-rows').click(); await options.waitFor()
  await options.locator('.limits select').selectOption('60'); await options.locator('.limits input[type="number"]').fill('42')
  await options.locator('button[data-close]').click(); await options.waitFor({ state: 'detached' })
  await page.locator('.topbar').getByRole('button', { name: '设置' }).click(); await settings.waitFor()
  await page.keyboard.press('Escape'); await settings.waitFor({ state: 'detached' })
  await page.locator('.console .start-rows').click(); await options.waitFor()
  assert.equal(await options.locator('.limits select').inputValue(), '60', 'the start options keep what was set')
  assert.equal(await options.locator('.limits input[type="number"]').inputValue(), '42')
  await options.locator('button[data-close]').click(); await options.waitFor({ state: 'detached' })
  // 录制 → a voice chip → the voice settings → closed → 录制 again, as it was left
  await page.getByRole('button', { name: '录制', exact: true }).click()
  const recordCard = page.locator('.popover.record')
  await recordCard.waitFor()
  const micLabel = recordCard.locator('label.switch').filter({ hasText: '录进麦克风' }), micSwitch = micLabel.locator('input')
  await micLabel.click(); assert.equal(await micSwitch.isChecked(), true)
  await recordCard.locator('.chips.voices button.chip.off').first().click()
  await settings.waitFor(); await recordCard.waitFor({ state: 'hidden' })
  await settings.locator('button[data-close]').click()
  await settings.waitFor({ state: 'detached' }); await recordCard.waitFor()
  assert.equal(await micSwitch.isChecked(), true, 'the record card keeps what was set')
  await recordCard.locator('button[data-close]').click()
  report.detours = 'checklist → 连接 → 保存 / Esc → the checklist; start options keep their limits; 录制 → voice → close → 录制 with its switch'

  await page.screenshot({ path: join(artifacts, 'start.png') })
  assert.deepEqual(errors, [])
  report.modelCalls = calls.length
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  server?.kill()
}
