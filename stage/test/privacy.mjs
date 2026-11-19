// Private chat and outputs: while any output is on (a recording, the OBS output window, ...) a session is public. A
// private chat that a recording starts during goes on in public: the next model request carries no private memory and
// no private line, and what is said goes to the public record. Model calls go to a fixture.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-privacy-'))
const SECRET = 'PAPAYA-913', PUBLIC = 'KIWI-204'
const errors = [], calls = [], report = { artifacts }
// delay: how long the fixture model takes; its reply says whether the request it answers carried the private memory
let server, browser, page, delay = 0, long = false
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-ai/chat/completions') {
      const body = route.request().postData() ?? ''; calls.push(body)
      const text = (body.includes(SECRET) ? 'TAINTED-' : 'CLEAN-') + calls.length + (long ? ' 好的，我们慢慢聊，这一句会说得比较久，录制会在它说到一半时开始。' : ' 好的，我听着。')
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text, emotion: 'neutral', action: 'none', cues: [] }) } }] } }).catch(() => {})
      return
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(20000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  const profile = await page.evaluate(async ({ SECRET, PUBLIC }) => {
    const { store, emptyScene, newCharacter, captionBar } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts'), { saveBrainConfig } = await import('/src/brain.ts'), { memory } = await import('/src/memory.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#7bb6e8'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。'); character.muted = true; store.add(character); store.add(captionBar(store.get())); store.select(null)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
    const profileId = character.profileId ?? character.id
    await memory.remember({ profileId, scope: 'private', text: '私人暗号是 ' + SECRET })
    await memory.remember({ profileId, scope: 'public', text: '公开爱好是 ' + PUBLIC })
    return profileId
  }, { SECRET, PUBLIC })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  const conv = () => page.evaluate(() => { const c = window.__stage.conversation(); return { running: c.running, mode: c.mode, scope: c.scope, sessionId: c.sessionId, output: c.output, error: c.error, lines: c.lines.map((l) => l.text) } })
  const tag = page.locator('.console .scope-tag')
  const send = async (text) => {
    const before = calls.length
    await page.getByRole('textbox', { name: '你说的话', exact: true }).fill(text)
    await page.getByRole('button', { name: '说', exact: true }).click()
    await page.waitForFunction((text) => { const c = window.__stage.conversation(); return c.lines.some((l) => l.text === text) && c.waitingInput && !c.speaking }, text)
    assert.ok(calls.length > before, 'the line got an answer')
    return calls.slice(before).join('\n')
  }
  const sessions = (scope) => page.evaluate(async ({ profile, scope }) => (await (await import('/src/memory.ts')).memory.sessions([profile], scope)).map((s) => ({ id: s.id, lines: s.lines.map((l) => l.text) })), { profile, scope })

  // no output: the tag chooses, private by default, and a private chat reads private memories
  assert.equal((await tag.innerText()).trim(), '私聊'); assert.equal(await tag.isEnabled(), true)
  await page.locator('.console .run .primary').click()
  await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingInput)
  assert.equal((await conv()).scope, 'private'); assert.equal(await tag.isDisabled(), true, 'the scope is fixed while a session runs')
  const privateRequest = await send('私下说一句：今天有点累。')
  assert.match(privateRequest, new RegExp(SECRET), 'a private chat reads private memories')
  const privateSession = (await conv()).sessionId

  // a recording starts during it: from here on it is public, with no private memory and no private line in context
  await page.getByRole('button', { name: '录制', exact: true }).click()
  await page.locator('.popover.record .row.end .primary').click()
  await page.waitForFunction(() => window.__stage.recording().phase === 'recording')
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.mode === 'chat' && c.scope === 'public' && !!c.sessionId })
  const during = await conv()
  assert.notEqual(during.sessionId, privateSession, 'the public record is another conversation')
  assert.ok(!during.lines.some((line) => line.includes('今天有点累')), 'no private line stays on show')
  assert.equal((await tag.innerText()).trim(), '公开记忆'); assert.equal(await tag.isDisabled(), true)
  assert.equal(await page.evaluate(() => window.__stage.talk.setScope('private')), false, 'private can not be chosen while recording')
  const publicRequest = await send('大家好，这段在录像。')
  assert.doesNotMatch(publicRequest, new RegExp(SECRET), 'no private memory reaches the model while recording')
  assert.doesNotMatch(publicRequest, /今天有点累/, 'no private line reaches the model while recording')
  assert.match(publicRequest, new RegExp(PUBLIC), 'public memories still do')
  report.recordingSwitch = 'private chat → recording starts → public session, request has public memory only'

  // what was said while recording is in the public record, not the private one
  await page.evaluate(async () => { await window.__stage.rec.stop(); window.__stage.talk.stop() })
  await page.waitForFunction(() => !window.__stage.conversation().running && !['starting', 'recording'].includes(window.__stage.recording().phase))
  await page.waitForTimeout(300)
  const publicSaved = await sessions('public'), privateSaved = await sessions('private')
  assert.ok(publicSaved.some((s) => s.lines.includes('大家好，这段在录像。')), 'the recording\'s transcript is saved as public: ' + JSON.stringify(publicSaved))
  assert.ok(!publicSaved.some((s) => s.lines.includes('私下说一句：今天有点累。')))
  assert.ok(privateSaved.some((s) => s.lines.includes('私下说一句：今天有点累。')))
  assert.ok(!privateSaved.some((s) => s.lines.includes('大家好，这段在录像。')))
  report.saved = { public: publicSaved.length, private: privateSaved.length }

  // all outputs off again: private works as before
  await page.waitForFunction(() => !window.__stage.conversation().output)
  assert.equal((await tag.innerText()).trim(), '私聊'); assert.equal(await tag.isEnabled(), true)

  // a session started while an output is on starts public: 对谈 while recording
  await page.evaluate(async () => { await window.__stage.rec.start({ mic: false, talk: false }) })
  await page.waitForFunction(() => window.__stage.recording().phase === 'recording')
  assert.equal((await tag.innerText()).trim(), '公开记忆')
  const before = calls.length
  await page.evaluate(() => window.__stage.talk.start())
  await page.waitForFunction(() => window.__stage.conversation().running)
  for (let i = 0; i < 100 && calls.length === before; i++) await page.waitForTimeout(100)
  assert.equal((await conv()).scope, 'public', '对谈 started while recording is public')
  assert.ok(calls.length > before); assert.doesNotMatch(calls.slice(before).join('\n'), new RegExp(SECRET))
  await page.evaluate(async () => { window.__stage.talk.stop(); await window.__stage.rec.stop() })
  await page.waitForFunction(() => !window.__stage.conversation().output, null, { timeout: 30000 })

  // the OBS output window opens during a private chat: the same switch, and the output never sees a private line
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  await page.locator('.console .run .primary').click()
  await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingInput)
  assert.equal((await conv()).scope, 'private')
  await send('再私下说一句：别告诉别人。')
  await page.evaluate(() => {
    const output = window.privacyOutput = new BroadcastChannel('livliv-stage')
    window.privacyMirrors = []
    output.onmessage = ({ data }) => { if (data.t === 'conv') window.privacyMirrors.push(data.conv) }
    output.postMessage({ t: 'hello' })
  })
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.scope === 'public' && !!c.sessionId })
  const outputRequest = await send('输出窗口开着时说的话。')
  assert.doesNotMatch(outputRequest, new RegExp(SECRET)); assert.doesNotMatch(outputRequest, /别告诉别人/)
  const mirrors = await page.evaluate(() => { window.privacyOutput.postMessage({ t: 'bye' }); window.privacyOutput.close(); return window.privacyMirrors })
  assert.ok(mirrors.length)
  assert.doesNotMatch(JSON.stringify(mirrors), /别告诉别人|今天有点累/, 'the output window never gets a private line')
  await page.evaluate(() => window.__stage.talk.stop())
  report.outputWindow = 'private chat → output window opens → public session; the output only ever mirrors public lines'

  const memories = (scope) => page.evaluate(async ({ profile, scope }) => (await (await import('/src/memory.ts')).memory.context([profile], scope)).memories.map((m) => m.text), { profile, scope })
  const outputsOff = async () => {
    delay = 0
    await page.evaluate(async () => { window.__stage.talk.stop(); if (['starting', 'recording'].includes(window.__stage.recording().phase)) await window.__stage.rec.stop() })
    await page.waitForFunction(() => !window.__stage.conversation().output && !window.__stage.conversation().running, null, { timeout: 30000 })
  }
  const record = () => page.evaluate(async () => { await window.__stage.rec.start({ mic: false, talk: false }) })
  const nextCall = async (before) => { for (let i = 0; i < 100 && calls.length === before; i++) await page.waitForTimeout(100); assert.ok(calls.length > before, 'the model was asked') }

  // a turn in flight when the recording starts: its reply was made from the private memory, so it is cut and dropped,
  // never shown or saved in public, and the chat waits for you instead of answering again on its own
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  await page.locator('.console .run .primary').click()
  await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingInput)
  delay = 3000
  let mark = calls.length
  await page.evaluate(() => window.__stage.talk.say('私下再说一句。'))
  await nextCall(mark)
  assert.match(calls.at(-1), new RegExp(SECRET), 'the turn in flight was made from the private memory')
  await record()
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.scope === 'public' && !c.thinking && !c.speaking }, null, { timeout: 2000 })
  const atSwitch = calls.length
  await page.waitForTimeout(testTimeout(4500))
  const afterInFlight = await conv()
  assert.equal(afterInFlight.running, true); assert.equal(afterInFlight.scope, 'public')
  assert.ok(!afterInFlight.lines.some((line) => line.includes('TAINTED')), 'the reply made in private is never shown: ' + JSON.stringify(afterInFlight.lines))
  assert.equal(calls.length, atSwitch, 'after the switch the chat waits for you, it does not answer again by itself')
  assert.ok(!JSON.stringify(await sessions('public')).includes('TAINTED'), 'the reply made in private is not saved in public')
  await outputsOff()
  report.turnInFlight = 'a reply in flight at the switch is cut, never shown or saved in public; no new turn by itself'

  // a line being said when the recording starts (made from the private memory): it stops there, marked cut
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  await page.locator('.console .run .primary').click()
  await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingInput)
  long = true
  const privateId = await page.evaluate(() => window.__stage.conversation().sessionId)
  await page.evaluate(() => window.__stage.talk.say('说一段长一点的。'))
  const spoken = await page.waitForFunction(() => { const line = window.__stage.conversation().speaking; return line?.text.startsWith('TAINTED') && line.id })
  const spokenId = await spoken.jsonValue()
  await record()
  await page.waitForFunction(() => !window.__stage.conversation().speaking, null, { timeout: 1000 })
  await page.waitForTimeout(500)
  const cutLine = await page.evaluate(async ({ id, line }) => (await (await import('/src/memory.ts')).memory.session(id)).lines.find((entry) => entry.id === line), { id: privateId, line: spokenId })
  assert.equal(cutLine?.cut, true, 'the line being said at the switch is cut: ' + JSON.stringify(cutLine))
  long = false
  await outputsOff()
  report.lineBeingSaid = 'a private-made line being said at the switch stops at once (cut)'

  // 对谈 with a line made ahead and your lines waiting behind the one being said: on the switch they are dropped, not
  // said or remembered in public (typed, and transcribed)
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  delay = 2500
  mark = calls.length
  await page.evaluate(() => window.__stage.talk.start())
  await nextCall(mark)
  await page.evaluate(() => { window.__stage.talk.say('记住 我的保险箱密码是 MANGO-55'); window.__stage.talk.say('记住 我的门禁卡是 LEMON-77', { transcribed: true }) })
  assert.ok(!(await conv()).lines.some((line) => line.includes('MANGO')), 'the typed line waits behind the turn')
  await record()
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.scope === 'public' && !!c.sessionId })
  await page.waitForTimeout(testTimeout(5000))
  const queued = await conv()
  assert.match(queued.error, /私聊输入已丢弃/)
  assert.ok(!queued.lines.some((line) => /MANGO|LEMON|TAINTED/.test(line)), 'nothing from the private 对谈 is on show: ' + JSON.stringify(queued.lines))
  const publicMemories = await memories('public'), privateMemories = await memories('private')
  assert.ok(!publicMemories.some((text) => /MANGO|LEMON/.test(text)), 'queued 记住 lines are not remembered in public: ' + JSON.stringify(publicMemories))
  assert.ok(!privateMemories.some((text) => /MANGO|LEMON/.test(text)), 'nor in private while an output is on')
  assert.ok(!/MANGO|TAINTED/.test(JSON.stringify(await sessions('public'))), 'nor saved in the public record')
  await outputsOff()
  report.queuedInput = 'typed and transcribed 记住 lines queued in a private 对谈 are dropped at the switch, remembered nowhere'

  // nothing running, the private record on show: a recording switches what is on show (and on tape) to the public record
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.text === '私下再说一句。'))
  await record()
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.scope === 'public' && !c.running })
  await page.waitForTimeout(500)
  const idle = await conv()
  assert.ok(!idle.lines.some((line) => /私下|别告诉别人|今天有点累/.test(line)), 'no private line on show while recording: ' + JSON.stringify(idle.lines))
  // a template change or a reopened record during the recording stays public too
  await page.evaluate(async () => { window.__stage.talk.detach(); await window.__stage.talk.restore() })
  const restored = await conv()
  assert.equal(restored.scope, 'public'); assert.ok(!restored.lines.some((line) => /私下|别告诉别人|今天有点累/.test(line)))
  await outputsOff()
  // the tape itself keeps only what an output may show, whatever the conversation's record
  await page.evaluate(async () => { await window.__stage.talk.setScope('private') })
  await page.waitForFunction(() => window.__stage.conversation().scope === 'private' && window.__stage.conversation().lines.length > 0)
  const taped = await page.evaluate(async () => {
    const { record } = await import('/src/tape.ts'), { spans, subtitleAt } = await import('/src/paint.ts'), { store } = await import('/src/scene.ts')
    const r = await record(false); await new Promise((resolve) => setTimeout(resolve, 1200)); const take = await r.stop()
    const scene = store.get(), item = scene.items.find((i) => i.kind === 'subtitle'), sp = spans(take.convs)
    return { lines: take.convs.flatMap((c) => c.lines.map((l) => l.text)), subtitles: [0.1, 1].map((t) => subtitleAt(item, scene, take.convs[0], sp, t)?.words ?? null) }
  })
  assert.deepEqual(taped.lines, [], 'a take of a private record keeps no line'); assert.deepEqual(taped.subtitles, [null, null])
  report.idle = 'idle private record: a recording shows the public record, detach/restore stays public, the tape keeps no private line'

  // an output coming on while a private chat opens its record: it goes on in public, no error
  await page.evaluate(async () => {
    const { memory } = await import('/src/memory.ts'), { chatHistory } = await import('/src/chatHistory.ts')
    window.__latest = memory.latest; memory.latest = async (...args) => { await new Promise((resolve) => setTimeout(resolve, 800)); return window.__latest.apply(memory, args) }
    chatHistory.reset()
    void window.__stage.talk.startChat('private').catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 100))
    const output = window.raceOutput = new BroadcastChannel('livliv-stage'); output.postMessage({ t: 'hello' })
  })
  await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.scope === 'public' && !!c.sessionId }, null, { timeout: 10000 })
  await page.waitForTimeout(1500)
  const raced = await conv()
  assert.equal(raced.running, true); assert.equal(raced.error, '', 'no error from the record that was opening')
  await page.evaluate(async () => { const { memory } = await import('/src/memory.ts'); memory.latest = window.__latest; window.raceOutput.postMessage({ t: 'bye' }); window.raceOutput.close() })
  await outputsOff()
  report.openRace = 'an output during a private chat\'s start: the chat runs in public, no error'

  await page.screenshot({ path: join(artifacts, 'privacy.png') })
  assert.deepEqual(errors, [])
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  server?.kill()
}
