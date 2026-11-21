import { tr } from '../../i18n'
// The 直播间 (AI 来开播): the AI characters answer viewers' messages (one at a time, a few seconds apart), external and
// game events, and you; with no chat they wait quietly or speak up now and then (warm-up). It is public, runs within
// its minutes and generations, rides out a failed turn (tried again twice), and on AIRI can play a game: connected at
// the start, its events become lines to answer, its window or frame goes to the model.
import { actors } from '../../actors'
import { brainReady, loadBrainConfig } from '../../brain'
import { airiFits, chooseEngine } from '../../brains/select'
import { features } from '../../core/platform'
import { desktop } from '../../desktopBridge'
import { hush } from '../../speech'
import { isBlocked, type Chat } from '../../danmaku'
import { participants, store, uid } from '../../scene'
import { voiceRoute } from '../../voiceApi'
import { airiGameError, airiGameText } from '../../airiEngine'
import type { ExternalEvent } from '../../externalEvents'
import type { AiriGameConfig, AiriGameConnection } from '../../../../desktop/src/airiGameProtocol'
import { bindAiri } from '../airiBinding'
import { deadline, GenerationLimit, LIVE_FAILURES, RETRY_SECONDS, spent, type LiveOptions } from '../budget'
import { clock } from '../clock'
import { castKey, NeedModel, voices, VoiceFailed } from '../context'
import { inbox, turnHeld, wake } from '../inbox'
import { consumeInput } from '../input'
import { looks } from '../performance'
import { openHistory } from '../record'
import { begin, current, finish, lastBegun, order, Run } from '../run'
import { runSession, type Policy } from '../runner'
import { dropAhead, followLines, freePick, speakTurn } from '../speak'
import { conversation, set } from '../state'
import { sleep, waitWhile } from '../wake'

export const gameName = (game: AiriGameConfig['game']) => game === 'minecraft' ? 'Minecraft' : 'Factorio'

/** starts a 直播间 with these options (limits already in bounds); `event` hands a game's events to the session */
export function startLive(options: LiveOptions, event: (event: ExternalEvent) => boolean) {
  const config = loadBrainConfig()
  if (!brainReady(config) || config.kind === 'demo') { set({ error: tr("直播间需要接上模型，演示只能在「只有我」里看"), needModel: true, modelIntent: 'live' }); return }
  const cast = participants(store.get()).filter((c) => c.lines === 'ai')
  if (!cast.length) { set({ error: tr("先添加一个「AI 来演」的角色") }); return }
  // the start asked for AIRI: the one rule (brains/select.ts), a game or a window asking for it whatever the switch says
  const choice = options.airi ? chooseEngine(config, cast, { kind: 'live', needsAiri: true, textOnly: options.textOnly, voice: voiceRoute(cast[0]) }, features) : null
  if (choice && !airiFits(choice)) {
    set({ error: tr('内置 AIRI 需要一个本地 AI 角色和流式模型接口') }); return
  }
  const gameHost = desktop?.airiGame, gameConfig = options.airi?.game
  if (gameConfig && !gameHost) { set({ error: tr('当前桌面版本不支持 AIRI 游戏') }); return }
  if (choice?.reason === 'livliv-voice') {
    set({ error: tr('内置 AIRI 支持自配语音接口和系统朗读；静音的角色只出字幕') }); return
  }
  const airiModel = choice?.engine === 'airi' && config.kind === 'openai' ? config : null
  // a muted character speaks no line aloud: only the ones that speak need a voice, else the session is subtitles only
  if (!options.textOnly && cast.some((c) => !c.muted && voiceRoute(c) === 'none')) { set({ error: tr("AI 角色还没有声音：在角色卡「人设和声音」里选一个，或者把它静音，只出字幕") }); return }
  const run = new Run('live'), c = run.controller
  dropAhead(lastBegun()); begin(run); followLines(run)
  inbox.viewers.clear(); inbox.queue.length = 0; inbox.external.length = 0; inbox.dialogue.clear(); inbox.activeEvent = null
  run.liveOptions = options
  run.boundProfiles = castKey()
  const offAiriCast = airiModel ? bindAiri(run, airiModel, cast[0], options.airi?.windowId) : undefined
  const engine = run.airi
  const until = clock.now() + options.minutes * 60_000
  set({ running: true, mode: 'live', paused: false, waitingAudience: true, turns: 0, generations: 0, generationLimit: options.maxGenerations, until, retryAt: 0, ended: '', error: '',
    engine: engine ? 'airi' : undefined, game: gameConfig ? { name: gameConfig.game, status: 'connecting', text: '' } : undefined,
    scope: 'public', sessionId: '', lines: [], speaking: null,
  }, false)
  const stopClock = deadline(until, () => {
    if (current() !== run || c.signal.aborted) return
    set({ ended: tr("已达到本次时长上限") }); c.abort(); hush(); actors.forEach((a) => a.silence())
  })
  return runSession(live(run, options, { cast, engine, gameHost, gameConfig, stopClock, offAiriCast, event }), c)
}

type Setup = {
  cast: ReturnType<typeof participants>
  engine: Run['airi']
  gameHost: NonNullable<typeof desktop>['airiGame'] | undefined
  gameConfig: AiriGameConfig | undefined
  stopClock: () => void
  offAiriCast: (() => void) | undefined
  event: (event: ExternalEvent) => boolean
}

