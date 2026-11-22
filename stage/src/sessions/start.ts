import { tr } from '../i18n'
// Starting a session: what each start checks (a model set up, a cast, AIRI's one rule, a game host), the state it
// starts in, and what it opens and closes (the record, the cast loaded, AIRI bound, a game connected). Then the runner
// runs it with the policy (sessions/policies) over the stage (sessions/env.ts).
import { actors } from '../actors'
import { brainReady, demoRunsWhen, livlivNow, loadBrainConfig, modelOf, type ModelConfig } from '../brain'
import { airiFits, chooseEngine } from '../brains/select'
import { chatHistory } from '../chatHistory'
import { features } from '../core/platform'
import { desktop } from '../desktopBridge'
import { participants, store, uid } from '../scene'
import { voiceRoute } from '../voiceApi'
import { airiGameError, airiGameText } from '../airiEngine'
import type { MemoryScope } from '../memory'
import type { ExternalEvent } from '../externalEvents'
import type { AiriGameConnection } from '../../../protocol/src/airiGame'
import { bindAiri, preferredAiriForChat } from './airiBinding'
import { chatLimits, type LiveOptions } from './budget'
import { clock } from './clock'
import { castKey, profiles, voices } from './context'
import { chatState, onChatState } from '../danmaku'
import { stageEnv } from './env'
import { EVENTS, holds, inbox, viewersWaiting, wake, YOURS, yourLine, type ChatInput } from './inbox'
import { chatPolicy } from './policies/chat'
import { duetPolicy, oncePolicy } from './policies/duet'
import { livePolicy } from './policies/live'
import { openHistory, openRecord, sessionScope } from './record'
import { current, finish, Run } from './run'
import { pick } from './speakers'
import { handOver, runSession } from './runner'
import { conversation, set } from './state'
import { spendAtStart } from './spend'
import { sleep } from './wake'

import { gameName } from './games'

// a demo running is left one by livliv.ai's switches (brain.ts setLivLiv)
demoRunsWhen(() => !!current()?.demo)

/** a session of this kind takes over: on AIRI with this model, else on the brain set up turn by turn */
function takeOver(kind: Run['kind'], airi: ModelConfig | null = null) {
  const run = new Run(kind)
  run.demo = loadBrainConfig().kind === 'demo'
  // what it may spend: its lines, how you are heard and each voiced character's voice (an AI character's, or yours
  // read aloud), as it starts; the demo nothing (sessions/spend.ts)
  const voiced = participants(store.get()).filter((c) => c.lines === 'ai' || (c.lines === 'me' && c.readAloud))
  run.spend = spendAtStart(livlivNow(), Object.fromEntries(voiced.map((c) => [c.id, voiceRoute(c)])), run.demo)
  handOver(run, stageEnv, airi)
  return run
}

/** starts the characters talking (once: a line of yours answered once) */
export function startDuet(once: boolean) {
  const run = takeOver('conversation')
  run.single = once; run.boundProfiles = castKey()
  // A public conversation consumes viewer inputs and opens only the public history.
  const audience = viewersWaiting()
  const scope: MemoryScope = audience ? 'public' : sessionScope()
  const switchScope = scope !== conversation().scope && loadBrainConfig().kind !== 'demo'
  set({ running: true, mode: 'conversation', waitingAudience: false, until: 0, ended: '', paused: false, error: '',
    ...(switchScope ? { scope, sessionId: '', lines: [], speaking: null } : {}),
  }, !switchScope)
  const open = async (signal: AbortSignal) => {
    if (profiles().length) await openRecord(run, scope, signal)
    else { chatHistory.reset(); set({ sessionId: '', scope }) }
    // characters still loading (a template just placed, its players not made yet) are waited for, a little
    const loading = () => participants(store.get()).some((x) => x.lines === 'ai' && !['ready', 'error'].includes(actors.get(x.id)?.status ?? ''))
    for (let i = 0; i < 60 && loading(); i++) await sleep(250, signal)
  }
  return runSession(once ? oncePolicy(stageEnv, open) : duetPolicy(run, stageEnv, open), run, stageEnv)
}

