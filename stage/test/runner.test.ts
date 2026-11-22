// The session runner and its policies, without a browser: a fake stage (Env) on a virtual clock, chance draws pinned
// to the first choice, a fake engine and fake actors. Each test runs a whole session and reads what it said and did.
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { tr } from '../src/i18n'
import type { CharacterItem, Talk } from '../src/scene'
import type { Line } from '../src/core/lines'
import type { ConvState } from '../src/sessions/state'
import { once, type Engine } from '../src/brains/engines/types'
import { LIVE_FAILURES, spend } from '../src/sessions/budget'
import { setChance } from '../src/sessions/chance'
import { clock, setClock } from '../src/sessions/clock'
import { NeedModel, VoiceFailed } from '../src/sessions/errors'
import { Inbox } from '../src/sessions/queue'
import { current, order, Run } from '../src/sessions/run'
import { handOver, runSession, turnPublic, type Env, type Policy } from '../src/sessions/runner'
import { Wake } from '../src/sessions/wake'
import { duetPolicy, oncePolicy } from '../src/sessions/policies/duet'
import { chatPolicy } from '../src/sessions/policies/chat'
import { livePolicy, type LiveSetup } from '../src/sessions/policies/live'

// ---------------------------------------------------------------- time, chance, the cast

const START = 1_000_000
/** the session clock, moved by hand: when the session has nothing to do but wait, time jumps to its next timer */
function virtualTime() {
  let now = START, id = 0
  const timers = new Map<number, { at: number; f: () => void }>()
  setClock({ now: () => now, timeout: (f, ms) => { timers.set(++id, { at: now + ms, f }); return id }, clear: (i) => { if (i !== undefined) timers.delete(i) } })
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve)) }
  return {
    get now() { return now },
    /** runs what is due, timer by timer, until the session ends, it waits with no timer left, or `until` holds (the
     *  session is then left where it is, for the test to go on) */
    async run(done: Promise<unknown>, until: () => boolean = () => false, max = 2000) {
      let ended = false
      void done.then(() => { ended = true }, () => { ended = true })
      for (let i = 0; i < max; i++) {
        await settle()
        if (ended || until()) return
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) return
        timers.delete(next[0]); now = Math.max(now, next[1].at); next[1].f()
      }
      throw new Error('the session never settled')
    },
    /** `ms` go by (the session's own timers run as they fall due); it is left where it is then */
    async pass(done: Promise<unknown>, ms: number) {
      const until = now + ms
      clock.timeout(() => {}, ms)
      await this.run(done, () => now >= until)
    },
  }
}
let time: ReturnType<typeof virtualTime>
beforeEach(() => { time = virtualTime(); setChance(() => 0); order.lastTurn = order.skipped = order.forced = null })
afterEach(() => { current()?.controller.abort(); setClock(); setChance() })

const character = (id: string, x: number, lines: CharacterItem['lines'] = 'ai') => ({ id, name: id.toUpperCase(), lines, chatty: 1, x, w: 100 }) as CharacterItem
const nana = character('nana', 0), kai = character('kai', 300), sena = character('sena', 600), me = character('me', 900, 'me')
const yours = (text: string, to: string | null = null): Line => ({ id: text, who: 'me', name: '我', text, emotion: 'neutral', action: 'none', to, human: true })

// ---------------------------------------------------------------- the fake stage

type Fake = Env & {
  /** what was said, in order; what else happened (errors, ends, waits); the engine, failing with what is queued; voices
   *  that fail; turns cut off part way (by you: the epoch moves on; by something else: a game character talking); your
   *  answers on your character's turns (null: skipped); the state; what holds a turn; the public record opening */
  said: string[]; log: string[]; model: Engine; fail: Error[]; voiceFails: number; cuts: ('you' | 'other')[]; answers: (string | null)[]; s: ConvState
  holds: { held: boolean; epoch: number }; publicOpens: () => Promise<void>
}

