import { tr } from '../i18n'
// One AI turn, said: the engine's answer (brains/engines) a line at a time, each voiced and played on the stage
// (performance.ts). A whole reply from a model (one's own or livliv.ai's) or the demo is made first (with its voice); in
// a chat it is said sentence by sentence, so the first is heard sooner (a livliv.ai voice is paid by the line: its
// sentences share one line id); AIRI's reply streams and each
// sentence is said as it comes. In a 对谈 the next line is made while this one is said (one ahead).
import { actors, type Take } from '../actors'
import { brainReady, isTooLong, loadBrainConfig, previousModelConfig } from '../brain'
import { chatHistory } from '../chatHistory'
import { conversationContext, speechSegments } from '../chatContext'
import { demoFor, demoSpeaker } from '../demo'
import { desktop } from '../desktopBridge'
import { memory } from '../memory'
import type { Chat } from '../danmaku'
import { participants, store, uid, type CharacterItem } from '../scene'
import { sessionRoute } from '../voiceApi'
import type { Line } from '../core/lines'
import { brainEngine, type Engine, type TurnRequest, type Utterance } from '../brains/engines'
import { personaOf } from '../brains/persona'
import { counted, GenerationLimit, spend, spent, turnLimit as linesFor } from './budget'
import { castKey, NeedModel, played, TURN_INTERRUPTED, voices, VoiceFailed } from './context'
import { holds, inbox, someViewer, speechHeld, wake, YOURS } from './inbox'
import { checkMemory, memoryIdsOf } from './memoryGate'
import { across } from './order'
import { byOrder, pick, picked } from './speakers'
import { cut, deliver, takeCutting, tellSpeech, type LineSpeech } from './performance'
import { current, type Run } from './run'
import { conversation, set } from './state'
import { untilFree, waitWhile } from './wake'
import { sayEach } from './stream'
import { bySentence as sentenceBySentence } from './voicing'
import { brainNow } from './spend'

/** the lines a 对谈 runs to: a prepared demo always reaches its ending, paid conversations keep the user's limit */
export const turnLimit = () => linesFor(loadBrainConfig().kind === 'demo' ? demoFor(voices())?.script.lines.length : undefined, conversation().limit)

/** who the speaker shares the stage with: the other AI characters, the people (the characters you play, and you once
 *  you have spoken as yourself), who stands where from the left, and its part in the host order */
function castFor(me: CharacterItem): TurnRequest['cast'] {
  const s = store.get(), t = s.talk, ai = voices().filter((c) => c.lines === 'ai')
  const humans = played().map((h) => h.name)
  if (conversation().lines.some((l) => l.who === 'me')) humans.push(tr("我"))
  return {
    others: ai.filter((c) => c.id !== me.id), humans, role: t.order === 'host' ? (me.id === (t.host ?? ai[0]?.id) ? 'host' : 'guest') : null,
    layout: [...participants(s)].sort((a, b) => across(a) - across(b)).map((c) => c.name),
  }
}

/** a turn as every engine is asked it: the speaker and its card, the cast, what it answers from, how to answer */
function turnRequest(me: CharacterItem, cast: TurnRequest['cast'], context: Pick<TurnRequest['context'], 'lines' | 'summary' | 'memories' | 'viewer' | 'event' | 'replyToOwner' | 'game' | 'frame'>,
  constraints: Pick<TurnRequest['constraints'], 'cutIn' | 'allowBatch' | 'verifyMemory'>): TurnRequest {
  const s = store.get(), { sessionId, scope, mode } = conversation()
  return {
    speaker: me, persona: personaOf(me, s.talk.language, scope), cast,
    context: { sessionId, scope, topic: s.topic, mode: mode as TurnRequest['context']['mode'], ...context },
    constraints: { language: s.talk.language, depth: s.talk.depth, ...constraints },
  }
}

/** a request with the older half of its history and of its memories left out */
export function shorter(request: TurnRequest): TurnRequest {
  const { lines, memories } = request.context
  return { ...request, context: { ...request.context, lines: lines.slice(Math.floor(lines.length / 2)), memories: memories.slice(0, Math.floor(memories.length / 2)) } }
}

