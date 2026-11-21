// What a character is told it is, word for word: the prompt Stage's own brain gives the model (brain.ts prompt), the
// identity AIRI's runtime is given (airiEngine.ts identity) and a realtime call's instructions (realtime.ts
// instructions), for a set of cards and sessions, compared with test/prompts/<case>.txt.
//   npm run test:prompts              compare
//   npm run test:prompts -- --update  write them anew from this run: read the diff before keeping it
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { freePort, startVite, testTimeout } from './vite.mjs'

const dir = fileURLToPath(new URL('./prompts/', import.meta.url)), update = process.argv.includes('--update')
let server, browser
try {
  const port = await freePort(); server = await startVite({ port, args: ['--configLoader', 'native'] })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const context = await browser.newContext()
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', (route) => { const url = new URL(route.request().url()); return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort() })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(20000))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!window.__stage)
  const prompts = await page.evaluate(async () => {
    const { prompt } = await import('/src/brain.ts'), { identity } = await import('/src/airiEngine.ts'), { instructions } = await import('/src/realtime.ts')
    const { store } = await import('/src/scene.ts'), { talk } = window.__stage
    const card = (name, more = {}) => ({ id: name.toLowerCase(), kind: 'character', name, persona: '', lines: 'ai', length: 'short', reactions: { enabled: true, intensity: 0.8, listen: true }, ...more })
    // a full card written for 「小娜」 before the character became Nana: Stage's brain and AIRI say Nana, a realtime call reads it as written
    const nana = card('Nana', {
      cardName: '小娜', persona: '小娜是住在海边的插画师，喜欢猫和雨天。', style: '说话轻快，常用「呐」结尾，小娜会自称「本画师」。',
      relationship: '把操作者当成小娜的老朋友，把观众当成画展的客人。', stance: '支持手绘，不喜欢一键出图。', examples: ['呐，今天的云像小娜画坏的草稿。', '本画师今天不加班！'],
    })
    const kai = card('Kai', { persona: '安静的程序员，喜欢复古游戏和咖啡。'.repeat(3), tagline: '一个总在修 bug 的游戏宅' })
    const sena = card('Sena', { persona: '元气满满的偶像练习生，什么都想试一试，最怕早起。', length: 'long' })
    const lines = (n, who = nana) => Array.from({ length: n }, (_, i) => ({ id: 'l' + i, who: i % 2 ? 'kai' : who.id, name: i % 2 ? 'Kai' : who.name, text: `第 ${i + 1} 句：今天的话题很有意思。`, emotion: 'neutral', action: 'none', to: null }))
    const ask = (more) => ({ me: nana, others: [], humans: [], topic: '', lines: [], layout: [], role: null, cutIn: false, language: 'zh', viewer: null, ...more })
    const out = {}
    out['brain-private-full-card'] = prompt(ask({ others: [kai, sena], humans: ['我'], topic: '周末去哪里', lines: lines(3), layout: ['Kai', 'Nana', 'Sena'], scope: 'private', depth: 'casual' }))
    out['brain-public-host-viewer-event'] = prompt(ask({ me: sena, others: [nana, kai], topic: 'What should we stream next?', lines: lines(2, sena), layout: ['Sena', 'Nana', 'Kai'], role: 'host', cutIn: true, language: 'auto',
      viewer: { user: 'Aki', text: 'Play a horror game!' }, scope: 'public', depth: 'discussion', event: { source: 'Minecraft', message: 'A creeper is near.' } }))
    out['brain-guest-japanese-summary'] = prompt(ask({ me: kai, others: [nana], role: 'guest', language: 'ja', lines: lines(18, kai), layout: ['Kai'], scope: 'public' }))
    out['brain-auto-english-examples-left-out'] = prompt(ask({ topic: 'Rainy days', language: 'auto', scope: 'private' }))
    out['brain-bare-card-no-scope'] = prompt(ask({ me: card('Mio') }))
    out['airi-private-chinese'] = identity(nana, 'zh', 'private')
    out['airi-public-auto'] = identity(nana, 'auto', 'public')
    out['airi-bare-card-english'] = identity(card('Mio'), 'en', 'public')
    out['airi-japanese'] = identity(kai, 'ja', 'private')
    const realtime = async ({ topic, language, depth, scope }, who = nana) => {
      store.set({ topic }); store.setTalk({ language, depth })
      if (window.__stage.conversation().scope !== scope) assert(await talk.setScope(scope), 'scope ' + scope)
      return instructions(who)
    }
    const assert = (ok, what) => { if (!ok) throw new Error('could not set ' + what) }
    out['realtime-private-full-card'] = await realtime({ topic: '周末去哪里', language: 'zh', depth: 'casual', scope: 'private' })
    out['realtime-public-discussion-auto'] = await realtime({ topic: '', language: 'auto', depth: 'discussion', scope: 'public' })
    out['realtime-english'] = await realtime({ topic: 'Rainy days', language: 'en', depth: 'casual', scope: 'public' }, kai)
    out['realtime-japanese-bare-card'] = await realtime({ topic: '', language: 'ja', depth: 'casual', scope: 'private' }, card('Mio'))
    return out
  })
  await mkdir(dir, { recursive: true })
  for (const [name, text] of Object.entries(prompts)) {
    const file = join(dir, `${name}.txt`)
    if (update) await writeFile(file, text + '\n')
    else assert.equal(text + '\n', await readFile(file, 'utf8'), `${name}: the prompt changed`)
  }
  console.log(JSON.stringify({ ok: true, prompts: Object.keys(prompts).length, updated: update }))
} catch (error) {
  console.error(error); process.exitCode = 1
} finally { await browser?.close(); server?.kill('SIGTERM') }
