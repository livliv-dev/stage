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
import { store, uid, type CharacterItem } from './scene'
import { hush } from './speech'
import { isOutput } from './link'
import { chatHistory } from './chatHistory'
import type { MemoryScope } from './memory'
import type { Line } from './core/lines'
import type { ExternalActionRequest, ExternalEvent } from './externalEvents'
import { desktop } from './desktopBridge'
import { features } from './core/platform'
import { lineLimit, liveLimits, type LiveOptions } from './sessions/budget'
import { castKey, played, profiles, voices, type RealtimeControls } from './sessions/context'
import { EVENTS, holds, inbox, wake, YOURS, yourLine, type ChatInput } from './sessions/inbox'
import { clearCutting, cut, looks, onSpeech } from './sessions/performance'
import { cancelRestore, openHistory, outputOn, restoring, sessionScope, showPublicRecord } from './sessions/record'
import { publicSwitch } from './sessions/scope'
import { watchOutputs } from './sessions/outputs'
import { clearCurrent, current, order } from './sessions/run'
import { pick } from './sessions/speakers'
import { dropAhead, interruptTurn } from './sessions/speak'
import { startChat, startDuet, startLive } from './sessions/start'
import { turnPublic } from './sessions/runner'
import { gameEnv, stageEnv } from './sessions/env'
import { decideAction, playGame } from './sessions/games'
import { openRealtime, type RealtimeSession } from './sessions/realtime'
import { conversation, set, showRecord } from './sessions/state'
import './output/window'

export type { ConvState } from './sessions/state'
export type { RealtimeSession } from './sessions/realtime'
export { conversation, mirrorConv, onConv, shownConv, useConversation } from './sessions/state'
export { outputOn, sessionScope } from './sessions/record'
export { played } from './sessions/context'

