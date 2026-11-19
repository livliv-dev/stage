import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
let server, browser, testPage
const errors = [], artifacts = await mkdtemp(join(tmpdir(), 'stage-memory-'))
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await context.addInitScript(() => localStorage.setItem('livliv-stage:locale', 'zh-Hans'))
  const first = await context.newPage(), second = await context.newPage()
  testPage = first
  for (const page of [first, second]) { page.on('pageerror', (error) => errors.push(error.message)); await page.goto(`http://127.0.0.1:${port}/test/memory-harness.html`) }
  await first.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    await memory.saveSession({ id: 'browser-chat', profileIds: ['nana'], scope: 'private', title: '游戏偏好', updatedAt: 10, revision: 1, lines: [{ id: 'browser-source', who: 'me', name: '我', text: '我喜欢安静的种田游戏。', emotion: 'neutral', action: 'none', to: null, human: true }] })
    await memory.remember({ profileId: 'nana', scope: 'private', text: '测试私聊内容', sourceSessionId: 'browser-chat', sourceLineIds: ['browser-source'] })
    await memory.remember({ profileId: 'nana', scope: 'public', text: '测试公开内容' })
  })
  await first.reload()
  const restored = await first.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    return { session: await memory.latest(['nana'], 'private'), public: await memory.context(['nana'], 'public') }
  })
  assert.equal(restored.session.lines[0].text, '我喜欢安静的种田游戏。')
  assert.deepEqual(restored.public.memories.map((entry) => entry.text), ['测试公开内容'])
  // Separate renderer instances share the transaction ordering and revision rule.
  await Promise.all([
    first.evaluate(async () => { const { memory } = await import('/src/memory.ts'); const session = await memory.session('browser-chat'); await memory.saveSession({ ...session, revision: 3, title: '新标题' }) }),
    second.evaluate(async () => { const { memory } = await import('/src/memory.ts'); const session = await memory.session('browser-chat'); await memory.saveSession({ ...session, revision: 2, title: '旧标题' }) }),
  ])
  assert.equal(await first.evaluate(async () => (await (await import('/src/memory.ts')).memory.session('browser-chat')).title), '新标题')
  await first.addScriptTag({ type: 'module', url: `http://127.0.0.1:${port}/test/memory-harness.tsx` })
  await first.getByRole('button', { name: '记住', exact: true }).waitFor()
  await first.getByRole('button', { name: '记住', exact: true }).click()
  await first.getByRole('status').filter({ hasText: '已记住' }).waitFor()
  await first.getByRole('button', { name: '查看来源', exact: true }).first().click()
  await first.getByText('我：我喜欢安静的种田游戏。', { exact: true }).waitFor()
  const added = first.locator('.memory-entry').first()
  assert.ok((await added.innerText()).includes('我喜欢安静的种田游戏。'))
  await added.getByRole('button', { name: '编辑', exact: true }).click()
  await added.getByRole('textbox').fill('我现在更喜欢动作游戏。', { timeout: 5000 })
  await added.getByLabel('可在直播中使用', { exact: true }).check()
  await added.getByRole('button', { name: '保存', exact: true }).click()
  await first.getByRole('status').filter({ hasText: '记忆已更新' }).waitFor()
  assert.ok(await second.evaluate(async () => (await (await import('/src/memory.ts')).memory.context(['nana'], 'public')).memories.some((entry) => entry.text === '我现在更喜欢动作游戏。')))
  const corrected = await second.evaluate(async () => (await import('/src/memory.ts')).memory.session('browser-chat'))
  assert.deepEqual(corrected.excludedLineIds, ['browser-source'])
  const late = await second.evaluate(async () => {
    const { memory } = await import('/src/memory.ts')
    const entry = (await memory.listMemories(['nana'], 'private')).find((item) => item.text === '我现在更喜欢动作游戏。')
    return memory.saveSession({ id: 'late-derived', profileIds: ['nana'], scope: 'private', title: '迟到回复', updatedAt: Date.now(), revision: 1,
      lines: [{ id: 'late-line', who: 'nana', name: 'Nana', text: '你喜欢安静的种田游戏。', emotion: 'neutral', action: 'none', to: null, memoryIds: [entry.id], memoryRevision: 0 }] })
  })
  assert.deepEqual(late.excludedLineIds, ['late-line'])
  await first.getByRole('button', { name: '添加记忆', exact: true }).click()
  await first.locator('.memory-add').getByRole('textbox', { name: '记忆内容' }).fill('我明天要出门。')
  await first.locator('.memory-add').getByRole('button', { name: '记住', exact: true }).click()
  const independent = await first.evaluate(async () => (await (await import('/src/memory.ts')).memory.listMemories(['nana'], 'private')).find((entry) => entry.text === '我明天要出门。'))
  assert.equal(independent.sourceSessionId, undefined, 'ordinary additions do not inherit the previous transcript source')
  assert.equal(independent.sourceLineIds, undefined)
  await first.screenshot({ path: join(artifacts, 'memory-desktop.png'), fullPage: true })
  await first.setViewportSize({ width: 390, height: 844 })
  assert.equal(await first.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await first.screenshot({ path: join(artifacts, 'memory-mobile.png'), fullPage: true })
  await first.getByLabel('在对话中使用长期记忆', { exact: true }).uncheck()
  await first.getByText('长期记忆已关闭，已保存的条目仍可管理。', { exact: true }).waitFor()
  assert.deepEqual(await second.evaluate(async () => (await (await import('/src/memory.ts')).memory.context(['nana'], 'private')).memories), [])
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ indexedDB: 'reload, cross-window revision ordering, public isolation and source exclusion passed', panel: 'remember, edit, publish, source preview and disable passed', artifacts }, null, 2))
} catch (error) { console.error('Browser errors:', errors); if (testPage) console.error('Panel:', (await testPage.locator('.memory-panel').innerHTML()).slice(0, 12000)); throw error }
finally { await browser?.close(); server?.kill('SIGTERM') }