/** the engine's answer. livliv.ai refusing the call as too long before anything came back: asked once more, shorter,
 *  without a word to the user */
async function* replyOf(engine: Engine, request: TurnRequest, signal: AbortSignal): AsyncGenerator<Utterance> {
  let came = false
  try {
    for await (const said of engine.reply(request, signal)) { came = true; yield said }
  } catch (error) {
    if (came || signal.aborted || !isTooLong(error)) throw error
    yield* engine.reply(shorter(request), signal)
  }
}

/** the brain a turn of this session thinks with: the one set up now, but never livliv.ai's text in a session that
 *  started without it (sessions/spend.ts) */
export const brainOf = (run: Run | null) => brainNow(loadBrainConfig(), previousModelConfig(), run?.spend)
/** the engine a turn runs on: the session's when it was chosen at the start (AIRI), else the brain set up now */
export const engineNow = (run: Run | null) => run?.engine ?? brainEngine(brainOf(run))

/** a line and its voice, made ready (an engine that answers whole: a model of one's own, LivLiv or the demo). The
 *  answer is read to its end */
async function makeLine(run: Run, me: CharacterItem, signal: AbortSignal, audience?: Chat | null) {
  const engine = engineNow(run)
  if (run.boundProfiles !== castKey()) throw new Error(tr('参与角色已改变，请重新开始会话'))
  const cast = castFor(me)
  const cutIn = takeCutting()
  const chat = audience === undefined ? conversation().scope === 'public' ? someViewer() : null : audience
  if (conversation().mode !== 'conversation') set(spend(conversation()))
  const cfg = brainOf(run), aloud = !run.liveOptions?.textOnly && !me.muted
  const sessionId = conversation().sessionId
  const context = cfg.kind === 'demo' ? { lines: conversation().lines, summary: undefined, memories: [], revision: 0 } : await chatHistory.context(me.profileId ?? me.id, conversation().lines, conversation().scope)
  signal.throwIfAborted()
  const used = conversationContext(context.lines, context.summary)
  const memoryIds = memoryIdsOf(context)
  const request = turnRequest(me, cast, { lines: context.lines, summary: context.summary, memories: context.memories, viewer: chat && { user: chat.user, text: chat.text },
    event: run.event ?? undefined, replyToOwner: false },
    { cutIn, allowBatch: false })
  const answer: Utterance[] = []
  for await (const said of replyOf(engine, request, signal)) answer.push(said)
  signal.throwIfAborted()
  const r = answer[0]
  if (!r) throw new Error(tr('模型没有返回可播放的回复'))
  const { summary, ...reply } = r
  if (summary && used.updateSummary) {
    await chatHistory.summarize(summary, used.sourceIds, memoryIds, context.revision, sessionId, conversation().lines)
  }
  // its voice is made while it still shows 在想 (a livliv.ai voice takes about a second); the demo's comes recorded
  const bySentence = sentenceBySentence(conversation().mode)
  const take = bySentence ? undefined : await actors.get(me.id)?.prepare(r.text, r.emotion, aloud, signal, r.audio)
  signal.throwIfAborted()
  if (run.liveOptions && !run.liveOptions.textOnly && take?.mute) throw new Error(actors.get(me.id)?.voiceError || tr("角色还没有声音：在角色卡「人设和声音」里选一个，或者把它静音，只出字幕"))
  return { r: { ...reply, memoryIds, memoryRevision: context.revision }, take, chat, memoryRevision: context.revision, bySentence }
}

// The next line is made while this one is said, so it can follow at once: at most one line ahead. It is thrown away
// when what it answers changes (you said something, the line was cut, the topic changed, the conversation stopped);
// that costs one model call and one line's voice at most (with LivLiv, one line's points), at the user's own expense,
// so it isn't done where lines get cut on purpose (AI 抢话). A viewer's message it answers goes back to wait for the
// next line
type Made = Awaited<ReturnType<typeof makeLine>>
/** the line made ahead in this session is given up (a viewer's message it answered goes back to wait) */
export function dropAhead(run: Run | null) {
  const ahead = run?.ahead
  if (!run || !ahead) return
  if (ahead.chat) inbox.putBack(ahead.chat)
  ahead.ctl.abort(); run.ahead = null
}

