import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-voice-setup-'))
let server, browser
const errors = [], speechCalls = []
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-speech/audio/voices') { await route.fulfill({ json: { voices: ['fixture-voice'] } }); return }
    if (url.pathname === '/fixture-speech/audio/speech') {
      speechCalls.push(route.request().postDataJSON())
      const wav = Buffer.alloc(44 + 4800)
      wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16)
      wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(48000, 28)
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(4800, 40)
      await route.fulfill({ contentType: 'audio/wav', body: wav }); return
    }
    if (url.pathname.startsWith('/api/')) {
      await route.fulfill({ status: 401, json: { detail: 'Not signed in in this fixture' } }); return
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(testTimeout(15000))
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  const original = await page.evaluate(async () => {
    const { store } = await import('/src/scene.ts'), { buildTemplate } = await import('/src/templates.ts')
    const { saveSpeech, SPEECH_OFF } = await import('/src/voiceApi.ts')
    const { modelId } = await import('/src/livliv.ts')
    const scene = await buildTemplate('ai'), character = scene.items.find(c => c.kind === 'character')
    character.voice.source = 'livliv'
    saveSpeech(SPEECH_OFF); store.replace(scene); store.select(character.id)
    return { id: character.id, mid: modelId(character), voice: character.voice, speech: JSON.stringify(SPEECH_OFF) }
  })
  assert.equal(original.mid, 'd03ft', 'Exercise the real featured LivLiv character')
  await page.waitForFunction(() => window.__stage.actors.size === 1 && [...window.__stage.actors.values()].every(a => a.status === 'ready'))
  // the voice is set on the character card's 人设和声音 page
  await page.locator('.panel .card-pages').getByRole('tab', { name: '人设和声音', exact: true }).click()
  const api = page.getByRole('button', { name: '我的接口', exact: true })
  assert.equal(await api.isEnabled(), true, 'An unconfigured voice API must guide setup instead of disabling the entry')
  await api.click()
  const settings = page.locator('.settings'), speech = settings.locator('[data-section="speech"]')
  assert.equal(await settings.locator('.settings-tabs button.on').innerText(), '连接')
  assert.ok(await speech.evaluate((el) => { const r = el.getBoundingClientRect(), c = el.closest('.settings-body').getBoundingClientRect(); return r.top >= c.top - 1 && r.top < c.bottom }), 'Settings opens at 声音与语音识别')
  await speech.getByText('语音模型', { exact: true }).waitFor()
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.evaluate(async locale => (await import('/src/i18n.ts')).setLocale(locale), locale)
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await settings.evaluate(el => el.scrollWidth > el.clientWidth), false)
  }
  await page.evaluate(async () => (await import('/src/i18n.ts')).setLocale('zh-Hans'))
  await page.screenshot({ path: join(artifacts, 'voice-setup-390.png'), fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: join(artifacts, 'voice-setup-1280.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await settings.waitFor({ state: 'detached' })
  assert.deepEqual(await page.evaluate(id => window.__stage.store.get().items.find(c => c.id === id).voice, original.id), original.voice)
  assert.equal(await page.evaluate(() => localStorage.getItem('livliv-stage:speech')), original.speech)
  await api.click()
  await speech.getByRole('button', { name: '其他', exact: true }).click()
  const form = speech.locator('.model-form')
  await form.getByLabel('接口地址', { exact: true }).fill(`http://127.0.0.1:${port}/fixture-speech`)
  await form.locator('input[type=password]').fill('fixture-only')
  await form.getByLabel('语音模型', { exact: true }).fill('fixture-tts')
  await form.getByLabel('默认音色', { exact: true }).fill('fixture-voice')
  await form.getByRole('button', { name: '保存', exact: true }).click()
  await settings.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(id => window.__stage.store.get().items.find(c => c.id === id).voice.source, original.id), 'api')
  assert.equal(await api.getAttribute('class'), 'on')
  await page.waitForFunction(() => [...window.__stage.actors.values()].every(a => a.status === 'ready'))
  await page.locator('.panel').getByRole('button', { name: '试听', exact: true }).click()
  await page.waitForFunction(() => [...window.__stage.actors.values()].every(a => !a.speaking))
  assert.equal(speechCalls.length, 1)
  assert.equal(speechCalls[0].model, 'fixture-tts')
  assert.equal(speechCalls[0].voice, 'fixture-voice')
  await page.getByRole('button', { name: '系统朗读', exact: true }).click()
  await api.click()
  assert.equal(await page.locator('.settings').count(), 0, 'A configured API switches immediately without reopening setup')
  assert.equal(await api.getAttribute('class'), 'on')
  assert.deepEqual(errors, [])
  console.log('PASS: LivLiv character -> voice API setup; four locales and mobile; cancel keeps settings; save applies to selected character; preview uses custom API; configured switch stays direct')
} finally {
  await browser?.close()
  server?.kill()
}