/** a model that answers `<NAME> <n>` (and whom it answers), failing with what is queued */
function fakeEngine(fail: Error[]): Engine {
  let n = 0
  return {
    id: 'openai', caps: { stream: false, vision: false, tools: false, multiCast: true },
    reply: (request) => once(async () => {
      const error = fail.shift()
      if (error) throw error
      const to = request.context.viewer ? ` @${request.context.viewer.user}` : request.context.event ? ` @${request.context.event.source}` : ''
      return { text: `${request.speaker.name} ${++n}${to}`, emotion: 'neutral', action: 'none', to: null }
    }),
  }
}

function fakeStage(cast: CharacterItem[], s: Partial<ConvState> = {}, talk: Partial<Talk> = {}): Fake {
  const state = { running: true, mode: 'conversation', scope: 'private', paused: false, lines: [] as Line[], turns: 0, limit: 12, gap: 0.6, generations: 0, generationLimit: 100,
    error: '', ended: '', waitingInput: false, waitingAudience: false, retryAt: 0, needModel: false, ...s } as ConvState
  const fail: Error[] = [], said: string[] = [], log: string[] = [], answers: (string | null)[] = []
  const line = (who: CharacterItem, text: string, human = false): Line => ({ id: `${state.lines.length + 1}`, who: who.id, name: who.name, text, emotion: 'neutral', action: 'none', to: null, human })
  /** a line on the stage: who had the turn, and a second to say it */
  const deliver = async (l: Line, signal: AbortSignal) => {
    state.lines = [...state.lines, l]; order.lastTurn = l.who; order.skipped = null
    await new Promise<void>((resolve, reject) => {
      const t = clock.timeout(resolve, 1000)
      signal.addEventListener('abort', () => { clock.clear(t); reject(signal.reason) }, { once: true })
    })
  }
  const env: Fake = {
    said, log, fail, answers, voiceFails: 0, cuts: [], s: state, holds: { held: false, epoch: 0 }, model: fakeEngine(fail), publicOpens: async () => {},
    engine: () => env.model, follow: () => {}, letGo: () => {},
    state: () => state,
    set(patch) {
      Object.assign(state, patch)
      if (patch.error) log.push('error: ' + patch.error)
      if (patch.ended) log.push('ended: ' + patch.ended)
      if (patch.needModel) log.push('needModel: ' + patch.modelIntent)
      if (patch.retryAt) log.push(`retry in ${(patch.retryAt - time.now) / 1000} s`)
    },
    cast: () => cast,
    talk: () => ({ order: 'free', danmaku: 0, interrupt: 0, proactiveSeconds: 0, ...talk }) as Talk,
    demo: () => null,
    inbox: new Inbox(), wake: new Wake(),
    held: () => env.holds.held || state.paused,
    epoch: () => env.holds.epoch,
    blocked: (user) => user === 'Blocked',
    async consume(_run, item) { state.lines = [...state.lines, item.line]; said.push('you: ' + item.line.text) },
    nextEpoch: () => { env.holds.epoch++ },
    openPublic: () => env.publicOpens(),
    async yourTurn(_run, who) { log.push('your turn: ' + who.name); const text = answers.shift(); return text ? line(who, text, true) : null },
    async sayYours(_run, l, signal) { said.push(`${l.name}: ${l.text}`); await deliver(l, signal) },
    async speak(run, who, signal, viewer, replyToOwner) {
      if (state.mode !== 'conversation') Object.assign(state, spend(state))
      let text = ''
      // each turn on the model set up now (a session on AIRI keeps its own)
      for await (const u of (run.engine ?? env.model).reply({ speaker: who, context: { viewer, event: run.event ?? undefined, replyToOwner } } as never, signal)) text = u.text
      signal.throwIfAborted()
      state.turns++
      const cut = env.cuts.shift()
      if (cut) { said.push('cut: ' + text); if (cut === 'you') env.holds.epoch++; return false }
      said.push(text)
      await deliver(line(who, text), signal)
      if (env.voiceFails > 0) { env.voiceFails--; throw new VoiceFailed('no voice') }
      return true
    },
    ahead: () => null,
    lineLimit: () => state.limit,
    cutting: () => false,
    waitingForYou: () => log.push('waiting for you'),
    interrupt: () => log.push('interrupted'),
    silence: (what) => log.push(`silenced ${what}`),
    lookAround: () => {},
  }
  return env
}

