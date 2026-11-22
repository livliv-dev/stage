// A session that started free stays free when Voicebox goes away mid-session (sessions/spend.ts). In the desktop app
// (a stand-in for its Voicebox bridge), signed in to LivLiv, a model of one's own and no speech API: the characters
// speak in Voicebox's voice; Voicebox quits; the next line is shown as a subtitle, never voiced by LivLiv for points.
// Hands-free on Voicebox's Whisper: Voicebox quits and nothing goes to LivLiv's recognition; your own recognition
// turned off mid-session stops hearing, and says why, instead of turning to LivLiv's.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { setTimeout as delay } from 'node:timers/promises'
import { freePort, startVite, testTimeout } from './vite.mjs'

const errors = [], paid = [], chats = []
let server, browser, page
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    localStorage.setItem('livliv-stage:session', 'app.fixture-signed-in')
    // a microphone whose loudness the test sets (as test/handsfree.mjs)
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext(), gain = context.createGain(), wave = context.createOscillator(), destination = context.createMediaStreamDestination()
      gain.gain.value = 0; wave.frequency.value = 220; wave.connect(gain); gain.connect(destination); wave.start(); await context.resume()
      window.microphone = { context, gain }
      return destination.stream
    }
    navigator.mediaDevices.enumerateDevices = async () => []
    // a short WAV of a tone, as Voicebox says a line
    const wav = () => {
      const samples = 9600, view = new DataView(new ArrayBuffer(44 + samples * 2)), text = (at, s) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
      text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
      view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true)
      for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, Math.round(Math.sin(i / 24000 * 330 * Math.PI * 2) * 6000), true)
      return view.buffer
    }
    window.vb = { up: true, speaks: 0, transcribes: 0 }
    const down = { ok: false, error: 'not-running', detail: 'ECONNREFUSED' }
    window.livlivDesktop = {
      api: 1, version: 'test', platform: 'darwin', role: 'main', stageEditor: true,
      requests: { begin: async () => 'fixture', cancel: async () => {} }, onCommand: () => () => {},
      hotkeys: { list: async () => [], set: async () => [], reset: async () => [], enabled: async () => false, enable: async () => [] },
      voicebox: {
        profiles: async () => (window.vb.up ? { ok: true, value: [{ id: 'lily', name: 'Lily', language: 'zh', kind: 'preset', engine: 'kokoro', ready: true }] } : down),
        speak: async () => { window.vb.speaks++; return window.vb.up ? { ok: true, value: wav() } : down },
        transcribe: async () => { window.vb.transcribes++; return window.vb.up ? { ok: true, value: '我们聊聊天气' } : down },
        cancel: async () => null,
      },
    }
  })
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url())
    if (url.pathname === '/fixture/chat/completions') {
      chats.push(1)
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '今天天气不错。', emotion: 'happy', action: 'none' }) } }] } })
    }
    if (url.pathname === '/api/me') return route.fulfill({ json: request.headers().authorization === 'Bearer app.fixture-signed-in' ? { signed_in: true, email: 'e2e@example.test', points: 500 } : { signed_in: false } })
    // a LivLiv character's chat card: a free read (livliv.ts watchSiteCards)
    if (/^\/api\/chat\/[^/]+\/card$/.test(url.pathname)) return route.fulfill({ status: 404, json: { detail: 'none' } })
    // LivLiv's voices and recognition, which cost points: never asked here
    if (url.pathname.startsWith('/api/')) { paid.push(url.pathname); return route.fulfill({ status: 402, json: { detail: 'Fixture: points spent' } }) }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['blob:', 'data:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(20000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!window.__stage)
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), { fromPngs } = await import('/src/library.ts')
    const { saveBrainConfig } = await import('/src/brain.ts')
    const canvas = new OffscreenCanvas(40, 60); canvas.getContext('2d').fillRect(0, 0, 40, 60)
    const blob = await canvas.convertToBlob(), pick = await fromPngs({ closed: new File([blob], 'closed.png'), open: new File([blob], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    // a LivLiv character (it could be voiced by LivLiv for points), on the voice of your API: Voicebox's
    const character = newCharacter(store.get(), 'Nana', { ...pick.model, livlivId: 'dropout-nana' }, ''); character.voice.source = 'api'; store.add(character)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture', key: 'fixture-only', model: 'fixture', airi: false })
    // your own services only: livliv.ai off, though signed in
    ;(await import('/src/brain.ts')).setLivLiv({ text: false, voice: false })
    await window.__stage.voice.detectVoicebox()
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((actor) => actor.status === 'ready'))
  const actor = () => page.evaluate(() => { const a = [...window.__stage.actors.values()][0]; return { error: a.voiceError } })
  const said = (n) => page.waitForFunction((n) => window.__stage.conversation().lines.filter((line) => !line.human).length >= n && !window.__stage.conversation().speaking && !window.__stage.conversation().thinking, n)
  assert.equal(await page.evaluate(() => window.__stage.voice.activeSpeech().provider), 'voicebox', 'Voicebox found: the characters\' voice')
  assert.equal(await page.evaluate(() => window.__stage.voice.asrReady(window.__stage.voice.activeSpeech())), false, 'its Whisper is off until switched on')

  // voices: a chat on Voicebox's voice; Voicebox quits; the next line is a subtitle, not LivLiv's voice for points
  await page.evaluate(async () => { await window.__stage.talk.newChat(); await window.__stage.talk.startChat('private') })
  await said(1)
  assert.ok(await page.evaluate(() => window.vb.speaks) >= 1, 'said in Voicebox\'s voice')
  await page.evaluate(async () => { window.vb.up = false; await window.__stage.voice.detectVoicebox() })
  assert.equal(await page.evaluate(() => window.__stage.voice.voicebox().status), 'off')
  await page.evaluate(() => window.__stage.talk.say('继续说说'))
  await said(2)
  assert.deepEqual(paid, [], 'no LivLiv voice asked for')
  assert.match((await actor()).error, /声音接口停了，这句只出字幕/)
  await page.evaluate(() => window.__stage.talk.stop())

  // hearing: hands-free on Voicebox's Whisper (switched on); Voicebox quits: what you say goes nowhere that costs points
  const speak = async (ms) => {
    await page.evaluate(() => window.microphone.gain.gain.setValueAtTime(.12, window.microphone.context.currentTime)); await delay(ms)
    await page.evaluate(() => window.microphone.gain.gain.setValueAtTime(0, window.microphone.context.currentTime))
  }
  // the microphone's state, read synchronously (a wait's condition must not be a promise)
  await page.evaluate(async () => { window.pttState = (await import('/src/ptt.ts')).pttState })
  const ptt = () => page.evaluate(() => window.pttState())
  await page.evaluate(async () => {
    window.vb.up = true; await window.__stage.voice.detectVoicebox()
    const { saveSpeech, VOICEBOX_SPEECH } = await import('/src/voiceApi.ts')
    saveSpeech({ ...VOICEBOX_SPEECH, asr: 'whisper' })
    await window.__stage.talk.newChat(); await window.__stage.talk.startChat('private')
    await (await import('/src/ptt.ts')).setHandsFree(true)
  })
  await said(1)
  await page.waitForFunction(() => window.pttState().phase === 'armed')
  await speak(800)
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '我们聊聊天气'))
  await said(2)
  await page.evaluate(() => { window.vb.up = false })
  await page.waitForFunction(() => window.pttState().phase === 'armed')
  const heard = await page.evaluate(() => window.vb.transcribes)
  await speak(800)
  await page.waitForFunction((n) => window.vb.transcribes > n, heard)
  await page.waitForFunction(() => window.pttState().error !== '')
  assert.match((await ptt()).error, /Voicebox 没有在运行/)
  assert.deepEqual(paid, [], 'Voicebox gone: nothing sent to LivLiv\'s recognition')

  // your own recognition turned off mid-session, livliv.ai off: nothing can hear you, so hands-free stops at once and
  // says why, instead of turning to livliv.ai's
  await page.evaluate(async () => { const { saveSpeech, SPEECH_OFF } = await import('/src/voiceApi.ts'); saveSpeech(SPEECH_OFF) })
  await page.waitForFunction(() => !window.pttState().automatic)
  await speak(800)
  assert.match((await ptt()).error, /语音识别停了，已停止听你说话/)
  assert.deepEqual(paid, [], 'no LivLiv recognition')
  await page.evaluate(() => window.__stage.talk.stop())
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, chats: chats.length }))
} catch (error) {
  console.error(error); process.exitCode = 1
  const state = await page?.evaluate(async () => ({ conversation: window.__stage.conversation(), ptt: (await import('/src/ptt.ts')).pttState(), vb: window.vb })).catch(() => null)
  console.error('State:', JSON.stringify(state), 'paid:', JSON.stringify(paid), 'errors:', JSON.stringify(errors))
} finally { await browser?.close(); server?.kill() }
