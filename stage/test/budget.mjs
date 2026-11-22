// How much one model call carries, on both engines, in three sessions:
//   typical  a sample card, 10 short memories, a short conversation: under 3,000 input tokens a call
//   long     500 memories (a tenth of them long), a 300-line conversation with its summary: under 6,000
//   worst    a full imported card (persona 4,000, style 1,500, relationship and stance 2,000 each, 12 example lines of
//            300, a greeting of 400), memories that all fill the index (48 × 120), a summary of 1,800, a full window of
//            30 event lines (each cut to 500), and on AIRI a round of its memory tool asking for five entries: under
//            22,000 a call, and the reply still comes (the second call may not call a tool, and reads four). A full case is
//            rare; the site's daily cost cap per account covers it
// Tokens are counted as the cost study counts them: a Chinese character 0.6 of a token, any other character 0.3, and 4
// for each message. Each engine is driven in the page against a fixture model, so its requests are the ones a session
// sends: Stage's own brain through makeBrain, AIRI through streamAiriReply with the memories its engine is given
// (AIRI_MEMORIES, most recent first, and how many there are in all). Nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const LIMITS = { typical: 3000, long: 6000, worst: 22000 }
const tokens = (text) => [...text].reduce((n, c) => n + (/[　-鿿＀-￯]/.test(c) ? 0.6 : 0.3), 0)
const content = (m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '') + JSON.stringify(m.tool_calls ?? '')
const callTokens = (sent) => Math.round(sent.messages.reduce((n, m) => n + 4 + tokens(content(m)), 0) + tokens(JSON.stringify(sent.tools ?? [])))
const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'budget', object: 'chat.completion.chunk', model: 'fixture-model', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
const sse = (text) => chunk({ role: 'assistant', content: text }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
const toolCall = (ids) => chunk({ role: 'assistant', tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'builtIn_readMemory', arguments: JSON.stringify({ ids }) } }] }) + chunk({}, 'tool_calls') + 'data: [DONE]\n\n'