/** a session of `kind` on the fake stage */
function begin(env: Fake, kind: Run['kind'], make: (run: Run) => Policy) {
  const run = new Run(kind)
  handOver(run, env)
  return { run, done: runSession(make(run), run, env) }
}
const opened = async () => {}
const typed = (env: Fake, text: string, to: string | null = null) => { env.inbox.push({ kind: 'typed', line: yours(text, to) }); env.wake.wake() }

// ---------------------------------------------------------------- 对谈 (the characters among themselves)

test('对谈: who speaks follows the stage order, with a pause between lines, and it ends after its lines', async () => {
  const env = fakeStage([nana, kai, sena], { limit: 4 }, { order: 'round' })
  const { done } = begin(env, 'conversation', (run) => duetPolicy(run, env, opened))
  await time.run(done); await done
  assert.deepEqual(env.said, ['NANA 1', 'KAI 2', 'SENA 3', 'NANA 4'])
  // four lines of a second; a pause of 0.6 s × 0.7 (the first draw) after each
  assert.equal(time.now - START, 4 * 1000 + 4 * 420)
  assert.equal(env.s.running, false, 'the stage is put back')
})

test('对谈: your character waits for your line on its turn; a skip passes it on', async () => {
  const env = fakeStage([nana, me], { limit: 3 }, { order: 'round' })
  env.answers.push('mine', null)
  const { done } = begin(env, 'conversation', (run) => duetPolicy(run, env, opened))
  await time.run(done); await done
  assert.deepEqual(env.said, ['NANA 1', 'ME: mine', 'NANA 2', 'NANA 3'])
  assert.deepEqual(env.log.filter((x) => x.startsWith('your turn')), ['your turn: ME', 'your turn: ME'])
})

test('对谈: paused, the next line waits for resume', async () => {
  const env = fakeStage([nana, kai], { limit: 3 }, { order: 'round' })
  const { done } = begin(env, 'conversation', (run) => duetPolicy(run, env, opened))
  await time.run(done, () => env.said.length === 1)
  env.s.paused = true
  await time.pass(done, 60_000)
  assert.deepEqual(env.said, ['NANA 1'], 'nothing more is said while paused')
  env.s.paused = false
  await time.run(done); await done
  assert.deepEqual(env.said, ['NANA 1', 'KAI 2', 'NANA 3'])
})

test('对谈: a voice that fails keeps the talk going; a turn with no model asks for one', async () => {
  const env = fakeStage([nana, kai], { limit: 2 }, { order: 'round' })
  env.voiceFails = 1
  const { done } = begin(env, 'conversation', (run) => duetPolicy(run, env, opened))
  await time.run(done); await done
  assert.deepEqual(env.said, ['NANA 1', 'KAI 2'])
  assert.equal(env.s.error, '', 'not an error: the line was shown')
  const second = fakeStage([nana])
  second.fail.push(new NeedModel())
  const session = begin(second, 'conversation', (run) => duetPolicy(run, second, opened))
  await time.run(session.done); await session.done
  assert.deepEqual(second.log, ['needModel: conversation'], 'and nothing silenced at the end: the stage is left as it is')
})

test('a line of yours with nothing running: the one you named answers, and once more for what you said meanwhile', async () => {
  const env = fakeStage([nana, kai])
  env.inbox.push({ kind: 'typed', line: yours('kai, hello', 'KAI') })
  const { done } = begin(env, 'conversation', () => oncePolicy(env, opened))
  await time.run(done, () => env.said.length === 2)
  typed(env, 'and you, nana', 'NANA')
  await time.run(done); await done
  assert.deepEqual(env.said, ['you: kai, hello', 'KAI 1', 'you: and you, nana', 'NANA 2'])
})

// ---------------------------------------------------------------- 和角色聊天

const chat = (env: Fake, until = START + 3600_000) => begin(env, 'chat', (run) => chatPolicy(run, env, { until, close: () => {} }))
const earlier: Line = { id: '0', who: 'nana', name: 'NANA', text: 'earlier', emotion: 'neutral', action: 'none', to: null }

