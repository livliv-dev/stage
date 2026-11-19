import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { chatLimits, counted, deadline, GenerationLimit, LIVE_FAILURES, lineLimit, liveLimits, RETRY_SECONDS, spend, spent, turnLimit } from '../src/sessions/budget'
import { checkMemory, memoryIdsOf, memoryUnchanged } from '../src/sessions/memoryGate'
import { freePick, nextSpeaker, quiet, type Speaker, type Turns } from '../src/sessions/order'
import { outputsOn, publicSwitch, scopeFor } from '../src/sessions/scope'
import { sleep, untilFree, waitWhile, Wake } from '../src/sessions/wake'

// ---------------------------------------------------------------- who speaks next (对谈)

const who = (id: string, x: number, lines: Speaker['lines'] = 'ai', chatty = 1): Speaker => ({ id, name: id.toUpperCase(), lines, chatty, x, w: 100 })
const nana = who('nana', 0), kai = who('kai', 400), sena = who('sena', 800), me = who('me', 1200, 'me')
const turns = (t: Partial<Turns> = {}): Turns => ({ lines: [], lastTurn: null, skipped: null, forced: null, ...t })
const said = (...ids: string[]) => ids.map((id) => ({ who: id, to: null }))
const first = () => 0, last = () => 0.999999

test('round order: left to right on the stage, on from whoever had the last turn, round again', () => {
  const cast = [sena, nana, kai]  // the stage's order is by place, not by the list
  assert.equal(nextSpeaker({ order: 'round', host: null }, cast, turns())?.id, 'nana')
  assert.equal(nextSpeaker({ order: 'round', host: null }, cast, turns({ lastTurn: 'nana' }))?.id, 'kai')
  assert.equal(nextSpeaker({ order: 'round', host: null }, cast, turns({ lastTurn: 'kai' }))?.id, 'sena')
  assert.equal(nextSpeaker({ order: 'round', host: null }, cast, turns({ lastTurn: 'sena' }))?.id, 'nana')
  assert.equal(nextSpeaker({ order: 'round', host: null }, [...cast, me], turns({ lastTurn: 'sena' }))?.id, 'me', 'a character you play takes its turn')
  assert.equal(nextSpeaker({ order: 'round', host: null }, [], turns()), null)
})

test('host order: the host after every guest; the guest it names, else the one quiet longest', () => {
  const cast = [nana, kai, sena], talk = { order: 'host' as const, host: 'kai' }
  assert.equal(nextSpeaker(talk, cast, turns())?.id, 'kai')
  assert.equal(nextSpeaker(talk, cast, turns({ lastTurn: 'nana', lines: said('kai', 'nana') }))?.id, 'kai')
  assert.equal(nextSpeaker(talk, cast, turns({ lastTurn: 'kai', lines: [{ who: 'kai', to: 'SENA' }] }))?.id, 'sena', 'the guest named')
  assert.equal(nextSpeaker(talk, cast, turns({ lastTurn: 'kai', lines: said('nana', 'kai', 'sena', 'kai') }))?.id, 'nana', 'the guest quiet longest')
  assert.equal(nextSpeaker({ order: 'host', host: null }, cast, turns())?.id, 'nana', 'no host set: the first AI character hosts')
})

test('free order: the one named answers, never the same twice running, a skipped one not asked again at once', () => {
  const cast = [nana, kai, sena]
  assert.equal(nextSpeaker({ order: 'free', host: null }, cast, turns({ lines: [{ who: 'nana', to: 'SENA' }] }), last)?.id, 'sena')
  assert.notEqual(nextSpeaker({ order: 'free', host: null }, cast, turns({ lines: [{ who: 'nana', to: 'SENA' }], skipped: 'sena' }), first)?.id, 'sena')
  for (const random of [first, last, () => 0.5]) assert.notEqual(nextSpeaker({ order: 'free', host: null }, cast, turns({ lines: said('kai') }), random)?.id, 'kai')
  assert.equal(nextSpeaker({ order: 'free', host: null }, [nana, me], turns({ lines: said('nana') }))?.id, 'me', 'one AI and you: you take turns')
  assert.equal(nextSpeaker({ order: 'free', host: null }, [nana], turns({ lines: said('nana') }))?.id, 'nana', 'one AI alone goes on talking')
  assert.equal(nextSpeaker({ order: 'free', host: null }, [nana, me], turns({ lines: said('nana'), skipped: 'me' }))?.id, 'nana', 'you skipped: it goes on')
})

