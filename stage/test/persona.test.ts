import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { airiIdentity, brainPersona, named, personaOf, realtimeInstructions } from '../src/brains/persona'
import { CARD_LIMITS } from '../src/characterCard'

// the cards test/prompts.mjs renders through brain.ts, airiEngine.ts and realtime.ts; the AIRI identity and the
// realtime instructions are whole there, so the renderers must give the same text here
const snapshot = (name: string) => readFileSync(new URL(`./prompts/${name}.txt`, import.meta.url), 'utf8').replace(/\n$/, '')
const card = (name: string, more: Record<string, unknown> = {}) => ({ name, persona: '', ...more })
const nana = card('Nana', {
  cardName: '小娜', persona: '小娜是住在海边的插画师，喜欢猫和雨天。', style: '说话轻快，常用「呐」结尾，小娜会自称「本画师」。',
  relationship: '把操作者当成小娜的老朋友，把观众当成画展的客人。', stance: '支持手绘，不喜欢一键出图。', examples: ['呐，今天的云像小娜画坏的草稿。', '本画师今天不加班！'],
})
const kai = card('Kai', { persona: '安静的程序员，喜欢复古游戏和咖啡。'.repeat(3), tagline: '一个总在修 bug 的游戏宅' })

test('AIRI\'s identity, as pinned', () => {
  assert.equal(airiIdentity(personaOf(nana, 'zh', 'private')), snapshot('airi-private-chinese'))
  assert.equal(airiIdentity(personaOf(nana, 'auto', 'public')), snapshot('airi-public-auto'))
  assert.equal(airiIdentity(personaOf(card('Mio'), 'en', 'public')), snapshot('airi-bare-card-english'))
  assert.equal(airiIdentity(personaOf(kai, 'ja', 'private')), snapshot('airi-japanese'))
})

test('a realtime call\'s instructions, as pinned', () => {
  assert.equal(realtimeInstructions(personaOf(nana, 'zh', 'private'), { topic: '周末去哪里', depth: 'casual' }), snapshot('realtime-private-full-card'))
  assert.equal(realtimeInstructions(personaOf(nana, 'auto', 'public'), { topic: '', depth: 'discussion' }), snapshot('realtime-public-discussion-auto'))
  assert.equal(realtimeInstructions(personaOf(kai, 'en', 'public'), { topic: 'Rainy days', depth: 'casual' }), snapshot('realtime-english'))
  assert.equal(realtimeInstructions(personaOf(card('Mio'), 'ja', 'private'), { topic: '', depth: 'casual' }), snapshot('realtime-japanese-bare-card'))
})

test('Stage\'s brain: the persona opens its prompt', () => {
  const lines = brainPersona(personaOf(nana, 'zh', 'private'), 'zh').filter(Boolean)
  assert.ok(snapshot('brain-private-full-card').startsWith(lines.join('\n') + '\n'))
  assert.ok(!brainPersona(personaOf(nana, 'auto', 'private'), 'en').some((line) => line.includes('只学语气')), 'Chinese examples only for a Chinese reply')
})

test('asked in earnest whether it is a real person or an AI, a character says it is a virtual one: Stage\'s brain and AIRI, every language and scope', () => {
  for (const language of ['zh', 'en', 'ja', 'auto'] as const) for (const scope of ['private', 'public'] as const) {
    const p = personaOf(card('Mio'), language, scope)
    for (const said of ['zh', 'en', 'ja'] as const) assert.ok(brainPersona(p, said).includes('你可以一直保持角色；但有人认真问你是真人还是 AI 时，要说明你是虚拟角色，绝不声称自己是真人。'), `${language} ${scope} ${said}`)
    assert.ok(airiIdentity(p).split('\n').includes('Stay in character, but when someone sincerely asks whether you are a real person or an AI, say you are a virtual character; never claim to be a real human.'), `${language} ${scope}`)
  }
})

test('what each engine is told of the card', () => {
  const p = personaOf(nana, 'zh', 'public')
  const realtime = realtimeInstructions(p, { topic: '' }), airi = airiIdentity(p), brain = brainPersona(p, 'zh').join('\n')
  assert.ok(!realtime.includes(nana.relationship as string) && !realtime.includes(nana.stance as string), 'a realtime call leaves out the relationship and the stance')
  assert.ok(airi.includes('Nana的老朋友') && airi.includes(nana.stance as string))
  assert.ok(brain.includes('小娜的老朋友'), 'Stage\'s brain gives the relationship as written')
  assert.ok(realtime.includes('小娜是住在海边的插画师') && !airi.includes('小娜') && brain.includes('Nana是住在海边的插画师'), 'the card\'s old name: replaced by Stage\'s brain and AIRI, not by a realtime call')
  assert.ok(brain.includes('人设里说的「对方」') === false && brainPersona(personaOf(kai, 'zh', 'public'), 'zh').includes('人设里说的「对方」，在这里就是同框的人。'), 'a one-line card says who 对方 is')
  assert.equal(named({ name: 'Nana' }, '小娜'), '小娜', 'no card name: as written')
})

test('an imported card\'s first message opens the talk; its example lines go in when the reply is in their language', () => {
  const iru = card('Iru Mk2', { cardName: 'Iru', persona: 'Iru lives in your computer.', greeting: 'Hi! I\'m Iru. Ready?', examples: ['Reading your files, obviously.'] })
  const p = personaOf(iru, 'en', 'private')
  const opening = brainPersona(p, 'en', true), later = brainPersona(p, 'en', false)
  assert.ok(opening.includes('还没有人说话，由你开场，就说你的开场白：Hi! I\'m Iru Mk2. Ready?'), 'said under the character\'s name now')
  assert.ok(!later.some((line) => line.includes('开场白')), 'only while nothing has been said')
  assert.ok(opening.some((line) => line.includes('Reading your files')), 'English example lines for an English reply')
  assert.ok(!brainPersona(p, 'zh', true).some((line) => line.includes('只学语气')), 'not for a Chinese one')
  assert.ok(airiIdentity(p).includes('Your first message, said when nothing has been said yet: Hi! I\'m Iru Mk2. Ready?'))
  assert.ok(!brainPersona(personaOf(nana, 'zh', 'private'), 'zh', true).some((line) => line.includes('开场白')), 'a card without one: as before')
  assert.ok(!airiIdentity(personaOf(nana, 'zh', 'private')).includes('first message'))
})

test('a typed persona and style are held to an imported card\'s length in every prompt', () => {
  const long = { name: 'Nana', persona: '长'.repeat(9000), style: '慢'.repeat(3000), examples: [] }
  const p = personaOf(long, 'zh', 'private')
  assert.equal(p.persona.length, CARD_LIMITS.persona)
  assert.equal(p.style?.length, CARD_LIMITS.style)
  assert.ok(brainPersona(p, 'zh').join('').length < CARD_LIMITS.persona + CARD_LIMITS.style + 200, "Stage's own brain")
  assert.ok(airiIdentity(p).length < CARD_LIMITS.persona + CARD_LIMITS.style + 1500, 'AIRI')
  assert.deepEqual([CARD_LIMITS.persona, CARD_LIMITS.style], [4000, 1500], 'the caps an imported card has')
  assert.equal(personaOf({ name: 'Kai', persona: '短', examples: [] }, 'zh', 'private').persona, '短', 'a short one as it is')
})
