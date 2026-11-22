// What starts free stays free, on the site's build signed in (the site and your own services are faked: nothing is
// spent). The demo played while livliv.ai is on, its 声音 turned on and off meanwhile, asks livliv.ai for nothing. A card
// set to livliv.ai's voice doesn't make a session that started with its voices off pay when they come on. Your own
// character's typed lines, read aloud, are voiced as the session started (livliv.ai's voice with 声音 on, not
// subtitles). Off, nothing reaches a route that takes points: an AIRI chat, the card's 试听, the checklist's 测试 and
// 我来演 typed lines. livliv.ai refusing an AIRI call as too long: the same call again, shorter, its tool round not asked
// again; still too long, said so. livliv.ai's prices come from the site; 声音 never chosen stays off while voices of
// your own are ready.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
const OWN = { kind: 'openai', provider: 'custom', base: 'ORIGIN/own', key: 'test-only', model: 'own-model' }
const SPEECH = { provider: 'openai', base: 'ORIGIN/own', key: 'test-only', model: 'own-tts', voice: 'alloy', asr: 'own-asr' }
const LINE = '今天的风好舒服。'
const calls = []  // { kind, path, body }
const POINTS = /^\/api\/(stage\/v1\/|chat\/(asr\/|say$|[^/]+\/say$))/
const paid = () => calls.filter((c) => POINTS.test(c.path))
const wav = (seconds) => {
  const samples = Math.round(24000 * seconds), buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVE', 8); buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 24000 * 330 * Math.PI * 2) * 6000), 44 + i * 2)
  return buffer
}
const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'f', object: 'chat.completion.chunk', model: 'm', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
const sse = (content) => chunk({ role: 'assistant', content }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
const toolCall = (memoryId) => chunk({ role: 'assistant', tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'builtIn_readMemory', arguments: JSON.stringify({ id: memoryId }) } }] }) + chunk({}, 'tool_calls') + 'data: [DONE]\n\n'
const json = { choices: [{ message: { content: JSON.stringify({ text: LINE, emotion: 'happy', action: 'none', to: null, look: null }) } }] }
/** what livliv.ai's text does next: answer, ask for a memory (a tool round), or refuse as too long */
const plan = { tool: '', refuse: 0 }

