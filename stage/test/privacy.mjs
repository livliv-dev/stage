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
let server, browser, page
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/fixture-ai/chat/completions') {
      calls.push(route.request().postData() ?? '')
      await route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '好的，我听着。', emotion: 'neutral', action: 'none', cues: [] }) } }] } }).catch(() => {})
      return
    }
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) await route.continue()
    else await route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(testTimeout(20000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  const profile = await page.evaluate(async ({ SECRET, PUBLIC }) => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts')
    const { fromPngs } = await import('/src/library.ts'), { saveBrainConfig } = await import('/src/brain.ts'), { memory } = await import('/src/memory.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#7bb6e8'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。'); character.muted = true; store.add(character); store.select(null)
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

  await page.screenshot({ path: join(artifacts, 'privacy.png') })
  assert.deepEqual(errors, [])
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser?.close()
  server?.kill()
}