export const liveModelName = () => conversation().mode === 'live' ? current()?.airi?.model.model : undefined

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
  const state = conversation(), run = current()
  const plan = publicSwitch({ scope: state.scope, switching: !!run?.switching, demo: loadBrainConfig().kind === 'demo' && state.mode !== 'realtime', running: state.running, call: !!run?.realtime, session: !!run })
  if (plan === 'record') { showPublicRecord(); return }
  if (plan === 'end-call') { talk.stop(); set({ ended: tr('输出已打开，私聊通话已结束') }); return }
  if (plan !== 'session' || !run) return
  turnPublic(run, stageEnv, (error) => { talk.stop(); set({ error: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) }) })
}
/** the stage for game actions; a game's line is shown as the game's (externalEvent) */
const games = () => gameEnv((event) => talk.externalEvent(event, 'game'))

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
    if (conversation().running) { if (current()?.boundProfiles === castKey()) return; talk.stop() }
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
    const run = current()
    if (!run?.realtime) {
      holds.hearing = active
      if (active) { holds.epoch++; if (options.interrupt || conversation().mode === 'chat' || run?.airi || store.get().talk.cutIn) interruptTurn(run) }
    }
    if (active) actors.forEach((actor) => { if (actor.item.lines === 'ai') actor.setPhase('listening') })
    wake.wake()
  },
  /** another app's event (the external events API, the Neuro bridge), or a game's (`game`) */
  externalEvent(event: ExternalEvent, kind: 'external' | 'game' = 'external'): boolean {
    const state = conversation(), airi = current()?.airi, realtime = current()?.realtime
    if (!state.running || state.scope !== 'public' || inbox.hasSeen(event.id)) return false
    if (airi && (!state.sessionId || (event.character && event.character !== airi.actorId))) return false
    if (realtime && !realtime.event(event)) return false
    inbox.seenNow(event.id)
    set({ lines: [...conversation().lines, { id: uid(), who: `external:${event.source}`, name: event.source, text: event.message.slice(0, 4000), emotion: 'neutral', action: 'none', to: null, human: true, audience: true }] })
    if (realtime) return true
    if (event.reply === 'always' || (event.reply === 'maybe' && !conversation().speaking && !conversation().thinking && !inbox.has(EVENTS))) inbox.push({ kind, event })
    wake.wake(); return true
  },
  externalDialogue(event: { id: string; started: boolean; character?: string }) {
    if (event.started) {
      const state = conversation(), airi = current()?.airi
      if (!state.running || state.scope !== 'public') return
      if (airi && (!state.sessionId || event.character !== airi.actorId)) return
      holds.dialogue.add(event.id); interruptTurn(current())
    } else holds.dialogue.delete(event.id)
    current()?.realtime?.pause(conversation().paused || holds.dialogue.size > 0)
    wake.wake()
  },
  /** a game action for another app's request, decided in the public session running (sessions/games.ts) */
  decideExternalAction: (request: ExternalActionRequest, incoming: AbortSignal) => decideAction(games(), request, incoming),
  /** what you ask the game played on AIRI to do */
  playGame: (instruction: string) => playGame(games(), instruction),
  async cancelGame() {
    const game = current()?.airi?.game
    if (game?.game === 'minecraft') await desktop?.airiGame?.cancel(game.id)
  },
  /** they talk until the limit (a new limit's worth of AI lines, from where they are). Gives what stops this run only,
   *  not one started after it */
  start(): (() => void) | null {
    if (conversation().running) return null
    if (loadBrainConfig().kind === 'demo' && demoFor(voices())) talk.detach()
    set({ turns: 0 }); void startDuet(false)
    const mine = current()
    return () => { if (mine && current() === mine) talk.stop() }
  },
  startLive(options: LiveOptions) {
    if (conversation().running) return
    void startLive(liveLimits(options), (event) => talk.externalEvent(event, 'game'))
  },
  /** the line being said finishes, then they wait */
  pause() { if (conversation().running) { set({ paused: true }); current()?.realtime?.pause(true); wake.wake() } },
  resume() { set({ paused: false }); current()?.realtime?.pause(holds.dialogue.size > 0); wake.wake() },
  stop() {
    cancelRestore()
    const run = current()
    holds.hearing = false; if (run) run.event = null
    if (run) { run.offRealtimeHistory(); run.offRealtimeHistory = () => {} }
    run?.realtime?.interrupt()
    const realtime = run?.realtime; if (run) run.realtime = null; realtime?.stop()
    interruptTurn(run); run?.controller.abort(); clearCurrent(); if (run) { run.liveOptions = null; run.airi = null }
    inbox.drop(YOURS); inbox.drop(EVENTS); holds.dialogue.clear(); clearCutting()
    dropAhead(run)
    hush(); actors.forEach((a) => a.silence())
    set({ running: false, paused: false, thinking: null, speaking: null, waitingInput: false, waiting: null, waitingAudience: false, retryAt: 0, ended: conversation().mode === 'live' ? tr("已手动停止") : '', engine: undefined, game: undefined })
    looks(null, null)
  },
  clear() { talk.stop(); inbox.clearViewers(); order.lastTurn = null; chatHistory.invalidate(); set({ lines: [], turns: 0, error: '' }) },
  setLimit(n: number) { set({ limit: lineLimit(n) }) },
  setGap(s: number) { set({ gap: Math.max(0, Math.min(3, s)) }) },
  /** who you speak as: a character you play, or 'narrator' */
  setAs(id: string) { set({ as: id }) },
  /** a line out of what they remember (it is no longer part of the conversation) */
  forget(id: string) { if (current()?.realtime) return; interruptTurn(current()); chatHistory.invalidate(); set({ lines: conversation().lines.filter((l) => l.id !== id) }) },
  /** back to just before this line: it and everything after are gone */
  rewind(id: string) {
    if (conversation().running) return
    const lines = conversation().lines, i = lines.findIndex((l) => l.id === id)
    if (i >= 0) { chatHistory.invalidate(); order.lastTurn = lines[i - 1]?.who ?? null; set({ lines: lines.slice(0, i), error: '' }) }
  },
  /** the last line said again, differently */
  redo() {
    if (conversation().running) return
    const last = conversation().lines.at(-1)
    if (last && !last.human) { chatHistory.invalidate(); set({ lines: conversation().lines.slice(0, -1) }) }
    void startDuet(true)
  },
  /** your character's turn passes */
  skip() { current()?.yourTurn?.skip() },
  /** on to the next line now: your turn skipped, the line being said cut off, or the pause ended */
  next() {
    const run = current()
    if (run?.realtime) { run.realtime.interrupt(); return }
    if (!conversation().running) { talk.start(); return }
    if (run?.airi && run.currentTurn) { holds.epoch++; interruptTurn(run); return }
    const speaking = conversation().speaking
    if (run?.yourTurn) run.yourTurn.skip()
    else if (speaking) cut(speaking.id, true, run?.lineAhead)
    else if (conversation().mode === 'chat') { pick(voices().find((character) => character.lines === 'ai')?.id ?? null); wake.wake() }
    else run?.hurry?.()
  },
  /** this character speaks next (a click on its card): an AI one after the current line, or, idle, at once; one you
   *  play becomes who the console speaks as */
  nextUp(id: string) {
    if (current()?.realtime) return
    const c = voices().find((x) => x.id === id)
    if (!c) return
    if (c.lines === 'me') { set({ as: c.id }); return }
    pick(c.id)
    if (!conversation().running) void startDuet(true)
    else if (!conversation().speaking && !current()?.yourTurn) { current()?.hurry?.(); wake.wake() }
  },
  /** a line of yours. With nothing running, in the desktop app or asked for (chat: 和角色聊天's first line), it starts
   *  a chat with this line as its first input; elsewhere it starts the characters talking. On your character's turn it
   *  is that turn; otherwise it waits for the current line (or cuts it off, cutIn) and they answer */
  say(text: string, options: { respond?: boolean; transcribed?: boolean; chat?: boolean } = {}) {
    const t = text.trim()
    if (!t) return
    const run = current()
    if (run?.realtime) { run.realtime.say(t); return }
    const state = conversation()
    if (state.running && (state.mode === 'chat' || run?.airi) && !state.sessionId) { set({ error: tr('会话正在准备，请稍后再发') }); return false }
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
    if (run?.yourTurn) { run.yourTurn.said(line); return }
    inbox.push(yourLine({ line, transcribed: options.transcribed === true }))
    wake.wake()
    if (!conversation().running) { void startDuet(true); return }
    if (current()?.airi) holds.epoch++
    if (conversation().mode === 'chat' || current()?.airi || store.get().talk.cutIn) interruptTurn(current())
  },
}

// the editor follows its outputs (a recording is heard whenever its module registers it: sessions/recordingOutput.ts)
if (!isOutput && typeof window !== 'undefined') watchOutputs(outputChanged)
