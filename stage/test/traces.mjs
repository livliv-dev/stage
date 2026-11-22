// Behaviour traces: every way a session starts, run once against fixture services, recorded as what a user or the bill
// would notice: who says what and in which scope, which memories each model request carried, what was remembered and
// saved, the voice calls, and how the session ended. Each scenario's events are compared with test/traces/<name>.jsonl
// (one event per line; test/traces/README.md says what each means). A new session runner must give the same events.
//   npm run test:traces                      every scenario, compared with its file
//   npm run test:traces -- chat duet         only these
//   npm run test:traces -- --update [names]  writes the files anew from this run: read the diff before keeping it
// Scenarios drive Stage the way its console does (talk.*, the hands-free switch, a recording), never through the UI,
// so a new console keeps them. Model, voice, recognition and LivLiv calls go to fixtures that answer from what they
// are asked, so a run gives the same lines every time.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const dir = fileURLToPath(new URL('./traces/', import.meta.url)), artifacts = await mkdtemp(join(tmpdir(), 'stage-traces-'))
const update = process.argv.includes('--update'), only = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']

/** a tone this long, as WAV: every voice the fixtures give */
function wav(seconds) {
  const samples = Math.round(24000 * seconds), buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24000, 24); buffer.writeUInt32LE(48000, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / 24000 * 330 * Math.PI * 2) * 6000), 44 + i * 2)
  return buffer
}

// ---------------------------------------------------------------- the fixture services

/** a model reply: the speaker's how-many-th line, from what the request shows of the conversation, in two sentences */
const replyText = (speaker, n) => `${speaker}的第${n}句。我接着说下去。`
/** a streamed reply, as an OpenAI-compatible API sends one (AIRI asks for these) */
function sse(content) {
  const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'trace', object: 'chat.completion.chunk', model: 'fixture-model', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
  return chunk({ role: 'assistant', content }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}

/** answers this scenario's requests; `world` holds what the scenario set (voice length, a transcript, LivLiv names, how
 *  long the model takes and how many of its answers fail) */
async function serve(route, world) {
  const request = route.request(), url = new URL(request.url())
  const json = (body) => route.fulfill({ json: body }).catch(() => {})
  if (url.pathname === '/fixture-ai/chat/completions') {
    const body = request.postDataJSON()
    if (world.modelDelay) await new Promise((resolve) => setTimeout(resolve, world.modelDelay))
    if (world.modelFailures > 0) { world.modelFailures--; return route.fulfill({ status: 503, json: { error: { message: 'Fixture model unavailable' } } }).catch(() => {}) }
    if (body.stream) {
      // AIRI: the speaker from its identity line, the count from its own lines in the history it sends
      const text = JSON.stringify(body.messages), speaker = /You are \\"([^\\]+)\\"/.exec(text)?.[1] ?? '?'
      const n = body.messages.filter((m) => m.role === 'assistant').length + 1
      return route.fulfill({ contentType: 'text/event-stream', body: sse(`<|ACT {"emotion":"happy","motion":"nod"}|>${replyText(speaker, n)}`) }).catch(() => {})
    }
    const payload = JSON.parse(body.messages[1].content), mine = `${payload.speaker}：`
    const n = (payload.history ?? '').split('\n').filter((line) => line.startsWith(mine)).length + 1
    return json({ choices: [{ message: { content: JSON.stringify({ text: replyText(payload.speaker, n), emotion: 'happy', action: 'nod', to: null, look: null, cues: [] }) } }] })
  }
  if (url.pathname === '/fixture-ai/audio/speech' || url.pathname === '/api/chat/say/line.mp3') return route.fulfill({ contentType: 'audio/wav', body: wav(world.voiceSeconds) }).catch(() => {})
  if (url.pathname === '/fixture-ai/audio/transcriptions') return json({ text: world.transcript ?? '' })
  if (url.pathname === '/api/me') return json(world.signedIn ? { signed_in: true, email: 'trace@example.test', points: 1000, plan: 'plus', stage_line_points: 0.5 } : { signed_in: false })
  const stageLine = /^\/api\/chat\/([^/]+)\/stage-line$/.exec(url.pathname)
  if (stageLine) {
    const body = request.postDataJSON(), name = world.livliv[stageLine[1]] ?? stageLine[1]
    const n = body.lines.filter((line) => line.me).length + 1
    return json({ text: replyText(name, n), emotion: 'happy', action: 'nod', to: null, look: null, audio: body.voice ? '/api/chat/say/line.mp3' : null, points: 999 })
  }
  if (/^\/api\/chat\/[^/]+\/say$/.test(url.pathname)) return json({ lines: [{ audio: '/api/chat/say/line.mp3', expression: null }], points: 999 })
  if (/^\/api\/chat\/[^/]+\/voices$/.test(url.pathname)) return json({ voices: [{ id: 'Cherry', name: 'Cherry', desc: '' }], voice: 'Cherry', own: null })
  if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } }).catch(() => {})
  if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue().catch(() => {})
  return route.abort().catch(() => {})
}

