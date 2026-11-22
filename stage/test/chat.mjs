import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-chat-'))
let server, browser, page
const errors = [], calls = []
let slow = false, pendingCalls = 0, reactionCase = false
function wav() {
  const rate = 24000, samples = reactionCase ? 48000 : 2400, buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  return buffer
}
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-ai/chat/completions') {
      const body = route.request().postDataJSON(), payload = JSON.parse(body.messages[1].content)
      calls.push({ body, payload }); pendingCalls++
      if (payload.actions) { await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ name: 'choose', data: { slot: 1 } }) } }] } }).catch(() => {}); pendingCalls--; return }
      const delayed = slow
      if (delayed) await new Promise((resolve) => setTimeout(resolve, 1500))
      const text = reactionCase === 'silent' ? '' : reactionCase ? 'That helped!     Thank you, Kai!' : delayed ? '这条旧回答不能播放。' : '我接着刚才的具体内容说。还有一个问题值得继续聊。'
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text, listeners: reactionCase ? [{ who: 'Kai', at: 0.8, feeling: 'curious', action: 'tilt' }] : [], emotion: 'happy', action: 'nod', cues: [{ at: 0, feeling: 'curious' }, { at: .7, feeling: 'happy' }], summary: '开头约定：用户的暗号是橘子；讨论还没有结束。' }) } }] } }).catch(() => {})
      pendingCalls--; return
    }
    if (url.pathname === '/fixture-ai/audio/speech') { await route.fulfill({ contentType: 'audio/wav', body: wav() }).catch(() => {}); return }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(15000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts')
    const { saveBrainConfig } = await import('/src/brain.ts'), { saveSpeech } = await import('/src/voiceApi.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。'); character.voice.source = 'api'; store.add(character); store.select(character.id)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
    saveSpeech({ provider: 'openai', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-tts', voice: 'alloy', asr: 'fixture-asr' })
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  await page.evaluate(() => { window.__speechEvents = []; window.__stage.talk.onSpeech((event) => window.__speechEvents.push(event)) })
  await page.locator('.console .start-button').click()
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.equal(await page.evaluate(() => window.__speechEvents.filter((event) => event.final === true).length), 1, 'segmented replies publish only one final speech event')
  const send = async (text) => {
    const before = await page.evaluate(() => window.__stage.conversation().turns)
    await page.getByRole('textbox', { name: '你说的话', exact: true }).fill(text)
    await page.getByRole('button', { name: '说', exact: true }).click()
    await page.waitForFunction((turns) => { const state = window.__stage.conversation(); return state.turns > turns && state.waitingInput && !state.speaking }, before)
  }
  await send('记住：我的暗号是橘子。')
  for (let i = 0; i < 9; i++) await send(`继续讨论第 ${i} 个具体细节。`)
  assert.ok(calls.some((call) => call.payload.earlier.includes('橘子')), 'a rolling recap reaches subsequent model calls')
  assert.ok(calls.at(-1).payload.memories.some((memory) => memory.includes('橘子')), 'explicit remember commands persist facts before the reply')
  const privateId = await page.evaluate(() => window.__stage.conversation().sessionId)
  await page.evaluate(() => window.__stage.talk.stop())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction((id) => window.__stage.conversation().sessionId === id && window.__stage.conversation().lines.some((line) => line.text.includes('暗号')), privateId)
  await page.locator('.console .start-button').click()
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  const beforeCalls = calls.length
  slow = true
  await page.evaluate(() => window.__stage.talk.say('旧问题'))
  await page.waitForFunction(() => !!window.__stage.conversation().thinking)
  await page.waitForTimeout(120)
  slow = false
  await page.evaluate(() => window.__stage.talk.say('改问新的问题'))
  await page.waitForFunction(() => window.__stage.conversation().waitingInput && window.__stage.conversation().lines.some((line) => line.text === '改问新的问题'))
  await page.waitForTimeout(1700)
  assert.ok(calls.length >= beforeCalls + 2)
  assert.equal(await page.evaluate(() => window.__stage.conversation().lines.some((line) => line.text.includes('旧回答'))), false, 'a cancelled model response never becomes spoken history')
  await page.evaluate(() => window.__stage.talk.stop())
  await page.evaluate(() => window.__stage.talk.startChat('public'))
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.ok(!calls.at(-1).payload.history.includes('暗号') && !calls.at(-1).payload.earlier.includes('橘子'))
  assert.deepEqual(calls.at(-1).payload.memories, [], 'public sessions never receive private memory')
  const dialogueAccepted = await page.evaluate(async () => {
    const { talk, conversation } = window.__stage
    talk.externalDialogue({ id: 'npc', started: true })
    talk.externalEvent({ id: 'event-one', source: 'Game fixture', message: '轮到你评价这一回合。', reply: 'always' })
    return { running: conversation().running, scope: conversation().scope }
  })
  assert.equal(dialogueAccepted.scope, 'public')
  const beforeDialogue = calls.length; await page.waitForTimeout(350); assert.equal(calls.length, beforeDialogue, 'game dialogue blocks speech generation')
  const decision = await page.evaluate(async () => { const character = [...window.__stage.actors.values()][0].item.id; return window.__stage.talk.decideExternalAction({ character, source: 'Game fixture', state: 'NPC is speaking', query: 'Choose slot 1', actions: [{ name: 'choose', description: 'Choose a slot', schema: { type: 'object', properties: { slot: { type: 'integer' } }, required: ['slot'] } }], priority: 'low', silent: true }, new AbortController().signal) })
  assert.deepEqual(decision, { name: 'choose', data: { slot: 1 } }, 'game actions continue during NPC speech')
  await page.evaluate(() => window.__stage.talk.externalDialogue({ id: 'npc', started: false }))
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.ok(calls.length > beforeDialogue + 1)
  await page.evaluate(() => window.__stage.talk.stop())
  await page.evaluate(() => window.__stage.store.setTalk({ chatGenerations: 2 }))
  await page.evaluate(() => window.__stage.talk.startChat('public'))
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  slow = true
  const budgetStart = calls.length
  await page.evaluate(() => window.__stage.talk.say('限额内的旧问题'))
  await page.waitForFunction(() => !!window.__stage.conversation().thinking)
  await page.waitForTimeout(100)
  slow = false
  await page.evaluate(async () => { const character = [...window.__stage.actors.values()][0].item.id; await window.__stage.talk.decideExternalAction({ character, source: 'Game fixture', query: 'Choose', actions: [{ name: 'choose', description: 'Choose a slot' }], priority: 'critical', silent: true }, new AbortController().signal) })
  await page.waitForFunction(() => !window.__stage.conversation().running)
  await page.waitForTimeout(1600)
  assert.equal(calls.length - budgetStart, 2, 'a priority game decision consumes the last generation without restarting a third response')
  assert.match(await page.evaluate(() => window.__stage.conversation().ended), /生成次数上限/)
  await page.evaluate(() => window.__stage.store.setTalk({ chatGenerations: 100 }))
  await page.evaluate(() => window.__stage.talk.startChat('private'))
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  await page.evaluate(() => window.__stage.talk.externalDialogue({ id: 'ignored-private-npc', started: true }))
  await send('私聊继续正常回应。')
  await page.evaluate(() => { const { store } = window.__stage; store.duplicate([...window.__stage.actors.values()][0].item.id) })
  await page.waitForFunction(() => !window.__stage.conversation().running)
  assert.equal(await page.evaluate(() => { const cast = window.__stage.store.get().items.filter((item) => item.kind === 'character'); return cast.length === 2 && cast[0].profileId !== cast[1].profileId }), true, 'duplicated characters use independent profiles')
  await page.getByRole('button', { name: '对话记录', exact: true }).click()
  await page.getByRole('tab', { name: '记忆', exact: true }).click()
  await page.locator('.memory-entry').getByText('我的暗号是橘子。', { exact: true }).waitFor()
  assert.ok(await page.locator('.console .run-bar input').evaluate((input) => input.getBoundingClientRect().width >= 120), 'topic remains usable at desktop width')
  await page.screenshot({ path: join(artifacts, 'chat-memory-1440.png') })
  await page.setViewportSize({ width: 1280, height: 800 }); assert.ok(await page.locator('.console .run-bar input').evaluate((input) => input.getBoundingClientRect().width >= 120), 'topic remains usable at 1280px'); await page.screenshot({ path: join(artifacts, 'chat-memory-1280.png') })
  reactionCase = true
  await page.evaluate(async () => {
    const { Actor, onHeard } = await import('/src/actors.ts')
    const cast = [...window.__stage.actors.values()]
    window.reactionSpeaker = cast[0].item.id; window.reactionListener = cast[1].item.id
    window.__stage.store.patch(cast[1].item.id, { name: 'Kai', reactions: { ...cast[1].item.reactions, listen: true, cooldownSeconds: 0 } })
    window.listenerEvents = []; window.voiceStarts = []
    const react = Actor.prototype.react
    Actor.prototype.react = function(cue, planned) {
      const applied = react.call(this, cue, planned)
      if (this.item.id === window.reactionListener && applied) window.listenerEvents.push({ cue, text: window.__stage.conversation().speaking?.text, at: performance.now() })
      return applied
    }
    onHeard(heard => { if (heard.who === window.reactionSpeaker) window.voiceStarts.push(performance.now()) })
  })
  const startReaction = async (listen, scope = 'private') => {
    await page.evaluate(async ({ listen, scope }) => {
      window.__stage.talk.stop(); await window.__stage.talk.newChat()
      const item = window.__stage.store.get().items.find(item => item.id === window.reactionListener)
      window.__stage.store.patch(item.id, { reactions: { ...item.reactions, listen } })
      window.listenerEvents = []; window.voiceStarts = []
      void window.__stage.talk.startChat(scope, window.reactionSpeaker)
    }, { listen, scope })
  }
  await startReaction(true)
  await page.waitForFunction(() => window.__stage.conversation().waitingInput && window.listenerEvents.length === 1)
  const reaction = await page.evaluate(() => ({ events: window.listenerEvents, starts: window.voiceStarts }))
  assert.equal(reaction.events[0].text, 'Thank you, Kai!', 'a late listener cue survives whitespace between speech segments')
  assert.ok(reaction.events[0].at >= reaction.starts[1], 'the reaction follows the second sentence audio start')
  await startReaction(false)
  await page.waitForFunction(() => window.__stage.conversation().waitingInput)
  assert.equal(await page.evaluate(() => window.listenerEvents.length), 0, 'the per-character listening switch suppresses content reactions')
  await startReaction(true)
  await page.waitForFunction(() => !!window.__stage.conversation().speaking)
  await page.evaluate(() => window.__stage.talk.stop())
  await page.waitForTimeout(4500)
  assert.equal(await page.evaluate(() => window.listenerEvents.length), 0, 'stopped replies leave no pending listener gesture')
  await startReaction(true, 'public')
  await page.waitForFunction(() => window.__stage.conversation().waitingInput && window.listenerEvents.length === 1)
  reactionCase = 'silent'
  await page.evaluate(() => { window.listenerEvents = []; window.__stage.talk.externalEvent({ id: 'silent-listener', character: window.reactionSpeaker, source: 'Game fixture', message: '只需要用表情回应这一幕。', reply: 'always' }) })
  await page.waitForFunction(() => window.listenerEvents.length === 1 && window.__stage.conversation().waitingInput)
  assert.equal(await page.evaluate(() => window.listenerEvents[0].text), undefined, 'a silent event can react without inventing a spoken line')
  await page.evaluate(() => window.__stage.talk.stop())

  assert.deepEqual(errors, [])
  await writeFile(join(artifacts, 'report.json'), JSON.stringify({ calls: calls.length, privateSession: privateId, errors, artifacts }, null, 2))
  console.log(JSON.stringify({ ok: true, calls: calls.length, artifacts }))
} catch (error) {
  if (page) { console.error('Conversation state:', await page.evaluate(() => { const state = window.__stage?.conversation(); return state && { running: state.running, mode: state.mode, turns: state.turns, lines: state.lines.length, error: state.error, storageError: state.storageError } }).catch(() => null)); console.error('Artifacts:', artifacts); await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {}) }
  console.error(error); process.exitCode = 1
} finally { await browser?.close(); server?.kill('SIGTERM') }