/** starts a chat (scope as chosen, unless an output is on; a character to answer; your first line to answer). It
 *  resolves once the chat is open (its record, its cast loaded), and rejects when it couldn't start */
export async function startChat(chosen: MemoryScope = conversation().chatScope, target?: string, firstInput?: ChatInput) {
  const scope = sessionScope(chosen)
  if (conversation().running) {
    const state = conversation(), airi = current()?.airi
    if ((state.mode === 'chat' || (state.mode === 'live' && airi)) && state.scope === scope
      && (!airi || (state.sessionId && (!target || airi.actorId === target)))) return
    throw new Error(tr('请先停止当前会话'))
  }
  const config = loadBrainConfig()
  if (!brainReady(config) || config.kind === 'demo') { set({ needModel: true, modelIntent: firstInput ? 'input' : 'chat' }); throw new Error(tr('和角色聊天需要接上 AI 模型')) }
  if (!profiles().length) {
    const error = tr('先添加一个「AI 来演」的角色')
    set({ error }); throw new Error(error)
  }
  const preferred = preferredAiriForChat(config, target)
  const run = takeOver('chat', preferred?.model)
  run.single = true; pick(target ?? null); run.boundProfiles = castKey()
  inbox.drop(EVENTS); holds.dialogue.clear()
  const offAiriCast = preferred ? bindAiri(run, preferred.model, preferred.actor) : undefined
  const unbind = () => { offAiriCast?.() }
  const limits = chatLimits(store.get().talk), until = clock.now() + limits.minutes * 60000
  set({ running: true, mode: 'chat', scope, sessionId: '', lines: [], speaking: null, waitingInput: false, paused: false, thinking: null, waitingAudience: false,
    engine: preferred ? 'airi' : undefined, game: undefined,
    generations: 0, generationLimit: limits.generations, turns: 0, until, ended: '', error: '' }, false)
  const signal = run.signal
  try {
    await openRecord(run, scope, signal)
    for (let i = 0; i < 60 && !voices().some((character) => character.lines === 'ai'); i++) await sleep(250, signal)
    if (!voices().some((character) => character.lines === 'ai')) throw new Error(tr('有 AI 角色尚未载入，请检查角色列表'))
    signal.throwIfAborted()
    if (firstInput) {
      if (firstInput.transcribed) set({ lines: [...conversation().lines, firstInput.line] })
      inbox.pushFirst(yourLine(firstInput))
    }
    void runSession(chatPolicy(run, stageEnv, { until, close: unbind }), run, stageEnv)
  } catch (error) {
    unbind()
    if (finish(run)) {
      run.airi = null
      set({ running: false, engine: undefined, error: signal.aborted ? '' : error instanceof Error ? error.message : String(error) })
    }
    throw error
  }
}