// ---------------------------------------------------------------- the recorder, in the page

/** before the app: the desktop app's bridge (desktop scenarios), a microphone whose level a scenario sets, and every
 *  request the page makes to a paid service written down as it is made */
function beforeApp({ desktop, signedIn }) {
  localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1')
  if (signedIn) localStorage.setItem('livliv-stage:session', 'trace-session')
  if (desktop) {
    window.livlivDesktop = {
      version: '0.5.0', platform: 'darwin', vision: { list: async () => [], frame: async () => null },
      requests: { begin: async () => 'trace', cancel: async () => {} },
      hotkeys: { list: async () => [], set: async () => [], reset: async () => [] }, onCommand: () => () => {},
    }
  }
  navigator.mediaDevices.getUserMedia = async () => {
    const context = new AudioContext(), gain = context.createGain(), wave = context.createOscillator(), destination = context.createMediaStreamDestination()
    gain.gain.value = 0; wave.frequency.value = 220; wave.connect(gain); gain.connect(destination); wave.start(); await context.resume()
    window.microphone = { context, gain }
    return destination.stream
  }
  navigator.mediaDevices.enumerateDevices = async () => []
  const trace = window.__trace = { on: false, events: [], memories: [], names: {} }
  const push = (event) => { if (trace.on) trace.events.push(event) }
  /** a memory a request carried, by its id: its scope and text */
  const request = (url, init) => {
    const path = new URL(url, location.href).pathname, body = typeof init?.body === 'string' ? init.body : ''
    if (path === '/fixture-ai/chat/completions') {
      const sent = JSON.parse(body)
      if (sent.stream) {
        const text = JSON.stringify(sent.messages), user = sent.messages.findLast((m) => m.role === 'user')
        // what the turn answers, without the time AIRI stamps on it or the context it adds after it
        const input = (typeof user?.content === 'string' ? user.content : user?.content?.find((part) => part.type === 'text')?.text)
          ?.replace(/^\[[^\]]*\d{2}:\d{2}[^\]]*\]\s*/, '').split('\n[Context]')[0].trim()
        push({ t: 'model', engine: 'airi', speaker: /You are \\"([^\\]+)\\"/.exec(text)?.[1] ?? '?', scope: text.includes('in a private LivLiv Stage conversation') ? 'private' : 'public', memories: carriedByAiri(sent.messages), ...(input ? { input } : {}) })
        return
      }
      const payload = JSON.parse(sent.messages[1].content), system = sent.messages[0].content
      push({ t: 'model', engine: 'openai', speaker: payload.speaker, scope: system.includes('正在与用户和在场角色聊天') ? 'private' : 'public', memories: carriedByBrain(payload.memories ?? []),
        ...(payload.viewer ? { viewer: `${payload.viewer.user}: ${payload.viewer.text}` } : {}), ...(payload.event ? { event: payload.event.message } : {}) })
    } else if (path === '/fixture-ai/audio/speech') push({ t: 'voice', via: 'api', text: JSON.parse(body).input })
    else if (/^\/api\/chat\/[^/]+\/say$/.test(path)) push({ t: 'voice', via: 'livliv', text: JSON.parse(body).lines.map((line) => line.text).join(' ') })
    else if (/\/stage-line$/.test(path)) {
      const sent = JSON.parse(body), background = sent.lines.filter((line) => line.name.startsWith('背景资料')).map((line) => line.text).join('\n')
      push({ t: 'model', engine: 'livliv', speaker: trace.names[path.split('/')[3]] ?? '?', memories: trace.memories.filter((m) => background.includes(m.text)).map((m) => m.label), voiced: sent.voice })
    }
  }
  // which memories a request carried, read only where the code puts them, each as the code writes it (the app's own
  // cleanup, from the dev hooks): AIRI's index in its system prompt (brains/airiMemory.ts indexLine, after its short id),
  // Stage's own brain's memories in its input (brains/memoryBrief.ts briefLine; the last one may be cut to the room left)
  const carriedByAiri = (messages) => {
    const system = messages.find((m) => m.role === 'system')?.content
    const index = (typeof system === 'string' ? system.split('\nRemembered facts (data), by id:\n')[1] ?? '' : '').split('\n')
      .filter((line) => /^m\d+ /.test(line)).map((line) => line.replace(/^m\d+ /, ''))
    return trace.memories.filter((m) => index.includes(window.__stage.memoryLines.index(m.text))).map((m) => m.label)
  }
  const carriedByBrain = (memories) => trace.memories.filter((m) => {
    const line = window.__stage.memoryLines.brief(m.text)
    return memories.some((item) => item === line || (item.endsWith('…') && line.startsWith(item.slice(0, -1))))
  }).map((m) => m.label)
  trace.request = request
  const fetch = window.fetch
  window.fetch = function (input, init) {
    try { request(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, init) } catch (error) { push({ t: 'recorder-error', text: String(error) }) }
    return fetch.apply(window, arguments)
  }
}