test('聊天: it answers your lines and waits for you; it ends at its generations', async () => {
  const env = fakeStage([nana], { mode: 'chat', generationLimit: 2, lines: [earlier] })
  const { done } = chat(env)
  await time.run(done, () => env.s.waitingInput)
  assert.deepEqual(env.said, [], 'with lines there already, it waits for yours')
  assert.ok(env.log.includes('waiting for you'))
  typed(env, 'hi'); await time.run(done, () => env.said.length === 2 && env.s.waitingInput)
  typed(env, 'again'); await time.run(done); await done
  assert.deepEqual(env.said, ['you: hi', 'NANA 1', 'you: again', 'NANA 2'])
  assert.equal(env.s.ended, tr('已达到本次生成次数上限'))
})

test('聊天: it speaks up once after a quiet while; at its minutes, the turn in hand is cut', async () => {
  const env = fakeStage([nana], { mode: 'chat', lines: [earlier] }, { proactiveSeconds: 20 })
  const { done } = chat(env, START + 60_000)
  await time.run(done); await done
  assert.deepEqual(env.said, ['NANA 1'], 'one line of its own after 20 quiet seconds, then it waits')
  assert.deepEqual(env.log.slice(-3), [`ended: ${tr('已达到本次时长上限')}`, 'interrupted', 'silenced actors'])
})

test('聊天: held (you speaking, a game character talking), it waits; then a chat with nothing said starts with a line', async () => {
  const env = fakeStage([nana], { mode: 'chat' })
  env.holds.held = true
  const { done } = chat(env)
  await time.pass(done, 30_000)
  assert.deepEqual(env.said, [], 'nothing while held')
  env.holds.held = false; env.wake.wake()
  await time.run(done, () => env.said.length === 1 && env.s.waitingInput)
  assert.deepEqual(env.said, ['NANA 1'])
})

test('an output coming on: your unsaid lines dropped, the turn cut, and the session goes on once the public record is open', async () => {
  const env = fakeStage([nana], { mode: 'chat' })
  let opened = () => {}
  env.publicOpens = () => new Promise<void>((resolve) => { opened = resolve })
  const { run, done } = chat(env)
  await time.run(done, () => env.said.length === 1 && env.s.waitingInput)
  // two private lines wait when an output comes on (the facade's goPublic)
  env.inbox.push({ kind: 'typed', line: yours('private one') }); env.inbox.push({ kind: 'transcript', line: yours('private two') })
  const epoch = env.holds.epoch
  turnPublic(run, env, (error) => env.log.push('failed: ' + error))
  assert.equal(env.inbox.has(['typed', 'transcript']), false, 'never said or remembered in public')
  assert.deepEqual([env.s.scope, env.s.lines, env.s.error], ['public', [], tr('输出已打开，还没说出的私聊输入已丢弃')])
  assert.ok(env.log.includes('interrupted')); assert.equal(env.holds.epoch, epoch + 1)
  typed(env, 'in public')
  await time.pass(done, 0)
  assert.deepEqual(env.said, ['NANA 1'], 'nothing goes on until the public record is open')
  opened()
  await time.run(done, () => env.said.length === 3 && env.s.waitingInput)
  assert.deepEqual(env.said, ['NANA 1', 'you: in public', 'NANA 2'])
  assert.equal(run.switching, null)
})

test('聊天: a turn cut off by something else is asked again; one you cut off waits for you', async () => {
  const env = fakeStage([nana], { mode: 'chat', lines: [earlier] })
  const { done } = chat(env)
  env.cuts.push('other')
  typed(env, 'hi')
  await time.run(done, () => env.said.length === 3 && env.s.waitingInput)
  assert.deepEqual(env.said, ['you: hi', 'cut: NANA 1', 'NANA 2'], 'cut by a game character talking: answered again')
  env.cuts.push('you')
  typed(env, 'and now')
  await time.run(done, () => env.said.length === 5 && env.s.waitingInput)
  assert.deepEqual(env.said.slice(3), ['you: and now', 'cut: NANA 3'], 'you cut it off: it waits for what you say next')
})

