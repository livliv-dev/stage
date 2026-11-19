import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-ux-'))
let server, browser, page, failList = true, slowPreview = false, listCalls = 0
const errors = [], requests = []
function wav() {
  const samples = 9600, buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  return buffer
}
try {
  const socket = createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port; await new Promise((resolve) => socket.close(resolve))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start: ' + output)), 20000)
    server.stdout.on('data', (data) => { output += String(data); if (output.includes('Local:')) { clearTimeout(timer); resolve() } })
    server.stderr.on('data', (data) => { output += String(data) })
    server.once('exit', (code) => { clearTimeout(timer); reject(new Error('Vite exited ' + code + ': ' + output)) })
  })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1'); localStorage.setItem('livliv-stage:session', 'fixture-only')
    window.uxMediaRequests = 0
    navigator.mediaDevices.getUserMedia = async () => { window.uxMediaRequests++; throw new Error('No microphone during settings review') }
    let state = { enabled: false, port: null, url: null, character: null, connections: [], error: null }
    const listeners = new Set()
    window.livlivDesktop = {
      version: 'test', platform: 'darwin', onCommand: () => () => {}, requests: { begin: async () => 'ticket', cancel: async () => {} },
      hotkeys: { list: async () => [], set: async () => [], reset: async () => [] },
      neuro: { get: async () => state, set: async (config) => { state = config.enabled ? { ...state, enabled: true, port: config.port || 8765, url: `ws://127.0.0.1:${config.port || 8765}`, character: config.character } : { ...state, enabled: false, port: null, url: null, character: null }; listeners.forEach((callback) => callback(state)); return state }, onState: (callback) => { listeners.add(callback); return () => listeners.delete(callback) }, onMessage: () => () => {}, answer: () => {}, speech: async () => {} },
    }
  })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/me') { await route.fulfill({ json: { signed_in: true, email: 'fixture@example.test', points: 1000 } }); return }
    if (url.pathname.endsWith('/voices')) {
      listCalls++
      if (failList) { failList = false; await route.fulfill({ status: 503, json: { detail: '测试：服务暂时不可用' } }); return }
      const groups = ['girl', 'woman', 'man', 'other']
      const voices = Array.from({ length: 120 }, (_, index) => ({ id: `voice-${index}`, name: `音色 ${String(index).padStart(3, '0')}`, desc: index % 2 ? '低沉沉稳' : '温柔明亮', group: groups[index % 4] }))
      await route.fulfill({ json: { voice: 'voice-0', own: { id: 'own-nana', name: 'Nana 专属声音' }, voices } }); return
    }
    if (url.pathname.endsWith('/say')) {
      requests.push(route.request().postDataJSON())
      if (slowPreview) await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.fulfill({ json: { lines: [{ audio: '/fixture-voice.wav', expression: null }] } }).catch(() => {}); return
    }
    if (url.pathname === '/fixture-voice.wav') { await route.fulfill({ contentType: 'audio/wav', body: wav() }); return }
    if (url.pathname === '/fixture-ai/chat/completions') { await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '游戏准备好了。', emotion: 'neutral', action: 'none' }) } }] } }); return }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' && message.text().includes('same key')) errors.push(message.text()) })
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), { fromPngs } = await import('/src/library.ts')
    const { saveBrainConfig } = await import('/src/brain.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', { ...pick.model, livlivId: 'ux-nana' }, '喜欢具体的讨论。')
    character.voice.source = 'livliv'; store.add(character); store.select(character.id)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  const currentVoice = () => page.evaluate(() => [...window.__stage.actors.values()][0].item.voice.livliv)
  await page.getByRole('button', { name: '更换音色' }).click()
  const dialog = page.getByRole('dialog', { name: '选择角色音色' })
  await dialog.getByRole('alert').filter({ hasText: '服务暂时不可用' }).waitFor()
  await dialog.getByRole('button', { name: '重试', exact: true }).click()
  await dialog.getByText('122 个音色', { exact: true }).waitFor(); assert.equal(listCalls, 2)
  assert.equal(await requests.length, 0, 'opening the picker never generates billed speech')
  await dialog.getByRole('button', { name: '男声', exact: true }).click()
  assert.equal(await dialog.getByRole('radio').count(), 30)
  await dialog.getByRole('button', { name: '全部', exact: true }).click()
  await dialog.getByRole('searchbox', { name: '搜索音色' }).fill('音色 078')
  assert.equal(await dialog.getByRole('radio').count(), 1)
  await dialog.getByRole('radio').check(); assert.equal(await currentVoice(), '')
  await dialog.getByRole('button', { name: '试听 音色 078', exact: true }).click()
  await page.waitForFunction(() => ![...window.__stage.actors.values()][0].speaking)
  assert.equal(requests.at(-1).voice, 'voice-78'); assert.equal(await currentVoice(), '', 'preview does not apply the candidate')
  await dialog.getByRole('button', { name: '应用音色', exact: true }).click(); assert.equal(await currentVoice(), 'voice-78')
  await page.getByRole('button', { name: '更换音色' }).click()
  await dialog.getByRole('button', { name: '最近使用', exact: true }).click(); assert.equal(await dialog.getByRole('radio').count(), 1)
  await dialog.getByRole('button', { name: '全部', exact: true }).click()
  await dialog.getByRole('searchbox').fill('不存在的声音')
  await dialog.getByText('没有找到匹配的音色', { exact: true }).waitFor()
  await dialog.getByRole('button', { name: '查看全部音色', exact: true }).click()
  await page.screenshot({ path: join(artifacts, 'voices-desktop.png') })
  await dialog.getByRole('searchbox').fill('低沉'); assert.equal(await dialog.getByRole('radio').count(), 60)
  await dialog.getByRole('radio').first().check()
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); assert.equal(await currentVoice(), 'voice-78', 'Escape discards a draft')
  await page.getByRole('button', { name: '更换音色' }).click()
  slowPreview = true
  await dialog.getByRole('button', { name: '试听 角色原声', exact: true }).click()
  await dialog.getByRole('button', { name: '停止试听 角色原声', exact: true }).waitFor()
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await page.waitForTimeout(1200); assert.equal(await currentVoice(), 'voice-78')
  assert.equal(await page.evaluate(() => [...window.__stage.actors.values()][0].speaking), false, 'closed previews cannot play a late response')
  assert.equal(await page.locator('.panel .persona-settings').count(), 1, 'rerenders keep one persona section')
  assert.equal(await page.locator('.panel > section').getByRole('heading', { name: 'AI 反应', exact: true }).count(), 1, 'the reaction section is not replaced by a duplicate persona')
  slowPreview = false
  await page.getByRole('button', { name: '记忆', exact: true }).click()
  const memory = page.locator('.memory-panel')
  await page.getByRole('tab', { name: '记忆', exact: true }).waitFor()
  assert.equal(await page.locator('.transcript').count(), 1)
  await memory.getByRole('button', { name: '添加记忆', exact: true }).click()
  await memory.getByRole('textbox', { name: '记忆内容' }).fill('我喜欢安静的种田游戏。')
  await memory.getByRole('button', { name: '记住', exact: true }).click()
  await memory.getByRole('status').filter({ hasText: '已记住' }).waitFor()
  await memory.locator('.memory-entry').getByText('我喜欢安静的种田游戏。', { exact: true }).waitFor()
  assert.equal(await memory.getByRole('textbox', { name: '记忆内容' }).count(), 0, 'save returns to the readable list')
  await page.evaluate(async () => { await window.__stage.talk.newChat(); window.__stage.talk.say('我最近喜欢烘焙。') })
  await page.getByRole('tab', { name: '对话记录', exact: true }).click()
  await page.locator('.transcript .line').filter({ hasText: '我最近喜欢烘焙。' }).getByRole('button', { name: '记住', exact: true }).click()
  await memory.locator('.memory-add').getByRole('button', { name: '记住', exact: true }).click()
  await memory.getByRole('status').filter({ hasText: '已记住' }).waitFor()
  await memory.getByRole('button', { name: '添加记忆', exact: true }).click()
  await memory.locator('.memory-add').getByRole('textbox').fill('我明天要出门。')
  await memory.locator('.memory-add').getByRole('button', { name: '记住', exact: true }).click()
  await memory.getByRole('status').filter({ hasText: '已记住' }).waitFor()
  assert.equal(await page.evaluate(async () => { const { memory } = await import('/src/memory.ts'), item = [...window.__stage.actors.values()][0].item; return (await memory.listMemories([item.profileId ?? item.id], 'private')).find((entry) => entry.text === '我明天要出门。').sourceSessionId }), undefined)
  await page.screenshot({ path: join(artifacts, 'memory-desktop.png') })
  await page.getByRole('tab', { name: '记忆', exact: true }).focus(); await page.keyboard.press('ArrowLeft')
  assert.equal(await page.getByRole('tab', { name: '对话记录', exact: true }).getAttribute('aria-selected'), 'true')
  await page.keyboard.press('ArrowRight'); assert.equal(await page.getByRole('tab', { name: '记忆', exact: true }).getAttribute('aria-selected'), 'true')
  await page.getByRole('tab', { name: '对话记录', exact: true }).click()
  await page.locator('.transcript .line').filter({ hasText: '我最近喜欢烘焙。' }).getByRole('button', { name: '记住', exact: true }).click()
  await memory.locator('.memory-add').getByRole('textbox').waitFor()
  await page.evaluate(async () => { window.__stage.talk.stop(); await window.__stage.talk.setScope('public') })
  await memory.getByText('还没有长期记忆', { exact: true }).waitFor()
  assert.equal(await memory.locator('.memory-add').count(), 0, 'scope changes clear pending transcript sources')
  assert.equal(await memory.getByText('我最近喜欢烘焙。', { exact: true }).count(), 0)
  await page.evaluate(async () => window.__stage.talk.setScope('private'))
  await page.locator('.transcript').getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '对话设置：谁先说、抢话、语言、节奏、弹幕' }).click()
  const settings = page.locator('.talk-settings')
  await settings.getByRole('button', { name: '深入讨论', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__stage.store.get().talk.depth), 'discussion')
  assert.equal(await settings.getByText('AI 抢话', { exact: true }).isVisible(), false)
  await page.screenshot({ path: join(artifacts, 'chat-settings.png') })
  await settings.getByRole('button', { name: '关闭', exact: true }).click()
  await page.evaluate(() => [...window.__stage.actors.values()][0].setPhase('thinking'))
  await page.getByRole('button', { name: '预览反应', exact: true }).click(); await page.getByRole('status').filter({ hasText: '正在预览反应' }).waitFor()
  await page.getByRole('button', { name: '预览反应', exact: true }).click(); await page.getByRole('status').filter({ hasText: '正在预览反应' }).waitFor()
  assert.equal(await page.getByText('反应间隔', { exact: true }).isVisible(), false)
  await page.getByText('聆听时回应', { exact: true }).click()
  await page.locator('.reaction-details > summary').click()
  const gesture = page.getByRole('slider', { name: /^小动作幅度/ })
  await gesture.focus(); await gesture.press('Home')
  for (let step = 0; step < 8; step++) await gesture.press('ArrowRight')
  assert.ok(Math.abs((await page.evaluate(() => [...window.__stage.actors.values()][0].item.reactions.motion)) - 0.4) < 0.001)
  assert.equal(await page.evaluate(() => [...window.__stage.actors.values()][0].item.reactions.listen), false)
  await page.screenshot({ path: join(artifacts, 'reaction-controls.png') })
  await page.locator('.reaction-details > summary').click()
  await page.getByText('动作与更多设置', { exact: true }).click()
  const shoulders = page.getByRole('slider', { name: /^肩膀与身体摆动/ })
  await shoulders.focus(); await shoulders.press('Home')
  for (let step = 0; step < 10; step++) await shoulders.press('ArrowRight')
  const savedMotion = await page.evaluate(async () => {
    const { loadable, persistentScene } = await import('/src/scene.ts')
    const character = loadable(persistentScene(window.__stage.store.get()), false).items.find(item => item.kind === 'character')
    return { listen: character.reactions.listen, motion: character.reactions.motion, body: character.tuning.bodyMotion }
  })
  assert.deepEqual(savedMotion, { listen: false, motion: 0.4, body: 0.5 })
  await page.getByText('动作与更多设置', { exact: true }).click()

  await page.getByRole('button', { name: '实时语音', exact: true }).click()
  await page.locator('.realtime-settings').getByText('实时语音服务', { exact: true }).waitFor()
  assert.equal(await page.locator('.realtime-settings input[type=password]').count(), 0)
  const originalModels = await page.evaluate(() => [localStorage.getItem('livliv-stage:brain'), localStorage.getItem('livliv-stage:speech')])
  await page.locator('.realtime-settings').getByRole('button', { name: '设置模型与声音', exact: true }).click()
  const modelSettings = page.locator('.settings .model-settings'), realtimeModel = modelSettings.locator('.realtime-model-form')
  assert.equal(await modelSettings.locator('.model-tabs').getByRole('button', { name: '实时语音', exact: true }).getAttribute('aria-pressed'), 'true')
  await realtimeModel.getByRole('combobox', { name: '实时语音服务', exact: true }).selectOption('openai')
  await realtimeModel.getByRole('textbox', { name: '密钥', exact: true }).fill('fixture-realtime-key')
  await realtimeModel.getByRole('textbox', { name: '模型', exact: true }).fill('fixture-realtime-model')
  await realtimeModel.getByRole('textbox', { name: '实时音色', exact: true }).fill('fixture-voice')
  await realtimeModel.getByRole('button', { name: '保存', exact: true }).click()
  // saved from the realtime panel: back there, with the model just saved
  await page.locator('.realtime-model-summary').getByText(/fixture-realtime-model/).waitFor()
  assert.equal(await page.locator('.settings').count(), 0)
  assert.equal(await page.evaluate(() => window.uxMediaRequests), 0)
  assert.deepEqual(await page.evaluate(() => [localStorage.getItem('livliv-stage:brain'), localStorage.getItem('livliv-stage:speech')]), originalModels)
  await page.locator('.realtime-settings').getByRole('button', { name: '设置模型与声音', exact: true }).click()
  await modelSettings.locator('.model-tabs').getByRole('button', { name: '配音与识别', exact: true }).click()
  await modelSettings.getByRole('button', { name: 'OpenAI', exact: true }).click()
  await modelSettings.getByText('识别模型', { exact: true }).waitFor()
  await modelSettings.locator('.model-tabs').getByRole('button', { name: '文字对话', exact: true }).click()
  await modelSettings.getByRole('button', { name: '其他', exact: true }).waitFor()
  await modelSettings.locator('.model-tabs').getByRole('button', { name: '实时语音', exact: true }).click()
  assert.equal(await realtimeModel.getByRole('textbox', { name: '模型', exact: true }).inputValue(), 'fixture-realtime-model')
  await page.screenshot({ path: join(artifacts, 'unified-model-settings.png') })
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.evaluate(async (locale) => (await import('/src/i18n.ts')).setLocale(locale), locale)
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.locator('.settings').evaluate((element) => element.scrollWidth > element.clientWidth), false)
    await page.screenshot({ path: join(artifacts, 'models-390-' + locale + '.png') })
  }
  await page.evaluate(async () => (await import('/src/i18n.ts')).setLocale('zh-Hans')); await page.setViewportSize({ width: 1440, height: 900 })
  // closed: back in the realtime panel too
  await page.locator('.settings').getByRole('button', { name: '关闭', exact: true }).click()
  await page.locator('.realtime-model-summary').getByText(/fixture-realtime-model/).waitFor()
  assert.equal(await page.locator('.realtime-settings').getByRole('button', { name: '开始实时语音', exact: true }).isEnabled(), true)
  await page.locator('.realtime-settings').getByRole('button', { name: '关闭', exact: true }).click()
  const more = page.locator('.start-modes')
  await more.locator('summary').focus(); await page.keyboard.press('Enter')
  await more.getByText('回应直播间的观众弹幕', { exact: true }).waitFor()
  await page.keyboard.press('Escape'); assert.equal(await more.evaluate((element) => element.open), false)
  await more.locator('summary').click(); await more.getByRole('button', { name: 'AI 直播', exact: false }).click()
  await page.locator('.live-settings:not(.realtime-settings)').getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const neuro = page.locator('.neuro-panel')
  assert.equal(await neuro.getByRole('button', { name: '开始游戏互动', exact: true }).isVisible(), false)
  await neuro.locator('details > summary').first().click()
  assert.equal(await neuro.getByRole('spinbutton').isVisible(), false)
  await neuro.getByText('连接设置', { exact: true }).click()
  await neuro.getByRole('spinbutton').fill('-1')
  assert.equal(await neuro.getByRole('button', { name: '开始游戏互动', exact: true }).isEnabled(), false)
  await neuro.getByRole('spinbutton').fill('8765')
  await neuro.getByRole('button', { name: '开始游戏互动', exact: true }).click()
  await neuro.getByRole('textbox', { name: '连接地址', exact: true }).waitFor()
  assert.equal(await neuro.getByRole('textbox', { name: '连接地址', exact: true }).inputValue(), 'ws://127.0.0.1:8765')
  await page.screenshot({ path: join(artifacts, 'game-settings.png') })
  await neuro.getByRole('button', { name: '关闭游戏接口', exact: true }).click()
  await page.evaluate(() => window.__stage.talk.stop())
  await page.locator('.settings').getByRole('button', { name: '关闭', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 800 })
  assert.ok(await page.locator('.say input').evaluate((element) => element.getBoundingClientRect().width >= 120), 'chat input stays usable')
  await page.getByRole('button', { name: '更换音色' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: join(artifacts, 'voices-mobile.png') })
  assert.equal(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth), false)
  await dialog.getByRole('searchbox').fill('音色 119'); await dialog.getByRole('radio').check(); await dialog.getByRole('button', { name: '应用音色', exact: true }).click()
  assert.equal(await currentVoice(), 'voice-119')
  const reactionSettings = await page.evaluate(async () => {
    const { persistentScene, loadable } = await import('/src/scene.ts')
    const restored = loadable(persistentScene(window.__stage.store.get()), false)
    const item = restored.items.find(item => item.kind === 'character')
    return { listen: item.reactions.listen, motion: item.reactions.motion, bodyMotion: item.tuning.bodyMotion }
  })
  assert.equal(reactionSettings.listen, false); assert.equal(reactionSettings.motion, 0.4); assert.equal(reactionSettings.bodyMotion, 0.5)
  assert.deepEqual(errors, [])
  assert.equal(await page.evaluate(() => window.uxMediaRequests), 0)
  await writeFile(join(artifacts, 'report.json'), JSON.stringify({ listCalls, previews: requests.length, errors, artifacts }, null, 2))
  console.log(JSON.stringify({ ok: true, listCalls, previews: requests.length, artifacts }))
} catch (error) {
  if (page) { console.error('Artifacts:', artifacts); await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}) }
  throw error
} finally { await browser?.close(); server?.kill('SIGTERM') }