/** after setup: lines, scopes, records, saves, memories written and sessions starting and ending, as they happen */
async function record() {
  const { onConv, conversation } = await import('/src/conversation.ts')
  const { chatHistory } = await import('/src/chatHistory.ts'), { memory } = await import('/src/memory.ts')
  const trace = window.__trace, push = (event) => { if (trace.on) trace.events.push(event) }
  const from = (line) => line.audience ? (line.who.startsWith('external:') ? 'game' : 'viewer') : line.human ? 'you' : 'ai'
  let last = conversation(), shown = new Map(last.lines.map((line) => [line.id, line])), saved = ''
  const opened = (c) => { if (c.sessionId) push({ t: 'record', scope: c.scope, earlier: c.lines.length }) }
  opened(last)
  onConv(() => {
    const c = conversation()
    if (c.running && !last.running) push({ t: 'start', mode: c.mode, scope: c.scope, ...(c.engine ? { engine: c.engine } : {}) })
    else if (c.scope !== last.scope && c.running) push({ t: 'scope', scope: c.scope })
    if (c.sessionId !== last.sessionId) { shown = new Map(c.lines.map((line) => [line.id, line])); opened(c) }
    else {
      const now = new Set(c.lines.map((line) => line.id))
      for (const [id, line] of shown) if (!now.has(id)) { shown.delete(id); push({ t: 'drop', name: line.name, text: line.text }) }
      for (const line of c.lines) {
        const before = shown.get(line.id)
        if (!before) push({ t: 'line', from: from(line), name: line.name, text: line.text, scope: c.scope, ...(line.cut ? { cut: true } : {}) })
        else if (line.cut && !before.cut) push({ t: 'cut', name: line.name, text: line.text })
        shown.set(line.id, line)
      }
    }
    if (c.running && last.running && c.paused !== last.paused) push({ t: c.paused ? 'pause' : 'resume' })
    if (c.retryAt && !last.retryAt) push({ t: 'retry', seconds: Math.round((c.retryAt - Date.now()) / 1000) })
    if (c.error && c.error !== last.error) push({ t: 'error', text: c.error })
    if (c.storageError && c.storageError !== last.storageError) push({ t: 'error', text: c.storageError })
    if (c.needModel && !last.needModel) push({ t: 'need-model', intent: c.modelIntent })
    if (!c.running && last.running) push({ t: 'end', mode: c.mode, scope: c.scope, turns: c.turns, generations: c.generations, ...(c.ended ? { ended: c.ended } : {}), ...(c.error ? { error: c.error } : {}) })
    last = c
  })
  const save = chatHistory.save
  chatHistory.save = function (lines, ...rest) {
    const scope = this.current?.scope, key = `${scope} ${lines.length} ${rest.length ? 'summary' : ''}`
    if (this.current && key !== saved) push({ t: 'save', scope, lines: lines.length, ...(rest.length ? { summary: true } : {}) })
    if (this.current) saved = key
    return save.call(this, lines, ...rest)
  }
  const remember = memory.remember
  memory.remember = async function (input) {
    const entry = await remember.call(this, input)
    trace.memories.push({ id: entry.id, text: entry.text, label: `${entry.scope}: ${entry.text}` })
    push({ t: 'remember', scope: entry.scope, for: trace.names[entry.profileId] ?? '?', text: entry.text })
    return entry
  }
  const edit = memory.editMemory
  memory.editMemory = async function (id, patch) {
    const known = trace.memories.find((m) => m.id === id), entry = await edit.call(this, id, patch)
    push({ t: 'memory-edit', from: known?.label ?? '?', to: `${entry.scope}: ${entry.text}` })
    if (known) Object.assign(known, { text: entry.text, label: `${entry.scope}: ${entry.text}` })
    return entry
  }
}

// ---------------------------------------------------------------- setting the stage