function makeAhead(run: Run) {
  const t = store.get().talk, last = conversation().lines.at(-1)
  if (conversation().mode !== 'conversation' || run.ahead || current() !== run || run.single || !last || inbox.has(YOURS) || conversation().turns >= turnLimit()) return
  const cfg = brainOf(run)
  if (!brainReady(cfg) || (cfg.kind !== 'demo' && t.interrupt)) return
  const who = cfg.kind === 'demo' ? demoSpeaker(voices(), conversation().lines) : byOrder(store.get().talk, voices(), conversation().lines)
  if (!who) return
  if (who.lines !== 'ai') { pick(who.id); return }  // your turn is next: nothing to make, and it stays next
  if (run.switching) return
  const ctl = new AbortController(), chat = conversation().scope === 'public' ? someViewer() : null
  run.ahead = { who, after: last.id, topic: store.get().topic, ctl, chat, made: makeLine(run, who, AbortSignal.any([run.signal, ctl.signal]), chat).catch(() => null) }
}
/** the line made ahead in this session follows what a line said does (performance.ts deliver and cut) */
export function followLines(run: Run) { run.lineAhead = { started: () => makeAhead(run), dropped: () => dropAhead(run) } }

/** the line made ahead, if it still answers what was just said */
export function aheadStill(run: Run) {
  const ahead = run.ahead
  if (ahead && (ahead.after !== conversation().lines.at(-1)?.id || ahead.topic !== store.get().topic || (picked() && picked() !== ahead.who.id)
    || !voices().some((c) => c.id === ahead.who.id && c.lines === 'ai'))) dropAhead(run)
  return run.ahead
}

/** the turn in hand stops: a call is interrupted, a line made ahead is dropped, the line being said is cut */
export function interruptTurn(run: Run | null) {
  run?.realtime?.interrupt()
  dropAhead(run)
  const speaking = conversation().speaking
  if (speaking) cut(speaking.id, true, run?.lineAhead)
  run?.currentTurn?.abort(TURN_INTERRUPTED)
}

function addViewer(chat: Chat | null | undefined) {
  if (!chat || conversation().lines.some((line) => line.id === chat.id)) return
  set({ lines: [...conversation().lines, { id: chat.id, who: 'audience', name: tr("弹幕 · {0}", chat.user), text: chat.text, emotion: 'neutral', action: 'none', to: null, human: true, audience: true }] })
}

/** a turn on an engine that streams (AIRI, bound to one character): its reply comes a sentence at a time, each voiced
 *  and said as it comes (the next made ready while one plays); it sees the game's frame or the window when it can */