test('the stage after a session ends: 对谈 leaves the last expression to play out, a chat stops the voices, a 直播间 every voice', async () => {
  const duet = fakeStage([nana], { limit: 1 })
  const a = begin(duet, 'conversation', (run) => duetPolicy(run, duet, opened))
  await time.run(a.done); await a.done
  const once = fakeStage([nana])
  once.inbox.push({ kind: 'typed', line: yours('hi') })
  const b = begin(once, 'conversation', () => oncePolicy(once, opened))
  await time.run(b.done); await b.done
  const talk = fakeStage([nana], { mode: 'chat', generationLimit: 1 })
  const c = chat(talk)
  await time.run(c.done); await c.done
  const room = fakeStage([nana], { mode: 'live', scope: 'public', generationLimit: 1 })
  room.inbox.push(viewer('v'))
  const d = live(room)
  await time.run(d.done); await d.done
  assert.deepEqual([duet, once, talk, room].map((env) => env.log.filter((x) => x.startsWith('silenced'))), [[], [], ['silenced actors'], ['silenced all']])
  assert.deepEqual([duet.s.running, once.s.running, talk.s.running, room.s.running], [false, false, false, false])
})

test('on AIRI a session keeps the engine chosen at its start; otherwise it has none of its own', () => {
  const env = fakeStage([nana])
  const airi = new Run('chat')
  handOver(airi, env, { kind: 'openai', provider: 'custom', base: 'x', key: 'k', model: 'm' })
  assert.equal(airi.engine, env.model)
  const own = new Run('chat')
  handOver(own, env)
  assert.equal(own.engine, null)
  assert.equal(airi.signal.aborted, true, 'the new session took over')
})

// ---------------------------------------------------------------- 直播间

const options = { minutes: 30, maxGenerations: 100, warmupSeconds: 0, textOnly: false }
function live(env: Fake, setup: Partial<LiveSetup> = {}) {
  return begin(env, 'live', (run) => livePolicy(run, env, {
    options, until: START + 30 * 60_000, open: opened, close: async () => {}, airi: null, game: false, describe: (e) => (e as Error).message, ...setup,
  }))
}
const viewer = (id: string, user = 'Viewer') => ({ kind: 'viewer' as const, chat: { id, user, text: id, at: time.now } })

test('直播间: an event first, then viewers one at a time, six seconds apart, never a blocked one', async () => {
  const env = fakeStage([nana, kai], { mode: 'live', scope: 'public' })
  env.inbox.push(viewer('a')); env.inbox.push(viewer('b', 'Blocked')); env.inbox.push(viewer('c'))
  env.inbox.push({ kind: 'game', event: { id: 'e', source: 'Minecraft', message: 'a creeper', character: 'kai', reply: 'maybe' } })
  const { done } = live(env)
  await time.run(done, () => env.said.length === 3 && env.s.waitingAudience)
  assert.deepEqual(env.said, ['KAI 1 @Minecraft', 'NANA 2 @Viewer', 'KAI 3 @Viewer'])
  assert.equal(time.now - START, 3 * 1000 + 2 * 6000, 'three lines of a second, six seconds from the end of one to the next')
})

test('直播间: a failed turn is tried again after 5 s, then 15 s; the session stops at the third failure in a row', async () => {
  const env = fakeStage([nana], { mode: 'live', scope: 'public' })
  env.inbox.push(viewer('q'))
  env.fail.push(new Error('busy'), new Error('busy'))
  const { done } = live(env)
  await time.run(done, () => env.said.length === 1)
  assert.deepEqual(env.said, ['NANA 1 @Viewer'], 'the viewer is answered on the third try')
  assert.deepEqual(env.log, ['error: busy', 'retry in 5 s', 'error: busy', 'retry in 15 s'])
  env.fail.push(new Error('down'), new Error('down'), new Error('down'))
  env.inbox.push(viewer('r')); env.wake.wake()
  await time.run(done); await done
  assert.equal(env.s.ended, tr('连续出错 {0} 次，已停止', LIVE_FAILURES))
  assert.equal(env.s.error, 'down')
})