/** the cast (PNG characters, left to right), the model and voices, the talk settings and memories, in the page */
const stage = (page, o) => page.evaluate(async (o) => {
  const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), { fromPngs } = await import('/src/library.ts')
  const { saveBrainConfig } = await import('/src/brain.ts'), { saveSpeech } = await import('/src/voiceApi.ts'), { memory } = await import('/src/memory.ts')
  const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
  const image = await canvas.convertToBlob({ type: 'image/png' })
  window.__stage.talk.detach(); store.replace(emptyScene())
  const trace = window.__trace, ids = {}
  for (const name of o.cast) {
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, name)
    const character = newCharacter(store.get(), name, pick.model, `${name}喜欢具体的讨论。`)
    character.voice.source = o.voice ?? 'api'
    if (o.livliv) character.model = { ...character.model, livlivId: name.toLowerCase() }
    if (o.played?.includes(name)) Object.assign(character, { lines: 'me', readAloud: false })
    store.add(character)
    ids[name] = character.id
    trace.names[character.profileId ?? character.id] = name
    if (o.livliv) trace.names[name.toLowerCase()] = name
  }
  store.select(null)
  store.setTalk({ order: 'free', interrupt: 0, cutIn: false, danmaku: 0, language: 'zh', ...o.talk })
  if (o.topic) store.set({ topic: o.topic })
  saveBrainConfig(o.brain === 'livliv' ? { kind: 'livliv' } : { kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model' })
  saveSpeech({ provider: 'openai', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-tts', voice: 'alloy', asr: 'fixture-asr' })
  for (const { scope, text } of o.memories ?? []) {
    const profileId = store.get().items.find((item) => item.id === ids[o.cast[0]]).profileId
    const entry = await memory.remember({ profileId, scope, text })
    trace.memories.push({ id: entry.id, text: entry.text, label: `${scope}: ${text}` })
  }
  return ids
}, o)

const MEMORIES = [{ scope: 'private', text: '私下的暗号是木瓜' }, { scope: 'public', text: '公开的爱好是猫' }]

// ---------------------------------------------------------------- what each scenario does

const conv = (page) => page.evaluate(() => { const c = window.__stage.conversation(); return { running: c.running, mode: c.mode, scope: c.scope, speaking: !!c.speaking, thinking: !!c.thinking, waitingInput: c.waitingInput, turns: c.turns, lines: c.lines.length, error: c.error, ended: c.ended } })
const idle = (page) => page.waitForFunction(() => !window.__stage.conversation().running)
/** a chat waits for you, nothing said or thought */
const waiting = (page) => page.waitForFunction(() => { const c = window.__stage.conversation(); return c.running && c.waitingInput && !c.speaking && !c.thinking })
const linesSaid = (page, n) => page.waitForFunction((n) => window.__stage.conversation().lines.filter((line) => !line.human).length >= n, n)
const say = async (page, text) => {
  const before = await page.evaluate(() => window.__stage.conversation().turns)
  await page.evaluate((text) => window.__stage.talk.say(text), text)
  await page.waitForFunction((turns) => { const c = window.__stage.conversation(); return c.turns > turns && c.waitingInput && !c.speaking && !c.thinking }, before)
}

const SCENARIOS = [
  {
    name: 'duet', about: '对谈: two AI characters in round order, the line limit 4, a private session with a private and a public memory',
    async run(page) {
      await stage(page, { cast: ['Nana', 'Kai'], talk: { order: 'round' }, topic: '周末去哪里', memories: MEMORIES })
      await ready(page)
      await page.evaluate(() => window.__stage.talk.setLimit(4))
      await begin(page)
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'duet-viewers', about: '对谈 while a viewer message waits (对谈时回应弹幕: often): the session is public and a line answers the viewer',
    async run(page) {
      await stage(page, { cast: ['Nana', 'Kai'], talk: { order: 'round', danmaku: 2 }, memories: MEMORIES })
      await ready(page)
      await page.evaluate(() => window.__stage.talk.setLimit(2))
      await begin(page)
      await page.evaluate(async () => (await import('/src/danmaku.ts')).simulate('Viewer', '主播们好'))
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'chat', about: '持续聊天: one AI character greets, remembers what it is told (记住…), answers with that memory, and stops at its generation limit (3)',
    async run(page) {
      await stage(page, { cast: ['Nana'], talk: { chatGenerations: 3 }, memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startChat())
      await waiting(page)
      await say(page, '记住：我的生日是三月')
      await page.evaluate(() => window.__stage.talk.say('还记得我的生日吗'))
      await idle(page)
    },
  },
  {
    name: 'chat-public', about: '持续聊天 chosen public: only public memories reach the model; stopped by hand',
    async run(page) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startChat('public'))
      await waiting(page)
      await say(page, '大家好')
      await page.evaluate(() => window.__stage.talk.stop())
      await idle(page)
    },
  },
  {
    name: 'live', about: 'AI 直播: one AI character answers two viewers in its voice and stops at its generation limit (2)',
    async run(page) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startLive({ minutes: 5, maxGenerations: 2, warmupSeconds: 0, textOnly: false }))
      await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingAudience)
      await page.evaluate(async () => (await import('/src/danmaku.ts')).simulate('Aki', '今天聊什么'))
      await linesSaid(page, 1)
      await page.evaluate(async () => (await import('/src/danmaku.ts')).simulate('Mio', '晚上好'))
      await idle(page)
    },
  },
  {
    name: 'say', about: 'One-shot: idle, you type a line as the narrator; the AI character answers once and the session ends',
    async run(page) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.say('你好'))
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'say-played', about: 'One-shot as a character you play (Mei, not read aloud): your line is shown as hers, the AI character answers once',
    async run(page) {
      await stage(page, { cast: ['Mei', 'Nana'], played: ['Mei'] })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.say('今天好热'))
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'next-up', about: 'One-shot: idle, a click on Kai\'s card (nextUp) makes Kai say one line',
    async run(page) {
      const ids = await stage(page, { cast: ['Nana', 'Kai'] })
      await ready(page)
      await begin(page)
      await page.evaluate((id) => window.__stage.talk.nextUp(id), ids.Kai)
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'redo', about: 'One-shot: a line, then 重说 (redo): the last AI line is dropped and said again',
    async run(page) {
      await stage(page, { cast: ['Nana'] })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.say('讲个故事'))
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
      await page.evaluate(() => window.__stage.talk.redo())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'handsfree', about: '免按键语音: hands-free on starts 持续聊天; what you say is heard, transcribed and answered; hands-free off, then stop',
    async run(page, world) {
      await stage(page, { cast: ['Nana'] })
      await ready(page)
      await begin(page)
      await page.evaluate(async () => { await window.__stage.talk.startChat(); await (await import('/src/ptt.ts')).setHandsFree(true) })
      await page.waitForFunction(async () => (await import('/src/ptt.ts')).pttState().phase === 'armed')
      await waiting(page)
      world.transcript = '我们聊聊音乐吧'
      const level = (value) => page.evaluate((value) => window.microphone.gain.gain.setValueAtTime(value, window.microphone.context.currentTime), value)
      await level(0.12); await page.waitForTimeout(700); await level(0)
      await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => line.human && line.text === '我们聊聊音乐吧'))
      await waiting(page)
      await page.evaluate(async () => { await (await import('/src/ptt.ts')).setHandsFree(false); window.__stage.talk.stop() })
      await idle(page)
    },
  },
  {
    name: 'demo', about: 'The demo: the 双人对谈 template\'s prepared conversation, in its recorded voices, to its end; no model call and nothing saved',
    async run(page) {
      await page.evaluate(async () => {
        const { store } = await import('/src/scene.ts'), { buildTemplate } = await import('/src/templates.ts'), { playDemo } = await import('/src/brain.ts')
        window.__stage.talk.detach(); store.replace(await buildTemplate('duo')); playDemo(true)
      })
      await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length === 2 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(60000) })
      await page.waitForTimeout(500)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
    timeout: 120000,
  },
  {
    name: 'private-to-public', about: '持续聊天 in private; a recording starts while the AI speaks: the line is cut, the session goes on in the public record with public memories only',
    voiceSeconds: 4,
    async run(page, world) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startChat('private'))
      await page.waitForFunction(() => !!window.__stage.conversation().speaking)
      world.voiceSeconds = 0.15
      await page.evaluate(() => window.__stage.rec.start({ mic: false, talk: false }))
      await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.scope === 'public' && !!c.sessionId && c.waitingInput && !c.speaking && !c.thinking })
      await say(page, '现在在录像')
      await page.evaluate(() => window.__stage.talk.stop())
      await idle(page)
    },
  },
  {
    name: 'livliv-points', about: 'Desktop, signed in to LivLiv, 对谈 with LivLiv\'s points model: each line is one stage-line request that brings its voice (no /say)',
    desktop: true, signedIn: true,
    async run(page) {
      await stage(page, { cast: ['Nana', 'Kai'], brain: 'livliv', voice: 'livliv', livliv: true, talk: { order: 'round' }, memories: MEMORIES })
      await ready(page)
      await page.evaluate(() => window.__stage.talk.setLimit(2))
      await begin(page)
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'livliv-voice', about: 'Desktop, signed in, 持续聊天 with a model of one\'s own in the LivLiv voice: the standard engine (not AIRI), each line voiced whole by one /say call',
    desktop: true, signedIn: true,
    async run(page) {
      await stage(page, { cast: ['Nana'], voice: 'livliv', livliv: true, memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startChat())
      await waiting(page)
      await say(page, '你好')
      await page.evaluate(() => window.__stage.talk.stop())
      await idle(page)
    },
  },
  {
    name: 'airi-chat', about: 'Desktop, one AI character, a model of one\'s own: 持续聊天 runs on AIRI (streamed, sentence by sentence) with private memories in its index by short id',
    desktop: true,
    async run(page) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startChat())
      await waiting(page)
      await say(page, '你好呀')
      await page.evaluate(() => window.__stage.talk.stop())
      await idle(page)
    },
  },
  {
    name: 'airi-say', about: 'Desktop: typing while idle starts 持续聊天 (on AIRI) with that line as its first input',
    desktop: true,
    async run(page) {
      await stage(page, { cast: ['Nana'] })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.say('在吗'))
      await waiting(page)
      await page.evaluate(() => window.__stage.talk.stop())
      await idle(page)
    },
  },
  {
    name: 'airi-live', about: 'Desktop: AI 直播 on AIRI answers a viewer and stops at its generation limit (1)',
    desktop: true,
    async run(page) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startLive({ minutes: 5, maxGenerations: 1, warmupSeconds: 0, textOnly: false, airi: { windowId: '' } }))
      await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingAudience)
      await page.evaluate(async () => (await import('/src/danmaku.ts')).simulate('Aki', '能看到我吗'))
      await idle(page)
    },
  },
  {
    name: 'duet-free', about: '对谈 in free order with three AI characters (the line limit 4): the one picked, never the same twice running',
    async run(page) {
      await stage(page, { cast: ['Nana', 'Kai', 'Mio'], talk: { order: 'free' }, topic: '周末去哪里' })
      await ready(page)
      await page.evaluate(() => window.__stage.talk.setLimit(4))
      await begin(page)
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'duet-host', about: '对谈 in host order (Kai hosts, the line limit 4): the host after every guest, the guest quiet longest next',
    async run(page) {
      const ids = await stage(page, { cast: ['Nana', 'Kai', 'Mio'], topic: '周末去哪里' })
      await page.evaluate((host) => window.__stage.store.setTalk({ order: 'host', host }), ids.Kai)
      await ready(page)
      await page.evaluate(() => window.__stage.talk.setLimit(4))
      await begin(page)
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => window.__stage.conversation().running)
      await idle(page)
    },
  },
  {
    name: 'pause', about: '对谈 paused while its first line is said: that line finishes, nothing more is said until it resumes',
    voiceSeconds: 1,
    async run(page) {
      await stage(page, { cast: ['Nana', 'Kai'], talk: { order: 'round' } })
      await ready(page)
      await page.evaluate(() => window.__stage.talk.setLimit(3))
      await begin(page)
      await page.evaluate(() => window.__stage.talk.start())
      await page.waitForFunction(() => !!window.__stage.conversation().speaking)
      await page.evaluate(() => window.__stage.talk.pause())
      await page.waitForTimeout(2500)
      await page.evaluate(() => window.__stage.talk.resume())
      await idle(page)
    },
  },
  {
    name: 'memory-changed', about: '持续聊天: a memory is edited while the first line is being made: the line is not said (记忆已更新) and the session stops',
    async run(page, world) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      world.modelDelay = 1500
      await page.evaluate(() => window.__stage.talk.startChat('private'))
      await page.waitForFunction(() => !!window.__stage.conversation().thinking)
      await page.evaluate(async () => {
        const { memory } = await import('/src/memory.ts'), mine = window.__trace.memories.find((m) => m.label.startsWith('private:'))
        await memory.editMemory(mine.id, { text: '私下的暗号是芒果' })
      })
      await idle(page)
    },
  },
  {
    name: 'chat-time-limit', about: '持续聊天 with a one-minute limit: the time runs out while the model is still answering; nothing is said',
    fastClock: true,
    async run(page, world) {
      await stage(page, { cast: ['Nana'], talk: { chatMinutes: 1 } })
      await ready(page)
      await begin(page)
      world.modelDelay = 3000
      await page.evaluate(() => window.__stage.talk.startChat())
      await idle(page)
    },
  },
  {
    name: 'live-time-limit', about: 'AI 直播 with a one-minute limit and no viewer: it waits, then ends at its limit',
    fastClock: true,
    async run(page) {
      await stage(page, { cast: ['Nana'] })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startLive({ minutes: 1, maxGenerations: 5, warmupSeconds: 0, textOnly: false }))
      await idle(page)
    },
  },
  {
    name: 'live-retry', about: 'AI 直播: the model fails once; the error shows, the viewer is answered on the retry 5 s later, and the generation limit (2) counts the failed call',
    async run(page, world) {
      await stage(page, { cast: ['Nana'] })
      await ready(page)
      await begin(page)
      world.modelFailures = 1
      await page.evaluate(() => window.__stage.talk.startLive({ minutes: 5, maxGenerations: 2, warmupSeconds: 0, textOnly: false }))
      await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingAudience)
      await page.evaluate(async () => (await import('/src/danmaku.ts')).simulate('Aki', '今天聊什么'))
      await idle(page)
    },
    timeout: 60000,
  },
  {
    name: 'live-failures', about: 'AI 直播: the model keeps failing; tried again after 5 s and 15 s, then the session stops (连续出错 3 次)',
    async run(page, world) {
      await stage(page, { cast: ['Nana'] })
      await ready(page)
      await begin(page)
      world.modelFailures = 99
      await page.evaluate(() => window.__stage.talk.startLive({ minutes: 5, maxGenerations: 10, warmupSeconds: 0, textOnly: false }))
      await page.waitForFunction(() => window.__stage.conversation().running && window.__stage.conversation().waitingAudience)
      await page.evaluate(async () => (await import('/src/danmaku.ts')).simulate('Aki', '今天聊什么'))
      await idle(page)
    },
    timeout: 90000,
  },
  {
    name: 'airi-private-to-public', about: 'Desktop, AIRI 持续聊天 in private; a recording starts while AIRI speaks: the line is cut, the next AIRI turn is public with public memories only',
    desktop: true, voiceSeconds: 4,
    async run(page, world) {
      await stage(page, { cast: ['Nana'], memories: MEMORIES })
      await ready(page)
      await begin(page)
      await page.evaluate(() => window.__stage.talk.startChat('private'))
      await page.waitForFunction(() => !!window.__stage.conversation().speaking)
      world.voiceSeconds = 0.15
      await page.evaluate(() => window.__stage.rec.start({ mic: false, talk: false }))
      await page.waitForFunction(() => { const c = window.__stage.conversation(); return c.scope === 'public' && !!c.sessionId && c.waitingInput && !c.speaking && !c.thinking })
      await say(page, '现在在录像')
      await page.evaluate(() => window.__stage.talk.stop())
      await idle(page)
    },
  },
]