let server, browser
const calls = [], errors = []
let session = ''
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const context = await browser.newContext()
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/budget-ai/chat/completions') {
      const sent = route.request().postDataJSON()
      calls.push({ session, engine: sent.stream ? 'airi' : 'standard', tokens: callTokens(sent), tools: (sent.tools ?? []).length, toolChoice: sent.tool_choice ?? null })
      if (!sent.stream) return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '好呀，去海边走走。', emotion: 'happy', action: 'none', to: null, look: null, cues: [] }) } }] } })
      // the worst case's first AIRI call reads five entries; every other call answers
      const read = session === 'worst' && sent.tools?.length && !sent.messages.some((m) => m.role === 'tool')
      return route.fulfill({ contentType: 'text/event-stream', body: read ? toolCall(['m48', 'm47', 'm46', 'm45', 'm44']) : sse('今天的海风很舒服。我们去散步吧。') })
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!window.__stage)

  const run = (name) => page.evaluate(async (name) => {
    const { makeBrain } = await import('/src/brain.ts'), { streamAiriReply } = await import('/src/airiEngine.ts'), { AIRI_MEMORIES } = await import('/src/brains/engines/airi.ts')
    const { newCharacter, store } = await import('/src/scene.ts')
    const long = (seed, n) => (seed + '我们一起在海边画了一整天的画，聊到了小时候的猫和那场大雨，还有她最喜欢的那家面包店。').repeat(Math.ceil(n / 40)).slice(0, n)
    const card = name === 'typical' ? { persona: '住在海边的插画师，喜欢猫和雨天。', style: '说话轻快，常用「呐」结尾。' }
      : name === 'long' ? { persona: '住在海边的插画师，喜欢猫和雨天，说话轻快。'.repeat(4), style: '常用「呐」结尾。' }
      : { persona: long('人设', 4000), style: long('风格', 1500), relationship: long('关系', 2000), stance: long('立场', 2000),
          examples: Array.from({ length: 12 }, (_, i) => long(`例句${i}：`, 300)), greeting: long('开场白：', 400) }
    const me = { ...newCharacter(store.get(), 'Nana', { type: 'url', url: '/characters/k01/' }), id: 'nana', lines: 'ai', ...card }
    const count = { typical: 10, long: 500, worst: 60 }[name]
    // the memories, the most recent first (as memory.ts gives them)
    const memories = Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(), profileId: 'nana', scope: 'private', createdAt: 1e12 + (count - i) * 1000, updatedAt: 1e12 + (count - i) * 1000,
      text: name === 'worst' ? long(`第${i}条：`, 2000) : name === 'long' && i % 10 === 0 ? long(`第${i}条长记忆：`, 480) : `第${i}条记忆：喜欢第${i}种口味的冰淇淋`,
    }))
    const n = { typical: 8, long: 300, worst: 390 }[name]
    const lines = Array.from({ length: n }, (_, i) => ({ id: `l${i}`, who: i % 2 ? 'nana' : 'me', name: i % 2 ? 'Nana' : '我', emotion: 'neutral', action: 'none', to: null, human: i % 2 === 0,
      text: name === 'worst' ? long(`第${i}句：`, i % 2 ? 300 : 200) : `第${i}句：今天想聊聊周末去哪里玩，海边还是山上，你觉得呢？` }))
    // the worst case's last 30 lines (AIRI's whole window) are a game's events, longer than the 500 a model is given
    if (name === 'worst') for (let i = n - 30; i < n; i++) Object.assign(lines[i], { who: 'external:Minecraft', name: 'Minecraft', human: true, audience: true, text: long(`事件${i}：`, 600) })
    // a long session has its summary; the worst case a full one (1,800)
    const summary = name === 'long' ? { text: '之前聊了周末的安排、海边和山上的区别、喜欢的冰淇淋口味和小时候的猫。'.repeat(20), sourceIds: lines.slice(0, 284).map((l) => l.id) }
      : name === 'worst' ? { text: long('摘要：', 1800), sourceIds: lines.slice(0, 340).map((l) => l.id) } : undefined
    const model = { kind: 'openai', provider: 'custom', base: location.origin + '/budget-ai', key: 'test-only', model: 'fixture-model' }
    const signal = new AbortController().signal
    await makeBrain(model).reply({ me, others: [], humans: ['我'], topic: '周末去哪里', lines, layout: ['Nana'], role: null, cutIn: false, language: 'zh', viewer: null, summary, memories, scope: 'private', voiced: false }, signal)
    const said = []
    const reader = streamAiriReply({
      sessionId: 's-' + name, scope: 'private', actor: me, model, lines, context: { topic: '周末去哪里', summary: summary?.text, memories: memories.slice(0, AIRI_MEMORIES), memoryCount: memories.length },
      input: '我：那就去海边吧', language: 'zh', signal, verifyMemory: async () => {},
    }).getReader()
    for (let next = await reader.read(); !next.done; next = await reader.read()) said.push(next.value.text)
    return said.join('')
  }, name)

  const results = {}, said = {}
  for (const name of ['typical', 'long', 'worst']) {
    session = name
    said[name] = await run(name)
    const mine = calls.filter((c) => c.session === name)
    results[name] = { standard: mine.filter((c) => c.engine === 'standard').map((c) => c.tokens), airi: mine.filter((c) => c.engine === 'airi').map((c) => c.tokens) }
  }
  console.log(JSON.stringify(results))
  for (const name of ['typical', 'long', 'worst']) {
    assert.ok(said[name].length > 0, `${name}: AIRI's reply came`)
    for (const call of calls.filter((c) => c.session === name)) assert.ok(call.tokens < LIMITS[name], `${name}, ${call.engine}: ${call.tokens} tokens (under ${LIMITS[name]})`)
  }
  const worst = calls.filter((c) => c.session === 'worst' && c.engine === 'airi')
  assert.equal(worst.length, 2, 'the worst case: a round of the memory tool, then the reply')
  assert.deepEqual(worst.map((c) => [c.tools, c.toolChoice]), [[1, null], [1, 'none']], 'the second (last allowed) call may not call a tool')
  assert.equal(calls.filter((c) => c.session === 'typical' && c.engine === 'airi')[0].tools, 0, 'short memories, all in the index: no tool')
  assert.deepEqual(errors, [])
  console.log('test:budget passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
