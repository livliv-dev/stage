import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-handsfree-'))
const calls = [], recordings = [], errors = [], checks = []
let server, browser, page, transcript = '这是第一句', asrFailure = false, asrDelay = 0, voiceSeconds = .7
function wav(seconds) {
  const samples = Math.round(24000 * seconds), buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 24000 * 330 * Math.PI * 2) * 6000), 44 + i * 2)
  return buffer
}
const armed = () => page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'armed')
const waiting = (replied = true) => page.waitForFunction((replied) => { const conv = window.__stage.conversation(); return conv.waitingInput && !conv.speaking && !conv.thinking && (!replied || conv.lines.at(-1)?.human !== true) }, replied)
const until = async (condition) => { for (let i = 0; i < 1000; i++) { if (condition()) return; await delay(10) } assert.ok(condition(), 'fixture request arrived') }
const level = (value) => page.evaluate((value) => window.microphone.gain.gain.setValueAtTime(value, window.microphone.context.currentTime), value)
const speak = async (milliseconds) => { await level(.12); await delay(milliseconds); await level(0) }
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    window.microphones = []; window.microphoneConstraints = []; window.refuseMic = false; window.delayMic = false
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.microphoneConstraints.push(constraints)
      if (window.refuseMic) throw new DOMException('Fixture permission refused', 'NotAllowedError')
      if (window.delayMic) await new Promise((resolve) => { window.releaseMic = resolve })
      const context = new AudioContext(), gain = context.createGain(), wave = context.createOscillator(), destination = context.createMediaStreamDestination()
      gain.gain.value = 0; wave.frequency.value = 220; wave.connect(gain); gain.connect(destination); wave.start(); await context.resume()
      const microphone = { context, gain, stream: destination.stream, stops: 0 }
      const track = destination.stream.getAudioTracks()[0], stop = track.stop.bind(track)
      track.stop = () => { microphone.stops++; stop(); void context.close() }
      window.microphone = microphone; window.microphones.push(microphone)
      return microphone.stream
    }
    navigator.mediaDevices.enumerateDevices = async () => []
  })
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url())
    if (url.pathname === '/fixture/chat/completions') {
      calls.push(request.postDataJSON())
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '我们继续聊这个话题。', emotion: 'happy', action: 'nod' }) } }] } }); return
    }
    if (url.pathname === '/fixture/audio/speech') { await route.fulfill({ contentType: 'audio/wav', body: wav(voiceSeconds) }); return }
    if (url.pathname === '/fixture/audio/transcriptions') {
      const form = await new Request(request.url(), { method: request.method(), headers: request.headers(), body: request.postDataBuffer() }).formData()
      const audio = Buffer.from(await form.get('file').arrayBuffer())
      recordings.push({ rate: audio.readUInt32LE(24), channels: audio.readUInt16LE(22), bytes: audio.length })
      const result = transcript, failure = asrFailure
      if (asrDelay) await delay(asrDelay)
      await route.fulfill(failure ? { status: 503, json: { error: { message: 'Fixture ASR unavailable' } } } : { json: { text: result } }).catch(() => {}); return
    }
    if (url.pathname.startsWith('/api/')) { await route.fulfill({ json: { signed_in: false } }); return }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['blob:', 'data:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(15000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!window.__stage)
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), { fromPngs } = await import('/src/library.ts')
    const { saveBrainConfig } = await import('/src/brain.ts'), { saveSpeech } = await import('/src/voiceApi.ts')
    const canvas = new OffscreenCanvas(40, 60); canvas.getContext('2d').fillRect(0, 0, 40, 60)
    const blob = await canvas.convertToBlob(), pick = await fromPngs({ closed: new File([blob], 'closed.png'), open: new File([blob], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, ''); character.voice.source = 'api'; store.add(character)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture', key: 'fixture-only', model: 'fixture' })
    saveSpeech({ provider: 'openai', base: location.origin + '/fixture', key: 'fixture-only', model: 'fixture', voice: 'fixture', asr: 'fixture' })
    await window.__stage.talk.newChat()
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((actor) => actor.status === 'ready'))
  const toggle = page.getByRole('button', { name: '免按键语音', exact: true })
  const automatic = () => page.evaluate(async () => (await import('/src/ptt.ts')).pttState().automatic)
  assert.equal(await automatic(), false)
  // hands-free from the start: 你参与吗 免按键, then the start button; running, the console's toggle turns it off and on
  await page.locator('.console .start-rows').click()
  await page.locator('.popover.start-options .option-row').nth(2).getByRole('button', { name: '免按键', exact: true }).click()
  await page.locator('.popover.start-options button[data-close]').click()
  await page.locator('.console .start-button').click(); await armed(); await waiting()
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true')
  const initialCalls = calls.length
  await level(.003); await delay(300); await speak(80); await delay(400); await armed()
  assert.equal(recordings.length, 0); assert.equal(calls.length, initialCalls)
  checks.push('quiet input and short transients do not interrupt or call ASR')

  await speak(700)
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '这是第一句'))
  await armed(); await waiting()
  assert.equal(calls.length, initialCalls + 1)
  assert.equal(recordings.length, 1); assert.equal(recordings[0].rate, 16000); assert.equal(recordings[0].channels, 1); assert.ok(recordings[0].bytes > 20000)
  assert.equal(await page.evaluate(() => window.microphones.length), 1)
  checks.push('actual MediaRecorder audio → 16 kHz mono WAV → ASR → chat → TTS, reusing one microphone')

  voiceSeconds = 4; await page.evaluate(() => window.__stage.talk.say('请展开说说'))
  await page.waitForFunction(() => { const line = window.__stage.conversation().speaking; return line && !line.human })
  const beforeAck = calls.length; transcript = '嗯'
  await speak(300)
  await page.waitForFunction(() => !window.__stage.conversation().speaking)
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '嗯'))
  await armed(); await waiting(false); assert.equal(calls.length, beforeAck)
  checks.push('confirmed speech interrupts playback; a brief acknowledgement is archived without a new answer')

  voiceSeconds = .7; transcript = '换个话题'
  await speak(650)
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '换个话题'))
  await armed(); await waiting(); assert.equal(calls.length, beforeAck + 1)
  checks.push('the next real utterance starts exactly one new answer')

  asrDelay = 2200; transcript = '识别中继续说的第一句'
  const beforeOverlap = calls.length, beforeRecordings = recordings.length
  await speak(600); await until(() => recordings.length === beforeRecordings + 1)
  transcript = '识别中继续说的第二句'; await speak(600); await delay(900)
  assert.equal(calls.length, beforeOverlap, 'ASR never starts a reply over the next recording')
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.text === '识别中继续说的第一句'))
  assert.equal(calls.length, beforeOverlap, 'the first ASR result stays held while the second is pending')
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.text === '识别中继续说的第二句'))
  await armed(); await waiting()
  assert.equal(recordings.length, beforeRecordings + 2); assert.equal(calls.length, beforeOverlap + 1)
  const order = await page.evaluate(() => window.__stage.conversation().lines.filter((line) => line.text.startsWith('识别中继续说')).map((line) => line.text))
  assert.deepEqual(order, ['识别中继续说的第一句', '识别中继续说的第二句']); asrDelay = 0
  checks.push('slow ASR never stops recording the next utterance; FIFO transcripts produce one answer after input completes')

  await page.evaluate(() => window.__stage.talk.pause())
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true')
  await page.getByText('已暂停收音', { exact: true }).waitFor()
  await page.evaluate(() => window.__stage.talk.resume()); await armed()
  await page.evaluate(async () => (await import('/src/devices.ts')).setInput({ microphone: 'second-device' })); await armed()
  assert.equal(await page.evaluate(() => window.microphoneConstraints.at(-1).audio.deviceId.exact), 'second-device')
  assert.equal(await page.evaluate(() => window.microphoneConstraints.every((value) => value.audio.echoCancellation && value.audio.noiseSuppression)), true)
  checks.push('pause releases the microphone; resume and device changes open the selected device with echo cancellation')

  asrFailure = true; const beforeFailure = calls.length
  await speak(650); await page.getByText('这家服务暂时出问题了，稍后再试', { exact: true }).waitFor(); await armed()
  assert.equal(calls.length, beforeFailure)
  assert.ok(await page.getByText('这家服务暂时出问题了，稍后再试', { exact: true }).isVisible())
  checks.push('recognition failures remain visible while listening rearms')

  asrFailure = false; asrDelay = 1000; transcript = '这句取消后不应出现'
  const beforeCancel = recordings.length; await speak(650)
  await page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'recognizing')
  await until(() => recordings.length === beforeCancel + 1)
  await page.evaluate(async () => (await import('/src/mixer.ts')).setBus('microphone', { muted: true }))
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  await delay(1200)
  assert.equal(recordings.length, beforeCancel + 1)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some((line) => line.text === '这句取消后不应出现')), false)
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')
  checks.push('muting cancels recognition, closes the microphone and suppresses a late transcript')

  await page.evaluate(async () => (await import('/src/mixer.ts')).setBus('microphone', { muted: false }))
  asrDelay = 0; transcript = '手动语音'
  await toggle.click(); await armed(); await page.keyboard.down('Backquote')
  await page.waitForFunction(async () => { const state = (await import('/src/ptt.ts')).pttState(); return !state.automatic && state.phase === 'listening' })
  await speak(600); await page.keyboard.up('Backquote')
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '手动语音'))
  await waiting(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  checks.push('hold-to-talk explicitly takes over from hands-free mode')

  await toggle.click(); await armed()
  await page.setViewportSize({ width: 1100, height: 700 })
  assert.ok(await page.locator('.say-bar input').evaluate((element) => element.getBoundingClientRect().width >= 120))
  assert.equal(await page.locator('.say-bar').evaluate((element) => element.scrollWidth > element.clientWidth), false)
  await page.screenshot({ path: join(artifacts, 'handsfree-1100.png') })
  await page.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')
  checks.push('the compact console stays usable; Escape releases the microphone')

  await toggle.click(); await armed()
  await page.evaluate(async () => { const voice = await import('/src/voiceApi.ts'); window.savedSpeech = voice.loadSpeech(); voice.saveSpeech(voice.SPEECH_OFF) })
  await page.waitForFunction(async () => !(await import('/src/ptt.ts')).pttState().automatic)
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')
  await page.evaluate(async () => (await import('/src/voiceApi.ts')).saveSpeech(window.savedSpeech))
  checks.push('removing speech recognition automatically stops listening and never traps the close control')

  await page.evaluate(() => { window.delayMic = true }); await toggle.click()
  await page.waitForFunction(() => !!window.releaseMic); await toggle.click()
  await page.evaluate(() => { window.delayMic = false; window.releaseMic() }); await delay(150)
  assert.equal(await page.evaluate(() => window.microphones.every((microphone) => microphone.stream.getAudioTracks()[0].readyState === 'ended')), true)
  await page.evaluate(() => { window.refuseMic = true }); await toggle.click()
  await page.getByText(/Fixture permission refused/).waitFor(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  await page.evaluate(() => { window.refuseMic = false }); await toggle.click(); await armed()
  await page.evaluate(() => window.__stage.talk.stop())
  assert.equal(await automatic(), false); assert.equal(await toggle.count(), 0, 'no session: no hands-free toggle')
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')

  voiceSeconds = 5; transcript = '嗯'
  await page.evaluate(() => {
    const store = window.__stage.store; store.set({ talk: { ...store.get().talk, cutIn: false } })
    window.__stage.talk.startLive({ minutes: 1, maxGenerations: 10, warmupSeconds: 0, textOnly: false })
  })
  await page.waitForFunction(() => window.__stage.conversation().waitingAudience)
  await toggle.click(); await armed()
  await page.evaluate(() => window.__stage.talk.say('这是直播问题'))
  await page.waitForFunction(() => { const line = window.__stage.conversation().speaking; return line && !line.human })
  const beforeLiveAck = calls.length
  await speak(300)
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '嗯'))
  await armed(); await delay(300); assert.equal(calls.length, beforeLiveAck, 'live never regenerates the old answer after a brief acknowledgement')
  transcript = '直播里请换个解释'
  await page.evaluate(() => window.__stage.talk.say('这是直播的第二个问题'))
  await page.waitForFunction(() => { const line = window.__stage.conversation().speaking; return line && !line.human })
  await level(.12)
  await page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'listening')
  await page.waitForFunction(() => !window.__stage.conversation().speaking)
  await delay(250); await level(0)
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.text === '直播里请换个解释'))
  await page.evaluate(() => window.__stage.talk.stop())
  checks.push('automatic speech yields in live mode even when manual cut-in is disabled')

  asrDelay = 15000; transcript = '识别排队中的内容'
  await page.evaluate(() => window.__stage.talk.startChat())
  await toggle.click(); await armed()
  for (let index = 0; index < 5; index++) { await speak(350); await delay(900) }
  await page.getByText('识别暂时跟不上，请稍后重新开启免按键语音', { exact: true }).waitFor()
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  assert.equal(await page.evaluate(() => window.microphone.stream.getAudioTracks()[0].readyState), 'ended')
  await page.evaluate(() => window.__stage.talk.stop())
  checks.push('a stalled recognizer has a bounded queue, stops visibly and releases the microphone')
  await page.reload(); await page.waitForFunction(() => !!window.__stage)
  assert.equal(await automatic(), false); assert.equal(await toggle.count(), 0, 'reloaded: nothing runs, nothing listens')
  checks.push('late permission resolution, permission refusal, stop and reload never leave listening enabled')

  assert.deepEqual(errors, [])
  const report = { artifacts, checks, modelCalls: calls.length, recordings, errors }
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  const state = await page?.evaluate(async () => ({ input: (await import('/src/ptt.ts')).pttState(), conversation: window.__stage?.conversation(), microphone: window.microphoneConstraints })).catch(() => null)
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ checks, recordings, calls, state, errors, error: String(error) }, null, 2)); console.error(artifacts); throw error
} finally { await browser?.close(); server?.kill('SIGTERM') }