/** starts a 直播间 with these options (limits already in bounds); `event` hands a game's events to the session */
export function startLive(options: LiveOptions, event: (event: ExternalEvent) => boolean) {
  const config = loadBrainConfig()
  if (!brainReady(config) || config.kind === 'demo') { set({ error: tr("直播间需要接上模型"), needModel: true, modelIntent: 'live' }); return }
  const cast = participants(store.get()).filter((c) => c.lines === 'ai')
  if (!cast.length) { set({ error: tr("先添加一个「AI 来演」的角色") }); return }
  // the start asked for AIRI: the one rule (brains/select.ts), a game or a window asking for it whatever the switch says
  const choice = options.airi ? chooseEngine(config, cast, { kind: 'live', needsAiri: true, textOnly: options.textOnly }, features) : null
  if (choice && !airiFits(choice)) {
    set({ error: tr('内置 AIRI 需要一个本地 AI 角色和流式模型接口') }); return
  }
  const gameHost = desktop?.airiGame, gameConfig = options.airi?.game
  if (gameConfig && !gameHost) { set({ error: tr('当前桌面版本不支持 AIRI 游戏') }); return }
  const airiModel = choice?.engine === 'airi' ? modelOf(config) : null
  // a muted character speaks no line aloud: only the ones that speak need a voice, else the session is subtitles only
  if (!options.textOnly && cast.some((c) => !c.muted && voiceRoute(c) === 'none')) { set({ error: tr("AI 角色还没有声音，在角色卡里选一个") }); return }
  const run = takeOver('live', airiModel), signal = run.signal
  inbox.clearViewers(); inbox.drop(YOURS); inbox.drop(EVENTS); holds.dialogue.clear()
  run.liveOptions = options
  run.boundProfiles = castKey()
  const offAiriCast = airiModel ? bindAiri(run, airiModel, cast[0], options.airi?.windowId) : undefined
  const engine = run.airi
  const until = clock.now() + options.minutes * 60_000
  set({ running: true, mode: 'live', paused: false, waitingAudience: true, turns: 0, generations: 0, generationLimit: options.maxGenerations, until, retryAt: 0, ended: '', error: '',
    engine: engine ? 'airi' : undefined, game: gameConfig ? { name: gameConfig.game, status: 'connecting', text: '' } : undefined,
    scope: 'public', sessionId: '', lines: [], speaking: null,
  }, false)
  // a game played on AIRI: connected when the session opens, its events lines to answer, closed when it ends
  let attached: AiriGameConnection | undefined
  let offGame: (() => void) | undefined
  const gameId = gameConfig ? crypto.randomUUID() : undefined
  let closingGame: Promise<void> | undefined
  const closeGame = () => {
    if (!gameId || !gameHost) return
    closingGame ??= gameHost.stop(gameId).catch((error: unknown) => {
      console.warn('[AIRI game close]', error)
      if (current() === run || (!current() && conversation().mode === 'live')) set({ error: airiGameError(error) })
    })
  }
  signal.addEventListener('abort', closeGame, { once: true })
  const open = async () => {
    await openHistory('public', signal)
    // The template may have just mounted; use the same loading window as conversation mode.
    for (let i = 0; i < 60 && cast.some((x) => !actors.get(x.id) || actors.get(x.id)?.status === 'loading'); i++) await sleep(250, signal)
    if (cast.some((x) => actors.get(x.id)?.status !== 'ready')) throw new Error(tr("有 AI 角色尚未载入，请检查角色列表"))
    if (engine && gameHost && gameConfig && gameId) {
      signal.throwIfAborted()
      attached = await gameHost.connect(gameId, gameConfig)
      signal.throwIfAborted()
      engine.game = attached
      offGame = gameHost.onEvent((game) => {
        if (run.airi !== engine || signal.aborted || game.connection !== engine.game?.id) return
        const text = airiGameText(game)
        if (game.status === 'disconnected') {
          engine.game = undefined
          set({ game: { name: gameConfig.game, status: 'offline', text } })
        } else if (game.status === 'done' || game.status === 'failed') {
          set({ game: { name: gameConfig.game, status: 'ready', text } })
        } else if (game.status === 'unknown') {
          set({ game: { name: gameConfig.game, status: 'playing', text } })
        }
        event({ id: uid(), source: gameName(gameConfig.game), message: text, character: engine.actorId,
          reply: game.status === 'chat' || game.status === 'done' || game.status === 'failed' ? 'maybe' : 'never' })
      })
      set({ game: { name: gameConfig.game, status: 'ready', text: '' } })
    }
  }
  // the automatic warm-up follows the chat source: Twitch connecting or dropping mid-session wakes the session to look again
  const chatConnected = () => chatState().status === 'on'
  let connected = chatConnected()
  const offChat = options.warmupSeconds === null ? onChatState(() => { if (chatConnected() !== connected) { connected = !connected; wake.wake() } }) : undefined
  const close = async () => {
    offChat?.()
    offGame?.()
    signal.removeEventListener('abort', closeGame)
    closeGame()
    await closingGame
    offAiriCast?.()
  }
  return runSession(livePolicy(run, stageEnv, {
    options, until, open, close, airi: engine, game: !!gameConfig, chatConnected,
    describe: (error) => gameConfig ? airiGameError(error) : (error as Error).message,
  }), run, stageEnv)
}
