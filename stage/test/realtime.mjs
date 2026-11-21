import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { testTimeout } from './vite.mjs'

// Run with an existing local Vite server. The SDP endpoint and the other WebRTC peer are fixtures, never paid services.
const origin = process.env.STAGE_TEST_URL || 'http://127.0.0.1:5244'
const provider = process.env.REALTIME_TEST_PROVIDER === 'openai' ? 'openai' : 'qwen'
const transcriptEvent = provider === 'openai' ? 'response.output_audio_transcript.delta' : 'response.audio_transcript.delta'
const artifacts = await mkdtemp(join(tmpdir(), 'livliv-realtime-browser-'))
const microphoneFile = join(artifacts, 'microphone.wav'), rate = 48000, samples = rate * 2, wav = Buffer.alloc(44 + samples * 2)
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40)
for (let index = 0; index < samples; index++) wav.writeInt16LE(Math.round(Math.sin(index / rate * 220 * 2 * Math.PI) * 9000), 44 + index * 2)
await writeFile(microphoneFile, wav)
const browser = await chromium.launch({ args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${microphoneFile}`] })
const errors = [], legacyCalls = []
let page
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] })
  await context.addInitScript(({ provider }) => {
    localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
    const NativePeer = RTCPeerConnection
    window.RTCPeerConnection = class extends NativePeer { constructor(...args) { super(...args); window.__clientPeer = this } }
    window.__voiceFixture = { configurations: [], clientEvents: [], microphoneStops: 0, peer: null, channel: null, input: null, gain: null, context: null }
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await capture(constraints), track = stream.getAudioTracks()[0], stop = track.stop.bind(track)
      window.__voiceFixture.rawMicrophone = stream
      track.stop = () => { window.__voiceFixture.microphoneStops++; stop() }
      return stream
    }
    window.__voiceFixture.accept = async (sdp) => {
      const f = window.__voiceFixture, peer = f.peer = new NativePeer(), audio = f.context = new AudioContext()
      f.offer = sdp
      const output = audio.createMediaStreamDestination(), wave = audio.createOscillator(), gain = f.gain = audio.createGain()
      wave.frequency.value = 330; gain.gain.value = 0; wave.connect(gain); gain.connect(output); wave.start(); await audio.resume()
      const rawSource = audio.createMediaStreamSource(f.rawMicrophone), rawMeter = f.rawMeter = audio.createAnalyser(), rawSink = audio.createGain()
      rawSink.gain.value = 0; rawSource.connect(rawMeter); rawMeter.connect(rawSink); rawSink.connect(audio.destination)
      peer.ontrack = ({ track, streams }) => {
        const stream = streams[0] ?? new MediaStream([track])
        const receiver = f.remoteAudio = new Audio(); receiver.srcObject = stream; receiver.muted = true; void receiver.play()
        const source = audio.createMediaStreamSource(stream), analyser = f.input = audio.createAnalyser()
        source.connect(analyser)
        const silent = audio.createGain(); silent.gain.value = 0; analyser.connect(silent); silent.connect(audio.destination)
      }
      await peer.setRemoteDescription({ type: 'offer', sdp })
      peer.addTrack(output.stream.getAudioTracks()[0], output.stream)
      const bind = (channel) => {
        f.channel = channel
        let opened = false
        channel.onopen = () => { if (!opened) { opened = true; channel.send(JSON.stringify({ type: 'session.created' })) } }
        channel.onmessage = ({ data }) => {
          const event = JSON.parse(data); f.clientEvents.push(event)
          if (event.type === 'session.update') { f.configurations.push(event.session); channel.send(JSON.stringify({ type: 'session.updated' })) }
        }
        if (channel.readyState === 'open') channel.onopen()
      }
      if (provider === 'openai') peer.ondatachannel = ({ channel }) => bind(channel)
      else bind(peer.createDataChannel('txt'))
      await peer.setLocalDescription(await peer.createAnswer())
      if (peer.iceGatheringState !== 'complete') await new Promise((resolve) => peer.addEventListener('icegatheringstatechange', () => { if (peer.iceGatheringState === 'complete') resolve() }))
      f.answer = peer.localDescription.sdp
      return f.answer
    }
    window.__voiceFixture.send = (event) => window.__voiceFixture.channel.send(JSON.stringify(event))
    window.__voiceFixture.inputLevel = () => {
      const analyser = window.__voiceFixture.input
      if (!analyser) return 0
      const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data)
      return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
    }
  }, { provider })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(10000))
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (['/fixture-realtime/api/v1/webrtc/realtime', '/fixture-realtime/v1/realtime/calls'].includes(url.pathname)) {
      let offer = route.request().postData()
      if (provider === 'openai') {
        const request = new Request(url, { method: 'POST', headers: route.request().headers(), body: route.request().postDataBuffer() })
        const form = await request.formData(); offer = String(form.get('sdp'))
        assert.equal(JSON.parse(String(form.get('session'))).type, 'realtime')
      }
      const answer = await page.evaluate((offer) => window.__voiceFixture.accept(offer), offer)
      await route.fulfill({ status: 200, contentType: 'application/sdp', body: answer }); return
    }
    if (/chat\/completions|audio\/transcriptions|audio\/speech|SpeechSynthesizer/.test(url.pathname)) {
      legacyCalls.push(url.pathname); await route.fulfill({ status: 500 }); return
    }
    if (url.pathname.startsWith('/api/')) { await route.fulfill({ json: { signed_in: false } }); return }
    if (url.origin === new URL(origin).origin || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  await page.goto(origin)
  await page.waitForFunction(() => !!window.__stage)
  const id = await page.evaluate(async () => {
    const { fromPngs } = await import('/src/library.ts'), { newCharacter, emptyScene, store } = await import('/src/scene.ts')
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#eac3ce'; ctx.fillRect(0, 0, 128, 128)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve)), file = new File([blob], 'fixture.png', { type: 'image/png' })
    const pick = await fromPngs({ closed: file, open: file }, '实时测试角色')
    const scene = emptyScene(), character = newCharacter(scene, pick.name, pick.model, '你是温和、好奇的朋友。')
    character.reactions = { ...character.reactions, cooldownSeconds: 0 }; store.replace({ ...scene, items: [character] }); store.select(character.id)
    return character.id
  })
  try { await page.waitForFunction((id) => window.__stage?.actors.get(id)?.status === 'ready', id) }
  catch (error) {
    console.log('Actor setup:', await page.evaluate(() => ({ actors: window.__stage && [...window.__stage.actors.values()].map((actor) => ({ id: actor.item.id, status: actor.status, error: actor.error })), body: document.body.innerText.slice(-1200) })), errors)
    throw error
  }
  // 实时通话 is 和角色聊天's other way: its row in the checklist goes to its setting, and once set up opens its card
  const checklist = page.locator('.popover.checklist'), callRow = checklist.locator('li.check').filter({ hasText: '实时通话' })
  await page.locator('.status-line .st-tag').filter({ hasText: '准备清单' }).click()
  await callRow.getByRole('button', { name: '去设置', exact: true }).click()
  const panel = page.locator('.realtime-settings')
  const modelSettings = page.locator('.settings'), modelForm = modelSettings.locator('.realtime-model-form')
  await modelForm.getByLabel('实时语音服务', { exact: true }).selectOption(provider)
  await modelForm.getByLabel('接口地址', { exact: true }).fill(origin + '/fixture-realtime' + (provider === 'openai' ? '/v1' : ''))
  await modelForm.getByLabel('密钥', { exact: true }).fill('fixture-only')
  // saved from the checklist: back there, the row ready; it now opens the call's card
  await modelForm.getByRole('button', { name: '保存', exact: true }).click()
  await modelSettings.waitFor({ state: 'detached' }); await checklist.waitFor()
  await callRow.and(page.locator('.ok')).waitFor()
  await callRow.getByRole('button', { name: '去设置', exact: true }).click()
  await panel.waitFor()
  for (const [width, height] of [[1440, 900], [768, 900], [430, 820]]) {
    await page.setViewportSize({ width, height })
    const box = await panel.boundingBox()
    await page.screenshot({ path: join(artifacts, `voice-panel-${width}.png`) })
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= height, `panel fits ${width}: ${JSON.stringify(box)}`)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.evaluate(() => { window.__speechEvents = []; window.__stage.talk.onSpeech((event) => window.__speechEvents.push(event)) })
  await page.evaluate(async () => {
    const { Actor } = await import('/src/actors.ts'), react = Actor.prototype.react
    window.__reactionEvents = []
    Actor.prototype.react = function(cue, planned) { const applied = react.call(this, cue, planned); if (applied) window.__reactionEvents.push(cue); return applied }
  })
  await panel.getByRole('button', { name: '开始实时语音', exact: true }).click()
  await page.evaluate(async () => { window.__realtimeModule = await import('/src/realtime.ts') })
  try {
    await page.waitForFunction(() => ['listening', 'error'].includes(window.__realtimeModule.realtimeState().phase))
    assert.equal(await page.evaluate(() => window.__realtimeModule.realtimeState().phase), 'listening')
  }
  catch (error) {
    console.log('Connection setup:', await page.evaluate(() => ({ state: window.__realtimeModule.realtimeState(), conversation: { error: window.__stage.conversation().error, running: window.__stage.conversation().running }, peer: window.__voiceFixture.peer?.connectionState, channel: window.__voiceFixture.channel?.readyState, events: window.__voiceFixture.clientEvents.map((event) => event.type), microphoneStops: window.__voiceFixture.microphoneStops, offerCandidates: window.__voiceFixture.offer?.match(/^a=candidate.*$/gm)?.length, answerCandidates: window.__voiceFixture.answer?.match(/^a=candidate.*$/gm)?.length })), errors)
    throw error
  }
  assert.equal(await page.evaluate(() => window.__voiceFixture.configurations.length), 1)
  try { await page.waitForFunction(() => window.__voiceFixture.inputLevel() > .005, null, { timeout: 5000 }) }
  catch (error) {
    console.log('Input level:', await page.evaluate(async () => { const data = new Float32Array(window.__voiceFixture.rawMeter.fftSize); window.__voiceFixture.rawMeter.getFloatTimeDomainData(data); return { rawRms: Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length), level: window.__voiceFixture.inputLevel(), audioState: window.__voiceFixture.context?.state, mixer: (await import('/src/mixer.ts')).mixer().settings.microphone, rawTrack: window.__voiceFixture.rawMicrophone?.getAudioTracks().map((track) => ({ enabled: track.enabled, muted: track.muted, state: track.readyState })), senders: window.__clientPeer.getTransceivers().map((item) => ({ direction: item.currentDirection, track: item.sender.track && { enabled: item.sender.track.enabled, muted: item.sender.track.muted, state: item.sender.track.readyState } })), stats: [...(await window.__voiceFixture.peer.getStats()).values()].filter((stat) => stat.type === 'inbound-rtp').map((stat) => ({ kind: stat.kind, packetsReceived: stat.packetsReceived, audioLevel: stat.audioLevel, totalAudioEnergy: stat.totalAudioEnergy })), source: [...(await window.__clientPeer.getStats()).values()].filter((stat) => stat.type === 'media-source').map((stat) => ({ kind: stat.kind, audioLevel: stat.audioLevel, totalAudioEnergy: stat.totalAudioEnergy })) } }))
    throw error
  }
  await page.evaluate(async () => { const { record } = await import('/src/tape.ts'); window.__recordedCall = await record(false) })
  const send = async (event) => page.evaluate((event) => window.__voiceFixture.send(event), event)
  await send({ type: 'response.created', response: { id: 'r1' } })
  await page.evaluate(() => { window.__voiceFixture.gain.gain.value = .2 })
  await page.waitForFunction((id) => window.__stage.actors.get(id).speaking, id)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.length), 0, 'audio starts before transcript or response completion')
  await send({ type: transcriptEvent, response_id: 'r1', item_id: 'a1', delta: '你好，' })
  await page.waitForFunction(() => window.__stage.conversation().speaking?.text === '你好，')
  await send({ type: transcriptEvent, response_id: 'r1', item_id: 'a1', delta: '我们继续聊吧。' })
  await page.waitForFunction(() => window.__stage.conversation().speaking?.text === '你好，我们继续聊吧。')
  const direction = { type: 'response.function_call_arguments.done', response_id: 'r1', call_id: 'reaction-one', name: 'stage_reaction', arguments: JSON.stringify({ who: '实时测试角色', when: 'speaking', feeling: 'curious', action: 'tilt', strength: 0.6, duration: 1 }) }
  await send(direction)
  await page.waitForFunction(() => window.__reactionEvents.length === 1)
  await send({ type: 'response.output_item.done', response_id: 'r1', item: { type: 'function_call', call_id: direction.call_id, name: direction.name, arguments: direction.arguments } })
  await page.waitForTimeout(80)
  assert.equal(await page.evaluate(() => window.__reactionEvents.length), 1, 'duplicate tool event variants apply one reaction')
  await send({ type: 'input_audio_buffer.speech_started', item_id: 'u1' })
  await page.waitForFunction((id) => !window.__stage.actors.get(id).speaking, id)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.find((line) => line.id === 'rt:a1').cut), true)
  assert.equal(await page.evaluate(() => window.__voiceFixture.clientEvents.some((event) => event.type === 'response.cancel')), provider === 'qwen')
  await send({ type: transcriptEvent, response_id: 'r1', item_id: 'a1', delta: '这段已经取消，不应继续出现' })
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some((line) => line.text.includes('不应继续出现'))), false)
  await page.evaluate(() => { window.__voiceFixture.gain.gain.value = 0 })
  await send({ type: 'response.done', response: { id: 'r1', status: 'cancelled' } })
  await send({ ...direction, call_id: 'late-cancelled-direction' })
  await page.waitForTimeout(80)
  assert.equal(await page.evaluate(() => window.__reactionEvents.length), 1, 'cancelled responses cannot apply late directions')

  await send({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: '等一下，我们换个话题。' })
  await send({ type: 'input_audio_buffer.speech_stopped', item_id: 'u1' })
  await send({ type: 'input_audio_buffer.committed', item_id: 'u1' })
  await send({ type: 'response.created', response: { id: 'tool-only' } })
  await send({ ...direction, response_id: 'tool-only', call_id: 'tool-before-voice' })
  await send({ type: 'response.done', response: { id: 'tool-only', status: 'completed' } })
  await page.waitForFunction(() => window.__voiceFixture.clientEvents.some(event => event.type === 'response.create'))
  const continuation = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').at(-1))
  assert.equal(continuation.response?.tool_choice, provider === 'openai' ? 'none' : undefined)
  assert.equal(await page.evaluate(() => window.__speechEvents.filter(event => event.final === true).length), 1, 'a tool-only response is not a fictitious cancelled speech turn')
  await send({ type: 'input_audio_buffer.speech_started', item_id: 'continuation-cut' })
  await send({ type: 'response.created', response: { id: 'obsolete-continuation', metadata: continuation.response?.metadata } })
  await send({ type: transcriptEvent, response_id: 'obsolete-continuation', item_id: 'obsolete-caption', delta: '已经被插话取消的续播' })
  await send({ ...direction, response_id: 'obsolete-continuation', call_id: 'obsolete-reaction' })
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some(line => line.text.includes('取消的续播'))), false)
  assert.equal(await page.evaluate(() => window.__reactionEvents.length), 2, 'pending continuation cancellation suppresses its late direction')
  await send({ type: 'response.done', response: { id: 'obsolete-continuation', status: 'cancelled' } })
  await send({ type: 'input_audio_buffer.speech_stopped', item_id: 'continuation-cut' })
  await send({ type: 'input_audio_buffer.committed', item_id: 'continuation-cut' })
  await send({ type: 'response.created', response: { id: 'r2' } })
  await send({ type: 'output_audio_buffer.started', response_id: 'r2' })
  await page.evaluate(() => { window.__voiceFixture.gain.gain.value = .2 })
  await page.waitForFunction((id) => window.__stage.actors.get(id).speaking, id)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some((line) => line.id === 'rt:a2')), false, 'second response also starts before its transcript')
  await send({ type: transcriptEvent, response_id: 'r2', item_id: 'a2', delta: '好呀，我们聊聊新的话题。' })
  await send({ type: transcriptEvent, response_id: 'r1', item_id: 'a1', delta: '上一轮迟到的字幕' })
  await page.waitForTimeout(80)
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking.text), '好呀，我们聊聊新的话题。')
  await send({ type: 'response.done', response: { id: 'r2', status: 'completed' } })
  await send({ type: 'output_audio_buffer.stopped', response_id: 'r1' })
  await page.waitForTimeout(80)
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking.text), '好呀，我们聊聊新的话题。', 'a stale audio stop cannot finish the new response')

  await page.evaluate(async () => (await import('/src/mixer.ts')).setBus('microphone', { muted: true }))
  await page.waitForFunction(() => window.__voiceFixture.inputLevel() < .002)
  assert.equal(await page.evaluate((id) => window.__stage.actors.get(id).speaking, id), true, 'microphone mute does not mute the character')
  await page.evaluate(async () => (await import('/src/mixer.ts')).setBus('microphone', { muted: false }))
  await page.waitForFunction(() => window.__voiceFixture.inputLevel() > .005)
  await page.waitForTimeout(1000)
  await page.evaluate(() => { window.__voiceFixture.gain.gain.value = 0 })
  await send({ type: 'response.done', response: { id: 'r2', status: 'completed' } })
  await page.waitForTimeout(750)
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking?.id), 'rt:a2', 'a pause within buffered audio cannot end the response before playback stops')
  await send({ type: 'output_audio_buffer.stopped', response_id: 'r2' })
  await page.waitForFunction(() => window.__stage.conversation().speaking === null)
  await page.waitForTimeout(500)
  // A cancelled response can finish after its replacement was requested. Its terminal event must not cancel that replacement.
  await send({ type: 'response.created', response: { id: 'old-before-new' } })
  const clearsBeforeNew = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'output_audio_buffer.clear').length)
  await page.evaluate(() => window.__stage.talk.say('接着刚才的话题'))
  if (provider === 'openai') await page.waitForFunction(count => window.__voiceFixture.clientEvents.filter(event => event.type === 'output_audio_buffer.clear').length > count, clearsBeforeNew)
  const cancelCount = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.cancel').length)
  await send({ type: 'response.done', response: { id: 'old-before-new', status: 'cancelled' } })
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.cancel').length), cancelCount, 'an old terminal event cannot cancel the new pending response')
  await send({ type: 'response.created', response: { id: 'replacement' } })
  await send({ ...direction, response_id: 'replacement', call_id: 'next-pending-tool' })
  const createsBeforeNext = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').length)
  await send({ type: 'response.done', response: { id: 'replacement', status: 'completed' } })
  await page.waitForFunction(count => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').length > count, createsBeforeNext)
  const beforeNext = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').at(-1))
  await page.evaluate(() => window.__stage.talk.next())
  await send({ type: 'response.created', response: { id: 'late-after-next', metadata: beforeNext.response?.metadata } })
  await send({ type: transcriptEvent, response_id: 'late-after-next', item_id: 'next-caption', delta: '跳过之后不应再说话' })
  await page.waitForTimeout(100)
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking), null, 'Next invalidates a pending continuation')
  if (provider === 'openai') assert.equal(await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.cancel').at(-1).response_id), 'late-after-next', 'a stale response is cancelled by ID')
  await send({ type: 'response.done', response: { id: 'late-after-next', status: 'cancelled' } })

  // A busy manual create and an already-known response terminal jointly release the cancellation gate.
  await send({ type: 'response.created', response: { id: 'busy-old' } })
  await page.evaluate(() => window.__stage.talk.say('换一个问题'))
  const busyCreate = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').at(-1))
  await page.evaluate(() => window.__stage.talk.next())
  await send({ type: 'error', error: { event_id: busyCreate.event_id, code: 'conversation_already_has_active_response' } })
  await send({ type: 'response.done', response: { id: 'busy-old', status: 'cancelled' } })
  const createsAfterBusy = await page.evaluate(() => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').length)
  await page.evaluate(() => window.__stage.talk.say('继续聊天'))
  await page.waitForFunction(count => window.__voiceFixture.clientEvents.filter(event => event.type === 'response.create').length > count, createsAfterBusy)
  await send({ type: 'response.created', response: { id: 'after-busy' } })
  await send({ type: 'response.done', response: { id: 'after-busy', status: 'completed' } })
  await send({ type: 'output_audio_buffer.stopped', response_id: 'after-busy' })
  await send({ type: 'response.created', response: { id: 'transcript-only' } })
  await send({ type: transcriptEvent, response_id: 'transcript-only', item_id: 'caption-only', delta: '当前这轮没有实际音频。' })
  await send({ type: transcriptEvent, response_id: 'r2', item_id: 'a2', delta: '已完成轮次的迟到字幕' })
  await send({ type: 'response.done', response: { id: 'transcript-only', status: 'completed' } })
  await send({ type: 'output_audio_buffer.stopped', response_id: 'r2' })
  await page.waitForTimeout(80)
  assert.equal(await page.evaluate(() => window.__stage.conversation().speaking.text), '当前这轮没有实际音频。')
  const finalsBeforeTextOnlyEnd = await page.evaluate(() => window.__speechEvents.filter(event => event.final).length)
  await send({ type: 'output_audio_buffer.stopped', response_id: 'transcript-only' })
  await page.waitForFunction(() => !window.__stage.conversation().speaking)
  assert.equal(await page.evaluate(() => window.__speechEvents.filter(event => event.final).length), finalsBeforeTextOnlyEnd, 'a caption without actual audio does not publish a fictitious speech event')
  await send({ type: 'input_audio_buffer.speech_started', item_id: 'u2' })
  assert.equal(await page.evaluate(() => !!window.__stage.conversation().lines.find((line) => line.id === 'rt:a2').cut), false, 'normal next turn does not mark a finished response interrupted')
  await panel.getByRole('button', { name: '暂停', exact: true }).click()
  await page.waitForFunction(() => window.__voiceFixture.inputLevel() < .002)
  await panel.getByRole('button', { name: '继续', exact: true }).click()
  await page.waitForFunction(() => window.__voiceFixture.inputLevel() > .005)
  await panel.getByRole('button', { name: '结束通话', exact: true }).click()
  await page.waitForFunction(() => !window.__stage.conversation().running)
  const result = await page.evaluate(async (id) => {
    const take = await window.__recordedCall.stop(), track = take.tracks.get(id)
    const audio = new AudioContext(), buffer = await audio.decodeAudioData(await take.remote[0].blob.arrayBuffer())
    const samples = buffer.getChannelData(0), rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
    await audio.close(); window.__voiceFixture.peer.close(); await window.__voiceFixture.context.close()
    return { audioRms: rms, audioClips: take.remote.length, frames: track.poses.length, maxMouth: Math.max(...track.poses.map((pose) => pose.params[track.keys.indexOf('mouthOpen')])), cuts: take.cuts.length, microphoneStops: window.__voiceFixture.microphoneStops }
  }, id)
  assert.equal(result.audioClips, 1); assert.ok(result.audioRms > .01); assert.ok(result.frames > 20); assert.ok(result.maxMouth > .02); assert.equal(result.cuts, 0); assert.equal(result.microphoneStops, 1)
  const speechEvents = await page.evaluate(() => window.__speechEvents.filter((event) => event.final === true))
  assert.deepEqual(speechEvents.map((event) => event.cancelled), [true, false], 'one final event per turn distinguishes interruption from completion')
  const savedId = await page.evaluate(() => window.__stage.conversation().sessionId)
  const persisted = await page.evaluate(async (id) => { const { memory } = await import('/src/memory.ts'); return (await memory.session(id)).lines }, savedId)
  assert.equal(persisted.find((line) => line.id === 'rt:a1').cut, true)
  assert.equal(persisted.find((line) => line.id === 'rt:a2').cut, false)
  await page.evaluate(async (id) => {
    const { memory } = await import('/src/memory.ts'), { chatHistory } = await import('/src/chatHistory.ts')
    const character = window.__stage.actors.get(id).item, profileId = character.profileId ?? character.id
    const privateMemory = await memory.remember({ profileId, scope: 'private', text: 'private-fixture-secret' })
    await memory.remember({ profileId, scope: 'public', text: 'public-fixture-fact' })
    window.__memoryFixture = { privateId: privateMemory.id, profileId }
    const session = { id: 'fixture-older-private', profileIds: [profileId], scope: 'private', title: 'earlier conversation', updatedAt: Date.now() + 100, revision: 1,
      lines: Array.from({ length: 20 }, (_, index) => ({ id: 'older-' + index, who: 'me', name: '我', text: index === 0 ? 'first-detail-outside-fourteen-lines' : 'earlier turn ' + index, emotion: 'neutral', action: 'none', to: null, human: true })) }
    session.summary = { text: 'earlier-summary-fixture', sourceIds: session.lines.slice(0, 4).map((line) => line.id), memoryIds: [], memoryRevision: (await memory.context([profileId], 'private')).revision }
    await memory.saveSession(session); chatHistory.reset()
  }, id)
  // the scope comes from the console's tag
  assert.equal(await page.evaluate(() => window.__stage.talk.setScope('private')), true)
  await page.locator('.console .scope-tag').filter({ hasText: '私聊' }).waitFor()
  await panel.getByRole('button', { name: '开始实时语音', exact: true }).click()
  await page.waitForFunction(() => window.__realtimeModule.realtimeState().phase === 'listening')
  const privateSeed = await page.evaluate(() => window.__voiceFixture.clientEvents.filter((event) => event.type === 'conversation.item.create').at(-1).item.content[0].text)
  assert.ok(privateSeed.includes('private-fixture-secret') && privateSeed.includes('public-fixture-fact') && privateSeed.includes('earlier-summary-fixture') && privateSeed.includes('earlier turn 4'), 'same archive, recap and all accessible memories seed a private call')
  assert.equal(await page.evaluate(() => window.__voiceFixture.configurations.at(-1).instructions.includes('private-fixture-secret')), false, 'stored content never becomes system instructions')
  await page.evaluate(async () => { const { memory } = await import('/src/memory.ts'); await memory.editMemory(window.__memoryFixture.privateId, { text: 'corrected-secret' }) })
  await page.waitForFunction(() => !window.__stage.conversation().running)
  assert.ok(await page.evaluate(() => window.__stage.conversation().ended.includes('记忆已更新')))
  await page.evaluate(async () => { window.__voiceFixture.peer.close(); await window.__voiceFixture.context.close() })
  // an output comes on during a private call: the provider holds private context, so the call ends
  await panel.getByRole('button', { name: '开始实时语音', exact: true }).click()
  await page.waitForFunction(() => window.__realtimeModule.realtimeState().phase === 'listening' && window.__stage.conversation().scope === 'private')
  await page.evaluate(() => { const output = window.__outputProbe = new BroadcastChannel('livliv-stage'); output.postMessage({ t: 'hello' }) })
  await page.waitForFunction(() => !window.__stage.conversation().running && window.__stage.conversation().ended.includes('私聊通话已结束'))
  await page.evaluate(async () => { window.__outputProbe.postMessage({ t: 'bye' }); window.__outputProbe.close(); window.__voiceFixture.peer.close(); await window.__voiceFixture.context.close() })
  await page.waitForFunction(() => !window.__stage.conversation().output)
  assert.equal(await page.evaluate(() => window.__stage.talk.setScope('public')), true)
  await panel.getByRole('button', { name: '开始实时语音', exact: true }).click()
  await page.waitForFunction(() => window.__realtimeModule.realtimeState().phase === 'listening')
  assert.equal(await page.evaluate(() => window.__stage.talk.externalEvent({ id: 'wrong-character', character: 'another-character', source: 'fixture', message: 'do not redirect this event', reply: 'always' })), false)
  const publicSeed = await page.evaluate(() => window.__voiceFixture.clientEvents.filter((event) => event.type === 'conversation.item.create').at(-1).item.content[0].text)
  assert.ok(publicSeed.includes('public-fixture-fact') && !publicSeed.includes('secret') && !publicSeed.includes('earlier turn'), 'public calls exclude private memories and transcripts')
  await page.evaluate(async () => { const { memory } = await import('/src/memory.ts'); await memory.deleteSession(window.__stage.conversation().sessionId) })
  await page.waitForFunction(() => !window.__stage.conversation().running)
  assert.ok(await page.evaluate(() => window.__stage.conversation().ended.includes('对话记录已删除')))
  await page.evaluate(async () => { window.__voiceFixture.peer.close(); await window.__voiceFixture.context.close() })
  await page.evaluate(async () => {
    const { chatHistory } = await import('/src/chatHistory.ts')
    window.__historyOpen = chatHistory.open
    chatHistory.open = async () => { throw new Error('fixture storage unavailable') }
  })
  await panel.getByRole('button', { name: '开始实时语音', exact: true }).click()
  await page.waitForFunction(() => !window.__stage.conversation().running && window.__stage.conversation().error.includes('fixture storage unavailable'))
  assert.ok((await panel.innerText()).includes('fixture storage unavailable'), 'archive initialization failures stay visible after cleanup')
  await page.evaluate(async () => { const { chatHistory } = await import('/src/chatHistory.ts'); chatHistory.open = window.__historyOpen })
  assert.deepEqual(legacyCalls, []); assert.deepEqual(errors, [])
  console.log(JSON.stringify({ provider, artifacts, result, checks: ['actual local WebRTC duplex', 'audio before text/completion', 'streamed captions', 'barge-in and stale reply suppression', 'next turn preserves history', 'microphone mute', 'pause/resume/end', 'lip sync and recorded audio', 'responsive panel', 'shared archive and recap', 'private/public memory isolation', 'memory revision and session deletion', 'whole-turn speech events', 'visible archive initialization error'] }, null, 2))
} catch (error) {
  console.error('Browser check failed:', error)
  if (page && !page.isClosed()) {
    const body = await page.evaluate(() => document.body?.innerText.slice(-1800) ?? '').catch(() => '(page unavailable)')
    console.log('Browser state:', errors, body)
  }
  throw error
} finally { await browser.close() }