/** the characters are loaded and the record the app opened for them is open (the demo opens none) */
async function ready(page) {
  await page.waitForFunction(() => { const a = [...window.__stage.actors.values()]; return a.length > 0 && a.every((x) => x.status === 'ready') }, null, { timeout: testTimeout(30000) })
  await page.waitForFunction(() => !!window.__stage.conversation().sessionId)
  if (await page.evaluate(() => localStorage.getItem('livliv-stage:session'))) await page.waitForFunction(async () => (await import('/src/livliv.ts')).signedIn())
  await page.waitForTimeout(300)
}
/** from here on, everything is written down */
async function begin(page) {
  // the session's own chance draws (who speaks in free order, whether a line answers a viewer, whether an AI cuts in,
  // the pause between lines, a glance) all come from sessions/chance.ts: pinned to 0, the first choice, so a run is the
  // same every time
  await page.evaluate(async () => (await import('/src/sessions/chance.ts')).setChance(() => 0))
  await page.evaluate(() => { window.__trace.on = true })
  await page.evaluate(record)
}

// ---------------------------------------------------------------- running and comparing

/** what must match: the story in its order (lines, scopes, records, saves, memories written, starts and ends), and
 *  each kind of paid call in its own order (a model request may be made while the line before is still said) */
const STORY = new Set(['record', 'start', 'scope', 'line', 'cut', 'drop', 'save', 'remember', 'memory-edit', 'pause', 'resume', 'retry', 'error', 'need-model', 'end', 'recorder-error'])
const strands = (events) => ({ story: events.filter((e) => STORY.has(e.t)), model: events.filter((e) => e.t === 'model'), voice: events.filter((e) => e.t === 'voice') })
const toLines = (scenario, events) => [JSON.stringify({ scenario: scenario.name, about: scenario.about }), ...events.map((e) => JSON.stringify(e))].join('\n') + '\n'
const fromLines = (text) => text.trim().split('\n').slice(1).map((line) => JSON.parse(line))