async function streamedTurn(run: Run, me: CharacterItem, chat: Chat | null | undefined, replyToOwner: boolean, signal: AbortSignal, onStart: () => void, onEnd: (cancelled: boolean) => void) {
  const airi = run.airi, engine = engineNow(run)
  const actor = actors.get(me.id), profile = me.profileId ?? me.id
  const { sessionId, scope } = conversation(), windowId = airi?.windowId, event = run.event
  if (!airi || airi.actorId !== me.id || !sessionId || actor?.status !== 'ready' || run.boundProfiles !== castKey()) throw new Error(tr('参与角色已改变，请重新开始会话'))
  if (spent(conversation())) throw new GenerationLimit()
  const context = await chatHistory.context(profile, conversation().lines, scope)
  const verifyMemory = async () => {
    await checkMemory(memory, profile, scope, context.revision)
    signal.throwIfAborted()
  }
  signal.throwIfAborted()
  const snapshot = engine.caps.tools && airi.game ? await desktop?.airiGame?.snapshot(airi.game.id, true) : undefined
  signal.throwIfAborted()
  const frame = snapshot?.frame ?? (engine.caps.vision && windowId ? await desktop?.vision?.frame(windowId) : undefined)
  signal.throwIfAborted()
  if (windowId && !frame) throw new Error(tr('游戏窗口已关闭或屏幕录制权限不可用'))
  const memories = engine.caps.memories ? context.memories.slice(0, engine.caps.memories) : context.memories
  const memoryIds = memoryIdsOf({ ...context, memories })
  const textOnly = run.liveOptions?.textOnly === true
  set(counted(conversation()))
  addViewer(chat)
  const request = turnRequest(me, castFor(me), {
    lines: context.lines, summary: context.summary, memories, viewer: chat ? { id: chat.id, user: chat.user, text: chat.text } : null, event: event ?? undefined, replyToOwner,
    game: snapshot?.state, ...(frame ? { frame } : {}),
  }, { cutIn: false, allowBatch: !airi.game && !windowId, verifyMemory })
  const answer = replyOf(engine, request, signal)
  const speech: LineSpeech = {
    final: false, onStart, onEnd,
    beforeStart: () => untilFree(speechHeld, wake, signal, async () => {
      if (conversation().sessionId !== sessionId || conversation().scope !== scope || run.boundProfiles !== castKey() || actors.get(me.id) !== actor) throw new Error(tr('参与角色已改变，请重新开始会话'))
      await verifyMemory()
    }),
  }
  // each sentence's voice is made while the one before is said, all under one line id (a livliv.ai voice is paid by the
  // line); the turn counts once the first is said
  const voiced = uid()
  const said = await sayEach(answer, signal, async (line) => {
    const aloud = !textOnly && !actor.item.muted
    const take = await actor.prepare(line.text, line.emotion, aloud, signal, undefined, voiced)
    signal.throwIfAborted()
    if (aloud && take.mute) throw new VoiceFailed(actor.voiceError || tr('声音播放失败，请检查声音设置'))
    return take
  }, (line, take) => deliver({ id: uid(), who: me.id, name: me.name, ...line, memoryIds, memoryRevision: context.revision }, me, signal, take, speech, run.lineAhead),
  () => set({ thinking: null, turns: conversation().turns + 1 }))
  if (!said && event?.reply !== 'maybe') throw new Error(tr('模型没有返回可播放的回复'))
}

