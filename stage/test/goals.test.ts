// The start's rules: which session a goal and its options run, what a stage's goal is, and each goal's checklist.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { goalOf, goalOptions, optionsOf, startLabel, startPlan, youHint, type StartStage } from '../src/shell/goals'
import { checklist, readiness, type CheckContext } from '../src/shell/checks'
import type { EngineChoice } from '../src/brains/select'

const ai = { id: 'nana', lines: 'ai', remote: false, hidden: false } as const
const kai = { id: 'kai', lines: 'ai', remote: false, hidden: false } as const
const me = { id: 'me', lines: 'me', remote: false, hidden: false } as const
const friend = { id: 'friend', lines: 'ai', remote: { person: 'x' }, hidden: false } as unknown as StartStage['cast'][number]
const stage = (over: Partial<StartStage> = {}): StartStage => ({ cast: [ai], hear: true, demo: false, ...over })

test('each combination runs one of the sessions there are, or says why not', () => {
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'type' }, stage()), { session: 'chat', record: false, handsFree: false })
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'handsfree' }, stage()), { session: 'chat', record: false, handsFree: true })
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'none' }, stage({ cast: [ai, kai] })), { session: 'conversation', record: false, handsFree: false })
  assert.deepEqual(startPlan('live', { audience: 'live', you: 'none' }, stage()), { session: 'live', record: false, handsFree: false })
  assert.deepEqual(startPlan('video', { audience: 'me', you: 'none' }, stage({ cast: [ai, kai] })), { session: 'conversation', record: true, handsFree: false })
  assert.deepEqual(startPlan('perform', { audience: 'live', you: 'camera' }, stage({ cast: [me, ai] })), { session: 'live', record: false, handsFree: false })
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'type' }, stage({ cast: [me, friend] })), { blocked: '舞台上还没有 AI 角色' }, "a friend's character is not yours to start")
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'hold' }, stage({ hear: false })), { blocked: '按住说和免按键需要语音识别' })
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'camera' }, stage()), { blocked: '我也上镜需要一个「我来演」的角色' })
  assert.deepEqual(startPlan('live', { audience: 'live', you: 'none' }, stage({ demo: true })), { blocked: '直播间需要接上模型，演示只能在「只有我」里看' })
  assert.deepEqual(startPlan('chat', { audience: 'me', you: 'none' }, stage({ demo: true })), { session: 'conversation', record: false, handsFree: false }, 'the demo plays for you alone')
})

test('the start button is named by the goal; 我来演 alone has none', () => {
  assert.equal(startLabel('perform', false), null)
  assert.equal(startLabel('perform', true), '开播')
  assert.deepEqual((['live', 'chat', 'video'] as const).map((goal) => startLabel(goal, false)), ['开播', '开始聊天', '开录'])
  // by what the start does: a 直播间 is 开播, your part 开始聊天, the characters among themselves 开始, a recording 开录
  assert.equal(startLabel('live', false, { audience: 'me', you: 'none' }), '开始')
  assert.equal(startLabel('chat', false, { audience: 'live', you: 'type' }), '开播')
  assert.equal(startLabel('perform', true, { audience: 'me', you: 'camera' }), '开始聊天')
  assert.equal(startLabel('video', false, { audience: 'live', you: 'none' }), '开录')
})

test("a stage's goal: the one picked, else its template's start", () => {
  assert.equal(goalOf({ goal: 'video', start: 'live' }, true), 'video')
  assert.equal(goalOf({ start: 'live' }, true), 'live')
  assert.equal(goalOf({ start: 'conversation' }, true), 'chat')
  assert.equal(goalOf({ start: 'chat' }, true), 'chat')
  assert.equal(goalOf({}, false), 'perform')
  // the characters talking among themselves stay so: you not joining, nothing recorded
  assert.deepEqual(optionsOf({ start: 'conversation' }, 'chat', false), { audience: 'me', you: 'none' })
  assert.deepEqual(optionsOf({ start: 'live' }, 'live', false), goalOptions('live', false))
  assert.deepEqual(optionsOf({ goal: 'chat', start: 'conversation' }, 'chat', false), goalOptions('chat', false), 'a picked goal has its own options')
  assert.deepEqual(optionsOf({ goal: 'chat', audience: 'live', you: 'hold' }, 'chat', false), { audience: 'live', you: 'hold' }, 'what was chosen stays')
  assert.deepEqual(goalOptions('perform', true), { audience: 'live', you: 'camera' })
})

test('不参与 says what happens', () => {
  assert.equal(youHint('none', 'live', 1), '角色回应直播间')
  assert.equal(youHint('none', 'me', 2), '角色之间聊')
  assert.equal(youHint('none', 'me', 1), '只有一个 AI 角色：它会一个人说下去')
  assert.equal(youHint('type', 'me', 1), '在控制台打字')
})

const standard: EngineChoice = { engine: 'standard', reason: 'web' } as EngineChoice
const context = (over: Partial<CheckContext> = {}): CheckContext => ({
  model: 'qwen-flash', ai: [{ name: 'Nana', voice: 'api', muted: false }], face: null, partner: false, hear: false, microphone: false,
  phone: { here: false, on: false }, twitch: { status: 'off', channel: '' }, game: { here: false, engine: standard, reason: '网页版' },
  realtime: { ready: false, provider: '' }, ...over,
})

test('each goal lists only what it needs', () => {
  assert.deepEqual(checklist('chat', context()).map((c) => c.id), ['model', 'voice', 'hearing', 'realtime'])
  assert.deepEqual(checklist('live', context()).map((c) => c.id), ['model', 'voice', 'twitch', 'game'])
  assert.deepEqual(checklist('video', context()).map((c) => c.id), ['model', 'record-voice'])
  assert.deepEqual(checklist('perform', context()).map((c) => c.id), ['camera', 'microphone', 'phone', 'twitch'])
  assert.deepEqual(checklist('perform', context({ partner: true })).map((c) => c.id), ['camera', 'microphone', 'phone', 'model', 'voice'])
})

test('where each item stands; optional and desktop items do not count toward ready', () => {
  const chat = checklist('chat', context())
  assert.deepEqual(readiness(chat), { ready: 2, of: 2 })
  assert.equal(checklist('chat', context({ model: null }))[0].state, 'todo', 'the demo is no model of one\'s own')
  assert.equal(checklist('chat', context({ ai: [{ name: 'Nana', voice: 'none', muted: false }] }))[1].state, 'warn', 'subtitles only')
  const live = checklist('live', context())
  assert.equal(live.find((c) => c.id === 'game')?.state, 'off'); assert.equal(live.find((c) => c.id === 'game')?.desktop, true)
  assert.deepEqual(readiness(live), { ready: 2, of: 2 })
  const video = checklist('video', context({ ai: [{ name: 'Nana', voice: 'system', muted: false }] }))
  assert.equal(video[1].state, 'warn', 'the system voice plays aside and is not in the file')
  const perform = checklist('perform', context({ face: { name: 'Me', tracking: true, calibrated: false } }))
  assert.equal(perform[0].state, 'todo'); assert.equal(perform[2].state, 'off')
  assert.deepEqual(readiness(perform), { ready: 0, of: 1 })
})