test('a character picked by hand goes first, whatever the order', () => {
  for (const order of ['free', 'round', 'host'] as const) assert.equal(nextSpeaker({ order, host: 'nana' }, [nana, kai, sena], turns({ forced: 'sena', lastTurn: 'kai' }))?.id, 'sena')
})

test('free pick: weighted by how chatty and how long quiet', () => {
  const lines = said('nana', 'kai', 'nana')
  assert.equal(quiet(nana, lines), 0); assert.equal(quiet(kai, lines), 1); assert.equal(quiet(sena, lines), 4, 'never spoke: all the lines and one more')
  // weights nana 1, kai 2, sena 5 of 8
  assert.equal(freePick([nana, kai, sena], lines, () => 0.1)?.id, 'nana')
  assert.equal(freePick([nana, kai, sena], lines, () => 0.3)?.id, 'kai')
  assert.equal(freePick([nana, kai, sena], lines, () => 0.5)?.id, 'sena')
  assert.equal(freePick([nana, { ...kai, chatty: 0 }], [], () => 0.99)?.id, 'nana', 'a character set never to start doesn\'t')
  assert.equal(freePick([], lines), null)
})

// ---------------------------------------------------------------- limits

test('generations: counted one by one, none past the limit', () => {
  assert.deepEqual(spend({ generations: 0, generationLimit: 2 }), { generations: 1 })
  assert.deepEqual(spend({ generations: 1, generationLimit: 2 }), { generations: 2 })
  assert.throws(() => spend({ generations: 2, generationLimit: 2 }), GenerationLimit)
  assert.equal(spent({ generations: 2, generationLimit: 2 }), true); assert.equal(spent({ generations: 1, generationLimit: 2 }), false)
  assert.deepEqual(counted({ generations: 7, generationLimit: 2 }), { generations: 8 }, 'counting alone checks nothing (a check came before)')
})

test('limits from settings and start options stay within bounds', () => {
  assert.deepEqual(chatLimits({}), { minutes: 60, generations: 100 })
  assert.deepEqual(chatLimits({ chatMinutes: 0, chatGenerations: 0 }), { minutes: 1, generations: 1 })
  assert.deepEqual(chatLimits({ chatMinutes: 999, chatGenerations: 9999 }), { minutes: 240, generations: 500 })
  assert.deepEqual(liveLimits({ minutes: Number.NaN, maxGenerations: 0, warmupSeconds: 45, textOnly: true }), { minutes: 30, maxGenerations: 100, warmupSeconds: 0, textOnly: true, airi: undefined })
  assert.deepEqual(liveLimits({ minutes: 61.4, maxGenerations: 1000, warmupSeconds: 60, textOnly: false, airi: { windowId: 'w' } }), { minutes: 61, maxGenerations: 500, warmupSeconds: 60, textOnly: false, airi: { windowId: 'w' } })
  assert.equal(lineLimit(0), 1); assert.equal(lineLimit(12.4), 12); assert.equal(lineLimit(99), 60); assert.equal(lineLimit(Number.NaN), 1)
  assert.equal(turnLimit(undefined, 12), 12, '对谈 runs to the line limit')
  assert.equal(turnLimit(8, 4), 8, 'the demo always reaches its ending')
  assert.deepEqual(RETRY_SECONDS, [5, 15]); assert.equal(LIVE_FAILURES, 3)
})

test('minutes: a session ends at its deadline, once, unless stopped before', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 })
  try {
    let ended = 0
    deadline(Date.now() + 5 * 60_000, () => ended++)
    mock.timers.tick(5 * 60_000 - 1); assert.equal(ended, 0)
    mock.timers.tick(1); assert.equal(ended, 1)
    mock.timers.tick(60 * 60_000); assert.equal(ended, 1)
    const cancel = deadline(Date.now() + 1000, () => ended++)
    cancel(); mock.timers.tick(2000); assert.equal(ended, 1, 'stopped: the deadline is gone')
    deadline(Date.now() - 5000, () => ended++)
    mock.timers.tick(0); assert.equal(ended, 2, 'already past: at once')
  } finally { mock.timers.reset() }
})

// ---------------------------------------------------------------- pause and resume

