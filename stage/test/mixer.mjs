import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-mixer-'))
let server, browser, page
const report = { artifacts }, errors = []
const range = (locator, value) => locator.evaluate((input, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(v)); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) }, value)
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (c) => { clearTimeout(timer); reject(new Error('Vite exited ' + c)) }) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/api/**', (route) => route.fulfill({ status: route.request().url().endsWith('/me') ? 200 : 404, json: { signed_in: false } }))
  await context.route('https://voice-fixture.test/**', (route) => route.fulfill({ json: { voices: [] } }))
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('http://127.0.0.1:' + port, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { fromPngs } = await import('/src/library.ts'), { emptyScene, newCharacter } = await import('/src/scene.ts'), { saveSpeech } = await import('/src/voiceApi.ts'), { wav16k } = await import('/src/audio.ts')
    const canvas = new OffscreenCanvas(80, 120), g = canvas.getContext('2d'); g.fillStyle = '#3388ee'; g.fillRect(0, 0, 80, 120)
    const png = await canvas.convertToBlob(), pick = await fromPngs({ closed: new File([png], 'closed.png'), open: new File([png], 'open.png') }, 'Mixer avatar'), s = window.__stage.store
    s.replace({ ...emptyScene(), width: 320, height: 240 }); const c = newCharacter(s.get(), pick.name, pick.model); c.lines = 'none'; c.tuning.idle = false; c.shadow = false; c.voice.source = 'api'; s.add(c); window.avatarId = c.id
    saveSpeech({ provider: 'custom', base: 'https://voice-fixture.test/v1', key: '', model: 'fixture', voice: 'fixture', asr: '' })
    const rate = 48000, pcm = new Float32Array(rate * 6)
    for (let i = 0; i < pcm.length; i++) pcm[i] = .4 * Math.sin(2 * Math.PI * 440 * i / rate)
    window.voiceClip = await wav16k(pcm, rate)
    const audio = new AudioContext(); await audio.resume()
    const make = (frequency, volume) => { const oscillator = audio.createOscillator(), gain = audio.createGain(), output = audio.createMediaStreamDestination(); oscillator.frequency.value = frequency; gain.gain.value = volume; oscillator.connect(gain); gain.connect(output); oscillator.start(); return { oscillator, gain, stream: output.stream } }
    const a = make(220, .3), b = make(880, .6), requests = [], pending = []
    window.fixture = { audio, a, b, requests, pending }
    navigator.mediaDevices.enumerateDevices = async () => ['', 'tone-b', 'slow', 'missing'].map((deviceId) => ({ deviceId, kind: 'audioinput', label: deviceId || 'Tone A', groupId: 'fixture' }))
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const id = typeof constraints.audio === 'object' ? constraints.audio.deviceId?.exact ?? '' : ''
      if (id === 'missing') throw new DOMException('Fixture device missing', 'NotFoundError')
      const clone = () => { const stream = (id === 'tone-b' || id === 'slow' ? b : a).stream.clone(); requests.push({ id, stream }); return stream }
      if (id === 'slow') return new Promise((resolve) => pending.push(() => resolve(clone())))
      return clone()
    }
    window.measure = async (stream) => {
      const ctx = new AudioContext(); await ctx.resume(); const source = ctx.createMediaStreamSource(stream), analyser = ctx.createAnalyser(); analyser.fftSize = 2048; source.connect(analyser)
      const samples = new Float32Array(2048); let squares = 0
      await new Promise((r) => setTimeout(r, 180))
      for (let n = 0; n < 5; n++) { analyser.getFloatTimeDomainData(samples); for (const v of samples) squares += v * v; await new Promise((r) => setTimeout(r, 20)) }
      source.disconnect(); analyser.disconnect(); await ctx.close(); return Math.sqrt(squares / (5 * samples.length))
    }
    window.decode = async (blob, times) => {
      const ctx = new AudioContext(), decoded = await ctx.decodeAudioData(await blob.arrayBuffer()), pcm = decoded.getChannelData(0), rate = decoded.sampleRate
      const result = times.map((at) => {
        const start = Math.round(at * rate), end = Math.min(pcm.length, start + Math.round(.1 * rate)); let squares = 0, crosses = 0
        for (let i = start; i < end; i++) { squares += pcm[i] * pcm[i]; if (i > start && (pcm[i] >= 0) !== (pcm[i - 1] >= 0)) crosses++ }
        return { rms: Math.sqrt(squares / (end - start)), frequency: crosses * rate / ((end - start) * 2) }
      })
      await ctx.close(); return result
    }
    window.playVoice = () => window.__stage.actors.get(window.avatarId).perform({ text: 'Fixture', seconds: 6, clip: { blob: window.voiceClip, seconds: 6, expression: null }, aloud: true }, 'neutral', 'none')
  })
  await page.waitForFunction(() => window.__stage.actors.get(window.avatarId)?.status === 'ready')
  const panel = page.locator('.mixer-panel')
  if (!process.env.STAGE_MIXER_LAYOUT_ONLY) {
  report.voices = await page.evaluate(async () => {
    const { setBus } = await import('/src/mixer.ts'), s = window.__stage.store, actor = window.__stage.actors.get(window.avatarId)
    actor.unlock(); void window.playVoice()
    const full = await window.measure(actor.audio)
    setBus('characters', { volume: .5 }); const half = await window.measure(actor.audio)
    s.patch(actor.item.id, { tuning: { ...actor.item.tuning, volume: .4 } }); const individual = await window.measure(actor.audio)
    setBus('characters', { muted: true }); const muted = await window.measure(actor.audio); actor.silence()
    s.patch(actor.item.id, { tuning: { ...actor.item.tuning, volume: 1 } }); setBus('characters', { volume: 1, muted: false })
    return { full, half, individual, muted }
  })
  assert.ok(report.voices.full > .2); assert.ok(Math.abs(report.voices.half / report.voices.full - .5) < .04); assert.ok(Math.abs(report.voices.individual / report.voices.full - .2) < .03); assert.ok(report.voices.muted < 1e-4)
  report.publish = await page.evaluate(async () => {
    const { PublishAudio } = await import('/src/collab/audio.ts'), { attachSound, removeSound } = await import('/src/collab/streams.ts'), { setBus } = await import('/src/mixer.ts')
    const pub = new PublishAudio(); await pub.context.resume(); const actor = window.__stage.actors.get(window.avatarId); pub.connectActor(actor); void window.playVoice()
    const voice = await window.measure(pub.stream); pub.connectActor(null); actor.silence()
    const remote = window.fixture.b.stream.clone(); attachSound('fixture-peer', remote)
    const noBackfeed = await window.measure(pub.stream)
    await pub.microphoneOn(true); const microphone = await window.measure(pub.stream)
    setBus('microphone', { volume: .5 }); const half = await window.measure(pub.stream)
    setBus('microphone', { muted: true }); const muted = await window.measure(pub.stream)
    setBus('microphone', { muted: false, volume: 2 }); const boosted = await window.measure(pub.stream)
    pub.close(); removeSound('fixture-peer'); remote.getTracks().forEach((t) => t.stop()); setBus('microphone', { volume: 1 })
    return { voice, noBackfeed, microphone, half, muted, boosted }
  })
  assert.ok(report.publish.voice > .2); assert.ok(report.publish.noBackfeed < 1e-4); assert.ok(Math.abs(report.publish.half / report.publish.microphone - .5) < .05); assert.ok(Math.abs(report.publish.boosted / report.publish.microphone - 2) < .1); assert.ok(report.publish.muted < 1e-4)

  report.voiceRecording = await page.evaluate(async () => {
    const { record } = await import('/src/tape.ts'), { renderTake } = await import('/src/render.ts'), { setBus } = await import('/src/mixer.ts'), { audioRms } = await import('/test/media.ts')
    const recorder = await record(false); void window.playVoice()
    await new Promise((r) => setTimeout(r, 500)); setBus('characters', { volume: .5 })
    await new Promise((r) => setTimeout(r, 500)); setBus('characters', { muted: true })
    await new Promise((r) => setTimeout(r, 500)); const take = await recorder.stop(); window.__stage.actors.get(window.avatarId).silence()
    const made = await renderTake(take, 'mixer-voices', () => {}, new AbortController().signal), rms = await audioRms(made.file, [.2, .75, 1.25])
    setBus('characters', { volume: 1, muted: false })
    return { rms, gain: take.clips[0].gain.map((p) => p.value), bytes: [...new Uint8Array(await made.file.arrayBuffer())] }
  })
  await writeFile(join(artifacts, 'mixer-voices.mp4'), new Uint8Array(report.voiceRecording.bytes)); delete report.voiceRecording.bytes
  assert.ok(report.voiceRecording.rms[0] > .2); assert.ok(Math.abs(report.voiceRecording.rms[1] / report.voiceRecording.rms[0] - .5) < .06); assert.ok(report.voiceRecording.rms[2] < .002)
  report.micRecording = await page.evaluate(async () => {
    const { record } = await import('/src/tape.ts'), { setBus } = await import('/src/mixer.ts')
    const r = await record(true)
    await new Promise((r) => setTimeout(r, 500)); setBus('microphone', { volume: .5 })
    await new Promise((r) => setTimeout(r, 500)); setBus('microphone', { muted: true })
    await new Promise((r) => setTimeout(r, 500)); const take = await r.stop(), values = await window.decode(take.mic.blob, [.2, .75, 1.25]); setBus('microphone', { volume: 1, muted: false }); return values
  })
  assert.ok(Math.abs(report.micRecording[1].rms / report.micRecording[0].rms - .5) < .06); assert.ok(report.micRecording[2].rms < .002)
  report.deviceSwitch = await page.evaluate(async () => {
    const { record } = await import('/src/tape.ts'), { setInput } = await import('/src/devices.ts')
    const r = await record(true), old = window.fixture.requests.at(-1).stream
    await new Promise((r) => setTimeout(r, 500)); setInput({ microphone: 'tone-b' })
    await new Promise((r) => setTimeout(r, 600)); const take = await r.stop(), values = await window.decode(take.mic.blob, [.2, .8])
    const oldEnded = old.getAudioTracks().every((t) => t.readyState === 'ended')
    setInput({ microphone: '' }); const failed = await record(true); setInput({ microphone: 'missing' }); await new Promise((r) => setTimeout(r, 100))
    const error = failed.inputError?.message; await failed.stop()
    setInput({ microphone: '' }); const late = await record(true); setInput({ microphone: 'slow' }); await new Promise((r) => setTimeout(r, 30)); late.cancel(); window.fixture.pending.splice(0).forEach((r) => r()); await new Promise((r) => setTimeout(r, 50))
    const lateEnded = window.fixture.requests.filter((r) => r.id === 'slow').every((r) => r.stream.getAudioTracks().every((t) => t.readyState === 'ended')); setInput({ microphone: '' })
    return { values, oldEnded, error, lateEnded }
  })
  assert.ok(Math.abs(report.deviceSwitch.values[0].frequency - 220) < 15); assert.ok(Math.abs(report.deviceSwitch.values[1].frequency - 880) < 15); assert.equal(report.deviceSwitch.oldEnded, true); assert.ok(report.deviceSwitch.error); assert.equal(report.deviceSwitch.lateEnded, true)
  report.friends = await page.evaluate(async () => {
    const { attachSound, removeSound, remoteSounds, volumeFor } = await import('/src/collab/streams.ts'), { setBus } = await import('/src/mixer.ts'), { record } = await import('/src/tape.ts'), { renderTake } = await import('/src/render.ts'), { audioRms } = await import('/test/media.ts')
    const stream = window.fixture.b.stream.clone(); attachSound('fixture-peer', stream); volumeFor('fixture-peer', .4); setBus('friends', { volume: .5 })
    const effective = remoteSounds()[0].volume, r = await record(false)
    await new Promise((r) => setTimeout(r, 500)); setBus('friends', { volume: 1 })
    await new Promise((r) => setTimeout(r, 500)); setBus('friends', { muted: true })
    await new Promise((r) => setTimeout(r, 500)); const take = await r.stop(); removeSound('fixture-peer'); stream.getTracks().forEach((t) => t.stop())
    const made = await renderTake(take, 'mixer-friends', () => {}, new AbortController().signal), rms = await audioRms(made.file, [.2, .75, 1.25]); setBus('friends', { volume: 1, muted: false })
    return { effective, rms, gain: take.remote[0].gain.map((p) => p.value), bytes: [...new Uint8Array(await made.file.arrayBuffer())] }
  })
  await writeFile(join(artifacts, 'mixer-friends.mp4'), new Uint8Array(report.friends.bytes)); delete report.friends.bytes
  assert.ok(Math.abs(report.friends.effective - .2) < 1e-6); assert.ok(Math.abs(report.friends.rms[1] / report.friends.rms[0] - 2) < .15); assert.ok(report.friends.rms[2] < .002)

  await page.getByRole('button', { name: '调音台', exact: true }).click()
  await panel.locator('.microphone-check > summary').click()
  await page.getByLabel('输入设备').selectOption('missing'); await panel.getByRole('button', { name: '测试麦克风', exact: true }).click(); await panel.getByRole('alert').waitFor()
  await page.getByLabel('输入设备').selectOption(''); await panel.getByRole('button', { name: '测试麦克风', exact: true }).click(); await panel.getByRole('button', { name: '校准麦克风', exact: true }).waitFor()
  await page.evaluate(() => { window.fixture.a.gain.gain.value = .001 })
  await panel.getByRole('button', { name: '校准麦克风', exact: true }).click(); await panel.getByText('用平常的声音说一句话', { exact: false }).waitFor(); await page.evaluate(() => { window.fixture.a.gain.gain.value = .3 })
  await panel.getByText('已校准', { exact: true }).waitFor()
  const calibrated = await page.evaluate(async () => (await import('/src/mixer.ts')).mixer().settings.microphone.volume)
  assert.ok(calibrated > .8 && calibrated < .9); report.calibration = calibrated
  await panel.getByRole('button', { name: '录三秒', exact: true }).click(); await panel.getByRole('button', { name: '回放', exact: true }).waitFor(); await page.waitForFunction(() => !document.querySelector('.microphone-check button:last-child')?.disabled)
  await panel.getByRole('button', { name: '回放', exact: true }).click()
  await panel.locator('button[data-close]').click()
  assert.equal(await page.evaluate(() => window.fixture.requests.every((r) => r.stream.getAudioTracks().every((t) => t.readyState === 'ended'))), true)

  // A cancelled/removed audition cannot reopen the old actor after its provider responds.
  await page.getByRole('button', { name: '调音台', exact: true }).click(); await panel.locator('.individual-mix > summary').first().click()
  await page.evaluate(() => { window.oldActor = window.__stage.actors.get(window.avatarId); window.oldActor.prepare = () => new Promise((resolve) => { window.releasePreview = () => resolve({ text: 'Late', seconds: 6, clip: { blob: window.voiceClip, seconds: 6, expression: null }, aloud: true }) }) })
  await panel.getByRole('button', { name: '试听 Mixer avatar', exact: true }).click(); await panel.getByRole('button', { name: '停止试听', exact: true }).waitFor()
  await page.evaluate(() => window.__stage.store.remove(window.avatarId)); await page.waitForFunction(() => !window.__stage.actors.has(window.avatarId)); await page.evaluate(() => window.releasePreview()); await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => window.oldActor.audio === null), true)
  await page.evaluate(async () => window.oldActor.perform({ text: 'Late', seconds: 6, clip: { blob: window.voiceClip, seconds: 6, expression: null }, aloud: true }, 'neutral', 'none'))
  assert.equal(await page.evaluate(() => window.oldActor.audio === null), true); report.audition = 'deleting the target cancels a late audition; a disposed actor cannot reopen audio'

  await page.evaluate(() => window.__stage.store.undo()); await page.waitForFunction(() => window.__stage.actors.get(window.avatarId)?.status === 'ready')
  } else {
    await page.getByRole('button', { name: '调音台', exact: true }).click()
    await panel.locator('.individual-mix > summary').first().click()
  }
  await panel.locator('.microphone-check > summary').click()
  await range(panel.getByLabel('我的麦克风音量', { exact: true }), .84)
  await range(panel.getByLabel('角色声音音量', { exact: true }), .65)
  for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ja']) {
    await page.evaluate(async (value) => (await import('/src/i18n.ts')).setLocale(value), locale)
    await page.setViewportSize({ width: 1100, height: 700 }); await page.screenshot({ path: join(artifacts, 'mixer-' + locale + '.png') })
    assert.equal(await panel.evaluate((e) => e.scrollWidth > e.clientWidth), false)
    const spacing = await page.evaluate(() => ({ arrow: document.querySelector('.scene-switcher > button').getBoundingClientRect().right, modeLeft: document.querySelector('.seg.mode').getBoundingClientRect().left, modeRight: document.querySelector('.seg.mode').getBoundingClientRect().right, right: document.querySelector('.topbar .right').getBoundingClientRect().left }))
    assert.ok(spacing.arrow + 3 < spacing.modeLeft, JSON.stringify(spacing)); assert.ok(spacing.modeRight + 3 < spacing.right, JSON.stringify(spacing))
    assert.equal(await panel.locator('input[type=range]').first().evaluate((e) => getComputedStyle(e).getPropertyValue('--p').trim()), '42%')

  }
  assert.deepEqual(errors, []); report.errors = errors; await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) { await writeFile(join(artifacts, 'partial.json'), JSON.stringify(report, null, 2)); console.error(error); console.error(artifacts); await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}); process.exitCode = 1 }
finally { await browser?.close(); server?.kill('SIGTERM') }
