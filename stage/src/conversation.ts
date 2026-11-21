import { tr } from './i18n'
// The conversation's facade (talk.*): what the console, the stage, the Stage API and the tests call. A session runs in
// sessions/: one runner (runner.ts) with three policies (policies/: the characters among themselves, a chat with you,
// a 直播间), one inbox for what comes in, one speak path for every engine (brains/engines), and the state everything
// reads (state.ts). A realtime call keeps its own connection and reports through the same state.
//
// Who speaks when (the stage's talk settings, scene.ts Talk), and you in it:
//  - free: the one just named answers, else an AI character picked by how chatty it is and how long it has been
//    quiet (never the same twice running). You can cut in at any time.
//  - round: everyone who speaks (AI and the characters you play), left to right on the stage.
//  - host: the host speaks after every guest and names the next one (else the guest quiet longest).
// When the turn falls to a character you play, the conversation waits for your line (or a skip). Pause lets the
// current line finish and waits; a conversation stops after `limit` AI lines, so a paid model can't run on by itself.
import { actors } from './actors'
import { loadBrainConfig } from './brain'
import { demoFor } from './demo'
import { participants, store, uid, type CharacterItem } from './scene'
import { hush } from './speech'
import { isOutput } from './link'
import { chatHistory } from './chatHistory'
import { memory, type MemoryScope } from './memory'
import type { Line } from './core/lines'
import type { ExternalActionRequest, ExternalEvent } from './externalEvents'
import { airiGameError, airiGameText } from './airiEngine'
import { desktop } from './desktopBridge'
import { features } from './core/platform'
import { engineFor } from './brains/engines'
import { counted, lineLimit, liveLimits, spent, type LiveOptions } from './sessions/budget'
import { checkMemory } from './sessions/memoryGate'
import { castKey, played, profiles, session, voices, type RealtimeControls } from './sessions/context'
import { inbox, wake, type ChatInput } from './sessions/inbox'
import { clearCutting, cut, looks, onSpeech } from './sessions/performance'
import { cancelRestore, openHistory, outputOn, restoring, sessionScope, showPublicRecord } from './sessions/record'
import { publicSwitch } from './sessions/scope'
import { watchOutputs } from './sessions/outputs'
import { dropAhead, interruptTurn } from './sessions/speak'
import { startDuet } from './sessions/policies/duet'
import { startChat } from './sessions/policies/chat'
import { gameName, startLive } from './sessions/policies/live'
import { openRealtime, type RealtimeSession } from './sessions/realtime'
import { conversation, set, showRecord } from './sessions/state'
import { sleep } from './sessions/wake'
import './output/window'

export type { ConvState } from './sessions/state'
export type { RealtimeSession } from './sessions/realtime'
export { conversation, mirrorConv, onConv, shownConv, useConversation } from './sessions/state'
export { outputOn, sessionScope } from './sessions/record'
export { played } from './sessions/context'

export const liveModelName = () => conversation().mode === 'live' ? session.airi?.model.model : undefined

/** told by everything that turns an output on or off (the output window, a recording, the room, Twitch), and checked
 *  every second as well (sessions/outputs.ts) */
function outputChanged() {
  if (isOutput) return
  const on = outputOn()
  if (on !== conversation().output) set({ output: on }, false)
  if (on) goPublic()
}
/** an output came on while the private record is open: it is public from here on. Nothing running, the public
 *  record takes its place (what a recording or the output window may show). A session running: the turn in hand
 *  (made with private memories) is cut, a line made ahead and your lines not yet said are dropped (never said or
 *  remembered in public), and the session goes on in the public record, each turn (an AIRI one too) built from
 *  public memories only. A realtime call keeps its private context at the provider: it ends */
