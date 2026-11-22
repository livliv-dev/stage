// An AIRI character card (Character Card V3 with extensions.airi, inside a PNG) imported on the character card's
// 人设和声音 page: the persona comes over (name, who it is, how it talks, the first message, example lines), the body and
// voice stay, the result says what was left behind, the first message opens a chat, the import can be undone, and a
// file that is not a card changes nothing.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { freePort, startVite, testTimeout } from './vite.mjs'

const card = {
  spec: 'chara_card_v3', spec_version: '3.0',
  data: {
    name: '伊露', description: '{{char}}住在你的电脑里，喜欢{{user}}的问题。', personality: '开朗，有点毒舌，说话简短',
    scenario: '深夜的直播间。', first_mes: '*挥手* 嗨，{{user}}！我是{{char}}，准备好了吗？',
    mes_example: '<START>\n{{user}}：在干嘛？\n{{char}}：*转圈* 在看你的文件呀。\n<START>\n{{user}}：晚安\n{{char}}：晚安，别梦到 bug。',
    alternate_greetings: [], tags: [], extensions: {
      airi: {
        avatarModels: [{ id: 'm1', type: 'live2d', displayModelId: 'hiyori' }], defaultAvatarModelId: 'm1', agents: {},
        modules: { consciousness: { provider: 'openrouter', model: 'x' }, vision: { provider: '', model: '' }, speech: { provider: 'elevenlabs', model: 'v3', voice_id: 'abc' } },
      },
    },
  },
}
/** the card inside a PNG, as AIRI exports it: a `ccv3` text chunk with the card's JSON in base64 */
function png(value) {
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'latin1')
    return Buffer.concat([head, data, Buffer.alloc(4)])
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])),
    chunk('tEXt', Buffer.concat([Buffer.from('ccv3\0', 'latin1'), Buffer.from(Buffer.from(JSON.stringify(value)).toString('base64'), 'latin1')])),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

let server, browser
const errors = [], calls = []
try {
  const port = await freePort(); server = await startVite({ port, env: { VITE_STAGE_HOST: '' } })
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' })
  await context.addInitScript(() => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') })
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url())
    if (url.pathname === '/fixture-ai/chat/completions') {
      calls.push(request.postDataJSON())
      return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify({ text: '嗨！', emotion: 'happy', action: 'none' }) } }] } })
    }
    if (url.pathname === '/api/me') return route.fulfill({ json: { signed_in: false } })
    if (['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)) return route.continue()
    return route.abort()
  })
  const page = await context.newPage(); page.setDefaultTimeout(testTimeout(15000)); page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const { store, emptyScene, newCharacter } = await import('/src/scene.ts'), { fromPngs } = await import('/src/library.ts')
    const { saveBrainConfig } = await import('/src/brain.ts')
    const canvas = new OffscreenCanvas(40, 60), draw = canvas.getContext('2d'); draw.fillStyle = '#ea92b6'; draw.fillRect(0, 0, 40, 60)
    const image = await canvas.convertToBlob({ type: 'image/png' })
    const pick = await fromPngs({ closed: new File([image], 'closed.png'), open: new File([image], 'open.png') }, 'Nana')
    window.__stage.talk.detach(); store.replace(emptyScene())
    const character = newCharacter(store.get(), 'Nana', pick.model, '喜欢具体的讨论。')
    character.lines = 'ai'; store.add(character); store.select(character.id)
    saveBrainConfig({ kind: 'openai', provider: 'custom', base: location.origin + '/fixture-ai', key: 'test-only', model: 'fixture-model', airi: false })
  })
  await page.waitForFunction(() => [...window.__stage.actors.values()].length === 1 && [...window.__stage.actors.values()].every((actor) => actor.status === 'ready'))
  const item = () => page.evaluate(() => { const c = [...window.__stage.actors.values()][0].item; return { name: c.name, persona: c.persona, style: c.style, greeting: c.greeting, examples: c.examples, model: JSON.stringify(c.model), voice: JSON.stringify(c.voice) } })
  const before = await item()
  await page.locator('.panel .card-pages').getByRole('tab', { name: '人设和声音', exact: true }).click()
  const choose = page.locator('.card-import input[type=file]')

  // not a card: nothing changes, and it says why
  await choose.setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"title":"notes"}') })
  await page.locator('.card-import .hint.error', { hasText: '这个文件不是角色卡' }).waitFor()
  assert.deepEqual(await item(), before)

  // AIRI's card in a PNG: the persona comes over, the body and voice stay, what was left behind is named
  await choose.setInputFiles({ name: 'iru.png', mimeType: 'image/png', buffer: png(card) })
  const result = page.locator('.card-import-result')
  await result.waitFor()
  assert.equal(await result.locator('p').first().textContent(), '已导入「伊露」：名字、人设、说话风格、开场白、示例对话 2 句')
  assert.equal(await result.locator('p').nth(1).textContent(), '没有导入：形象模型、声音、AIRI 的其他模块设置、场景')
  assert.equal(await result.locator('p').count(), 2)
  const now = await item()
  assert.deepEqual({ ...now, model: undefined, voice: undefined }, {
    name: '伊露', persona: '伊露住在你的电脑里，喜欢你的问题。', style: '开朗，有点毒舌，说话简短', greeting: '嗨，你！我是伊露，准备好了吗？',
    examples: ['在看你的文件呀。', '晚安，别梦到 bug。'], model: undefined, voice: undefined,
  })
  assert.equal(now.model, before.model, 'the body stays')
  assert.equal(now.voice, before.voice, 'the voice stays')
  assert.equal(await page.getByLabel('开场白').inputValue(), '嗨，你！我是伊露，准备好了吗？')

  // a chat begun with nothing said opens with the card's first message
  await page.evaluate(async () => { const { talk } = window.__stage; await talk.newChat(); await talk.startChat('private') })
  await page.waitForFunction(() => window.__stage.conversation().lines.some((line) => !line.human) || window.__stage.conversation().error)
  await page.evaluate(() => window.__stage.talk.stop())
  const system = calls[0]?.messages?.[0]?.content ?? ''
  assert.ok(system.includes('你扮演「伊露」') && system.includes('你的人设：伊露住在你的电脑里'), system.slice(0, 200))
  assert.ok(system.includes('还没有人说话，由你开场，就说你的开场白：嗨，你！我是伊露，准备好了吗？'))
  assert.ok(system.includes('你平时说话的样子，只学语气，不要照抄：在看你的文件呀。 / 晚安，别梦到 bug。'))

  // undone: the character as it was
  await result.getByRole('button', { name: '撤销导入' }).click()
  assert.deepEqual(await item(), before)
  assert.equal(await page.getByLabel('开场白').count(), 0)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ok: true, calls: calls.length }))
} catch (error) {
  console.error(error); process.exitCode = 1
} finally { await browser?.close(); server?.kill() }