/** an AI character's turn, said: true when it was said, false when you cut it off (the session goes on) */
export async function speakTurn(run: Run, me: CharacterItem, parent: AbortSignal, audience?: Chat | null, replyToOwner = false) {
  parent.throwIfAborted()
  await waitWhile(() => holds.dialogue.size > 0 || holds.decisions > 0 || holds.hearing, wake, parent)
  const model = run.airi?.model ?? brainOf(run)
  const scope = conversation().scope
  if (!brainReady(model)) throw new NeedModel()
  const turn = new AbortController(), signal = AbortSignal.any([parent, turn.signal])
  run.currentTurn = turn
  let spoke = false, hadCut = false
  set({ thinking: me.id })
  actors.get(me.id)?.setPhase('thinking')
  const prepared = aheadStill(run)?.who.id === me.id ? run.ahead : null
  const cancelPrepared = () => prepared?.ctl.abort(signal.reason)
  try {
    if (engineNow(run).caps.stream) {
      await streamedTurn(run, me, audience, replyToOwner, signal, () => { spoke = true }, (cancelled) => { hadCut ||= cancelled })
      return true
    }
    if (!prepared) dropAhead(run)
    else { run.ahead = null; signal.addEventListener('abort', cancelPrepared, { once: true }) }
    const made = prepared ? await prepared.made as Made | null : null
    signal.throwIfAborted()
    const { r, take, chat, memoryRevision, bySentence } = made ?? await makeLine(run, me, signal, prepared?.chat ?? audience)
    signal.throwIfAborted()
    const speech: LineSpeech = {
      final: false, onStart: () => { spoke = true }, onEnd: (cancelled: boolean) => { hadCut ||= cancelled },
      beforeStart: () => untilFree(speechHeld, wake, signal, async () => {
        // made before an output switched the session to public: never said
        if (conversation().scope !== scope) { turn.abort(TURN_INTERRUPTED); signal.throwIfAborted() }
        if (loadBrainConfig().kind !== 'demo') await checkMemory(memory, me.profileId ?? me.id, conversation().scope, memoryRevision)
        signal.throwIfAborted()
      }),
    }
    await speech.beforeStart()
    set({ thinking: null, turns: conversation().turns + 1 })
    if (!r.text.trim()) {
      actors.get(me.id)?.react({ at: 0, feeling: r.emotion, action: r.action, ...r.cues?.[0] })
      for (const reaction of r.listeners ?? []) {
        const listener = actors.get(reaction.who)
        if (listener?.item.reactions?.listen !== false) listener?.react(reaction.cue)
      }
      return true
    }
    addViewer(chat)
    if (bySentence) await bySentences(run, me, r, memoryRevision, signal, speech)
    else await deliver({ id: uid(), who: me.id, name: me.name, ...r }, me, signal, take, speech, run.lineAhead)
    if (run.liveOptions && !run.liveOptions.textOnly) {
      await take?.clip?.live?.whole
      const error = actors.get(me.id)?.voiceError
      if (error) throw new VoiceFailed(error)
    }
    return true
  } catch (error) {
    if (parent.aborted || !turn.signal.aborted) throw error
    return false
  } finally {
    if (spoke) tellSpeech({ character: me.id, scope, speaking: false, final: true, cancelled: signal.aborted || hadCut })
    turn.abort()
    signal.removeEventListener('abort', cancelPrepared)
    if (run.currentTurn === turn) { run.currentTurn = null; set({ thinking: null }); actors.get(me.id)?.setPhase('waiting') }
  }
}

/** a whole reply said sentence by sentence (a chat with a model of one's own): each voice made while the one before is
 *  said, its reactions where they fall */
async function bySentences(run: Run, me: CharacterItem, r: Utterance & Pick<Line, 'memoryIds' | 'memoryRevision'>, memoryRevision: number, signal: AbortSignal, speech: LineSpeech) {
  const segments = speechSegments(r.text), total = segments.reduce((sum, text) => sum + text.length, 0) || 1
  const actor = actors.get(me.id), voiced = uid()  // its sentences are one line (a livliv.ai voice is paid by the line)
  let preparedVoice: Promise<Take> | undefined = actor?.prepare(segments[0], r.emotion, true, signal, undefined, voiced)
  let offset = 0
  for (let i = 0; i < segments.length; i++) {
    const text = segments[i]
    signal.throwIfAborted()
    await waitWhile(() => conversation().paused || holds.dialogue.size > 0, wake, signal)
    const voice = await preparedVoice
    signal.throwIfAborted()
    await checkMemory(memory, me.profileId ?? me.id, conversation().scope, memoryRevision)
    if (voice?.mute && sessionRoute(me) !== 'none') throw new Error(actor?.voiceError || tr('声音播放失败，请检查声音设置'))
    preparedVoice = i + 1 < segments.length ? actor?.prepare(segments[i + 1], r.emotion, true, signal, undefined, voiced) : undefined
    // A cancelled future sentence may reject before playback reaches it.
    void preparedVoice?.catch(() => {})
    const start = offset / total, width = text.length / total
    const cues = r.cues?.filter((cue) => cue.at >= start && cue.at < start + width).map((cue) => ({ ...cue, at: (cue.at - start) / width }))
    const listeners = r.listeners?.filter(({ cue }) => cue.at >= start && cue.at < start + width).map((reaction) => ({ ...reaction, cue: { ...reaction.cue, at: (reaction.cue.at - start) / width } }))
    await deliver({ id: uid(), who: me.id, name: me.name, ...r, text, cues, listeners }, me, signal, voice, speech, run.lineAhead)
    offset += text.length
  }
}
