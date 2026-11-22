// How much one model call carries at most, on both engines, for a character with 500 memories (a tenth of them long)
// and a long conversation (300 lines, a summary of all but the last ones, as a long session has): under about 6,000
// input tokens. Tokens are counted as the cost study counts them: a Chinese character 0.6 of a token, any other
// character 0.3, and 4 for each message. Each engine is driven in the page against a fixture model, so its request is
// the one a session sends: Stage's own brain through makeBrain, AIRI through streamAiriReply with the memories its
// engine is given (AIRI_MEMORIES, most recent first). Nothing is spent.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const LIMIT = 6000
const tokens = (text) => [...text].reduce((n, c) => n + (/[　-鿿＀-￯]/.test(c) ? 0.6 : 0.3), 0)
const content = (m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '')
const callTokens = (sent) => Math.round(sent.messages.reduce((n, m) => n + 4 + tokens(content(m)), 0) + tokens(JSON.stringify(sent.tools ?? [])))
function sse(text) {
  const chunk = (delta, finish = null) => 'data: ' + JSON.stringify({ id: 'budget', object: 'chat.completion.chunk', model: 'fixture-model', created: 1, choices: [{ index: 0, delta, finish_reason: finish }] }) + '\n\n'
  return chunk({ role: 'assistant', content: text }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}

let server, browser
const calls = [], errors = []
try {
  const port = await freePort(); server = await startVite({ port })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const context = await browser.newContext()
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/budget-ai/chat/completions') {
      const sent = route.request().postDataJSON()
      calls.push({ engine: sent.stream ? 'airi' : 'standard', tokens: callTokens(sent), messages: sent.messages.length, tools: (sent.tools ?? []).length })
      if (sent.stream) return route.fulfill({ contentType: 'text/event-stream', body: sse('今天的海风很舒服。我们去散步吧。') })
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '好呀，去海边走走。', emotion: 'happy', action: 'none', to: null, look: null, cues: [] }) } }] } })
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { detail: 'none' } })
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(30000)); page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!window.__stage)

  await page.evaluate(async () => {
    const { makeBrain } = await import('/src/brain.ts'), { streamAiriReply } = await import('/src/airiEngine.ts'), { AIRI_MEMORIES } = await import('/src/brains/engines/airi.ts')
    const { newCharacter, store } = await import('/src/scene.ts')
    const me = { ...newCharacter(store.get(), 'Nana', { type: 'url', url: '/characters/k01/' }), id: 'nana', persona: '住在海边的插画师，喜欢猫和雨天，说话轻快。'.repeat(4), style: '常用「呐」结尾。', lines: 'ai' }
    // 500 memories, the most recent first (as memory.ts gives them); every tenth one long
    const memories = Array.from({ length: 500 }, (_, i) => ({
      id: crypto.randomUUID(), profileId: 'nana', scope: 'private', createdAt: 1e12 + (500 - i) * 1000, updatedAt: 1e12 + (500 - i) * 1000,
      text: i % 10 === 0 ? `第${i}条长记忆：` + '我们一起在海边画了一整天的画，聊到了小时候的猫和那场大雨。'.repeat(12) : `第${i}条记忆：喜欢第${i}种口味的冰淇淋`,
    }))
    // 300 lines, a summary of all but the last 16
    const lines = Array.from({ length: 300 }, (_, i) => ({ id: `l${i}`, who: i % 2 ? 'nana' : 'me', name: i % 2 ? 'Nana' : '我', text: `第${i}句：今天想聊聊周末去哪里玩，海边还是山上，你觉得呢？`, emotion: 'neutral', action: 'none', to: null, human: i % 2 === 0 }))
    const summary = { text: '之前聊了周末的安排、海边和山上的区别、喜欢的冰淇淋口味和小时候的猫。'.repeat(20), sourceIds: lines.slice(0, 284).map((l) => l.id) }
    const model = { kind: 'openai', provider: 'custom', base: location.origin + '/budget-ai', key: 'test-only', model: 'fixture-model' }
    const signal = new AbortController().signal
    await makeBrain(model).reply({ me, others: [], humans: ['我'], topic: '周末去哪里', lines, layout: ['Nana'], role: null, cutIn: false, language: 'zh', viewer: null, summary, memories, scope: 'private', voiced: false }, signal)
    const reader = streamAiriReply({
      sessionId: 's', scope: 'private', actor: me, model, lines, context: { topic: '周末去哪里', summary: summary.text, memories: memories.slice(0, AIRI_MEMORIES) },
      input: '我：那就去海边吧', language: 'zh', signal, verifyMemory: async () => {},
    }).getReader()
    while (!(await reader.read()).done) { /* the reply as it comes */ }
  })

  const standard = calls.filter((c) => c.engine === 'standard'), airi = calls.filter((c) => c.engine === 'airi')
  console.log(JSON.stringify({ standard, airi }))
  assert.equal(standard.length, 1, 'Stage\'s own brain: one call')
  assert.ok(airi.length >= 1 && airi.length <= 2, 'AIRI: the reply, at most after one round of its memory tool')
  for (const call of calls) assert.ok(call.tokens < LIMIT, `${call.engine}: ${call.tokens} tokens (under ${LIMIT})`)
  assert.equal(airi[0].tools, 1, 'AIRI is offered its memory tool: some memories are longer than its index holds')
  assert.deepEqual(errors, [])
  console.log('test:budget passed')
} finally {
  await browser?.close(); server?.kill('SIGTERM')
}
