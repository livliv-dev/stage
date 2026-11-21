import { tr } from '../../i18n'
// The 直播间 (AI 来开播): the AI characters answer viewers' messages (one at a time, at least six seconds apart),
// external and game events, and you; with no chat they wait quietly or speak up now and then (warm-up). It is public,
// runs within its minutes (every voice silenced when they are up) and generations, and rides out a failed turn (tried
// again after 5 s, then 15 s; it stops at the third in a row). On AIRI it can play a game: a game playing when the
// generations are spent keeps it open until the game is done.
import type { Chat } from '../../danmaku'
import { GenerationLimit, LIVE_FAILURES, RETRY_SECONDS, type LiveOptions } from '../budget'
import { chance } from '../chance'
import { clock } from '../clock'
import { NeedModel, VoiceFailed } from '../errors'
import { freePick } from '../order'
import { order, type Run } from '../run'
import type { Env, Policy } from '../runner'

/** what the start sets up: the record and cast (and a game) opened, and closed; the AIRI binding it runs on (a game
 *  or a window makes a failed turn end it); how an error reads */
export type LiveSetup = {
  options: LiveOptions
  until: number
  open: Policy['open']
  close(): Promise<void>
  airi: Run['airi']
  game: boolean
  describe(error: unknown): string
}

export function livePolicy(run: Run, env: Env, setup: LiveSetup): Policy {
  const { options } = setup
  let lastReply = clock.now() - 6000, failures = 0, replyToOwner = false, turnsBefore = 0
  /** a viewer's message whose answer failed: answered when it is tried again */
  let retryChat: Chat | null = null
  const answered = () => { retryChat = null; replyToOwner = false; run.event = null }
  return {
    kind: 'live', open: setup.open, close: setup.close, waitsWhileHeld: true,
    limits: { until: setup.until, timeUp: 'silence', generations: { whileSpent: () => ['playing', 'submitting'].includes(env.state().game?.status ?? '') } },
    heard(n) { if (n) replyToOwner = true },
    next() {
      const now = clock.now(), cooldown = lastReply + 6000 - now
      if (cooldown > 0 && !replyToOwner) return { wait: true, ms: cooldown }
      const warmupAt = options.warmupSeconds ? lastReply + options.warmupSeconds * 1000 : Infinity
      if (retryChat && env.blocked(retryChat.user)) retryChat = null
      if (!replyToOwner && !retryChat && !run.event && !env.inbox.has(['external', 'game']) && !env.inbox.viewerWaiting(now, env.blocked) && now < warmupAt) {
        env.set({ waitingAudience: true })
        return { wait: true, ms: Number.isFinite(warmupAt) ? warmupAt - now : undefined }
      }
      run.event ??= !replyToOwner && !retryChat ? env.inbox.take(['external', 'game'])?.event ?? null : null
      const chat: Chat | null = run.event || (options.airi && replyToOwner) ? null : retryChat ?? env.inbox.takeViewer(now, env.blocked)
      const pool = env.cast().filter((x) => x.lines === 'ai')
      const who = run.event?.character ? pool.find((x) => x.id === run.event!.character)
        : pool.find((x) => x.id === order.forced) ?? freePick(pool.filter((x) => pool.length === 1 || x.id !== order.lastTurn), env.state().lines, chance)
      order.forced = null
      if (!who) throw new Error(tr("舞台上没有已就绪的 AI 角色"))
      env.set({ waitingAudience: false })
      turnsBefore = env.state().turns
      return { speak: who, viewer: chat, replyToOwner }
    },
    after({ said, input }, turn) {
      if (said || input) answered()
      else retryChat = turn.viewer ?? null
    },
    settled() { failures = 0; lastReply = clock.now(); env.set({ waitingAudience: true, error: '' }) },
    failedTurn(error, turn) {
      if ((setup.airi && (setup.game || setup.airi.windowId)) || error instanceof NeedModel || error instanceof GenerationLimit) return null
      // A streamed reply may already have delivered a sentence. Retry only the input that is still unanswered.
      if (setup.airi ? env.state().turns !== turnsBefore : error instanceof VoiceFailed) answered()
      else retryChat = turn.viewer ?? null
      if (++failures >= LIVE_FAILURES) return null
      return RETRY_SECONDS[failures - 1] * 1000
    },
    ended: {
      limit: tr("已达到本次生成次数上限"), needModel: 'live',
      failure: (error) => ({ error: setup.describe(error), ended: failures >= LIVE_FAILURES ? tr("连续出错 {0} 次，已停止", LIVE_FAILURES) : tr("会话因错误停止") }),
    },
  }
}
