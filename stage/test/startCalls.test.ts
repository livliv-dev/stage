// What every start calls, and with what: the recording (its microphone, whether it starts the talk), the session
// (talk.start / startChat / say with a first line / startLive with its limits, subtitles-only and AIRI's game), and
// hands-free. Pinned for each goal × 谁在看 × 你参与吗.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startCalls, subtitlesOnly, type StartCalls, type StartInput } from '../src/shell/startCalls'
import type { Audience, Goal, You } from '../src/shell/goals'
import type { BrainConfig } from '../src/brain'

const model: BrainConfig = { kind: 'openai', provider: 'custom', base: 'http://model.test/v1', key: 'k', model: 'm' }
const cast = [{ id: 'nana', lines: 'ai', remote: undefined, hidden: false }, { id: 'kai', lines: 'ai', remote: undefined, hidden: false }, { id: 'me', lines: 'me', remote: undefined, hidden: false }] as const
const voiced = [{ id: 'nana', muted: false, voice: 'api' }, { id: 'kai', muted: false, voice: 'api' }] as const
const live = { minutes: 30, maxGenerations: 100, warmupSeconds: 0, game: 'window', minecraftVision: false, eventsPort: '8080', rconPort: '24180', windowId: '' } as const
const input = (goal: Goal, audience: Audience, you: You, over: Partial<StartInput> = {}): StartInput => ({
  goal, options: { audience, you }, firstLine: '', stage: { cast: [...cast], hear: true, demo: false }, ai: [...voiced],
  brain: model, features: { airi: false }, live: { ...live }, ...over,
})
/** a start in a line: rec(mic, talk), the call, +handsfree */
function describe(calls: StartCalls) {
  if ('blocked' in calls) return 'blocked: ' + calls.blocked + (calls.args ? ' ' + calls.args.join() : '')
  const call = calls.call, parts: string[] = []
  if (calls.record) parts.push(`rec(mic=${+calls.record.mic},talk=${+calls.record.talk})`)
  if (call?.kind === 'conversation') parts.push('start()')
  if (call?.kind === 'chat') parts.push(call.firstLine ? `say(${call.firstLine},chat)` : 'startChat()')
  if (call?.kind === 'live') { const o = call.options; parts.push(`startLive(${o.minutes}m,${o.maxGenerations},warmup ${o.warmupSeconds},text ${+o.textOnly}${o.airi ? ',airi ' + JSON.stringify(o.airi) : ''})`) }
  if (calls.handsFree) parts.push('+handsfree')
  return parts.join(' ')
}

const LIVE = 'startLive(30m,100,warmup 0,text 0)'
// 我来演, AI 来开播 and 和角色聊天 run the same sessions for the same options; only 做一段视频 records
const SAME: Record<Audience, Record<You, string>> = {
  me: { none: 'start()', type: 'startChat()', hold: 'startChat()', handsfree: 'startChat() +handsfree', camera: 'startChat()' },
  live: { none: LIVE, type: LIVE, hold: LIVE, handsfree: LIVE + ' +handsfree', camera: LIVE },
}
const VIDEO: Record<Audience, Record<You, string>> = {
  me: { none: 'rec(mic=0,talk=1)', type: 'rec(mic=0,talk=0) startChat()', hold: 'rec(mic=1,talk=0) startChat()', handsfree: 'rec(mic=1,talk=0) startChat() +handsfree', camera: 'rec(mic=1,talk=0) startChat()' },
  live: { none: `rec(mic=0,talk=0) ${LIVE}`, type: `rec(mic=0,talk=0) ${LIVE}`, hold: `rec(mic=1,talk=0) ${LIVE}`, handsfree: `rec(mic=1,talk=0) ${LIVE} +handsfree`, camera: `rec(mic=1,talk=0) ${LIVE}` },
}

test('each goal × 谁在看 × 你参与吗 makes the calls it should', () => {
  for (const goal of ['perform', 'live', 'chat', 'video'] as const) for (const audience of ['me', 'live'] as const) for (const you of ['none', 'type', 'hold', 'handsfree', 'camera'] as const) {
    assert.equal(describe(startCalls(input(goal, audience, you))), (goal === 'video' ? VIDEO : SAME)[audience][you], `${goal} · ${audience} · ${you}`)
  }
})

test('和角色聊天 with a first line says it as the chat\'s start', () => {
  assert.equal(describe(startCalls(input('chat', 'me', 'type', { firstLine: '  你好  ' }))), 'say(你好,chat)')
  assert.equal(describe(startCalls(input('chat', 'me', 'type', { firstLine: '   ' }))), 'startChat()')
})

test('subtitles only when a character that speaks has no voice; a muted one does not count', () => {
  assert.equal(subtitlesOnly([{ id: 'a', muted: false, voice: 'api' }, { id: 'b', muted: true, voice: 'none' }]), false)
  assert.equal(subtitlesOnly([{ id: 'a', muted: false, voice: 'api' }, { id: 'b', muted: false, voice: 'none' }]), true)
  assert.equal(describe(startCalls(input('live', 'live', 'none', { ai: [{ id: 'nana', muted: false, voice: 'api' }, { id: 'kai', muted: true, voice: 'none' }] }))), LIVE)
  assert.equal(describe(startCalls(input('live', 'live', 'none', { ai: [{ id: 'nana', muted: false, voice: 'none' }] }))), 'startLive(30m,100,warmup 0,text 1)')
})

test("直播间's own limits and what it does with no chat", () => {
  assert.equal(describe(startCalls(input('live', 'live', 'none', { live: { ...live, minutes: 1, maxGenerations: 7, warmupSeconds: 60 } }))), 'startLive(1m,7,warmup 60,text 0)')
})

test('a game goes to AIRI when the engine rule picks it, and is refused in words when it does not', () => {
  const one = [{ id: 'nana', muted: false, voice: 'api' as const }]
  const minecraft = { ...live, game: 'minecraft' as const }
  assert.equal(describe(startCalls(input('live', 'live', 'none', { ai: one, features: { airi: true }, live: minecraft }))),
    'startLive(30m,100,warmup 0,text 0,airi {"windowId":"","game":{"game":"minecraft","vision":false}})')
  assert.equal(describe(startCalls(input('live', 'live', 'none', { ai: one, features: { airi: true } }))), 'startLive(30m,100,warmup 0,text 0,airi {"windowId":""})', 'AIRI with no game')
  assert.equal(describe(startCalls(input('live', 'live', 'none', { ai: one, live: minecraft }))), 'blocked: 游戏需要内置 AIRI：{0} 网页版')
  assert.equal(describe(startCalls(input('live', 'live', 'none', { ai: one, features: { airi: true }, live: { ...live, game: 'factorio', eventsPort: '0' } }))), 'blocked: 两个端口应连接同一个运行 Autorio 的存档。')
  assert.equal(describe(startCalls(input('live', 'live', 'none', { features: { airi: true } }))), LIVE, 'two AI characters: the standard engine')
})

test('what the stage lacks blocks the start, as the start options show', () => {
  assert.equal(describe(startCalls(input('chat', 'me', 'hold', { stage: { cast: [...cast], hear: false, demo: false } }))), 'blocked: 按住说和免按键需要语音识别')
  assert.equal(describe(startCalls(input('live', 'live', 'none', { stage: { cast: [...cast], hear: true, demo: true } }))), 'blocked: 直播间需要接上模型，演示只能在「只有我」里看')
})