function live(run: Run, options: LiveOptions, { cast, engine, gameHost, gameConfig, stopClock, offAiriCast, event }: Setup): Policy {
  const c = run.controller
  let lastReply = clock.now() - 6000, failures = 0, replyToOwner = false
  let retryChat: Chat | null = null
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
  c.signal.addEventListener('abort', closeGame, { once: true })
  return {
    async open() {
      await openHistory('public', c.signal)
      // The template may have just mounted; use the same loading window as conversation mode.
      for (let i = 0; i < 60 && cast.some((x) => !actors.get(x.id) || actors.get(x.id)?.status === 'loading'); i++) await sleep(250, c.signal)
      if (cast.some((x) => actors.get(x.id)?.status !== 'ready')) throw new Error(tr("有 AI 角色尚未载入，请检查角色列表"))
      if (engine && gameHost && gameConfig && gameId) {
        c.signal.throwIfAborted()
        attached = await gameHost.connect(gameId, gameConfig)
        c.signal.throwIfAborted()
        engine.game = attached
        offGame = gameHost.onEvent((game) => {
          if (run.airi !== engine || c.signal.aborted || game.connection !== engine.game?.id) return
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
    },
    async step() {
      if (spent({ generations: conversation().generations, generationLimit: options.maxGenerations })) {
        if (conversation().game?.status === 'playing' || conversation().game?.status === 'submitting') { await wake.wait(c.signal); return true }
        return false
      }
      await waitWhile(turnHeld, wake, c.signal)
      while (inbox.queue.length) { await consumeInput(run, c.signal); replyToOwner = true }
      c.signal.throwIfAborted()
      if (turnHeld()) return true
      const now = clock.now(), cooldown = lastReply + 6000 - now
      if (cooldown > 0 && !replyToOwner) { await wake.wait(c.signal, cooldown); return true }
      const warmupAt = options.warmupSeconds ? lastReply + options.warmupSeconds * 1000 : Infinity
      if (retryChat && isBlocked(retryChat.user)) retryChat = null
      if (!replyToOwner && !retryChat && !inbox.activeEvent && !inbox.external.length && !inbox.viewers.available(now, isBlocked) && now < warmupAt) {
        set({ waitingAudience: true })
        await wake.wait(c.signal, Number.isFinite(warmupAt) ? warmupAt - now : undefined)
        return true
      }
      inbox.activeEvent ??= !replyToOwner && !retryChat ? inbox.external.shift() ?? null : null
      const chat: Chat | null = inbox.activeEvent || (options.airi && replyToOwner) ? null : retryChat ?? inbox.viewers.take(now, isBlocked)
      const pool = voices().filter((x) => x.lines === 'ai')
      const who = inbox.activeEvent?.character ? pool.find((x) => x.id === inbox.activeEvent!.character) : pool.find((x) => x.id === order.forced) ?? freePick(pool.filter((x) => pool.length === 1 || x.id !== order.lastTurn))
      order.forced = null
      if (!who) throw new Error(tr("舞台上没有已就绪的 AI 角色"))
      set({ waitingAudience: false })
      const turnsBefore = conversation().turns
      try {
        const beforeInput = inbox.epoch
        const completed = await speakTurn(run, who, c.signal, chat, replyToOwner)
        if (!completed) {
          if (beforeInput !== inbox.epoch) { retryChat = null; replyToOwner = false; inbox.activeEvent = null }
          else retryChat = chat
          return true
        }
        retryChat = null; replyToOwner = false; inbox.activeEvent = null
      } catch (e) {
        if ((engine && (gameConfig || engine.windowId)) || e instanceof NeedModel || e instanceof GenerationLimit || c.signal.aborted) throw e
        // A streamed reply may already have delivered a sentence. Retry only the input that is still unanswered.
        if (engine ? conversation().turns !== turnsBefore : e instanceof VoiceFailed) { retryChat = null; replyToOwner = false; inbox.activeEvent = null }
        else retryChat = chat
        if (++failures >= LIVE_FAILURES) throw e
        const ms = RETRY_SECONDS[failures - 1] * 1000
        set({ thinking: null, waitingAudience: true, error: (e as Error).message, retryAt: clock.now() + ms })
        await sleep(ms, c.signal)
        set({ retryAt: 0 })
        return true
      }
      c.signal.throwIfAborted()
      failures = 0
      lastReply = clock.now(); set({ waitingAudience: true, error: '' })
      return true
    },
    done() { set({ ended: tr("已达到本次生成次数上限") }) },
    failed(e) {
      if (e instanceof GenerationLimit) set({ ended: tr('已达到本次生成次数上限') })
      else if (e instanceof NeedModel) set({ needModel: true, modelIntent: 'live' })
      else if (!c.signal.aborted) set({ error: gameConfig ? airiGameError(e) : (e as Error).message, ended: failures >= LIVE_FAILURES ? tr("连续出错 {0} 次，已停止", LIVE_FAILURES) : tr("会话因错误停止") })
    },
    async close() {
      stopClock()
      offGame?.()
      c.signal.removeEventListener('abort', closeGame)
      closeGame()
      await closingGame
      offAiriCast?.()
      if (finish(run)) {
        run.liveOptions = null; run.airi = null; inbox.activeEvent = null; hush(); actors.forEach((a) => a.silence())
        set({ running: false, paused: false, thinking: null, speaking: null, waiting: null, waitingAudience: false, retryAt: 0, engine: undefined, game: undefined }); looks(null, null)
      }
    },
  }
}
