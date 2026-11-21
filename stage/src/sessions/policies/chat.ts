import { tr } from '../../i18n'
// A chat with you (和角色聊天): a character answers what you say and then waits for you; it may speak up once after a
// quiet while (proactiveSeconds), and answers an event or the character you pick. It runs within its time and its
// generations (sessions/budget.ts), on AIRI when the one rule says so (sessions/airiBinding.ts).
import { actors } from '../../actors'
import { brainReady, loadBrainConfig } from '../../brain'
import { store } from '../../scene'
import type { MemoryScope } from '../../memory'
import { bindAiri, preferredAiriForChat } from '../airiBinding'
import { chatLimits, deadline, GenerationLimit, spent } from '../budget'
import { clock } from '../clock'
import { castKey, profiles, voices } from '../context'
import { inbox, turnHeld, wake, type ChatInput } from '../inbox'
import { consumeInput } from '../input'
import { looks } from '../performance'
import { openRecord, sessionScope } from '../record'
import { begin, current, finish, lastBegun, order, Run } from '../run'
import { runSession, type Policy } from '../runner'
import { dropAhead, followLines, freePick, interruptTurn, speakTurn } from '../speak'
import { conversation, set } from '../state'
import { sleep, waitWhile } from '../wake'

/** starts a chat (scope as chosen, unless an output is on; a character to answer; your first line to answer) */
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
  const run = new Run('chat'), controller = run.controller
  dropAhead(lastBegun()); begin(run); followLines(run)
  run.single = true; order.forced = target ?? null; run.boundProfiles = castKey()
  inbox.external.length = 0; inbox.dialogue.clear(); inbox.activeEvent = null
  const offAiriCast = preferred ? bindAiri(run, preferred.model, preferred.actor) : undefined
  const unbind = () => { offAiriCast?.() }
  const limits = chatLimits(store.get().talk)
  set({ running: true, mode: 'chat', scope, sessionId: '', lines: [], speaking: null, waitingInput: false, paused: false, thinking: null, waitingAudience: false,
    engine: preferred ? 'airi' : undefined, game: undefined,
    generations: 0, generationLimit: limits.generations, turns: 0,
    until: clock.now() + limits.minutes * 60000, ended: '', error: '' }, false)
  try {
    await openRecord(run, scope, controller.signal)
    for (let i = 0; i < 60 && !voices().some((character) => character.lines === 'ai'); i++) await sleep(250, controller.signal)
    if (!voices().some((character) => character.lines === 'ai')) throw new Error(tr('有 AI 角色尚未载入，请检查角色列表'))
    controller.signal.throwIfAborted()
    if (firstInput) {
      if (firstInput.transcribed) set({ lines: [...conversation().lines, firstInput.line] })
      inbox.queue.unshift(firstInput)
    }
    void runSession(chat(run, unbind), controller)
  } catch (error) {
    unbind()
    if (finish(run)) {
      run.airi = null
      set({ running: false, engine: undefined, error: controller.signal.aborted ? '' : error instanceof Error ? error.message : String(error) })
    }
    throw error
  }
}

function chat(run: Run, unbind: () => void): Policy {
  const controller = run.controller
  let stopClock = () => {}
  let requested = !conversation().lines.length, replyToOwner = false, lastReply = clock.now(), nudges = 0
  return {
    async open() {
      stopClock = deadline(conversation().until, () => { set({ ended: tr('已达到本次时长上限') }); interruptTurn(current()); controller.abort() })
    },
    async step(signal) {
      if (spent(conversation())) return false
      signal.throwIfAborted()
      await waitWhile(turnHeld, wake, signal)
      if (spent(conversation())) return false
      if (inbox.queue.length) {
        while (inbox.queue.length) await consumeInput(run, signal)
        requested = true; replyToOwner = true; nudges = 0
      }
      if (turnHeld()) return true
      inbox.activeEvent = conversation().scope === 'public' && !(run.airi && replyToOwner) ? inbox.external.shift() ?? null : null
      if (inbox.activeEvent) requested = true
      if (order.forced) requested = true
      if (!requested) {
        set({ waitingInput: true })
        actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('waiting') })
        const seconds = store.get().talk.proactiveSeconds ?? 0
        const remaining = seconds && nudges < 1 ? lastReply + seconds * 1000 - clock.now() : Infinity
        if (remaining <= 0) { requested = true; nudges++ }
        else { await wake.wait(signal, Number.isFinite(remaining) ? remaining : undefined); return true }
      }
      set({ waitingInput: false })
      const pool = voices().filter((character) => character.lines === 'ai')
      const lastHuman = [...conversation().lines].reverse().find((line) => line.human && !line.audience)
      const speaker = pool.find((character) => character.id === (inbox.activeEvent?.character ?? order.forced))
        ?? pool.find((character) => lastHuman?.text.includes(character.name)) ?? freePick(pool)
      order.forced = null
      if (!speaker) throw new Error(tr('舞台上没有已就绪的 AI 角色'))
      const beforeInput = inbox.epoch
      const completed = await speakTurn(run, speaker, signal, null, replyToOwner)
      requested = !completed && beforeInput === inbox.epoch
      replyToOwner &&= requested
      inbox.activeEvent = null; lastReply = clock.now()
      return true
    },
    done() { set({ ended: tr('已达到本次生成次数上限') }) },
    failed(error, signal) {
      if (error instanceof GenerationLimit) set({ ended: tr('已达到本次生成次数上限') })
      else if (!signal.aborted) set({ error: error instanceof Error ? error.message : String(error) })
    },
    close() {
      unbind()
      stopClock()
      if (finish(run)) {
        run.airi = null; inbox.activeEvent = null; actors.forEach((actor) => actor.silence())
        set({ running: false, paused: false, thinking: null, speaking: null, waitingInput: false, engine: undefined }); looks(null, null)
      }
    },
  }
}
