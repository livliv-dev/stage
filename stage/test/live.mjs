// Going live from the site (entry.ts, live.ts, GoLive.tsx, outputFeed.ts), on the site's build (VITE_STAGE_HOST=livliv):
// ?c=<id>&as=face lands in the 开播 shot (green, the character alone, your face and microphone on it), the live keys
// and the three expression modes, the modes and settings a site character's card gives, the shot reused, ?as=ai with
// the AI 直播 panel and the 「AI 生成」 label (editor, output window and recording), the LivLiv mark on the output by
// plan, and poses still reaching the output while the editor's page is hidden. That last part drives Chromium over
// raw CDP: Playwright keeps every page it controls "visible" (its focus emulation counts as a capture).
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-live-')), errors = [], report = { artifacts }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required']
let server, browser, chrome, profile, page
let plan = 'free'
// a character of the site's own (not one that comes with Stage): k01's files, its number keys moved about
const k01 = JSON.parse(await readFile(join(root, 'public/characters/k01/model.json'), 'utf8'))
const moved = { ...k01, expressions: k01.expressions.map((x) => ({ ...x, hotkey: { smile: '3', shy: '1', angry: '2', sad: '9' }[x.id] })) }
const SITE_LIVE = { smooth: 0.8, follow: 1.2, talk: 1.8, bounce: true, autoAway: 120, expr: { shy: { mode: 'hold' }, angry: { mode: 'timed', secs: 1 }, bogus: { mode: 'sometimes' } }, view: { x: 0, y: 0, zoom: 1 } }
try {
  const socket = createServer(); await new Promise((r) => socket.listen(0, '127.0.0.1', r)); const port = socket.address().port; await new Promise((r) => socket.close(r))
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_STAGE_HOST: 'livliv' } })
  await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Vite timeout')), 15000); server.stdout.on('data', (b) => { if (String(b).includes('Local:')) { clearTimeout(t); resolve() } }); server.once('exit', (c) => { clearTimeout(t); reject(new Error('Vite exited ' + c)) }) })
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ args: FLAGS })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] })
  await context.addInitScript(() => { if (!localStorage.getItem('livliv-stage:locale')) localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/me') return route.fulfill({ json: plan === 'free' ? { signed_in: false } : { signed_in: true, email: 'member@example.test', points: 10, plan: 'plus', record_seconds: 300, record_mark: false } })
    if (url.pathname === '/api/models/k01') return route.fulfill({ json: { id: 'k01', name: 'Sena', live: { expr: { sad: { mode: 'timed', secs: 2 } } } } })
    if (url.pathname === '/api/models/site01') return route.fulfill({ json: { id: 'site01', name: 'Site One', tagline: 'a test character', live: SITE_LIVE, access: { can_use: true } } })
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    if (url.pathname.startsWith('/models/site01/')) {
      const file = url.pathname.slice('/models/site01/'.length)
      if (file === 'model.json') return route.fulfill({ json: moved })
      return route.fulfill({ body: await readFile(join(root, 'public/characters/k01', file)).catch(() => ''), contentType: file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' })
    }
    if (url.hostname === '127.0.0.1' || ['blob:', 'data:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', (e) => errors.push(e.message))
  const live = (id) => page.waitForFunction((id) => { const a = id ? window.__stage.actors.get(id) : [...window.__stage.actors.values()].find((a) => !a.item.hidden); return a?.status === 'ready' && (a.item.driver !== 'face' || a.inputPhase === 'on') }, id, { timeout: 45000 })
  const shot = () => page.evaluate(() => { const s = window.__stage.store, scene = s.get(); return { id: scene.id, name: scene.name, background: scene.background, scenes: s.project().scenes.length, seen: scene.items.filter((i) => !i.hidden).map((i) => ({ kind: i.kind, id: i.id, name: i.name, lines: i.lines, driver: i.driver, faceMic: i.faceMic, x: i.x, w: i.w, h: i.h, smooth: i.smooth, talk: i.talk, autoAway: i.autoAway, exprModes: i.exprModes, follow: i.tuning?.faceFollow, bounce: i.tuning?.bounce })), width: scene.width, height: scene.height } })
  const actor = (id) => page.evaluate((id) => { const a = window.__stage.actors.get(id); return { expression: a.expression, away: a.away } }, id)

  // 开播 with a featured character: green, alone, big in the middle, your face and microphone on it, the card
  await page.goto(origin + '/?c=k01&as=face', { waitUntil: 'networkidle' })
  await live()
  const first = await shot()
  assert.equal(first.background, '#00b140'); assert.equal(first.seen.length, 1); assert.equal(first.scenes, 1)
  const sena = first.seen[0]
  assert.deepEqual([sena.kind, sena.lines, sena.driver, sena.faceMic], ['character', 'me', 'face', true])
  assert.ok(sena.h >= first.height * 0.9 && Math.abs(sena.x + sena.w / 2 - first.width / 2) <= 1)
  assert.deepEqual(sena.exprModes, { sad: { mode: 'timed', secs: 2 } }, 'a featured character takes its modes from the site')
  assert.equal(new URL(page.url()).search, '', 'the address forgets ?c and ?as')
  await page.locator('.coach.golive').waitFor()
  assert.equal(await page.locator('.welcome').count(), 0)
  assert.equal(await page.locator('.coach.golive li').count(), 3)
  report.faceArrival = { shot: first.name, background: first.background, character: sena }
  await page.screenshot({ path: join(artifacts, 'golive-face.png') })

  // the keys: by the expression's own number key, 0 clears, Q-T moves, B away and back
  await page.evaluate((id) => { const a = window.__stage.actors.get(id), act = a.player.act.bind(a.player); window.acts = []; a.player.act = (m) => { window.acts.push(m); act(m) } }, sena.id)
  await page.keyboard.press('1'); assert.equal((await actor(sena.id)).expression, 'smile')
  await page.keyboard.press('1'); assert.equal((await actor(sena.id)).expression, null, 'toggle: pressed again, off')
  await page.keyboard.press('3'); assert.equal((await actor(sena.id)).expression, 'angry')
  await page.keyboard.press('0'); assert.equal((await actor(sena.id)).expression, null)
  for (const k of 'qwert') await page.keyboard.press(k)
  assert.deepEqual(await page.evaluate(() => window.acts), ['nod', 'shake', 'tilt', 'hop', 'shy'])
  await page.keyboard.press('b'); assert.equal((await actor(sena.id)).away, true)
  await page.locator('.solo-status', { hasText: '暂离中，按 B 回来' }).waitFor()
  await page.keyboard.press('b'); assert.equal((await actor(sena.id)).away, false)
  // timed (the card's sad: 2 s)
  await page.keyboard.press('4'); assert.equal((await actor(sena.id)).expression, 'sad')
  await page.waitForFunction((id) => window.__stage.actors.get(id).expression === null, sena.id, { timeout: 4000 })
  // typing in a field is typing; Shift+1 stays the zoom
  await page.getByLabel('舞台名字').focus(); await page.keyboard.press('2'); assert.equal((await actor(sena.id)).expression, null)
  await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('Shift+1'); assert.equal((await actor(sena.id)).expression, null)
  report.keys = 'number keys by hotkey, toggle, 0, Q-T, B, timed from the card, typing and Shift+digit left alone'

  // a site character: its card's modes and live settings, its own number keys (shy is 1 there), in a shot of its own
  await page.goto(origin + '/?c=site01&as=face', { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__stage.store.get().items.some((i) => i.kind === 'character' && i.name === 'Site One' && !i.hidden))
  const second = await shot(), one = second.seen.find((i) => i.name === 'Site One')
  await live(one.id)
  assert.equal(second.scenes, 2, 'a new shot; the first one stays'); assert.equal(second.seen.length, 1); assert.equal(second.background, '#00b140')
  assert.deepEqual(one.exprModes, { shy: { mode: 'hold' }, angry: { mode: 'timed', secs: 1 } })
  assert.deepEqual([one.smooth, one.follow, one.talk, one.bounce, one.autoAway], [0.8, 1.2, 1.5, true, 120])
  assert.deepEqual(await page.evaluate((id) => { const a = window.__stage.actors.get(id); return a.player.expressions.map((x) => x.id) }, one.id), ['smile', 'shy', 'angry', 'sad'])
  // hold: shown while the key is down, gone on key up, and when the window loses the keyboard
  await page.keyboard.down('1'); assert.equal((await actor(one.id)).expression, 'shy')
  await sleep(500); assert.equal((await actor(one.id)).expression, 'shy', 'held: still shown')
  await page.keyboard.up('1'); assert.equal((await actor(one.id)).expression, null, 'released: gone')
  await page.keyboard.down('1'); assert.equal((await actor(one.id)).expression, 'shy')
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); assert.equal((await actor(one.id)).expression, null, 'blur releases a held one')
  await page.keyboard.up('1')
  await page.keyboard.press('3'); assert.equal((await actor(one.id)).expression, 'smile', 'its own key 3 is smile')
  await page.keyboard.press('2'); assert.equal((await actor(one.id)).expression, 'angry')
  await page.waitForFunction((id) => window.__stage.actors.get(id).expression === null, one.id, { timeout: 3000 })
  // the inspector shows each one's key and mode
  await page.locator('.key-modes > summary').click()
  assert.equal(await page.getByLabel(/的触发方式$/).count(), 4)
  report.siteCharacter = { exprModes: one.exprModes, seeded: { smooth: one.smooth, follow: one.follow, talk: one.talk, bounce: one.bounce, autoAway: one.autoAway } }

  // 开播 again with Sena: back to its own shot, nothing added
  await page.goto(origin + '/?c=k01&as=face', { waitUntil: 'networkidle' })
  await live()
  const again = await shot()
  assert.equal(again.scenes, 2); assert.equal(again.id, first.id); assert.deepEqual(again.seen.map((i) => i.name), ['Sena'])

  // auto-away: once a face was seen, none for the set time dozes off, and a face back wakes it. The fake camera never
  // shows one; the built-in face replay loses its face for a moment in its loop
  await page.evaluate((id) => window.__stage.store.patch(id, { driver: 'replay', autoAway: 1 }), sena.id)
  await page.waitForFunction((id) => window.__stage.actors.get(id).away, sena.id, { timeout: 40000 })
  await page.locator('.solo-status', { hasText: '暂离中，按 B 回来' }).waitFor()
  await page.waitForFunction((id) => !window.__stage.actors.get(id).away, sena.id, { timeout: 40000 })
  await page.evaluate((id) => window.__stage.store.patch(id, { driver: 'face', autoAway: 60 }), sena.id)
  await live(sena.id)
  report.autoAway = 'no face for autoAway seconds dozes off; a face back for a second wakes it'

  // the output window: the LivLiv mark on the free plan, gone for a member; no 「AI 生成」 with nobody AI
  await page.getByRole('button', { name: '输出到 OBS', exact: true }).click()
  const popup = page.waitForEvent('popup'); await page.locator('.output-settings').getByRole('button', { name: '打开输出窗口', exact: true }).click()
  const output = await popup; output.on('pageerror', (e) => errors.push('output: ' + e.message))
  await output.waitForSelector('canvas.character')
  await output.locator('.stage-mark').waitFor()
  assert.equal(await output.locator('.ai-label').count(), 0)
  await output.screenshot({ path: join(artifacts, 'output-free-mark.png') })
  plan = 'plus'; await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await output.locator('.stage-mark').waitFor({ state: 'detached' })
  plan = 'free'; await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await output.locator('.stage-mark').waitFor()
  report.mark = 'free plan: the mark on the output window; a member: none, as the account changes'

  // AI 直播: the character as AI, the panel open, 「AI 生成」 on the stage, the output and in a recording
  await output.close()
  await page.goto(origin + '/?c=k01&as=ai', { waitUntil: 'networkidle' })
  await live()
  await page.locator('.live-settings').waitFor()
  const ai = await shot()
  assert.equal(ai.seen.find((i) => i.kind === 'character').lines, 'ai'); assert.ok(ai.seen.some((i) => i.kind === 'subtitle'))
  await page.locator('.stage .ai-label', { hasText: 'AI 生成' }).waitFor()
  await page.screenshot({ path: join(artifacts, 'golive-ai.png') })
  await page.locator('.live-settings button[data-close]').click()
  await page.getByRole('button', { name: '输出到 OBS', exact: true }).click()
  const popup2 = page.waitForEvent('popup'); await page.locator('.output-settings').getByRole('button', { name: '打开输出窗口', exact: true }).click()
  const output2 = await popup2; await output2.locator('.ai-label', { hasText: 'AI 生成' }).waitFor()
  await output2.screenshot({ path: join(artifacts, 'output-ai-label.png') }); await output2.close()
  await page.evaluate(async () => { await window.__stage.rec.start({ mic: false, talk: false }) })
  await sleep(1500)
  await page.evaluate(async () => { await window.__stage.rec.stop() })
  await page.waitForFunction(() => ['done', 'error'].includes(window.__stage.recording().phase), null, { timeout: 60000 })
  report.recordingLabel = await page.evaluate(async () => {
    const r = window.__stage.recording(); if (r.phase !== 'done') return { error: r.error }
    const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(r.made.file)
    await new Promise((ok) => { v.onloadeddata = ok }); v.currentTime = 0.5; await new Promise((ok) => { v.onseeked = ok })
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const g = c.getContext('2d'); g.drawImage(v, 0, 0)
    const short = Math.min(c.width, c.height), at = Math.round(short * 0.022), size = Math.round(short * 0.026)
    const mean = (x, y, w, h) => { const d = g.getImageData(x, y, w, h).data; let s = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += d[i + k]; return s.map((n) => Math.round(n / (d.length / 4))) }
    return { size: [c.width, c.height], label: mean(at + 2, at + 2, size * 3, Math.round(size * 1.6)), beside: mean(at + size * 8, at + 2, size * 3, Math.round(size * 1.6)) }
  })
  // over green: the label's box is darker and greyer than the green beside it, its white text lifts red and blue
  const { label, beside } = report.recordingLabel
  assert.ok(label && beside && beside[1] > 140 && label[1] < beside[1] - 30 && label[0] > beside[0] + 10, 'the label is drawn into the recording: ' + JSON.stringify(report.recordingLabel))

  // the editor's page out of sight (raw CDP, see the top): poses keep reaching the output window
  profile = await mkdtemp(join(tmpdir(), 'stage-live-cdp-'))
  chrome = spawn(chromium.executablePath(), ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--window-size=1280,800', ...FLAGS, 'about:blank'], { stdio: 'ignore' })
  let cdpPort
  for (let i = 0; i < 150 && !cdpPort; i++) { await sleep(100); cdpPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0] }
  const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json()).webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let n = 0; const waiting = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = waiting.get(m.id); if (p) { waiting.delete(m.id); if (m.error) p.no(new Error(m.error.message)); else p.ok(m.result) } })
  const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++n; waiting.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })) })
  const evaluate = async (s, expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, s); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value }
  const until = async (s, expression, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(s, expression).catch(() => false)) return; await sleep(250) } throw new Error('timed out: ' + expression) }
  await send('Browser.grantPermissions', { origin, permissions: ['videoCapture', 'audioCapture'] })
  const { targetId: editorId } = await send('Target.createTarget', { url: 'about:blank' })
  const ed = (await send('Target.attachToTarget', { targetId: editorId, flatten: true })).sessionId
  await send('Page.enable', {}, ed)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('livliv-stage:locale','zh-Hans');localStorage.setItem('livliv-stage:coached','1')" }, ed)
  await send('Page.navigate', { url: origin + '/?c=k01&as=face' }, ed)
  await until(ed, "!!window.__stage && [...window.__stage.actors.values()].some((a) => a.status === 'ready' && a.inputPhase === 'on')")
  await evaluate(ed, "void window.open(location.pathname + '?output=1', 'livliv-stage-output', 'width=640,height=380')")
  let outId
  for (let i = 0; i < 50 && !outId; i++) { await sleep(200); outId = (await send('Target.getTargets')).targetInfos.find((t) => t.type === 'page' && t.url.includes('output=1'))?.targetId }
  const out = (await send('Target.attachToTarget', { targetId: outId, flatten: true })).sessionId
  await until(out, "!!document.querySelector('canvas.character')")
  await evaluate(out, "(() => { window.got = 0; new BroadcastChannel('livliv-stage').onmessage = (e) => { if (e.data.t === 'pose') window.got++ } })()")
  const count = async (label, ms) => { await evaluate(out, 'window.got = 0'); await sleep(ms); const poses = await evaluate(out, 'window.got'), editor = await evaluate(ed, 'document.visibilityState'); return { label, editor, poses, perSecond: +(poses / ms * 1000).toFixed(1) } }
  const hidden = [await count('editor in sight', 3000)]
  const { targetId: tab } = await send('Target.createTarget', { url: 'about:blank', newWindow: false }); await send('Target.activateTarget', { targetId: tab }); await sleep(500)
  hidden.push(await count('another tab in front', 4000))
  await send('Target.activateTarget', { targetId: editorId }); await sleep(500)
  const { windowId } = await send('Browser.getWindowForTarget', { targetId: editorId })
  await send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } }); await sleep(500)
  hidden.push(await count('editor window minimised', 4000))
  await send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
  ws.close()
  report.hiddenEditor = hidden; console.log(JSON.stringify(hidden))
  for (const h of hidden.slice(1)) { assert.equal(h.editor, 'hidden', h.label); assert.ok(h.poses >= 10, `${h.label}: ${h.poses} poses`) }

  assert.deepEqual(errors, []); report.errors = errors
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2))
} catch (e) {
  await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  console.error(artifacts); throw e
} finally {
  await browser?.close(); chrome?.kill('SIGTERM'); server?.kill('SIGTERM')
  if (profile) { await sleep(500); await rm(profile, { recursive: true, force: true }).catch(() => {}) }
}
