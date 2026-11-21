import { tr } from '../i18n'
// A realtime call keeps its own connection (realtime.ts: the provider's audio and voice); the session owns its record,
// its memory scope and its place on the stage. The call reports its lines and states here, through the same state
// as every other session.
import { actors } from '../actors'
import { chatHistory } from '../chatHistory'
import { conversationContext } from '../chatContext'
import { memory, type MemoryScope } from '../memory'
import { store, type CharacterItem } from '../scene'
import type { Line } from '../core/lines'
import { chatLimits, counted, spent } from './budget'
import { castKey, type RealtimeControls } from './context'
import { begin, current, lastBegun, Run } from './run'
import { inbox } from './inbox'
import { rememberLine } from './input'
import { memoryIdsOf, memoryUnchanged } from './memoryGate'
import { looks, tellSpeech } from './performance'
import { openHistory, sessionScope } from './record'
import { dropAhead } from './speak'
import { conversation, set } from './state'

export type RealtimeSession = {
  context: { earlier: string; history: string; memories: { id: string; text: string }[] }
  line(line: Line, complete?: boolean): void
  state(thinking: string | null, speaking: Line | null): void
  speech(speaking: boolean, final: boolean, cancelled?: boolean): void
  turn(): boolean
  end(error?: string, reason?: string): void
}

/** a call starts: its record opened and its context read; null when a session runs already. `stop` ends the session */
export async function openRealtime(controls: RealtimeControls, until: number, character: CharacterItem, chosen: MemoryScope, stop: () => void): Promise<RealtimeSession | null> {
  if (conversation().running) return null
  const scope = sessionScope(chosen)
  const run = new Run('realtime'), controller = run.controller
  dropAhead(lastBegun()); begin(run)
  inbox.queue.length = 0; run.realtime = controls; run.boundProfiles = castKey()
  set({ running: true, mode: 'realtime', scope, sessionId: '', lines: [], paused: false, thinking: null, speaking: null, waiting: null, waitingAudience: false, waitingInput: true,
    turns: 0, generations: 0, generationLimit: chatLimits(store.get().talk).generations, until, error: '', ended: '', needModel: false }, false)
  try {
    await openHistory(conversation().scope, controller.signal)
    await chatHistory.save(conversation().lines)
    const context = await chatHistory.context(character.profileId ?? character.id, conversation().lines, conversation().scope)
    controller.signal.throwIfAborted()
    const used = conversationContext(context.lines, context.summary)
    const memoryIds = memoryIdsOf(context)
    const mine = () => run.realtime === controls && current() === run
    const call: RealtimeSession = {
      context: { earlier: used.earlier, history: used.history, memories: context.memories.map(({ id, text }) => ({ id, text })) },
      line(line, complete = true) {
        if (!mine()) return
        const exists = conversation().lines.some((value) => value.id === line.id)
        if (!line.human) line = { ...line, memoryIds, memoryRevision: context.revision }
        const lines = exists ? conversation().lines.map((value) => value.id === line.id ? line : value) : [...conversation().lines, line]
        set({ lines, ...(conversation().speaking?.id === line.id ? { speaking: line } : {}) }, complete)
        if (complete && line.human && !line.audience && !exists) void rememberLine(line, character).catch((error: unknown) => {
          if (mine()) set({ storageError: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) })
        })
      },
      state(thinking, speaking) {
        if (!mine()) return
        if (speaking && conversation().speaking?.id !== speaking.id) looks(character, speaking)
        else if (thinking) actors.get(thinking)?.setPhase('thinking')
        else if (!speaking) actors.get(character.id)?.setPhase('waiting')
        set({ thinking, speaking, waitingInput: !thinking && !speaking })
      },
      speech(speaking, final, cancelled = false) {
        if (mine()) tellSpeech({ character: character.id, scope, speaking, final, cancelled })
      },
      turn() {
        if (!mine()) return false
        if (spent(conversation())) { call.end('', tr('已达到本次生成次数上限')); return false }
        set({ turns: conversation().turns + 1, ...counted(conversation()) }); return true
      },
      end(error = '', reason = '') { if (mine()) { stop(); set({ error, ended: reason }) } },
    }
    const sessionId = conversation().sessionId
    run.offRealtimeHistory = memory.subscribe(() => {
      void Promise.all([memoryUnchanged(memory, character.profileId ?? character.id, scope, context.revision), memory.session(sessionId)]).then(([unchanged, saved]) => {
        if (!mine()) return
        if (!saved) call.end('', tr('对话记录已删除，请重新开始实时通话'))
        else if (!unchanged) call.end('', tr('记忆已更新，请重新开始实时通话'))
      }, (error: unknown) => { if (mine()) call.end(tr('对话未保存：{0}', error instanceof Error ? error.message : String(error))) })
    })
    return call
  } catch (error) {
    if (current() === run) {
      set({ error: tr('对话未保存：{0}', error instanceof Error ? error.message : String(error)) })
      stop()
    }
    throw error
  }
}
