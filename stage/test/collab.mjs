import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { startRelay } from '../../collab/server.mjs'
const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'livliv-stage-collab-'))
let server, browser, relay, output
const pages = [], contexts = [], errors = [], report = { artifacts }
function wav(seconds, hz) {
  const rate = 48000, n = rate * seconds, data = Buffer.alloc(44 + n * 2)
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin(2 * Math.PI * hz * i / rate) * 7000), 44 + i * 2)
  return data
}
async function serve() {
  const socket = createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve)); const port = socket.address().port; await new Promise((resolve) => socket.close(resolve))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite start timed out')), 15000); server.stdout.on('data', (data) => { if (String(data).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (code) => reject(new Error('Vite exited ' + code))) })
  return `http://127.0.0.1:${port}`
}
async function meter(page, ms = 600) {
  return page.evaluate(async (duration) => {
    const { remoteSounds } = await import('/src/collab/streams.ts'), context = new AudioContext(), meters = remoteSounds().map((sound) => { const analyser = context.createAnalyser(), source = context.createMediaStreamSource(sound.stream); source.connect(analyser); analyser.fftSize = 1024; return { id: sound.id, analyser, peak: 0, data: new Float32Array(1024) } })
    const end = performance.now() + duration
    while (performance.now() < end) { for (const item of meters) { item.analyser.getFloatTimeDomainData(item.data); item.peak = Math.max(item.peak, ...item.data.map(Math.abs)) } await new Promise((resolve) => setTimeout(resolve, 20)) }
    await context.close(); return meters.map(({ id, peak }) => ({ id, peak }))
  }, ms)
}
try {
  const mic = join(artifacts, 'microphone.wav'); await writeFile(mic, wav(2, 220))
  relay = await startRelay({ port: 0 }); const service = `ws://127.0.0.1:${relay.address.port}/room`, origin = await serve()
  browser = await chromium.launch({ args: ['--allow-loopback-in-peer-connection', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${mic}`] })
  for (const [index, format] of ['png', 'livliv', 'vrm'].entries()) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] }); contexts.push(context)
    await context.addInitScript(() => {
      localStorage.setItem('livliv-stage:coached', '1'); localStorage.setItem('livliv-stage:locale', 'zh-Hans')
      window.testPeers = []; window.rtcLog = []
      const Peer = window.RTCPeerConnection
      window.RTCPeerConnection = class extends Peer { constructor(config) { super(config); window.testPeers.push(this); const i = window.testPeers.length; this.addEventListener('iceconnectionstatechange', () => window.rtcLog.push([i, 'ice', this.iceConnectionState])); this.addEventListener('connectionstatechange', () => window.rtcLog.push([i, 'connection', this.connectionState])); this.addEventListener('icecandidate', (e) => { if (e.candidate) window.rtcLog.push([i, 'candidate', e.candidate.candidate]) }) } }
    })
    await context.route('**/*', (route) => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) || /^(blob|data):/.test(route.request().url()) ? route.continue() : route.abort())
    const page = await context.newPage(); pages.push(page); page.on('pageerror', (error) => errors.push(error.message)); page.setDefaultTimeout(20000)
    await page.goto(origin, { waitUntil: 'networkidle' })
    await page.evaluate(async ({ format, index }) => {
      const { store, newCharacter, emptyScene, localModels } = await import('/src/scene.ts')
      const scene = { ...emptyScene(), width: 640, height: 360, background: 'transparent', name: '联播测试' }, key = 'own-' + index
      let model = { type: 'url', url: '/characters/k01/' }
      if (format === 'png') {
        const picture = async (color) => { const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 180; const g = canvas.getContext('2d'); g.fillStyle = color; g.fillRect(20, 20, 80, 160); return new Promise((resolve) => canvas.toBlob(resolve)) }
        localModels.set(key, new Map([['closed.png', await picture('#6aa0f9')], ['open.png', await picture('#e16b9d')], ['name.txt', new Blob(['PNG'])]])); model = { type: 'files', key, format }
      } else if (format === 'vrm') { localModels.set(key, new Map([['model.vrm', await (await fetch('/test/fixtures/avatar.vrm')).blob()]])); model = { type: 'files', key, format } }
      if (model.type === 'files') await (await import('/src/vault.ts')).keep({ key, name: format.toUpperCase(), at: Date.now(), format }, localModels.get(key))
      const character = { ...newCharacter(scene, format.toUpperCase(), model, ''), id: key, driver: 'auto', lines: 'none', shadow: false, w: 180, h: 270, x: index * 170 + 5, y: 90 }
      store.replace({ ...scene, items: [character] }); store.select(key)
    }, { format, index })
    await page.waitForFunction(() => window.__stage.actors.size === 1 && [...window.__stage.actors.values()][0].status === 'ready')
    await page.getByRole('button', { name: /^联播/ }).click(); await page.getByLabel('你的名字', { exact: true }).fill(['Host', 'Guest', 'Third'][index])
  }
  const [host, guest, third] = pages
  await host.locator('.collab-service summary').click(); await host.getByLabel('服务地址', { exact: true }).fill(service); await host.getByRole('button', { name: '分享并创建联播' }).click()
  await host.getByLabel('邀请码', { exact: true }).waitFor(); const invite = await host.getByLabel('邀请码', { exact: true }).inputValue()
  for (const [index, page] of [guest, third].entries()) {
    await page.getByRole('button', { name: '加入联播', exact: true }).click(); await page.getByLabel('朋友的邀请码', { exact: true }).fill(invite); await page.getByRole('button', { name: '分享并申请加入' }).click(); await page.getByText('等待房主接纳', { exact: true }).waitFor()
    assert.equal(await page.locator('.room-members').count(), 0)
    await host.locator('.collab-pending .room-member').filter({ hasText: index ? 'Third' : 'Guest' }).getByRole('button', { name: '接纳', exact: true }).click()
    for (const target of pages.slice(0, index + 2)) await target.waitForFunction((count) => window.__stage.actors.size === count && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'), index + 2, { timeout: 30000 })
    if (index === 0) await host.evaluate(async () => { const { record } = await import('/src/tape.ts'); window.testTake = await record(false) })
  }
  report.formats = await Promise.all(pages.map((page) => page.evaluate(() => [...window.__stage.actors.values()].map((actor) => actor.format).sort())))
  for (const formats of report.formats) assert.deepEqual(formats, ['livliv', 'png', 'vrm'])
  report.audio = await Promise.all(pages.map((page) => meter(page))); for (const values of report.audio) { assert.equal(values.length, 2); assert.ok(values.every((value) => value.peak > .005), JSON.stringify(values)) }
  const ids = await Promise.all(pages.map((page) => page.evaluate(async () => (await import('/src/collab/session.ts')).roomState().id)))
  await host.evaluate(() => { const actor = window.__stage.actors.get('own-0'); actor.player.use({ order: 30, update(frame) { frame.params.angleX = 17; frame.params.mouthOpen = .75 } }) })
  for (const page of [guest, third]) await page.waitForFunction((id) => [...window.__stage.actors.values()].some((actor) => actor.item.remote?.peer === id && actor.lastPose.params.angleX === 17 && actor.lastPose.params.mouthOpen === .75), ids[0])
  await host.getByRole('button', { name: '静音 Guest', exact: true }).click()
  assert.equal(await host.evaluate(async (id) => (await import('/src/collab/streams.ts')).remoteSounds().find((sound) => sound.id === id).volume, ids[1]), 0)
  await host.getByRole('button', { name: '听到 Guest', exact: true }).click()
  // A separate same-profile output must receive temporary assets before it loads the remote actors.
  output = await contexts[0].newPage(); await output.goto(origin + '/?output=1&clear=1'); await output.waitForFunction(() => window.__stage.actors.size === 3 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  await output.screenshot({ path: join(artifacts, 'output-three-formats.png'), omitBackground: true })
  await new Promise((resolve) => setTimeout(resolve, 1000))
  // The microphone can be silenced while the sender's stable voice mix keeps the connection alive.
  for (const page of pages) await page.getByRole('button', { name: '麦克风已开启', exact: true }).click()
  await new Promise((resolve) => setTimeout(resolve, 600))
  report.silence = await Promise.all(pages.map((page) => meter(page, 250))); for (const values of report.silence) assert.ok(values.every((value) => value.peak < .001), JSON.stringify(values))
  const voice = [...wav(1, 660)]
  const speaking = host.evaluate(async (bytes) => { const a = window.__stage.actors.get('own-0'), blob = new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }); await a.perform({ text: '测试角色声音', seconds: 1, clip: { blob, seconds: 1, expression: null }, aloud: true }, 'happy', 'nod') }, voice)
  report.tts = await Promise.all([guest, third].map((page) => meter(page, 750))); await speaking
  for (const values of report.tts) { assert.ok(values.find((value) => value.id === ids[0]).peak > .005); assert.ok(values.find((value) => value.id !== ids[0]).peak < .001, JSON.stringify(values)) }
  // Model assets and decoded voices remain exportable after the session has released its remote cast.
  await guest.getByRole('button', { name: '离开联播', exact: true }).click(); await host.waitForFunction(() => window.__stage.actors.size === 2)
  await third.getByRole('button', { name: '离开联播', exact: true }).click(); await host.waitForFunction(() => window.__stage.actors.size === 1)
  await output.waitForFunction(() => window.__stage.actors.size === 1)
  report.outputReleased = await output.evaluate(async () => [...(await import('/src/scene.ts')).localModels.keys()].filter((key) => key.startsWith('remote:')).length)
  assert.equal(report.outputReleased, 0)
  report.recording = await host.evaluate(async () => { const take = await window.testTake.stop(); window.savedTake = take; return { tracks: take.tracks.size, retained: [...take.tracks.values()].filter((track) => track.source instanceof Map).length, remote: take.remote.map((clip) => clip.blob.size), seconds: take.seconds, cuts: take.cuts.length } })
  assert.equal(report.recording.tracks, 3); assert.equal(report.recording.retained, 3); assert.equal(report.recording.cuts, 0); assert.ok(report.recording.remote.every((size) => size > 1000))
  report.export = await host.evaluate(async () => { const { renderTake } = await import('/src/render.ts'), made = await renderTake(window.savedTake, 'collab-export', () => {}, new AbortController().signal); const video = document.createElement('video'), url = URL.createObjectURL(made.file); video.src = url; video.muted = true; await new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = reject }); const result = { size: made.file.size, width: video.videoWidth, height: video.videoHeight }; URL.revokeObjectURL(url); return result })
  assert.ok(report.export.size > 10000); assert.equal(report.export.width, 640); assert.equal(report.export.height, 360)
  await host.getByRole('button', { name: '结束联播', exact: true }).click()
  await host.getByRole('button', { name: '分享并创建联播' }).waitFor()
  report.history = await host.evaluate(async () => {
    const { store, emptyScene } = await import('/src/scene.ts'), own = store.get().items.find((item) => item.kind === 'character')
    store.setRemote({ ...own, id: 'history-remote', remote: { peer: 'history-peer', person: 'History' } })
    store.replace(emptyScene()); store.dropRemote('history-peer'); store.undo()
    return store.get().items.some((item) => item.kind === 'character' && item.remote?.peer === 'history-peer')
  })
  assert.equal(report.history, false)
  assert.deepEqual(errors, []); report.errors = errors
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  if (output) { report.output = await output.evaluate(async () => ({ actors: [...window.__stage.actors.values()].map((a) => ({ id: a.item.id, status: a.status, error: a.error })), models: [...(await import('/src/scene.ts')).localModels.keys()], scene: window.__stage.store.get().items })).catch(() => null); await output.screenshot({ path: join(artifacts, 'failure-output.png'), omitBackground: true }).catch(() => {}) }
  for (const [index, page] of pages.entries()) { await page.screenshot({ path: join(artifacts, 'failure-' + index + '.png') }).catch(() => {}); report['state' + index] = await page.evaluate(async () => ({ actors: [...window.__stage.actors.values()].map((a) => ({ id: a.item.id, status: a.status, error: a.error })), room: (await import('/src/collab/session.ts')).roomState(), rtc: window.rtcLog, peers: window.testPeers?.map((p) => ({ ice: p.iceConnectionState, state: p.connectionState, local: p.localDescription?.sdp, remote: p.remoteDescription?.sdp })) })).catch(() => null) }
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, errors, error: error.stack }, null, 2)); console.error(error); console.error(artifacts); process.exitCode = 1
} finally { await browser?.close(); await relay?.close(); server?.kill('SIGTERM') }