function goPublic() {
  const state = conversation(), run = session.ctrl
  const plan = publicSwitch({ scope: state.scope, switching: !!session.switching, demo: loadBrainConfig().kind === 'demo' && state.mode !== 'realtime', running: state.running, call: !!session.realtime, session: !!run })
  if (plan === 'record') { showPublicRecord(); return }
  if (plan === 'end-call') { talk.stop(); set({ ended: tr('输出已打开，私聊通话已结束') }); return }
  if (plan !== 'session' || !run) return
  const unsaid = inbox.queue.length
  inbox.queue.length = 0; inbox.epoch++; dropAhead(); interruptTurn()
  set({ scope: 'public', sessionId: '', lines: [], speaking: null, thinking: null, ...(unsaid ? { error: tr('输出已打开，还没说出的私聊输入已丢弃') } : {}) }, false)
  session.switching = openHistory('public', run.signal).catch((error: unknown) => {
    if (!run.signal.aborted && session.ctrl === run) { talk.stop(); set({ error: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
  }).finally(() => { session.switching = null; wake.wake() })
}
// once every module is ready (a recording registers itself as an output when its module loads)
if (!isOutput && typeof window !== 'undefined') setTimeout(() => { watchOutputs(outputChanged) }, 0)

export const talk = {
  /** The transport owns audio; this session owns the archive, memory scope and stage lifecycle. */
  realtime(controls: RealtimeControls, until: number, character: CharacterItem, chosen: MemoryScope = conversation().chatScope): Promise<RealtimeSession | null> {
    return openRealtime(controls, until, character, chosen, () => talk.stop())
  },
  /** the model was asked for and shown (the model card opened) */
  modelAsked() { if (conversation().needModel) set({ needModel: false }) },
  startChat: (chosen: MemoryScope = conversation().chatScope, target?: string, firstInput?: ChatInput) => startChat(chosen, target, firstInput),
  onSpeech,
  async restore(signal = new AbortController().signal) {
    if (isOutput || (loadBrainConfig().kind === 'demo' && conversation().mode !== 'realtime')) return
    if (conversation().running) { if (session.boundProfiles === castKey()) return; talk.stop() }
    cancelRestore()
    if (!profiles().length) { chatHistory.reset(); set({ sessionId: '' }); return }
    const controller = new AbortController(), active = AbortSignal.any([signal, controller.signal])
    const done = restoring(controller, active)
    try { await openHistory(sessionScope(conversation().scope), active) }
    catch (error) { if (!active.aborted) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
    finally { done() }
  },
  async setScope(scope: MemoryScope) {
    if (conversation().running || (scope === 'private' && outputOn())) return false
    try { await openHistory(scope, new AbortController().signal); set({ chatScope: scope }); return true }
    catch (error) { set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }); return false }
  },
  async newChat() {
    talk.stop()
    try { await openHistory(sessionScope(conversation().scope), new AbortController().signal, true); await chatHistory.save([]) }
    catch (error) { set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
  },
  async openSession(id: string) {
    if (conversation().running) return
    cancelRestore()
    try {
      const record = await chatHistory.select(id, profiles(), sessionScope(conversation().scope))
      showRecord({ sessionId: record.id, lines: record.lines })
    } catch (error) { set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) }
  },
  detach() { talk.stop(); chatHistory.reset(); set({ lines: [], sessionId: '', turns: 0, scope: sessionScope('private'), chatScope: 'private', storageError: '' }) },
  hearing(active = true, options: { interrupt?: boolean } = {}) {
    if (!session.realtime) {
      inbox.hearing = active
      if (active) { inbox.epoch++; if (options.interrupt || conversation().mode === 'chat' || session.airi || store.get().talk.cutIn) interruptTurn() }
    }
    if (active) actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('listening') })
    wake.wake()
  },
  externalEvent(event: ExternalEvent): boolean {
    const state = conversation(), airi = session.airi, realtime = session.realtime
    if (!state.running || state.scope !== 'public' || inbox.externalSeen.has(event.id)) return false
    if (airi && (!state.sessionId || (event.character && event.character !== airi.actorId))) return false
    if (realtime && !realtime.event(event)) return false
    inbox.externalSeen.add(event.id)
    if (inbox.externalSeen.size > 512) inbox.externalSeen.delete(inbox.externalSeen.values().next().value!)
    set({ lines: [...conversation().lines, { id: uid(), who: `external:${event.source}`, name: event.source, text: event.message.slice(0, 4000), emotion: 'neutral', action: 'none', to: null, human: true, audience: true }] })
    if (realtime) return true
    if (event.reply === 'always' || (event.reply === 'maybe' && !conversation().speaking && !conversation().thinking && !inbox.external.length)) inbox.external.push(event)
    if (inbox.external.length > 16) inbox.external.shift()
    wake.wake(); return true
  },
  externalDialogue(event: { id: string; started: boolean; character?: string }) {
    if (event.started) {
      const state = conversation(), airi = session.airi
      if (!state.running || state.scope !== 'public') return
      if (airi && (!state.sessionId || event.character !== airi.actorId)) return
      inbox.dialogue.add(event.id); interruptTurn()
    } else inbox.dialogue.delete(event.id)
    session.realtime?.pause(conversation().paused || inbox.dialogue.size > 0)
    wake.wake()
  },
  async decideExternalAction(request: ExternalActionRequest, incoming: AbortSignal) {
    const run = session.ctrl
    if (!run || !conversation().running || conversation().scope !== 'public' || conversation().paused) throw new Error(tr('请先开启公开的游戏互动会话'))
    const airi = session.airi
    if (airi && (!conversation().sessionId || request.character !== airi.actorId)) throw new Error(tr('参与角色已改变，请重新开始会话'))
    const actor = participants(store.get()).find((character) => character.id === request.character && character.lines === 'ai' && !character.remote)
    if (!actor) throw new Error(tr('先选择一个 AI 角色'))
    const signal = AbortSignal.any([run.signal, incoming, AbortSignal.timeout(45000)])
    inbox.decisions++
    try {
      if (request.priority === 'critical' || request.priority === 'high') interruptTurn()
      while (session.currentTurn) await sleep(40, signal)
      signal.throwIfAborted()
      if (conversation().paused || spent(conversation())) throw new Error(tr('会话已暂停或达到生成上限'))
      set(counted(conversation()))
      const frame = airi?.windowId ? await desktop?.vision?.frame(airi.windowId) : undefined
      signal.throwIfAborted()
      if (airi?.windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
      // the engine the session runs on decides: AIRI with its tools (and the window it sees), else a model of one's own
      const engine = engineFor(loadBrainConfig(), airi?.model)
      if (!engine.decideAction) throw new Error(tr('游戏动作决策需要使用自己的模型接口'))
      const action = await engine.decideAction(actor, request, signal, frame ?? undefined)
      signal.throwIfAborted()
      if (conversation().paused) throw new Error(tr('会话已暂停或达到生成上限'))
      return action
    } finally { inbox.decisions--; wake.wake() }
  },
  async playGame(instruction: string) {
    const airi = session.airi, game = airi?.game, host = desktop?.airiGame, parent = session.ctrl, sessionId = conversation().sessionId
    if (!airi || !game || !host || !parent || !sessionId || conversation().scope !== 'public' || conversation().paused || conversation().game?.status !== 'ready') {
      throw new Error(tr('请先在 AIRI 开启游戏直播'))
    }
    const actor = participants(store.get()).find((character) => character.id === airi.actorId)
    const query = instruction.trim().slice(0, 500)
    if (!actor || !query) return
    if (spent(conversation())) throw new Error(tr('会话已暂停或达到生成上限'))
    const signal = AbortSignal.any([parent.signal, AbortSignal.timeout(45_000)])
    const profile = actor.profileId ?? actor.id
    set({ ...counted(conversation()), game: { name: game.game, status: 'submitting', text: '' } })
    try {
      const [context, snapshot] = await Promise.all([chatHistory.context(profile, conversation().lines, 'public'), host.snapshot(game.id, true)])
      const stillCurrent = async () => {
        signal.throwIfAborted()
        if (session.airi !== airi || airi.game !== game || sessionId !== conversation().sessionId || conversation().scope !== 'public' || conversation().paused) {
          throw new Error(tr('游戏连接已关闭或会话已暂停'))
        }
        await checkMemory(memory, profile, 'public', context.revision)
        signal.throwIfAborted()
      }
      const facts = context.memories.slice(0, 12).map((entry) => entry.text.slice(0, 300))
      const frame = snapshot.frame ?? (airi.windowId ? await desktop?.vision?.frame(airi.windowId) : null)
      if (airi.windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
      await stillCurrent()
      const decision = await engineFor(loadBrainConfig(), airi.model).decideAction!(actor, {
        character: actor.id, source: gameName(game.game), query, priority: 'medium', silent: true, actions: game.actions,
        state: JSON.stringify({ observation: snapshot.state, rememberedFacts: facts }),
      }, signal, frame ?? undefined, stillCurrent)
      if (!decision) throw new Error(tr('AIRI 没有选出适合的游戏动作'))
      await stillCurrent()
      const text = airiGameText(await host.execute(game.id, decision))
      if (session.airi !== airi || airi.game !== game || parent.signal.aborted) return
      if (conversation().game?.status === 'submitting') set({ game: { name: game.game, status: game.game === 'minecraft' ? 'playing' : 'ready', text } })
      talk.externalEvent({ id: uid(), source: gameName(game.game), message: text, character: actor.id, reply: 'never' })
    } catch (error) {
      if (session.airi === airi && airi.game === game && !parent.signal.aborted) {
        set({ game: { name: game.game, status: 'ready', text: airiGameError(error) } })
      }
    } finally { wake.wake() }
  },
  async cancelGame() {
    if (session.airi?.game?.game === 'minecraft') await desktop?.airiGame?.cancel(session.airi.game.id)
  },
  /** they talk until the limit (a new limit's worth of AI lines, from where they are). Gives what stops this run only,
   *  not one started after it */
  start(): (() => void) | null {
    if (conversation().running) return null
    if (loadBrainConfig().kind === 'demo' && demoFor(voices())) talk.detach()
    set({ turns: 0 }); void startDuet(false)
    const mine = session.ctrl
    return () => { if (mine && session.ctrl === mine) talk.stop() }
  },
  startLive(options: LiveOptions) {
    if (conversation().running) return
    void startLive(liveLimits(options), talk.externalEvent)
  },
  /** the line being said finishes, then they wait */
  pause() { if (conversation().running) { set({ paused: true }); session.realtime?.pause(true); wake.wake() } },
  resume() { set({ paused: false }); session.realtime?.pause(inbox.dialogue.size > 0); wake.wake() },
  stop() {
    cancelRestore()
    inbox.hearing = false; inbox.activeEvent = null
    session.offRealtimeHistory(); session.offRealtimeHistory = () => {}
    session.realtime?.interrupt()
    const realtime = session.realtime; session.realtime = null; realtime?.stop()
    interruptTurn(); session.ctrl?.abort(); session.ctrl = null; session.liveOptions = null; session.airi = null; inbox.queue.length = 0; inbox.external.length = 0; inbox.dialogue.clear(); clearCutting()
    dropAhead()
    hush(); actors.forEach((a) => a.silence())
    set({ running: false, paused: false, thinking: null, speaking: null, waitingInput: false, waiting: null, waitingAudience: false, retryAt: 0, ended: conversation().mode === 'live' ? tr("已手动停止") : '', engine: undefined, game: undefined })
    looks(null, null)
  },
  clear() { talk.stop(); inbox.viewers.clear(); session.lastTurn = null; chatHistory.invalidate(); set({ lines: [], turns: 0, error: '' }) },
  setLimit(n: number) { set({ limit: lineLimit(n) }) },
  setGap(s: number) { set({ gap: Math.max(0, Math.min(3, s)) }) },
  /** who you speak as: a character you play, or 'narrator' */
  setAs(id: string) { set({ as: id }) },
  /** a line out of what they remember (it is no longer part of the conversation) */
  forget(id: string) { if (session.realtime) return; interruptTurn(); chatHistory.invalidate(); set({ lines: conversation().lines.filter((l) => l.id !== id) }) },
  /** back to just before this line: it and everything after are gone */
  rewind(id: string) {
    if (conversation().running) return
    const lines = conversation().lines, i = lines.findIndex((l) => l.id === id)
    if (i >= 0) { chatHistory.invalidate(); session.lastTurn = lines[i - 1]?.who ?? null; set({ lines: lines.slice(0, i), error: '' }) }
  },
  /** the last line said again, differently */
  redo() {
    if (conversation().running) return
    const last = conversation().lines.at(-1)
    if (last && !last.human) { chatHistory.invalidate(); set({ lines: conversation().lines.slice(0, -1) }) }
    void startDuet(true)
  },
  /** your character's turn passes */
  skip() { inbox.answer?.(null) },
  /** on to the next line now: your turn skipped, the line being said cut off, or the pause ended */
  next() {
    if (session.realtime) { session.realtime.interrupt(); return }
    if (!conversation().running) { talk.start(); return }
    if (session.airi && session.currentTurn) { inbox.epoch++; interruptTurn(); return }
    const speaking = conversation().speaking
    if (inbox.answer) inbox.answer(null)
    else if (speaking) cut(speaking.id, true)
    else if (conversation().mode === 'chat') { session.forced = voices().find((character) => character.lines === 'ai')?.id ?? null; wake.wake() }
    else session.hurry?.()
  },
  /** this character speaks next (a click on its card): an AI one after the current line, or, idle, at once; one you
   *  play becomes who the console speaks as */
  nextUp(id: string) {
    if (session.realtime) return
    const c = voices().find((x) => x.id === id)
    if (!c) return
    if (c.lines === 'me') { set({ as: c.id }); return }
    session.forced = c.id
    if (!conversation().running) void startDuet(true)
    else if (!conversation().speaking && !inbox.answer) { session.hurry?.(); wake.wake() }
  },
  /** a line of yours. With nothing running, in the desktop app or asked for (chat: 和角色聊天's first line), it starts
   *  a chat with this line as its first input; elsewhere it starts the characters talking. On your character's turn it
   *  is that turn; otherwise it waits for the current line (or cuts it off, cutIn) and they answer */
  say(text: string, options: { respond?: boolean; transcribed?: boolean; chat?: boolean } = {}) {
    const t = text.trim()
    if (!t) return
    if (session.realtime) { session.realtime.say(t); return }
    const state = conversation()
    if (state.running && (state.mode === 'chat' || session.airi) && !state.sessionId) { set({ error: tr('会话正在准备，请稍后再发') }); return false }
    const me = played()
    const c = me.find((x) => x.id === (state.waiting ?? state.as)) ?? (state.as === 'narrator' ? undefined : me[0])
    const line: Line = { id: uid(), who: c?.id ?? 'me', name: c?.name ?? tr("旁白"), text: t.slice(0, 200), emotion: 'neutral', action: 'none', to: null, human: true }
    set({ error: '' })
    if ((features.desktopConsole || options.chat) && !conversation().running && options.respond !== false && profiles().length) {
      const model = loadBrainConfig()
      if (model.kind !== 'demo') {
        return startChat(conversation().chatScope, undefined, { line, transcribed: options.transcribed === true }).then(() => true, () => false)
      }
    }
    if (options.transcribed || options.respond === false) set({ lines: [...conversation().lines, line] })
    if (options.respond === false) return
    if (inbox.answer) { inbox.answer(line); return }
    inbox.queue.push({ line, transcribed: options.transcribed === true })
    wake.wake()
    if (!conversation().running) { void startDuet(true); return }
    if (session.airi) inbox.epoch++
    if (conversation().mode === 'chat' || session.airi || store.get().talk.cutIn) interruptTurn()
  },
}
