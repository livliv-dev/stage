// livliv.ai as one switch (Settings → 连接: brain.ts, voiceApi.ts, ptt.ts, shell/Connections.tsx), on the site's build with
// the site faked (nothing is spent):
//  - migration: a saved livliv brain is livliv.ai on, its text and its voices; a saved model of one's own is off, and a
//    LivLiv character then speaks with your own voice service, not its LivLiv voice
//  - off: a 对谈, a chat and push to talk make zero calls to the routes that take points
//  - on: an own VRM speaks on livliv.ai, its line written from its card here by livliv.ai's text and voiced in a system
//    voice (by its gender) through /api/chat/say; a LivLiv character in its own voice through /api/chat/<id>/say;
//    recognition through livliv.ai, saved own keys unused
//  - the card's override: 系统朗读 and 自己的服务 take no points
//  - 文字 on, 声音 off: lines from livliv.ai, voices and recognition your own
//  - livliv.ai refusing a call as too long: asked again with the older history left out, without a word
//  - Space never starts paid recognition
//  - signed out, turning it on signs in first and it comes on once that succeeds; both parts off is livliv.ai off; your
//    own services fold to 由 livliv.ai 提供 while covered
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
const vrm = [...await readFile(join(root, 'test/fixtures/avatar.vrm'))]
const OWN = { kind: 'openai', provider: 'custom', base: '', key: 'test-only', model: 'own-model' }
const SPEECH = { provider: 'openai', base: '', key: 'test-only', model: 'own-tts', voice: 'alloy', asr: 'own-asr' }
const LINE = '今天的风好舒服。'
let signed = true, refuseAt = 0  // refuseAt: the how-many-th livliv.ai text call from now is refused as too long
const calls = []  // every request to livliv.ai's points routes and to your own services: { kind, path, body, auth }
const POINTS = /^\/api\/(stage\/v1\/|chat\/(asr\/|say$|[^/]+\/say$|[^/]+\/stage-line$))/
const paid = () => calls.filter((c) => POINTS.test(c.path))
/** a streamed reply, as an OpenAI-compatible API sends one (AIRI asks for these: one AI character on the web build) */
const sse = (content) => {
  const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 's', object: 'chat.completion.chunk', model: 'm', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
  return chunk({ role: 'assistant', content }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}
const wav = (seconds) => {
  const samples = Math.round(24000 * seconds), buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 24000 * 330 * Math.PI * 2) * 6000), 44 + i * 2)
  return buffer
}
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: FLAGS })

  /** a fresh visitor with this saved: the brain (and its own model), the speech API, livliv.ai's voices part */
  async function open(saved = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.addInitScript(({ saved, origin }) => {
      if (sessionStorage.getItem('test-opened')) return
      sessionStorage.setItem('test-opened', '1')
      localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
      for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value).replaceAll('ORIGIN', origin))
    }, { saved, origin })
    // a microphone: a tone the test turns up and down
    await context.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const context = new AudioContext(), gain = context.createGain(), wave = context.createOscillator(), destination = context.createMediaStreamDestination()
        gain.gain.value = 0; wave.frequency.value = 220; wave.connect(gain); gain.connect(destination); wave.start(); await context.resume()
        window.microphone = { context, gain }
        return destination.stream
      }
      navigator.mediaDevices.enumerateDevices = async () => []
    })
    await context.route('**/*', async (route) => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname, auth = req.headers()['authorization'] || ''
      const record = (kind) => calls.push({ kind, path, body: req.method() === 'POST' && !/asr|transcriptions/.test(path) ? req.postDataJSON() : null, auth })
      if (path === '/api/me') return route.fulfill({ json: signed ? { signed_in: true, email: 'member@example.test', points: 120, plan: 'free' } : { signed_in: false } })
      if (path === '/login') return route.fulfill({ contentType: 'text/html', body: '<p>sign in</p>' })
      if (path === '/api/stage/v1/chat/completions') {
        record('livliv-text')
        if (refuseAt && calls.filter((c) => c.kind === 'livliv-text').length === refuseAt) { calls.at(-1).refused = true; return route.fulfill({ status: 413, json: { detail: '这次对话太长了：最多约 32000 个 token' } }) }
        if (calls.at(-1).body.stream) return route.fulfill({ contentType: 'text/event-stream', body: sse(LINE) })  // AIRI
        return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: LINE, emotion: 'happy', action: 'none', to: null, look: null }) } }] } })
      }
      if (path === '/api/chat/say' || /^\/api\/chat\/[^/]+\/say$/.test(path)) { record('livliv-voice'); return route.fulfill({ json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 119 } }) }
      if (path === '/api/chat/asr/upload') { record('livliv-hearing'); return route.fulfill({ json: { text: '你好呀' } }) }
      if (/stage-line$/.test(path)) { record('stage-line'); return route.fulfill({ status: 410, json: { detail: 'not used' } }) }
      if (path === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
      if (path === '/api/chat/voices' || /^\/api\/chat\/[^/]+\/voices$/.test(path)) return route.fulfill({ json: { voices: [{ id: 'longhua_v3.1', name: '龙华', desc: '', group: 'girl' }, { id: 'longanyang_v3.1', name: '龙安洋', desc: '', group: 'man' }], voice: 'longhua_v3.1', own: null } })
      if (path === '/own/chat/completions') { record('own-text'); if (calls.at(-1).body.stream) return route.fulfill({ contentType: 'text/event-stream', body: sse(LINE) }); return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: LINE, emotion: 'happy', action: 'none', to: null, look: null }) } }] } }) }
      if (path === '/own/audio/speech') { record('own-voice'); return route.fulfill({ contentType: 'audio/wav', body: wav(0.6) }) }
      if (path === '/own/audio/transcriptions') { record('own-hearing'); return route.fulfill({ json: { text: '你好呀' } }) }
      if (path.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
      return url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol) ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(origin + '/', { waitUntil: 'networkidle' })
    await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length >= 3 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
    await page.locator('.start-overlay .start-page [data-close]').click().catch(() => {})
    if (signed) await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
    return { page, context }
  }
  const own = { 'livliv-stage:brain': { ...OWN, base: 'ORIGIN/own' }, 'livliv-stage:speech': { ...SPEECH, base: 'ORIGIN/own' } }
  const state = (page) => page.evaluate(async () => { const b = await import('/src/brain.ts'); return { ...b.livlivNow(), kind: b.loadBrainConfig().kind } })
  const routes = (page) => page.evaluate(async () => { const { voiceRoute } = await import('/src/voiceApi.ts'); return window.__stage.store.get().items.filter((i) => i.kind === 'character').map((c) => voiceRoute(c)) })
  /** a 对谈 of two lines, to its end */
  const duet = (page) => page.evaluate(async () => {
    const { talk, conversation } = window.__stage
    talk.setLimit(2); talk.start()
    for (let i = 0; i < 600 && !(!conversation().running && conversation().turns >= 2); i++) await new Promise((r) => setTimeout(r, 100))
    return conversation().turns
  })
  /** a chat: the character greets, you say a line, it answers */
  async function chat(page) {
    await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); await talk.startChat('private') })
    await page.waitForFunction(() => window.__stage.conversation().waitingInput)
    await page.evaluate(() => window.__stage.talk.say('那就聊聊周末吧'))
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.waitingInput && c.lines.filter((l) => !l.human).length >= 2 && !c.speaking })
    await page.evaluate(() => window.__stage.talk.stop())
  }
  /** push to talk: hold, say something, let go; what was heard */
  async function pushToTalk(page) {
    await page.evaluate(async () => (await import('/src/ptt.ts')).press(true))
    await page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'listening')
    await page.evaluate(() => window.microphone.gain.gain.setValueAtTime(0.2, window.microphone.context.currentTime))
    await page.waitForTimeout(900)
    await page.evaluate(() => window.microphone.gain.gain.setValueAtTime(0, window.microphone.context.currentTime))
    await page.evaluate(async () => (await import('/src/ptt.ts')).release())
    await page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'idle', null, { timeout: testTimeout(20000) })
  }

  // ---- migration: a saved livliv brain is on, both parts; a saved model of one's own is off
  let { page, context } = await open({ 'livliv-stage:brain': { kind: 'livliv' } })
  assert.deepEqual(await state(page), { text: true, voice: true, kind: 'livliv' }, 'a saved livliv brain: livliv.ai on, its text and its voices')
  assert.deepEqual(await routes(page), ['livliv', 'livliv', 'livliv'], 'every character in livliv.ai\'s voice')
  await context.close()
  ;({ page, context } = await open(own))
  assert.deepEqual(await state(page), { text: false, voice: false, kind: 'openai' }, 'a saved model of one\'s own: livliv.ai off, even signed in')
  assert.deepEqual(await routes(page), ['api', 'api', 'api'], 'LivLiv characters speak with your own voice service, not their LivLiv voices')
  await page.locator('.status-line .st-tag', { hasText: 'own-model' }).waitFor()

  // ---- off: a 对谈, a chat and push to talk make zero calls to points routes
  calls.length = 0
  assert.equal(await duet(page), 2)
  await chat(page)
  await pushToTalk(page)
  assert.deepEqual(paid(), [], 'off: nothing asked of the routes that take points: ' + JSON.stringify(paid().map((c) => c.path)))
  assert.ok(calls.some((c) => c.kind === 'own-text') && calls.some((c) => c.kind === 'own-voice') && calls.some((c) => c.kind === 'own-hearing'), 'your own services did the work: ' + JSON.stringify(calls.map((c) => c.kind)))
  // Space with 免按键 while off: your own recognition, so it is no paid start
  assert.equal(await page.evaluate(async () => { window.__stage.store.setTalk({ goal: 'chat', audience: 'me', you: 'handsfree' }); return (await import('/src/shell/start.ts')).paidHearing({ goal: 'chat', audience: 'me', you: 'handsfree' }) }), false)

  // ---- the 连接 page: on from here; your own services fold, and open again
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.openModels('chat'))
  const section = page.locator('.connect-section.livliv')
  await section.locator('.switch.main').click()
  await page.waitForFunction(async () => (await import('/src/brain.ts')).livlivNow().text)
  assert.deepEqual(await state(page), { text: true, voice: true, kind: 'livliv' }, 'turned on: both parts')
  assert.match(await section.locator('.balance').innerText(), /120/, 'the balance on the row')
  assert.equal(await page.locator('.connect-section.covered').count(), 2, 'text and voices folded to one line each')
  assert.match(await page.locator('.connect-section.covered').first().innerText(), /由 livliv\.ai 提供/)
  await page.locator('.connect-section.covered[data-section="model"] .fold').click()
  assert.equal(await page.locator('.connect-section[data-section="model"] input[type="password"]').inputValue(), 'test-only', 'what was saved for your own model is kept')
  // 声音 off: voices yours again; 文字 off too: livliv.ai is off
  await section.locator('.livliv-parts .switch').nth(1).click()
  assert.deepEqual(await state(page), { text: true, voice: false, kind: 'livliv' })
  assert.equal(await page.locator('.connect-section.covered').count(), 1)

  // ---- 文字 on, 声音 off: lines from livliv.ai, voices and recognition your own
  await page.keyboard.press('Escape')
  calls.length = 0
  await chat(page)
  await pushToTalk(page)
  assert.deepEqual([...new Set(calls.map((c) => c.kind))].sort(), ['livliv-text', 'own-hearing', 'own-voice'], 'text from livliv.ai only: ' + JSON.stringify(calls.map((c) => c.kind)))
  assert.equal(calls.find((c) => c.kind === 'livliv-text').body.model, 'livliv', 'livliv.ai\'s model')
  assert.equal(calls.find((c) => c.kind === 'livliv-text').auth, '', 'on the site: its cookie, no key')
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.openModels('chat'))
  await section.locator('.livliv-parts .switch').nth(1).click()  // 声音 back on
  await section.locator('.livliv-parts .switch').nth(0).click()  // 文字 off
  await section.locator('.livliv-parts .switch').nth(0).waitFor()
  assert.deepEqual(await state(page), { text: false, voice: true, kind: 'openai' })
  await section.locator('.livliv-parts .switch').nth(1).click()  // 声音 off too: livliv.ai off
  assert.deepEqual(await state(page), { text: false, voice: false, kind: 'openai' }, 'both parts off: livliv.ai is off')
  assert.equal(await section.locator('.switch.main input').isChecked(), false)
  await section.locator('.switch.main').click()
  await page.keyboard.press('Escape')

  // ---- on: an own VRM speaks on livliv.ai: its card in the prompt, a system voice by its gender
  const id = await page.evaluate(async (bytes) => {
    const { fromFiles } = await import('/src/library.ts'), { store, newCharacter } = await import('/src/scene.ts')
    for (const c of store.get().items.filter((i) => i.kind === 'character')) store.patch(c.id, { lines: 'none' })
    const pick = await fromFiles([new File([new Uint8Array(bytes)], 'avatar.vrm')])
    const c = newCharacter(store.get(), 'Rio', pick.model, '海边长大的少年，爱冲浪。', 0.5)
    Object.assign(c, { style: '说话干脆，爱用「走起」', gender: 'm' })
    store.add(c); return c.id
  }, vrm)
  await page.waitForFunction((id) => window.__stage.actors.get(id)?.status === 'ready', id, { timeout: testTimeout(30000) })
  calls.length = 0
  await chat(page)
  const text = calls.filter((c) => c.kind === 'livliv-text'), voiced = calls.filter((c) => c.kind === 'livliv-voice')
  assert.ok(text.length >= 2, 'its lines from livliv.ai\'s text')
  const system = text[0].body.messages[0].content
  assert.ok(system.includes('Rio') && system.includes('海边长大的少年') && system.includes('走起'), 'written from its card here: ' + system.slice(0, 120))
  assert.ok(voiced.length >= 2 && voiced.every((c) => c.path === '/api/chat/say' && c.body.voice === 'longanyang_v3.1' && c.body.lines[0].text === LINE), 'voiced in the young men\'s system voice: ' + JSON.stringify(voiced.map((c) => [c.path, c.body.voice])))
  assert.ok(voiced.every((c) => typeof c.body.line === 'string' && c.body.line && c.body.stage === true), 'each with its line id, as Stage\'s (a livliv.ai voice is paid by the line)')
  assert.equal(calls.filter((c) => c.kind.startsWith('own')).length, 0, 'saved own keys unused')
  // livliv.ai refusing a call as too long: asked once more with the older half of the history left out, nothing shown
  calls.length = 0; refuseAt = 2
  await chat(page)
  refuseAt = 0
  const asked = calls.filter((c) => c.kind === 'livliv-text'), size = (c) => JSON.stringify(c.body.messages).length
  assert.ok(asked[1]?.refused && asked.length >= 3, 'the second call was refused and asked again: ' + asked.length)
  assert.ok(size(asked[2]) < size(asked[1]), 'asked again with less history: ' + JSON.stringify([size(asked[1]), size(asked[2])]))
  assert.equal(await page.evaluate(() => window.__stage.conversation().error), '', 'nothing shown')
  // recognition through livliv.ai while its voices are on, though your own is set
  calls.length = 0
  await pushToTalk(page)
  assert.deepEqual(calls.map((c) => c.kind), ['livliv-hearing'], 'heard by livliv.ai')
  // a LivLiv character: its own voice on the site
  const k01 = await page.evaluate(() => { const { store } = window.__stage, c = store.get().items.find((i) => i.kind === 'character' && i.lines === 'none' && /\/k01\/$/.test(i.model.url ?? '')); store.patch(c.id, { lines: 'ai' }); return c.id })
  await page.evaluate((id) => window.__stage.store.patch(id, { lines: 'none' }), id)
  calls.length = 0
  await chat(page)
  const itsOwn = calls.filter((c) => c.kind === 'livliv-voice')
  assert.ok(itsOwn.length && itsOwn.every((c) => c.path === '/api/chat/k01/say' && c.body.stage === true && c.body.line), 'a LivLiv character in its own voice, as Stage\'s (not a 录制 take): ' + JSON.stringify(itsOwn.map((c) => [c.path, c.body.stage])))
  // the card's override: 系统朗读 and 自己的服务 take no points for its voice
  await page.evaluate((id) => { const { store } = window.__stage, c = store.get().items.find((i) => i.id === id); store.patch(id, { voice: { ...c.voice, source: 'system' } }) }, k01)
  calls.length = 0
  await chat(page)
  assert.equal(calls.filter((c) => c.kind === 'livliv-voice').length, 0, '系统朗读: no /say')
  await page.evaluate((id) => { const { store } = window.__stage, c = store.get().items.find((i) => i.id === id); store.patch(id, { voice: { ...c.voice, source: 'api' } }) }, k01)
  calls.length = 0
  await chat(page)
  assert.equal(calls.filter((c) => c.kind === 'livliv-voice').length, 0, '自己的服务: no /say')
  assert.ok(calls.some((c) => c.kind === 'own-voice'), '...your own voice service instead')
  // Space starts nothing that takes points: on livliv.ai's text it plays the free demo (the demo's three are on the
  // stage); with your own model and the characters on the system voice, 免按键 would be heard by livliv.ai: nothing
  const space = async (toast) => {
    await page.evaluate(() => document.activeElement?.blur?.())
    calls.length = 0
    await page.keyboard.press('Space')
    if (toast) await page.locator('.toast').filter({ hasText: toast }).last().waitFor()
    await page.waitForTimeout(1500)
    assert.deepEqual(paid(), [], 'Space asks for nothing that takes points')
  }
  await space()
  await page.evaluate(async () => { window.__stage.talk.stop(); (await import('/src/brain.ts')).playDemo(false) })
  await page.evaluate(async () => {
    (await import('/src/brain.ts')).setLivLiv({ text: false })
    const { store } = window.__stage
    for (const c of store.get().items.filter((i) => i.kind === 'character')) store.patch(c.id, { voice: { ...c.voice, source: 'system' } })
    store.setTalk({ goal: 'chat', audience: 'me', you: 'handsfree' })
  })
  await space('用积分识别语音')
  assert.equal(await page.evaluate(() => window.__stage.conversation().running), false, 'Space starts no session with paid recognition')
  await page.evaluate(() => window.__stage.store.setTalk({ you: 'type' }))
  assert.deepEqual(calls.filter((c) => c.kind === 'stage-line'), [], 'the per-character stage-line is no longer asked')
  await context.close()

  // ---- signed out: turning it on signs in first (the site's page); back signed in, it is on
  signed = false
  ;({ page, context } = await open(own))
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.openModels('chat'))
  const login = page.waitForURL(/\/login\?next=/)
  await page.locator('.connect-section.livliv .switch.main').click()
  await login
  signed = true
  await page.goto(origin + '/', { waitUntil: 'networkidle' })
  await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
  await page.waitForTimeout(300)
  assert.deepEqual(await state(page), { text: true, voice: true, kind: 'livliv' }, 'on once signed in')
  await context.close()

  assert.deepEqual(errors, [])
  console.log('test:livliv-switch passed')
} catch (e) {
  console.error(e); process.exitCode = 1
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
