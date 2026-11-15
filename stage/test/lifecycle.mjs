import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const root = fileURLToPath(new URL('..', import.meta.url)), calls = [], errors = []
let server, browser, holdSpeech = false, slowModel = false, reactionOnly = false, releaseSpeech, speechHeld = false
function wav(seconds = .2) {
  const samples = Math.round(24000 * seconds), b = Buffer.alloc(44 + samples * 2)
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28)
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples * 2, 40)
  return b
}
async function until(condition) {
  for (let i = 0; i < 500; i++) { if (condition()) return; await delay(10) }
  assert.ok(condition(), 'the controlled fixture request arrived')
}
try {
  const socket = createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port; await new Promise((resolve) => socket.close(resolve))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Vite did not start')), 20000); server.stdout.on('data', (bytes) => { if (String(bytes).includes('Local:')) { clearTimeout(timer); resolve() } }); server.once('exit', (code) => reject(new Error('Vite exited '+code))) })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/me') { await route.fulfill({ json: { signed_in: false } }); return }
    if (url.pathname === '/fixture/chat/completions') {
      const payload = JSON.parse(route.request().postDataJSON().messages[1].content); calls.push(payload)
      if (slowModel) await delay(1200)
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: reactionOnly && payload.event ? '' : '正常的回复。', emotion: 'happy', action: 'nod' }) } }] } }).catch(() => {}); return
    }
    if (url.pathname === '/fixture/audio/speech') {
      if (holdSpeech) { speechHeld = true; await new Promise((resolve) => { releaseSpeech = resolve }) }
      await route.fulfill({ contentType: 'audio/wav', body: wav() }).catch(() => {}); return
    }
    if (url.pathname === '/fixture/audio/transcriptions') { await route.fulfill({ json: { text: '' } }); return }
    if (url.pathname === '/fixture-input.wav') { await route.fulfill({ contentType: 'audio/wav', body: wav(3) }); return }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['blob:', 'data:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!window.__stage)
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), { fromPngs } = await import('/src/library.ts')
    const { saveBrainConfig } = await import('/src/brain.ts'), { saveSpeech } = await import('/src/voiceApi.ts')
    const canvas = new OffscreenCanvas(40, 60); canvas.getContext('2d').fillRect(0, 0, 40, 60)
    const blob = await canvas.convertToBlob({ type: 'image/png' }), pick = await fromPngs({ closed: new File([blob], 'closed.png'), open: new File([blob], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, ''); character.voice.source = 'api'; store.add(character)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture', key: 'test-only', model: 'fixture' })
    saveSpeech({ provider: 'openai', base: location.origin + '/fixture', key: 'test-only', model: 'fixture', voice: 'fixture', asr: 'fixture' })
    localStorage.setItem('livliv-stage:fake-mic', '/fixture-input.wav')
    await window.__stage.talk.setScope('public'); await window.__stage.talk.newChat()
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].some((actor) => actor.status === 'ready'))
  holdSpeech = true
  await page.evaluate(() => window.__stage.talk.startChat('public')); await until(() => speechHeld)
  await page.evaluate(() => window.__stage.talk.pause())
  holdSpeech = false; releaseSpeech(); await delay(500)
  assert.deepEqual(await page.evaluate(() => ({ lines: window.__stage.conversation().lines.length, paused: window.__stage.conversation().paused })), { lines: 0, paused: true }, 'late prepared audio stays paused')
  await page.evaluate(() => window.__stage.talk.resume())
  await page.waitForFunction(() => window.__stage.conversation().waitingInput && !window.__stage.conversation().speaking)

  await page.evaluate(() => window.__stage.talk.stop())
  const memoryId = await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts'), actor = [...window.__stage.actors.values()][0]
    return (await memory.remember({ profileId: actor.item.profileId ?? actor.item.id, scope: 'public', text: '我的暗号是橘子。' })).id
  })
  await page.evaluate(() => window.__stage.talk.newChat())
  holdSpeech = true; speechHeld = false
  await page.evaluate(() => window.__stage.talk.startChat('public')); await until(() => speechHeld)
  assert.ok(calls.at(-1).memories.some((memory) => memory.text.includes('橘子')))
  await page.evaluate(() => window.__stage.talk.pause())
  holdSpeech = false; releaseSpeech(); await delay(350)
  await page.evaluate(async (id) => (await import('/src/memory.ts')).memory.forgetMemory(id), memoryId)
  await page.evaluate(() => window.__stage.talk.resume())
  await page.waitForFunction(() => !window.__stage.conversation().running && window.__stage.conversation().error.includes('记忆已更新'))
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.length), 0, 'resuming cannot speak a revoked memory')
  await page.evaluate(async () => { await window.__stage.talk.newChat(); await window.__stage.talk.startChat('public') })
  await page.waitForFunction(() => window.__stage.conversation().waitingInput && !window.__stage.conversation().speaking)

  for (const finish of ['cancel', 'silence']) {
    slowModel = true
    const before = calls.length
    await page.evaluate(() => window.__stage.talk.say('尚未回答的旧问题')); await until(() => calls.length === before + 1)
    await page.evaluate(async () => (await import('/src/ptt.ts')).press())
    await delay(500)
    assert.equal(calls.length, before + 1, 'listening never regenerates the old answer')
    slowModel = false
    await page.evaluate(async (finish) => { const ptt = await import('/src/ptt.ts'); if (finish === 'cancel') ptt.cancel(); else await ptt.release() }, finish)
    await delay(250); assert.equal(calls.length, before + 1, 'cancellation and empty recognition wait for new input')
    await page.evaluate(() => window.__stage.talk.say('现在回答新的问题'))
    await page.waitForFunction(() => window.__stage.conversation().waitingInput && !window.__stage.conversation().speaking)
    assert.ok(calls.at(-1).history.includes('现在回答新的问题'))
  }

  reactionOnly = true
  await page.evaluate(async () => { window.__recording = await (await import('/src/tape.ts')).record(false) })
  const turns = await page.evaluate(() => { const state = window.__stage.conversation(); window.__stage.talk.externalEvent({ id: 'reaction-only', source: 'Test game', message: '成功了，点头即可。', reply: 'always' }); return state.turns })
  await page.waitForFunction((turns) => window.__stage.conversation().turns > turns && window.__stage.conversation().waitingInput, turns)
  await delay(650)
  const take = await page.evaluate(async () => { const take = await window.__recording.stop(); return { seconds: take.seconds, tracks: take.tracks.size, poses: [...take.tracks.values()].reduce((sum, track) => sum + track.poses.length, 0), cuts: take.cuts.length } })
  assert.ok(take.seconds >= .5 && take.tracks === 1 && take.poses > 0, 'silent reactions remain in the captured take')
  assert.equal(take.cuts, 0)

  reactionOnly = false
  await page.evaluate(() => { window.__stage.talk.stop(); window.__stage.talk.startLive({ minutes: 1, maxGenerations: 2, warmupSeconds: 0, textOnly: true }) })
  await page.waitForFunction(() => window.__stage.conversation().mode === 'live' && window.__stage.conversation().waitingAudience)
  const beforeEvent = calls.length
  await page.evaluate(() => { window.__stage.talk.externalDialogue({ id: 'npc', started: true }); window.__stage.talk.externalEvent({ id: 'live-game-event', source: 'Test game', message: '请回应这条游戏事件', reply: 'always', character: [...window.__stage.actors.keys()][0] }) })
  await delay(300); assert.equal(calls.length, beforeEvent, 'NPC speech holds the response')
  await page.evaluate(() => window.__stage.talk.externalDialogue({ id: 'npc', started: false }))
  await until(() => calls.length === beforeEvent + 1)
  assert.equal(calls.at(-1).event.message, '请回应这条游戏事件')
  await page.evaluate(() => window.__stage.talk.stop())
  slowModel = true
  await page.evaluate(() => window.__stage.talk.startLive({ minutes: 1, maxGenerations: 2, warmupSeconds: 0, textOnly: true }))
  await page.waitForFunction(() => window.__stage.conversation().mode === 'live' && window.__stage.conversation().waitingAudience)
  const beforeRestart = calls.length
  await page.evaluate(() => window.__stage.talk.externalEvent({ id: 'old-live-event', source: 'Test game', message: '停止后不再回应这条旧事件', reply: 'always' }))
  await until(() => calls.length === beforeRestart + 1)
  await page.evaluate(() => { window.__stage.talk.stop(); window.__stage.talk.startLive({ minutes: 1, maxGenerations: 2, warmupSeconds: 0, textOnly: true }) })
  await delay(400); assert.equal(calls.length, beforeRestart + 1, 'a new live session never replays the stopped game event')
  await page.evaluate(() => window.__stage.talk.stop())
  slowModel = false
  const beforePlaybackFailure = calls.length
  await page.evaluate(() => {
    window.__stage.talk.startLive({ minutes: 1, maxGenerations: 4, warmupSeconds: 0, textOnly: false })
    const actor = [...window.__stage.actors.values()][0], say = actor.voice.say.bind(actor.voice)
    actor.voice.say = (_clip, callbacks) => { actor.voice.say = say; queueMicrotask(() => callbacks.onFail()) }
    window.__stage.talk.externalEvent({ id: 'voice-failed-event', source: 'Test game', message: '已经显示的回答不能因播放失败再次生成', reply: 'always' })
  })
  await page.waitForFunction(() => window.__stage.conversation().retryAt > Date.now())
  await page.waitForFunction(() => { const s = window.__stage.conversation(); return s.running && s.waitingAudience && s.retryAt === 0 }, null, { timeout: 9000 })
  await delay(300)
  assert.equal(calls.length, beforePlaybackFailure + 1, 'a delivered reply is not regenerated after playback fails')
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some((line) => !line.human && line.cut)), true)
  await page.evaluate(() => window.__stage.talk.stop())
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, checks: ['pause during TTS', 'revoked memory while paused', 'PTT cancel and silence', 'silent reaction recording', 'live game response after NPC dialogue', 'live stop/restart event isolation', 'no retry of a delivered reply after playback failure'], calls: calls.length, take }))
} finally { releaseSpeech?.(); await browser?.close(); server?.kill('SIGTERM') }
