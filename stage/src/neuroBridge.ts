import { desktop } from './desktopBridge'
import type { ExternalDecision, ExternalSelection } from '../../desktop/src/neuroProtocol'

type Host = {
  event(input: { id: string; source: string; message: string; reply: 'never' | 'maybe' | 'always'; character?: string }): boolean
  dialogue(input: { id: string; started: boolean; character?: string }): void
  decide(request: ExternalDecision, signal: AbortSignal): Promise<ExternalSelection | null>
  subscribeSpeech?(listener: (event: { character: string; scope: 'private' | 'public'; speaking: boolean; final?: boolean; cancelled?: boolean }) => void): () => void
}

/** This is the only renderer module translating the optional Neuro desktop protocol into conversation inputs. */
export function connectNeuro(host: Host) {
  const neuro = desktop?.neuro
  if (!neuro) return () => {}
  const pending = new Map<string, { controller: AbortController; connection: string }>()
  const dialogue = new Map<string, string>()
  let character: string | undefined
  let disposed = false
  let stateRevision = 0
  const cancel = (id: string) => { pending.get(id)?.controller.abort(new DOMException('Game request cancelled', 'AbortError')); pending.delete(id) }
  const disconnect = (connection?: string) => {
    for (const [id, value] of pending) if (connection === undefined || value.connection === connection) cancel(id)
    for (const [id, value] of dialogue) if (connection === undefined || value === connection) { host.dialogue({ id, started: false }); dialogue.delete(id) }
  }
  const offState = neuro.onState((state) => { stateRevision++; character = state.character?.id; if (!state.enabled) disconnect() })
  void neuro.get().then((state) => { if (!disposed && stateRevision === 0) character = state.character?.id }, (error: unknown) => console.error('[Neuro state]', error))
  const offMessage = neuro.onMessage((message) => {
    if (message.kind === 'context') { host.event({ id: message.id, source: message.source, message: message.message, reply: message.reply, character: message.character }); return }
    if (message.kind === 'dialogue') {
      if (message.started) dialogue.set(message.id, message.connection); else dialogue.delete(message.id)
      host.dialogue({ id: message.id, started: message.started, character: message.character }); return
    }
    if (message.kind === 'disconnect') { disconnect(message.connection); return }
    if (message.kind === 'cancel') { cancel(message.id); return }
    if (Date.now() > message.expires) { neuro.answer(message.id, { ok: false, error: 'Game request expired' }); return }
    const controller = new AbortController()
    pending.set(message.id, { controller, connection: message.connection })
    void host.decide(message.request, controller.signal).then(
      (action) => { if (!controller.signal.aborted && !disposed) neuro.answer(message.id, { ok: true, action }) },
      (error: unknown) => { if (!controller.signal.aborted && !disposed) neuro.answer(message.id, { ok: false, error: (error instanceof Error ? error.message : String(error)).slice(0, 500) || 'Game decision failed' }) },
    ).finally(() => pending.delete(message.id))
  })
  const offSpeech = host.subscribeSpeech?.((event) => {
    // speech_finished is for a part said, never for a line starting
    if (event.scope === 'public' && event.character === character && !event.speaking) void neuro.speech({ character: event.character, isFinal: event.final !== false, ...(event.cancelled ? { cancelled: true } : {}) }).catch((error: unknown) => console.error('[Neuro speech]', error))
  })
  return () => {
    disposed = true; offMessage(); offState(); offSpeech?.(); disconnect()
    void neuro.set({ enabled: false }).catch((error: unknown) => console.error('[Neuro stop]', error))
  }
}
