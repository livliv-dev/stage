// livliv.ai on, on the site's build (VITE_STAGE_HOST=livliv): what Stage asks the site for. Each line is written by
// livliv.ai's text (/api/stage/v1) and voiced by one /say call only when it will be heard in the character's livliv.ai
// voice; 仅字幕, a character on the system voice and a muted one ask for no voice. Space never starts paid lines: with the
// demo's three on the stage it plays the free demo, and with a model of one's own in a livliv.ai voice it starts nothing.
// 对谈 answers a waiting viewer, and a clip that won't play doesn't end it. In 持续聊天, a line in a livliv.ai voice is one
// /say call, not one a sentence. The site is faked: nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), errors = []
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
const clip = await readFile(join(root, 'public/demo/trio/01.mp3'))
let server, browser, page
const asked = [], said = [], requests = []
let badClips = 0  // the next n line clips come back as bytes no player can play
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: 'livliv' } })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: FLAGS })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url())
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: true, email: 'member@example.test', points: 10, plan: 'plus', record_seconds: 300, record_mark: false, stage_line_points: 0.5, stage_silent_free: true } })
    if (url.pathname === '/api/stage/v1/chat/completions') {
      const body = req.postDataJSON(); requests.push(body); asked.push(body)
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '今天的风好舒服。', emotion: 'happy', action: 'none', to: null, look: null }) } }] } })
    }
    if (url.pathname === '/api/chat/say/line.mp3') {
      if (badClips > 0) { badClips--; return route.fulfill({ body: Buffer.from('not a sound'), contentType: 'audio/mpeg' }) }
      return route.fulfill({ body: clip, contentType: 'audio/mpeg' })
    }
    if (/^\/api\/chat\/[^/]+\/say$/.test(url.pathname)) {
      said.push(url.pathname)
      return route.fulfill({ json: { lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 9 } })
    }
    if (url.pathname === '/fixture-ai/chat/completions') {
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '你好呀。今天想聊点什么？我们慢慢说。', emotion: 'happy', action: 'none', to: null, look: null }) } }] } })
    }
    if (/^\/api\/chat\/[^/]+\/voices$/.test(url.pathname)) return route.fulfill({ json: { voices: [{ id: 'Cherry', name: 'Cherry', desc: '' }], voice: 'Cherry', own: null } })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    if (url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(origin + '/', { waitUntil: 'networkidle' })
  // the first visit: the demo's three on the stage, signed in, LivLiv the AI's model
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 3 && a.every((x) => x.status === 'ready') }, null, { timeout: 60000 })
  // the first visit's start page over them, closed: the console's model tag says livliv.ai
  await page.locator('.start-overlay .start-page [data-close]').click()
  await page.locator('.status-line .st-tag', { hasText: 'livliv.ai' }).waitFor()
  const conv = () => page.evaluate(() => { const c = window.__stage.conversation(); return { running: c.running, error: c.error } })
  const ai = () => page.evaluate(() => window.__stage.store.get().items.filter((i) => i.kind === 'character' && i.lines === 'ai').map((i) => i.id))
  const patchAll = (p) => page.evaluate(({ ids, p }) => { for (const id of ids) { const c = window.__stage.store.get().items.find((i) => i.id === id); window.__stage.store.patch(id, typeof p === 'string' ? { voice: { ...c.voice, source: p } } : p) } }, { ids: p.ids, p: p.patch })
  /** starts a run, waits for its first line to be said, stops it: whether that line was voiced by livliv.ai */
  async function first(start) {
    asked.length = 0; said.length = 0
    await page.evaluate(start)
    for (let i = 0; i < 300 && !(asked.length && (said.length || (await page.evaluate(() => window.__stage.conversation().lines.some((l) => !l.human))))); i++) await page.waitForTimeout(100)
    await page.waitForTimeout(300)
    await page.evaluate(() => window.__stage.talk.stop())
    assert.ok(asked.length, 'a line was asked for: ' + JSON.stringify(await conv()))
    return { voice: said.length > 0 }
  }
  const ids = await ai()
  assert.equal(ids.length, 3)

  // Space with the demo's three: the free demo, nothing asked of the site
  await page.locator('.stage').click({ position: { x: 5, y: 5 } }).catch(() => {})
  await page.keyboard.press('Space')
  await page.waitForTimeout(1500)
  assert.equal(asked.length, 0, 'Space asks for no paid line')
  assert.equal(await page.evaluate(() => window.__stage.conversation().running), true, 'Space plays the demo')
  await page.evaluate(() => window.__stage.talk.stop())
  // the demo set the brain to the demo for this run: back to LivLiv, as the model card's LivLiv does
  await page.evaluate(async () => (await import('/src/brain.ts')).playDemo(false))

  // 对谈, the livliv.ai voice: the line from livliv.ai's text, its voice from /say in the character's own
  const talkLine = await first(() => window.__stage.talk.start())
  assert.equal(talkLine.voice, true, '对谈 with the livliv.ai voice asks for it')
  assert.equal(asked[0].model, 'livliv', "livliv.ai's model writes the line")
  assert.ok(said.every((path) => /^\/api\/chat\/(d03ft|k01|v04)\/say$/.test(path)), 'each in its own voice on the site: ' + JSON.stringify(said))
  // 对谈 with a viewer waiting (对谈时回应弹幕 on): the public session, and the line answers them
  {
    const from = requests.length
    await page.evaluate(async () => {
      window.__stage.store.setTalk({ danmaku: 2 }); window.__realRandom = Math.random; Math.random = () => 0  // 积极, and taken now
      ;(await import('/src/danmaku.ts')).simulate('Viewer', '主播们好')
    })
    await first(() => window.__stage.talk.start())
    await page.evaluate(() => { Math.random = window.__realRandom; window.__stage.store.setTalk({ danmaku: 1 }) })
    assert.ok(requests.slice(from).some((r) => JSON.stringify(r.messages).includes('主播们好')), '对谈 answers a waiting viewer')
  }
  // 对谈: a clip that won't play keeps its subtitle, and the talk goes on to the next line
  {
    badClips = 1; asked.length = 0
    await page.evaluate(() => window.__stage.talk.start())
    for (let i = 0; i < 300 && asked.length < 3; i++) await page.waitForTimeout(100)
    const after = await conv()
    await page.evaluate(() => window.__stage.talk.stop())
    assert.equal(badClips, 0, 'a bad clip was served')
    assert.ok(asked.length >= 3, 'the talk went on after a clip failed: ' + JSON.stringify(after))
    assert.equal(after.error, '', 'and it did not stop with an error')
  }
  // AI 直播, 仅字幕: no voice
  const textOnly = await first(async () => {
    window.__stage.talk.startLive({ minutes: 5, maxGenerations: 3, warmupSeconds: 0, textOnly: true })
    await new Promise((r) => setTimeout(r, 300));
    (await import('/src/danmaku.ts')).simulate('Viewer', '你们好呀')
  })
  assert.equal(textOnly.voice, false, '仅字幕 asks for no voice')
  // the system voice: said by the browser, the site's not asked for
  await patchAll({ ids, patch: 'system' })
  const system = await first(() => window.__stage.talk.start())
  assert.equal(system.voice, false, 'a character on the system voice asks for no LivLiv voice')
  // muted: not heard, so not voiced
  await patchAll({ ids, patch: 'livliv' }); await patchAll({ ids, patch: { muted: true } })
  const muted = await first(() => window.__stage.talk.start())
  assert.equal(muted.voice, false, 'a muted character asks for no voice')
  // 持续聊天 with a model of one's own (livliv.ai's text off) and its voices on: a three-sentence reply is one /say, as
  // each call is charged
  {
    await patchAll({ ids, patch: { muted: false } }); await patchAll({ ids, patch: 'livliv' })
    await page.evaluate(async () => (await import('/src/brain.ts')).saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' }))
    // Space with a model of one's own but livliv.ai's voices: every line would be a paid /say, so Space starts nothing
    said.length = 0
    await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Space')
    await page.locator('.toast').filter({ hasText: '用积分的台词' }).waitFor()
    await page.waitForTimeout(1500)
    assert.equal((await conv()).running, false, 'Space starts no session voiced in the LivLiv voice')
    assert.deepEqual(said, [], 'Space asks for no /say')
    await page.evaluate(() => { void window.__stage.talk.startChat('private') })
    await page.waitForFunction(() => window.__stage.conversation().waitingInput, null, { timeout: 60000 })
    const before = await page.evaluate(() => window.__stage.conversation().turns)
    said.length = 0
    await page.evaluate(() => window.__stage.talk.say('你好'))
    await page.waitForFunction((t) => { const c = window.__stage.conversation(); return c.turns > t && c.waitingInput && !c.speaking }, before, { timeout: 60000 })
    await page.evaluate(() => window.__stage.talk.stop())
    assert.equal(said.length, 1, 'one /say for the three-sentence line: ' + JSON.stringify(said))
    await page.evaluate(async () => (await import('/src/brain.ts')).saveBrainConfig({ kind: 'livliv' }))
  }
  assert.deepEqual(errors, [])
  // Space with 免按键 while livliv.ai's voices are on: what you say would be recognised through livliv.ai, which charges
  // each utterance; from a key it starts nothing (the button does)
  {
    await page.evaluate(() => window.__stage.talk.stop())
    await patchAll({ ids, patch: 'system' })
    await page.evaluate(async () => {
      (await import('/src/brain.ts')).saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
      window.__stage.store.setTalk({ goal: 'chat', audience: 'me', you: 'handsfree' })
    })
    await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Space')
    await page.locator('.toast').filter({ hasText: '用积分识别语音' }).waitFor()
    await page.waitForTimeout(1000)
    assert.equal((await conv()).running, false, 'Space starts no session with recognition paid in points')
    assert.equal(await page.locator('.handsfree-status').count(), 0, 'hands-free stays off')
    await page.evaluate(() => window.__stage.store.setTalk({ you: 'type' }))
  }
  console.log(JSON.stringify({ talk: talkLine, textOnly, system, muted, say: said.length }))
} catch (e) {
  console.error(e); process.exitCode = 1
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
