// Game actions in a running session, without a browser: a request from a game or the Neuro bridge decided by the
// session's engine (a generation counted, the session's turns held meanwhile, an urgent one cutting the turn in hand),
// and a game played on AIRI from the console (decided from the game's state and the public memories, done, and told).
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { tr } from '../src/i18n'
import type { CharacterItem } from '../src/scene'
import type { ConvState } from '../src/sessions/state'
import type { Engine } from '../src/brains/engines/types'
import type { ExternalActionRequest } from '../src/externalEvents'
import { decideAction, playGame, type GameEnv } from '../src/sessions/games'
import { holds } from '../src/sessions/holds'
import { begin, clearCurrent, Run } from '../src/sessions/run'
import { Wake } from '../src/sessions/wake'

afterEach(() => clearCurrent())

const nana = { id: 'nana', name: 'Nana', lines: 'ai' } as CharacterItem
const friend = { id: 'kai', name: 'Kai', lines: 'ai', remote: { peer: 'p', person: 'P' } } as unknown as CharacterItem
const request = (priority: ExternalActionRequest['priority'] = 'medium'): ExternalActionRequest => ({ character: 'nana', source: 'Neuro', query: 'jump?', priority, actions: [{ name: 'jump', description: 'jump' }] } as ExternalActionRequest)

function fakeGames(s: Partial<ConvState> = {}) {
  const state = { running: true, scope: 'public', paused: false, sessionId: 's1', generations: 0, generationLimit: 5, ...s } as ConvState
  const log: string[] = []
  const decide = (name: string): Engine => ({
    id: name as Engine['id'], caps: { stream: false, vision: false, tools: true, multiCast: true }, reply: () => { throw new Error('not asked') },
    async decideAction(actor, req, _signal, frame, beforeRequest) {
      log.push(`${name} decides for ${actor.name}: ${req.query}${frame ? ' (sees the window)' : ''}${req.state ? ' ' + req.state : ''}`)
      // another app's request holds the session's turns while it is decided (a game played from the console doesn't)
      if (!req.silent && holds.decisions !== 1) log.push('turns not held')
      await beforeRequest?.()
      return { name: 'jump', data: {} } as never
    },
  })
  const env: GameEnv & { log: string[]; s: ConvState; now: Engine } = {
    log, s: state, now: decide('own model'),
    state: () => state, set: (patch) => { Object.assign(state, patch) }, wake: new Wake(),
    engine: (run) => run.engine ?? env.now,
    interrupt: (run) => { log.push('interrupted'); run.currentTurn = null },
    actor: (id) => [nana, friend].find((c) => c.id === id),
    frame: async (id) => (id === 'win' ? { mimeType: 'image/jpeg', data: 'x' } : null),
    host: {
      snapshot: async () => ({ state: 'a creeper nearby', frame: null }) as never,
      execute: async (_id, decision) => ({ status: 'done', text: `did ${(decision as { name: string }).name}` }) as never,
    },
    memories: async () => ({ memories: [{ text: 'likes jumping' }], revision: 1 }),
    checkMemory: async () => { log.push('memory checked') },
    told: (event) => log.push(`told: ${event.source}: ${event.message} (${event.reply})`),
    describe: (result) => (result as unknown as { text: string }).text,
    failure: (error) => 'failed: ' + (error as Error).message,
  }
  return { env, decide }
}

test('a game action: refused with no public session running; decided by the model set up now, a generation counted', async () => {
  const { env } = fakeGames()
  await assert.rejects(decideAction(env, request(), new AbortController().signal), new RegExp(tr('请先开启公开的游戏互动会话')))
  // a session with no engine of its own (a realtime call, a 对谈): the model set up now decides
  begin(new Run('realtime'))
  assert.deepEqual(await decideAction(env, request(), new AbortController().signal), { name: 'jump', data: {} })
  assert.deepEqual(env.log, ['own model decides for Nana: jump?'])
  assert.equal(env.s.generations, 1)
  assert.equal(holds.decisions, 0, 'turns go on once it is decided')
  await assert.rejects(decideAction(env, { ...request(), character: 'kai' }, new AbortController().signal), new RegExp(tr('先选择一个 AI 角色')), 'never a friend\'s character')
})

test('a game action: an urgent one cuts the turn in hand; on AIRI with a window it decides seeing it; none past the limit', async () => {
  const { env, decide } = fakeGames()
  const run = new Run('live'); begin(run)
  run.engine = decide('AIRI'); run.airi = { model: {} as never, actorId: 'nana', windowId: 'win' }
  run.currentTurn = new AbortController()
  await decideAction(env, request('high'), new AbortController().signal)
  assert.deepEqual(env.log, ['interrupted', 'AIRI decides for Nana: jump? (sees the window)'])
  run.airi.windowId = 'closed'
  await assert.rejects(decideAction(env, request(), new AbortController().signal), new RegExp(tr('游戏窗口已关闭或屏幕录制权限不可用')))
  env.s.generations = env.s.generationLimit
  await assert.rejects(decideAction(env, request(), new AbortController().signal), new RegExp(tr('会话已暂停或达到生成上限')))
})

test('a game played on AIRI: decided from its state and memories, done, the game\'s line told; a failure shows on the game', async () => {
  const { env, decide } = fakeGames({ game: { name: 'minecraft', status: 'ready', text: '' } })
  const run = new Run('live'); begin(run)
  await assert.rejects(playGame(env, 'jump'), new RegExp(tr('请先在 AIRI 开启游戏直播')), 'only a game on AIRI')
  run.engine = decide('AIRI'); run.airi = { model: {} as never, actorId: 'nana', windowId: '', game: { id: 'g', game: 'minecraft', actions: [] } as never }
  await playGame(env, 'jump')
  assert.deepEqual(env.log, [
    'memory checked',
    'AIRI decides for Nana: jump {"observation":"a creeper nearby","rememberedFacts":["likes jumping"]}',
    'memory checked', 'memory checked',
    'told: Minecraft: did jump (never)',
  ])
  assert.deepEqual([env.s.generations, env.s.game], [1, { name: 'minecraft', status: 'playing', text: 'did jump' }])
  env.s.game = { name: 'minecraft', status: 'ready', text: '' }
  env.host = { ...env.host!, execute: async () => { throw new Error('bridge down') } }
  await playGame(env, 'jump')
  assert.deepEqual(env.s.game, { name: 'minecraft', status: 'ready', text: 'failed: bridge down' })
})