let server, browser
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })

  /** a fresh visitor, signed in, with this saved; `desktop`: in the desktop shell with window capture (AIRI) */
  async function open(saved = {}, { desktop = false } = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.addInitScript(({ saved, origin, desktop }) => {
      if (desktop) window.livlivDesktop = { version: '0.5.0', platform: 'darwin', vision: { list: async () => [], frame: async () => null }, requests: { begin: async () => 'test', cancel: async () => {} }, hotkeys: { list: async () => [], set: async () => [], reset: async () => [] }, onCommand: () => () => {} }
      if (sessionStorage.getItem('test-opened')) return
      sessionStorage.setItem('test-opened', '1')
      localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
      for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value).replaceAll('ORIGIN', origin))
    }, { saved, origin, desktop })
    await context.route('**/*', async (route) => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname
      const record = (kind) => { const body = req.method() === 'POST' ? req.postDataJSON() : null; calls.push({ kind, path, body }); return body }
      if (path === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 120, plan: 'free', stage_text_points: 0.2, stage_voice_points: 0.3 } })
      if (path === '/api/stage/v1/chat/completions') {
        const body = record('livliv-text')
        if (plan.refuse) { plan.refuse--; calls.at(-1).refused = true; return route.fulfill({ status: 413, json: { detail: '这次对话太长了：最多约 32000 个 token' } }) }
        if (plan.tool && body.stream && body.tools?.length) { const id = plan.tool; plan.tool = ''; return route.fulfill({ contentType: 'text/event-stream', body: toolCall(id) }) }
        return route.fulfill(body.stream ? { contentType: 'text/event-stream', body: sse(`<|ACT {"emotion":"happy","motion":"nod"}|>${LINE}`) } : { json })
      }
      if (path === '/api/chat/say' || /^\/api\/chat\/[^/]+\/say$/.test(path)) { record('livliv-voice'); return route.fulfill({ json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 119 } }) }
      if (path === '/api/chat/asr/upload') { record('livliv-hearing'); return route.fulfill({ json: { text: '你好呀' } }) }
      if (path === '/api/chat/say/line.mp3') return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
      if (path === '/api/chat/voices' || /^\/api\/chat\/[^/]+\/voices$/.test(path)) return route.fulfill({ json: { voices: [{ id: 'longhua_v3.1', name: '龙华', desc: '', group: 'girl', core: true }, { id: 'longanyang_v3.1', name: '龙安洋', desc: '', group: 'man', core: true }], voice: 'longhua_v3.1', own: null } })
      if (path === '/own/chat/completions') { const body = record('own-text'); return route.fulfill(body.stream ? { contentType: 'text/event-stream', body: sse(`<|ACT {"emotion":"happy","motion":"nod"}|>${LINE}`) } : { json }) }
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
    await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
    return { page, context }
  }
  const state = (page) => page.evaluate(async () => { const b = await import('/src/brain.ts'); return { ...b.livlivNow(), kind: b.loadBrainConfig().kind } })
  /** the characters: the first as `first` says, the second the one AI character, the third off the stage's talk */
  const cast = (page, first, second = {}) => page.evaluate(({ first, second }) => {
    const { store } = window.__stage, [a, b, c] = store.get().items.filter((i) => i.kind === 'character')
    store.patch(a.id, first); store.patch(b.id, { lines: 'ai', ...second }); store.patch(c.id, { lines: 'none' })
    return [a.id, b.id]
  }, { first, second })
  /** a chat: the character greets, you say a line, it answers */
  async function chat(page, between) {
    await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); await talk.startChat('private') })
    await page.waitForFunction(() => window.__stage.conversation().waitingInput)
    await between?.()
    await page.evaluate(() => window.__stage.talk.say('那就聊聊周末吧'))
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return (c.waitingInput && c.lines.filter((l) => !l.human).length >= 2 && !c.speaking) || !!c.error }, null, { timeout: testTimeout(40000) })
    const error = await page.evaluate(() => window.__stage.conversation().error)
    await page.evaluate(() => window.__stage.talk.stop())
    return error
  }
  /** a line of yours typed, as your character (read aloud as its card says), and the AI character's answer */
  async function typed(page, me) {
    await page.evaluate((me) => { const { talk } = window.__stage; talk.stop(); talk.setAs(me); talk.say('我先说一句') }, me)
    await page.waitForFunction(() => { const c = window.__stage.conversation(); return !c.running && c.lines.some((l) => l.human && l.text === '我先说一句') && c.lines.some((l) => !l.human) }, null, { timeout: testTimeout(40000) })
  }
  const voiceError = (page, id) => page.evaluate((id) => window.__stage.actors.get(id).voiceError, id)

  // ---- your own character's typed lines, read aloud, with livliv.ai's voices on: voiced as the session started
  let { page, context } = await open({ 'livliv-stage:brain': OWN, 'livliv-stage:speech': SPEECH })
  await page.evaluate(async () => (await import('/src/brain.ts')).setLivLiv({ text: false, voice: true }))
  assert.deepEqual(await state(page), { text: false, voice: true, kind: 'openai' })
  let [me] = await cast(page, { lines: 'me', readAloud: true, driver: 'auto' })
  calls.length = 0
  await typed(page, me)
  const mine = calls.filter((c) => c.kind === 'livliv-voice' && c.body.lines[0].text === '我先说一句')
  assert.equal(mine.length, 1, 'your typed line in your character\'s livliv.ai voice, not subtitles: ' + JSON.stringify(calls.map((c) => [c.kind, c.body?.lines?.[0]?.text])))
  assert.equal(await voiceError(page, me), '', 'no note that it only shows subtitles')

  // ---- a card set to livliv.ai's voice, in a chat that started with its voices off: free to the end
  await page.evaluate(async () => (await import('/src/brain.ts')).setLivLiv({ text: false, voice: false }))
  const [, ai] = await cast(page, { lines: 'none' })
  await page.evaluate((id) => { const { store } = window.__stage, c = store.get().items.find((i) => i.id === id); store.patch(id, { voice: { ...c.voice, source: 'livliv' } }) }, ai)
  calls.length = 0
  await chat(page, () => page.evaluate(async () => (await import('/src/brain.ts')).setLivLiv({ voice: true })))
  assert.deepEqual(paid(), [], 'her card says livliv.ai, its voices came on mid-chat: no line of hers is paid: ' + JSON.stringify(paid().map((c) => c.path)))
  await page.evaluate(async () => (await import('/src/brain.ts')).setLivLiv({ voice: false }))
  await context.close()

  // ---- the demo, livliv.ai on: its 声音 switched off and on again in 设置 → 连接 while it plays; nothing is paid
  ;({ page, context } = await open({ 'livliv-stage:brain': { kind: 'livliv' } }))
  assert.deepEqual(await state(page), { text: true, voice: true, kind: 'livliv' })
  calls.length = 0
  await page.evaluate(async () => { await (await import('/src/shell/demoStart.ts')).beginDemo() })
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.lines.length >= 1 }, null, { timeout: testTimeout(40000) })
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.openModels('chat'))
  const parts = page.locator('.connect-section.livliv .livliv-parts .switch')
  await parts.nth(1).click(); await page.waitForTimeout(300); await parts.nth(1).click()
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(async () => (await import('/src/brain.ts')).loadBrainConfig().kind), 'demo', 'the demo plays on')
  await page.waitForFunction(() => !window.__stage.conversation().running, null, { timeout: testTimeout(120000) })
  assert.deepEqual(paid(), [], 'the demo asked livliv.ai for nothing: ' + JSON.stringify(paid().map((c) => c.path)))
  await context.close()

  // ---- off, in the desktop shell: an AIRI chat, the card's 试听, the checklist's 测试 and 我来演 typed lines
  ;({ page, context } = await open({ 'livliv-stage:brain': OWN, 'livliv-stage:speech': SPEECH }, { desktop: true }))
  assert.deepEqual(await state(page), { text: false, voice: false, kind: 'openai' }, 'off')
  await cast(page, { lines: 'none' })
  calls.length = 0
  await chat(page)
  assert.equal(await page.evaluate(() => window.__stage.conversation().engine), 'airi', 'the chat ran on AIRI')
  await page.locator('.status-line .st-tag', { hasText: '声音' }).click()
  await page.getByRole('button', { name: '试听', exact: true }).first().click()
  await page.getByRole('button', { name: '试听', exact: true }).first().waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === '试听' && !b.disabled))
  await page.keyboard.press('Escape')
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.setPop('checklist'))
  const checks = page.locator('.popover.checklist')
  for (const name of ['文字', '声音']) {
    await checks.locator('.check', { hasText: name }).first().getByRole('button', { name: '测试', exact: true }).click()
    await checks.locator('.check', { hasText: name }).first().locator('.ok, .error').waitFor({ timeout: testTimeout(30000) })
  }
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.setPop(null))
  ;[me] = await cast(page, { lines: 'me', readAloud: true, driver: 'auto' })
  await typed(page, me)
  assert.deepEqual(paid(), [], 'off: nothing asked of the routes that take points: ' + JSON.stringify(paid().map((c) => c.path)))
  for (const kind of ['own-text', 'own-voice']) assert.ok(calls.some((c) => c.kind === kind), `your own services did the work (${kind}): ` + JSON.stringify(calls.map((c) => c.kind)))
  await context.close()

  // ---- AIRI on livliv.ai's text: a call refused as too long is sent again shorter, its tool round not asked again
  ;({ page, context } = await open({ 'livliv-stage:brain': { kind: 'livliv' }, 'livliv-stage:livliv-voice': '0' }, { desktop: true }))
  await cast(page, { lines: 'none' }, { muted: true })
  const remembered = await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts'), { store } = window.__stage, c = store.get().items.find((i) => i.kind === 'character' && i.lines === 'ai')
    return (await memory.remember({ profileId: c.profileId ?? c.id, scope: 'private', text: '喜欢周末去海边' })).id
  })
  await page.evaluate(async () => { const { talk } = window.__stage; talk.stop(); await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  calls.length = 0; plan.tool = remembered
  // the tool round answered, the call after it refused once: sent again, trimmed
  await page.route('**/api/stage/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON()
    if (!plan.refusedOnce && body.messages.some((m) => m.role === 'tool')) { plan.refusedOnce = true; calls.push({ kind: 'livliv-text', path: '/api/stage/v1/chat/completions', body, refused: true }); return route.fulfill({ status: 413, json: { detail: '这次对话太长了' } }) }
    return route.fallback()
  })
  assert.equal(await page.evaluate(() => window.__stage.conversation().engine), 'airi')
  await page.evaluate(() => window.__stage.talk.say('还记得我喜欢什么吗'))
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return (c.waitingInput && c.lines.filter((l) => !l.human).length >= 2 && !c.speaking) || !!c.error }, null, { timeout: testTimeout(40000) })
  assert.equal(await page.evaluate(() => window.__stage.conversation().error), '', 'nothing shown')
  const turn = calls.filter((c) => c.kind === 'livliv-text')
  assert.deepEqual(turn.map((c) => [c.body.messages.some((m) => m.role === 'tool'), !!c.refused]), [[false, false], [true, true], [true, false]],
    'the tool round once, the call after it refused and sent again (not the turn from its start): ' + JSON.stringify(turn.map((c) => c.body.messages.map((m) => m.role))))
  assert.ok(JSON.stringify(turn[2].body.messages).length < JSON.stringify(turn[1].body.messages).length, 'sent again shorter')
  await page.unroute('**/api/stage/v1/chat/completions')
  // refused every time: said so, after the same call twice more and no more
  calls.length = 0; plan.refuse = 3
  await page.evaluate(() => window.__stage.talk.say('再说说'))
  await page.waitForFunction(() => !!window.__stage.conversation().error, null, { timeout: testTimeout(30000) })
  assert.match(await page.evaluate(() => window.__stage.conversation().error), /这次对话太长了/)
  assert.equal(calls.filter((c) => c.kind === 'livliv-text').length, 3, 'three tries of the one call')
  plan.refuse = 0
  await page.evaluate(() => window.__stage.talk.stop())
  await context.close()

  // ---- the prices, from the site, by the two parts; 声音 never chosen stays off with voices of your own ready
  ;({ page, context } = await open({ 'livliv-stage:brain': { kind: 'livliv' }, 'livliv-stage:speech': SPEECH }))
  assert.deepEqual(await state(page), { text: true, voice: false, kind: 'livliv' }, 'a saved livliv brain with a speech service of your own: 声音 stays off')
  await page.evaluate(async () => (await import('/src/shell/ui.ts')).ui.openModels('chat'))
  const section = page.locator('.connect-section.livliv')
  await section.locator('.livliv-parts .switch').nth(1).click()
  assert.deepEqual(await section.locator('.livliv-parts .price').allInnerTexts(), ['0.2 积分/句', '0.3 积分/句'])
  assert.equal(await section.locator('.switch.main .hint').count(), 0, 'on: the prices say it, not 按积分')
  await context.close()

  assert.deepEqual(errors, [])
  console.log('test:livliv-free passed')
} catch (e) {
  console.error(e); process.exitCode = 1
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
