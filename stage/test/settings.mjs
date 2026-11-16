import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const artifacts = await mkdtemp(join(tmpdir(), 'stage-settings-'))
let server, browser, page
const errors = [], calls = []
try {
  const socket = createServer()
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_STAGE_HOST: '' } })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start')), 15000)
    server.stdout.on('data', bytes => { if (String(bytes).includes('Local:')) { clearTimeout(timer); resolve() } })
    server.once('exit', code => { clearTimeout(timer); reject(new Error('Vite exited ' + code)) })
  })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' })
  await context.addInitScript(() => {
    if (!localStorage.getItem('fixture:seeded')) {
      localStorage.setItem('livliv-stage:locale', 'zh-Hans')
      localStorage.setItem('livliv-stage:coached', '1')
      localStorage.setItem('fixture:seeded', '1')
    }
    window.nativeHotkeys = JSON.parse(localStorage.getItem('fixture:hotkeys') || '{"enabled":true,"custom":true}')
    const save = () => localStorage.setItem('fixture:hotkeys', JSON.stringify(window.nativeHotkeys))
    window.livlivDesktop = {
      version: 'test', platform: 'darwin', requests: { begin: async () => 'fixture', cancel: async () => {} },
      onCommand: () => () => {},
      hotkeys: {
        list: async () => [], set: async () => [], enabled: async () => window.nativeHotkeys.enabled,
        enable: async enabled => { window.nativeHotkeys.enabled = enabled; save(); return [] },
        reset: async () => {
          if (window.failHotkeyReset) throw new Error('fixture IPC failure')
          window.nativeHotkeys.custom = false; save(); return []
        },
      },
    }
  })
  const routeFixture = async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.pathname === '/fixture-silence.wav') {
      const wav = Buffer.alloc(44 + 48000)
      wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16)
      wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28)
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(48000, 40)
      return route.fulfill({ contentType: 'audio/wav', body: wav })
    }
    if (url.pathname === '/fixture-ai/models') return route.fulfill({ json: { data: [{ id: 'fixture-model' }] } })
    if (url.pathname === '/fixture-ai/chat/completions') {
      calls.push(request.postDataJSON())
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '我们接着聊。', emotion: 'happy', action: 'nod' }) } }] } })
    }
    if (url.pathname === '/api/me') return route.fulfill({ json: request.headers().authorization === 'Bearer app.fixture-preserved' ? { signed_in: true, name: 'Fixture', points: 10 } : { signed_in: false } })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 422, json: { detail: 'Fixture only' } })
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue()
    await route.abort()
  }
  await context.route('**/*', routeFixture)
  page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d')
    draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。')
    character.muted = true; store.add(character); store.select(character.id)
  })
  await page.waitForFunction(() => window.__stage.actors.size === 1 && [...window.__stage.actors.values()].every(actor => actor.status === 'ready'))

  // No provider configured: the user chooses a model before being asked to sign in.
  await page.getByRole('button', { name: '持续聊天', exact: true }).click()
  const settings = page.locator('.settings')
  await settings.getByRole('button', { name: '文字对话', exact: true }).waitFor()
  assert.equal(await settings.getByRole('button', { name: '文字对话', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.locator('.account-panel').count(), 0, 'Continuous chat must first show model settings')
  assert.equal(calls.length, 0)
  await page.screenshot({ path: join(artifacts, 'chat-model-settings.png') })
  await settings.locator('.providers').getByRole('button', { name: 'livliv.ai', exact: true }).click()
  await settings.locator('.account-panel').waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '持续聊天', exact: true }).click()
  await settings.getByRole('button', { name: '文字对话', exact: true }).waitFor()
  await settings.locator('.providers').getByRole('button', { name: '其他', exact: true }).click()
  await settings.getByLabel('接口地址', { exact: true }).fill(`http://127.0.0.1:${port}/fixture-ai`)
  await settings.getByLabel('密钥').fill('fixture-model-key')
  await settings.getByLabel('模型', { exact: true }).fill('fixture-model')
  await settings.getByRole('button', { name: '开始', exact: true }).click()
  await settings.waitFor({ state: 'detached' })
  await page.waitForFunction(() => window.__stage.conversation().mode === 'chat' && window.__stage.conversation().waitingInput)
  assert.equal(calls.length, 1, 'Saving resumes the requested continuous chat exactly once')
  await page.evaluate(() => window.__stage.talk.stop())
  await page.getByRole('button', { name: '持续聊天', exact: true }).click()
  await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingInput)
  assert.equal(await settings.count(), 0, 'A configured model starts chat directly')
  await page.evaluate(async () => {
    const { saveSpeech } = await import('/src/voiceApi.ts'), { setHandsFree } = await import('/src/ptt.ts')
    saveSpeech({ provider: 'custom', base: location.origin + '/fixture-ai', key: 'fixture-asr-key', model: 'fixture-tts', voice: 'sweet', asr: 'fixture-asr' })
    localStorage.setItem('livliv-stage:fake-mic', location.origin + '/fixture-silence.wav')
    await setHandsFree(true)
  })
  await page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'armed')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await settings.getByRole('button', { name: '恢复默认', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.locator('dialog.reset-confirm').waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(async () => (await import('/src/ptt.ts')).pttState().automatic), true, 'Escape in the reset confirmation must leave hands-free listening on')
  assert.equal(await settings.isVisible(), true)
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(async () => (await import('/src/ptt.ts')).pttState().automatic), false, 'Escape outside confirmation still cancels listening')
  await page.keyboard.press('Escape')
  await settings.waitFor({ state: 'detached' })
  await page.evaluate(() => localStorage.removeItem('livliv-stage:fake-mic'))
  await page.evaluate(() => window.__stage.talk.stop())

  await page.evaluate(async () => {
    const { setInput } = await import('/src/devices.ts'), { setBus } = await import('/src/mixer.ts')
    const { setQuality } = await import('/src/quality.ts'), { saveSpeech } = await import('/src/voiceApi.ts')
    const { saveRealtime, realtimeDefaults } = await import('/src/realtime.ts'), { refresh } = await import('/src/livliv.ts')
    const { memory } = await import('/src/memory.ts')
    setInput({ camera: 'fixture-camera', microphone: 'fixture-mic' }); setQuality('sharp')
    setBus('microphone', { volume: 1.6, muted: true }); setBus('characters', { volume: 0.3 }); setBus('friends', { muted: true })
    saveSpeech({ provider: 'custom', base: location.origin + '/fixture-speech', key: 'fixture-speech-key', model: 'fixture-tts', voice: 'sweet', asr: 'fixture-asr' })
    saveRealtime({ ...realtimeDefaults(), base: 'https://fixture.maas.aliyuncs.com', key: 'fixture-realtime-key' })
    localStorage.setItem('livliv-stage:session', 'app.fixture-preserved')
    localStorage.setItem('livliv-stage:brain-api', 'fixture-previous-model')
    localStorage.setItem('livliv-stage:relay', 'https://fixture-relay.test')
    localStorage.setItem('livliv-stage:tracking-presets', 'fixture-saved-presets')
    await refresh()
    const character = window.__stage.store.get().items.find(item => item.kind === 'character')
    await memory.remember({ profileId: character.profileId, scope: 'private', text: '需要保留的记忆。' })
  })
  await page.getByRole('button', { name: '收起舞台内容', exact: true }).click()
  await page.keyboard.press('Control+\\')
  assert.equal(await page.locator('.app.panels-folded.tools-folded').count(), 1)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await settings.getByRole('button', { name: '通用', exact: true }).click()
  const readPreferences = () => page.evaluate(async () => ({
    quality: (await import('/src/quality.ts')).getQuality(),
    locale: document.documentElement.lang,
    inputs: (await import('/src/devices.ts')).inputs(),
    mixer: (await import('/src/mixer.ts')).mixer().settings,
    hotkeys: window.nativeHotkeys,
    folded: document.querySelector('.app').classList.contains('panels-folded'),
    leftFolded: document.querySelector('.app').classList.contains('tools-folded'),
    saved: Object.fromEntries(['quality', 'locale', 'inputs', 'mixer', 'panel-folded', 'left-folded'].map(key => [key, localStorage.getItem('livliv-stage:' + key)])),
  }))
  const readKept = () => page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts'), { kept } = await import('/src/vault.ts')
    const scene = window.__stage.store.get(), profiles = scene.items.filter(item => item.kind === 'character').map(item => item.profileId)
    return {
      scene, library: await kept(), history: await memory.sessions(profiles, 'private'), memories: await memory.listMemories(profiles, 'private'),
      settings: Object.fromEntries(['brain', 'brain-api', 'speech', 'realtime', 'session', 'relay', 'tracking-presets', 'coached'].map(key => [key, localStorage.getItem('livliv-stage:' + key)])),
      account: (await import('/src/livliv.ts')).accountNow().status,
    }
  })
  const beforePreferences = await readPreferences(), kept = await readKept(), callsBeforeReset = calls.length
  assert.ok(kept.history.length && kept.memories.length && kept.library.length, 'Preservation is tested with real stored data')
  const output = await context.newPage()
  output.on('pageerror', error => errors.push(error.message))
  await output.goto(`http://127.0.0.1:${port}/?output=1`, { waitUntil: 'networkidle' })
  assert.equal(await output.evaluate(async () => (await import('/src/quality.ts')).getQuality()), 'sharp')
  const reset = settings.getByRole('button', { name: '恢复默认', exact: true })
  await reset.click()
  const confirmation = page.getByRole('dialog', { name: '恢复默认偏好？', exact: true })
  await confirmation.waitFor()
  assert.equal(await confirmation.getByRole('button', { name: '取消', exact: true }).evaluate(button => button === document.activeElement), true, 'Cancel receives initial focus')
  await page.keyboard.press('Tab')
  assert.equal(await confirmation.getByRole('button', { name: '确认恢复', exact: true }).evaluate(button => button === document.activeElement), true)
  await page.keyboard.press('Shift+Tab')
  await page.evaluate(() => document.querySelector('.settings-head button').focus())
  assert.equal(await confirmation.getByRole('button', { name: '取消', exact: true }).evaluate(button => button === document.activeElement), true, 'The settings behind the modal are inert')
  await page.keyboard.press('Delete')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Control+d')
  await confirmation.getByRole('button', { name: '取消', exact: true }).click()
  await confirmation.waitFor({ state: 'detached' })
  assert.deepEqual(await readPreferences(), beforePreferences, 'Cancel changes no preferences')
  assert.deepEqual(await readKept(), kept, 'Dialog shortcuts must not edit the scene or data')
  await reset.click()
  await page.keyboard.press('Escape')
  await confirmation.waitFor({ state: 'detached' })
  assert.equal(await settings.isVisible(), true, 'Escape dismisses only confirmation')
  assert.deepEqual(await readPreferences(), beforePreferences)

  // Check translated confirmation, narrow layout and keyboard cancel without applying a reset.
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.evaluate(async locale => (await import('/src/i18n.ts')).setLocale(locale), locale)
    await page.setViewportSize({ width: 390, height: 844 })
    await settings.locator('.reset-preferences > button').click()
    const dialog = page.locator('dialog.reset-confirm')
    await dialog.waitFor()
    assert.equal(await dialog.evaluate(element => element.scrollWidth > element.clientWidth), false)
    assert.equal(await dialog.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 16 && rect.right <= innerWidth - 16 && rect.bottom <= innerHeight - 16 }), true)
    await page.screenshot({ path: join(artifacts, `reset-${locale}-390.png`) })
    await page.keyboard.press('Escape')
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.evaluate(async () => (await import('/src/i18n.ts')).setLocale('zh-Hans'))
  await settings.locator('.reset-preferences > button').click()
  await page.locator('dialog.reset-confirm').screenshot({ path: join(artifacts, 'reset-confirm-zh.png') })
  await page.keyboard.press('Escape')
  await page.evaluate(async () => (await import('/src/i18n.ts')).setLocale('en'))
  await settings.locator('.reset-preferences > button').click()
  await page.screenshot({ path: join(artifacts, 'reset-en-1280.png') })
  await page.locator('dialog.reset-confirm').getByRole('button', { name: 'Reset preferences', exact: true }).click()
  await page.locator('dialog.reset-confirm').waitFor({ state: 'detached' })
  await settings.getByRole('status').filter({ hasText: '已恢复默认偏好' }).waitFor()
  const defaults = await readPreferences()
  assert.equal(defaults.quality, 'standard')
  assert.equal(defaults.locale, 'zh-Hans', 'Language follows the system after reset')
  assert.deepEqual(defaults.inputs, { camera: '', microphone: '' })
  assert.deepEqual(defaults.mixer, { microphone: { volume: 1, muted: false }, characters: { volume: 1, muted: false }, friends: { volume: 1, muted: false } })
  assert.deepEqual(defaults.hotkeys, { enabled: false, custom: false })
  assert.equal(defaults.folded || defaults.leftFolded, false)
  assert.ok(Object.values(defaults.saved).every(value => value === null), 'Removed preferences will use defaults on next launch')
  await output.waitForFunction(async () => (await import('/src/quality.ts')).getQuality() === 'standard' && document.documentElement.lang === 'zh-Hans')
  await output.close()
  assert.deepEqual(await readKept(), kept, 'Reset preserves models, all API keys, login, scenes, imported characters, history and memory')
  assert.equal(calls.length, callsBeforeReset, 'Reset does not call a model')

  // Native failures stay visible; the dialog permits retry and must not announce success.
  await page.evaluate(() => { window.failHotkeyReset = true })
  await reset.click()
  await confirmation.getByRole('button', { name: '确认恢复', exact: true }).click()
  await confirmation.getByRole('alert').filter({ hasText: 'fixture IPC failure' }).waitFor()
  assert.equal(await confirmation.isVisible(), true)
  await page.evaluate(() => { window.failHotkeyReset = false })
  await confirmation.getByRole('button', { name: '确认恢复', exact: true }).click()
  await confirmation.waitFor({ state: 'detached' })
  await page.reload({ waitUntil: 'networkidle' })
  assert.deepEqual(await readPreferences(), defaults, 'Defaults persist across app reload')
  const afterReload = await readKept()
  assert.deepEqual(afterReload.settings, kept.settings)
  assert.deepEqual(afterReload.scene, await page.evaluate(async scene => (await import('/src/scene.ts')).loadable(scene), kept.scene), 'Reload preserves the scene with its normal loaded defaults')
  assert.deepEqual(afterReload.memories, kept.memories)
  assert.deepEqual(afterReload.library, kept.library)
  assert.deepEqual(afterReload.history.map(session => session.id), kept.history.map(session => session.id))
  assert.equal(afterReload.account, 'in', 'The saved session remains signed in')

  // A self-hosted browser has no native hotkeys to reset.
  const webContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })
  await webContext.addInitScript(() => localStorage.setItem('livliv-stage:locale', 'zh-Hans'))
  await webContext.route('**/*', routeFixture)
  const web = await webContext.newPage()
  web.on('pageerror', error => errors.push(error.message))
  await web.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await web.getByRole('button', { name: '设置', exact: true }).click()
  await web.setViewportSize({ width: 390, height: 844 })
  await web.locator('.reset-preferences > button').click()
  const webDialog = web.locator('dialog.reset-confirm')
  assert.equal(await webDialog.getByText('全局热键将恢复默认并关闭。', { exact: true }).count(), 0)
  await webDialog.getByRole('button', { name: '确认恢复', exact: true }).click()
  await webDialog.waitFor({ state: 'detached' })
  await web.getByRole('status').filter({ hasText: 'Default preferences restored' }).waitFor()
  assert.equal(await web.evaluate(() => document.documentElement.lang), 'en')
  await webContext.close()

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, calls: calls.length, artifacts }))
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  console.error('Artifacts:', artifacts)
  console.error(error); process.exitCode = 1
} finally { await browser?.close(); server?.kill() }