test('直播间: a game still playing keeps it open past its generations; its event is answered by the game character', async () => {
  const env = fakeStage([nana, kai], { mode: 'live', scope: 'public', generationLimit: 1, game: { name: 'minecraft', status: 'playing', text: '' } })
  env.inbox.push({ kind: 'game', event: { id: 'e', source: 'Minecraft', message: 'mined', character: 'nana', reply: 'maybe' } })
  const { done } = live(env)
  await time.run(done, () => env.said.length === 1)
  await time.pass(done, 120_000)
  assert.deepEqual(env.said, ['NANA 1 @Minecraft'])
  assert.equal(env.s.running, true, 'open while the game plays')
  env.s.game = { name: 'minecraft', status: 'ready', text: '' }; env.wake.wake()
  await time.run(done); await done
  assert.equal(env.s.ended, tr('已达到本次生成次数上限'))
})

test('直播间: a viewer whose answer a game character cut off is answered when it is tried again; one you cut off is not', async () => {
  const env = fakeStage([nana], { mode: 'live', scope: 'public' })
  env.inbox.push(viewer('q', 'Qi'))
  env.cuts.push('other')
  const { done } = live(env)
  await time.run(done, () => env.said.length === 2)
  assert.deepEqual(env.said, ['cut: NANA 1 @Qi', 'NANA 2 @Qi'])
  env.cuts.push('you')
  env.inbox.push(viewer('r', 'Ren')); env.wake.wake()
  await time.run(done, () => env.said.length === 3)
  env.inbox.push(viewer('s', 'Sun')); env.wake.wake()
  await time.run(done, () => env.said.length === 4)
  assert.deepEqual(env.said.slice(2), ['cut: NANA 3 @Ren', 'NANA 4 @Sun'], 'Ren counts as answered once you spoke')
})

test('直播间: the automatic warm-up speaks every 30 s with no chat source, waits quietly while one is connected, and follows it', async () => {
  const env = fakeStage([nana], { mode: 'live', scope: 'public' })
  let connected = false
  const { done } = live(env, { options: { ...options, warmupSeconds: null }, chatConnected: () => connected })
  await time.run(done, () => env.said.length === 2)
  const second = time.now
  await time.pass(done, 29_000)
  assert.equal(env.said.length, 2, 'a line every 30 seconds')
  await time.run(done, () => env.said.length === 3)
  assert.equal(time.now - second, 1000 + 30_000, 'thirty seconds from the end of the line before (a line takes a second)')
  connected = true; env.wake.wake()
  await time.pass(done, 600_000)
  assert.equal(env.said.length, 3, 'quiet while chat comes in from a connected source')
  assert.ok(time.now - second >= 600_000)
  env.inbox.push(viewer('v')); env.wake.wake()
  await time.run(done, () => env.said.length === 4)
  assert.equal(env.said[3], 'NANA 4 @Viewer', 'a viewer is answered')
  connected = false; env.wake.wake()
  await time.run(done, () => env.said.length === 5)
  assert.equal(env.said[4], 'NANA 5', 'the source dropped: speaking up again')
  assert.ok(env.s.running)
})

test('直播间: a warm-up chosen stays as chosen, chat source or not', async () => {
  const env = fakeStage([nana], { mode: 'live', scope: 'public' })
  const quiet = live(env, { options: { ...options, warmupSeconds: 0 }, chatConnected: () => false })
  await time.pass(quiet.done, 600_000)
  assert.deepEqual(env.said, [], '安静等待 chosen: quiet without a chat source too')
  const busy = fakeStage([nana], { mode: 'live', scope: 'public' })
  const chosen = live(busy, { options: { ...options, warmupSeconds: 60 }, chatConnected: () => true })
  await time.run(chosen.done, () => busy.said.length === 2)
  assert.ok(busy.said.length === 2, '每分钟聊一句 chosen: speaking with a chat source connected too')
})

test('a session takes over: the one running stops, and the new one runs alone, on its engine', async () => {
  const env = fakeStage([nana, kai], { limit: 50 }, { order: 'round' })
  const first = begin(env, 'conversation', (run) => duetPolicy(run, env, opened))
  await time.run(first.done, () => env.said.length === 1)
  const second = begin(env, 'conversation', (run) => duetPolicy(run, env, opened))
  assert.equal(first.run.signal.aborted, true)
  assert.equal(current(), second.run)
  assert.equal(second.run.engine, null, 'off AIRI, each turn runs on the model set up then')
  await time.run(first.done); await first.done
  assert.equal(env.s.running, true, 'the first one ending does not put the stage back under the second')
})