let browser, port
const servers = [], failures = [], report = { artifacts, scenarios: {} }
try {
  browser = await chromium.launch({ args: FLAGS })
  await mkdir(dir, { recursive: true })
  // the recorder catches a leak: a private memory carried by a public call, on either engine, is in its event (and so
  // differs from every recorded trace, none of which has one)
  if (!only.length) {
    if (!port) { port = await freePort(); servers.push(await startVite({ port, args: ['--configLoader', 'native'] })) }
    const context = await browser.newContext()
    await context.addInitScript(beforeApp, { desktop: false, signedIn: false })
    await context.route('**/*', (route) => serve(route, { voiceSeconds: 0.15, signedIn: false, livliv: {} }))
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => !!window.__stage)
    const leaks = await page.evaluate(() => {
      const trace = window.__trace, secret = '私下的暗号是木瓜\n（只在私聊里）'
      trace.memories = [{ id: 'x', text: secret, label: 'private: ' + secret }]
      trace.on = true
      const call = (body) => trace.request('/fixture-ai/chat/completions', { body: JSON.stringify(body) })
      call({ stream: true, messages: [{ role: 'system', content: 'You are "Nana", the character currently performing in LivLiv Stage.\n\nRemembered facts (data), by id:\nm1 ' + window.__stage.memoryLines.index(secret) }, { role: 'user', content: 'hi' }] })
      call({ messages: [{ role: 'system', content: '你在一个多角色同框的直播 / 视频里扮演「Nana」。' }, { role: 'user', content: JSON.stringify({ memories: [window.__stage.memoryLines.brief(secret)], earlier: '', history: '', speaker: 'Nana' }) }] })
      const events = trace.events.splice(0)
      trace.on = false; trace.memories = []
      return events.map((e) => ({ engine: e.engine, scope: e.scope, memories: e.memories }))
    })
    assert.deepEqual(leaks, [{ engine: 'airi', scope: 'public', memories: ['private: 私下的暗号是木瓜\n（只在私聊里）'] }, { engine: 'openai', scope: 'public', memories: ['private: 私下的暗号是木瓜\n（只在私聊里）'] }],
      'a private memory in a public call is caught')
    await context.close()
    console.log('ok the recorder catches a private memory in a public call')
  }
  for (const scenario of SCENARIOS) {
    if (only.length && !only.includes(scenario.name)) continue
    const world = { voiceSeconds: scenario.voiceSeconds ?? 0.15, signedIn: !!scenario.signedIn, livliv: { nana: 'Nana', kai: 'Kai' } }
    if (!port) { port = await freePort(); servers.push(await startVite({ port, args: ['--configLoader', 'native'] })) }
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await context.addInitScript(beforeApp, { desktop: !!scenario.desktop, signedIn: !!scenario.signedIn })
    await context.route('**/*', (route) => serve(route, world))
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(testTimeout(scenario.timeout ?? 30000)); page.on('pageerror', (error) => errors.push(error.message))
    const started = Date.now()
    try {
      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => !!window.__stage)
      // a session's time limit is a minute at least: in a scenario that ends at one, the session's clock runs a timer of
      // half a minute or more (a limit's, set a moment after the session started) 60 times sooner, so a minute's limit
      // ends after a second
      if (scenario.fastClock) await page.evaluate(async () => (await import('/src/sessions/clock.ts')).setClock({ timeout: (f, ms) => setTimeout(f, ms >= 30_000 ? ms / 60 : ms) }))
      await scenario.run(page, world)
      await page.waitForTimeout(300)  // a save after the last line
      const events = await page.evaluate(() => window.__trace.events)
      assert.deepEqual(errors, [], 'page errors')
      const file = join(dir, `${scenario.name}.jsonl`)
      if (update) await writeFile(file, toLines(scenario, events))
      else {
        const expected = fromLines(await readFile(file, 'utf8').catch(() => { throw new Error(`no ${file}: run with --update to record it`) }))
        const got = strands(events), want = strands(expected)
        await writeFile(join(artifacts, `${scenario.name}.jsonl`), toLines(scenario, events))
        for (const strand of ['story', 'model', 'voice']) assert.deepEqual(got[strand], want[strand], `${scenario.name}: the ${strand} differs (this run: ${join(artifacts, scenario.name + '.jsonl')})`)
      }
      report.scenarios[scenario.name] = { events: events.length, seconds: Math.round((Date.now() - started) / 100) / 10 }
      console.log(`${update ? 'recorded' : 'ok'} ${scenario.name}: ${events.length} events, ${report.scenarios[scenario.name].seconds} s`)
    } catch (error) {
      failures.push(scenario.name)
      console.error(`FAILED ${scenario.name}:`, error.message)
      console.error('Conversation:', JSON.stringify(await conv(page).catch(() => null)))
      const events = await page.evaluate(() => window.__trace?.events).catch(() => null)
      if (events) await writeFile(join(artifacts, `${scenario.name}.jsonl`), toLines(scenario, events))
      await page.screenshot({ path: join(artifacts, `${scenario.name}.png`) }).catch(() => {})
    } finally { await context.close() }
  }
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  if (failures.length) { console.error(`failed: ${failures.join(', ')} (artifacts: ${artifacts})`); process.exitCode = 1 }
  else console.log(JSON.stringify({ ok: true, scenarios: Object.keys(report.scenarios).length, artifacts }))
} catch (error) {
  console.error(error); process.exitCode = 1
} finally { await browser?.close(); for (const server of servers) server.kill('SIGTERM') }