test('pause: a line waits while the session is paused and is said after resume', async () => {
  const wake = new Wake(), signal = new AbortController().signal
  let paused = true, checks = 0, started = false
  const turn = untilFree(() => paused, wake, signal, () => { checks++ }).then(() => { started = true })
  await sleep(5, signal); wake.wake(); await sleep(5, signal)
  assert.equal(started, false, 'woken while still paused: it waits on'); assert.equal(checks, 0)
  paused = false; wake.wake(); await turn
  assert.equal(started, true); assert.equal(checks, 1)
})

test('pause: paused again while the line was checked, it waits again and checks again', async () => {
  const wake = new Wake(), signal = new AbortController().signal
  let paused = false, checks = 0
  const turn = untilFree(() => paused, wake, signal, async () => { checks++; if (checks === 1) { paused = true; setTimeout(() => { paused = false; wake.wake() }, 5) } })
  await turn
  assert.equal(checks, 2)
})

test('stop: a waiting session gives up with the reason it was stopped', async () => {
  const wake = new Wake(), controller = new AbortController(), reason = new Error('stopped')
  const waiting = waitWhile(() => true, wake, controller.signal)
  controller.abort(reason)
  await assert.rejects(waiting, (error) => error === reason)
  await assert.rejects(new Wake().wait(controller.signal), (error) => error === reason, 'already stopped: no wait at all')
})

test('a wake with nobody waiting is lost; a wait with a time ends by itself', async () => {
  const wake = new Wake(), signal = new AbortController().signal
  wake.wake()
  const started = performance.now()
  await wake.wait(signal, 20)
  assert.ok(performance.now() - started >= 15)
})

// ---------------------------------------------------------------- the memory gate

const archive = (revision: number) => { const asked: unknown[] = []; return { asked, context: async (profileIds: string[], scope: string) => { asked.push([profileIds, scope]); return { revision } } } }

test('memory gate: a line made from the memories saved now is said; one made before they changed is not', async () => {
  const memory = archive(3)
  assert.equal(await memoryUnchanged(memory, 'p1', 'private', 3), true)
  assert.equal(await memoryUnchanged(memory, 'p1', 'private', 2), false)
  await checkMemory(memory, 'p1', 'public', 3)
  await assert.rejects(checkMemory(memory, 'p1', 'public', 2), /记忆已更新/)
  assert.deepEqual(memory.asked.at(-1), [['p1'], 'public'], 'asks for the speaker\'s own memories in the session\'s scope')
})

test('memory ids: every memory a turn drew on, once', () => {
  assert.deepEqual(memoryIdsOf({ memories: [{ id: 'a' }, { id: 'b' }], summary: { memoryIds: ['b', 'c'] }, lines: [{ memoryIds: ['c', 'd'] }, {}] }), ['a', 'b', 'c', 'd'])
  assert.deepEqual(memoryIdsOf({ memories: [], lines: [] }), [])
})

// ---------------------------------------------------------------- private and public

test('an output on makes every session public; with none on the scope chosen applies', () => {
  const none = { window: false, recording: false, room: false, twitch: false, live: false }
  assert.equal(outputsOn(none), false)
  for (const output of Object.keys(none) as (keyof typeof none)[]) assert.equal(outputsOn({ ...none, [output]: true }), true, output)
  assert.equal(scopeFor('private', false), 'private'); assert.equal(scopeFor('public', false), 'public')
  assert.equal(scopeFor('private', true), 'public')
})

test('an output coming on: what happens to a private conversation', () => {
  const now = { scope: 'private' as const, switching: false, demo: false, running: true, call: false, session: true }
  assert.equal(publicSwitch(now), 'session', 'a private session running goes on in public')
  assert.equal(publicSwitch({ ...now, running: false, session: false }), 'record', 'nothing running: the public record is shown')
  assert.equal(publicSwitch({ ...now, call: true }), 'end-call', 'a private realtime call ends')
  assert.equal(publicSwitch({ ...now, scope: 'public' }), 'none', 'public already')
  assert.equal(publicSwitch({ ...now, switching: true }), 'none', 'a switch under way')
  assert.equal(publicSwitch({ ...now, demo: true }), 'none', 'the demo keeps no memory')
  assert.equal(publicSwitch({ ...now, session: false }), 'none', 'running, but nothing to switch')
})
