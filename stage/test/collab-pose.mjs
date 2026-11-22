import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
import { startRelay } from '../../collab/server.mjs'
import { testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-collab-pose-'))
let vite, relay, browser
const pages = [], report = { artifacts }
const details = (page) => page.evaluate(async () => ({
  room: (await import('/src/collab/session.ts')).roomState().phase,
  members: (await import('/src/collab/session.ts')).roomState().members.map(({phase,error})=>({phase,error})),
  actors: [...window.__stage.actors.values()].map((a) => ({ remote: !!a.item.remote, ready: a.status, error: a.error, angle: a.lastPose.params.angleX, playing: a.player.playing })),
  frames: window.fixedFrames,
}))
try {
  vite = await createServer({ root, configFile: join(root, 'vite.config.ts'), cacheDir: join(artifacts, 'vite-cache'), server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false } })
  await vite.listen(); const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
  relay = await startRelay({ port: 0 }); const service = `ws://127.0.0.1:${relay.address.port}/room`
  browser = await chromium.launch({ args: ['--allow-loopback-in-peer-connection', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  for (const angle of [17, -9]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] })
    await context.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: '{"signed_in":false,"available":false}' }))
    // the order of connection and data channel events, for the failure dump (the rejoin has failed on CI with a share
    // sent on a channel that was no longer open)
    await context.addInitScript(() => {
      const log = window.rtcLog = [], t0 = performance.now(), note = (...entry) => { log.push([Math.round(performance.now() - t0), ...entry]); if (log.length > 300) log.shift() }
      const watch = (channel, id) => { for (const type of ['open', 'close', 'error']) channel.addEventListener(type, () => note(id, channel.label, type, channel.readyState)) }
      const Base = window.RTCPeerConnection
      window.RTCPeerConnection = class extends Base {
        constructor(...args) {
          super(...args); const id = this.logId = Math.random().toString(36).slice(2, 6); note(id, 'new')
          this.addEventListener('connectionstatechange', () => note(id, 'connection', this.connectionState))
          this.addEventListener('signalingstatechange', () => note(id, 'signaling', this.signalingState))
          this.addEventListener('datachannel', (event) => { note(id, 'datachannel', event.channel.label, event.channel.readyState); watch(event.channel, id) })
        }
        createDataChannel(label, options) { const channel = super.createDataChannel(label, options); note(this.logId, 'create', label); watch(channel, this.logId); return channel }
        close() { note(this.logId, 'close()'); return super.close() }
      }
    })
    const page = await context.newPage(); pages.push(page); page.setDefaultTimeout(testTimeout(10000))
    await page.goto(origin, { waitUntil: 'networkidle' })
    // A fake capture exposes loopback ICE candidates in the isolated browser profiles.
    await page.evaluate(async () => { window.fixtureMic = await navigator.mediaDevices.getUserMedia({ audio: true }) })
    await page.evaluate(async (angle) => {
      const { store, emptyScene, newCharacter, localModels } = await import('/src/scene.ts'), { onFrame } = await import('/src/actors.ts')
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 48
      const g = canvas.getContext('2d'); g.fillStyle = '#70a0ff'; g.fillRect(0, 0, 32, 48)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve)), key = 'fixed-pose'
      localModels.set(key, new Map([['closed.png', blob], ['open.png', blob]]))
      await (await import('/src/vault.ts')).keep({ key, name: 'Fixed pose', at: Date.now(), format: 'png' }, localModels.get(key))
      const scene = { ...emptyScene(), width: 640, height: 360 }, character = { ...newCharacter(scene, 'Fixed ' + angle, { type: 'files', key, format: 'png' }, ''), driver: 'auto', lines: 'none' }
      store.replace({ ...scene, items: [character] }); store.select(character.id)
      window.fixedAngle = angle; window.fixedFrames = 0
      onFrame((actor) => { if (!actor.item.remote) window.fixedFrames++ })
    }, angle)
    await page.waitForFunction(() => [...window.__stage.actors.values()][0]?.status === 'ready')
    await page.evaluate(() => [...window.__stage.actors.values()][0].player.use({ order: 30, update(frame) { frame.params.angleX = window.fixedAngle } }))
    await page.waitForFunction(() => [...window.__stage.actors.values()][0].lastPose.params.angleX === window.fixedAngle)
    await page.evaluate(() => { [...window.__stage.actors.values()][0].player.pause(); window.fixedFrames = 0 })
  }
  const [host, guest] = pages
  await host.evaluate(async (service) => { const { room } = await import('/src/collab/session.ts'); room.create(service, 'Host', [...window.__stage.actors.keys()][0], false) }, service)
  await host.waitForFunction(async () => (await import('/src/collab/session.ts')).roomState().phase === 'on')
  const invite = await host.evaluate(async () => (await import('/src/collab/session.ts')).roomState().invite)
  for (const phase of ['initial', 'rejoin']) {
    await guest.evaluate(async (invite) => (await import('/src/collab/session.ts')).room.join(invite, 'Guest', [...window.__stage.actors.values()].find((a) => !a.item.remote).item.id, false), invite)
    await host.waitForFunction(async () => (await import('/src/collab/session.ts')).roomState().pending.length === 1)
    await host.evaluate(async () => { const { room, roomState } = await import('/src/collab/session.ts'); room.admit(roomState().pending[0].id) })
    for (const page of pages) await page.waitForFunction(() => window.__stage.actors.size === 2 && [...window.__stage.actors.values()].every((a) => a.status === 'ready'))
    for (const page of pages) {
      assert.equal((await details(page)).actors.find((a) => !a.remote).playing, false)
      await page.waitForFunction(() => [...window.__stage.actors.values()].some((a) => a.item.remote && a.lastPose.params.angleX === (window.fixedAngle === 17 ? -9 : 17)), null, { polling: 50, timeout: 3000 })
      assert.equal((await details(page)).frames, 0, 'the initial pose must not require another publisher animation frame')
    }
    report[phase] = await Promise.all(pages.map(details))
    await guest.evaluate(async () => (await import('/src/collab/session.ts')).room.leave())
    await host.waitForFunction(() => window.__stage.actors.size === 1)
  }
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (error) {
  report.states = await Promise.all(pages.map((page) => details(page).catch(() => null)))
  report.rtc = await Promise.all(pages.map((page) => page.evaluate(() => window.rtcLog).catch(() => null)))
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ ...report, error: error.stack }, null, 2)); console.error(JSON.stringify(report, null, 2)); throw error
} finally { await browser?.close(); await relay?.close(); await vite?.close() }
