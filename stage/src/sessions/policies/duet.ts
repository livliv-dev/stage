import { tr } from '../../i18n'
// The characters among themselves (角色之间聊, the console's 不参与): who speaks when follows the stage's talk order
// (scene.ts Talk: free, round, host), and your characters wait for your line on their turn. A line of yours with
// nothing running (once) is answered once: by the character named, else one picked freely, and once more for what you
// said meanwhile. The demo goes by its script, and ends with it; a paid model stops after `limit` AI lines.
import { actors } from '../../actors'
import { loadBrainConfig } from '../../brain'
import { chatHistory } from '../../chatHistory'
import { demoPause, demoSpeaker } from '../../demo'
import { participants, store } from '../../scene'
import type { MemoryScope } from '../../memory'
import { chance } from '../chance'
import { clock } from '../clock'
import { castKey, NeedModel, profiles, session, voices } from '../context'
import { inbox, viewersWaiting } from '../inbox'
import { consumeInput, sayYours, waitFor } from '../input'
import { isCutting, looks } from '../performance'
import { openRecord, sessionScope } from '../record'
import { runSession, type Policy } from '../runner'
import { aheadStill, dropAhead, freePick, nextSpeaker, talkOn, turnLimit } from '../speak'
import { conversation, set } from '../state'
import { sleep } from '../wake'

/** starts the characters talking (once: a line of yours answered once) */
export function startDuet(once: boolean) {
  session.ctrl?.abort()
  dropAhead()
  const c = new AbortController(); session.ctrl = c
  session.single = once; session.liveOptions = null; session.boundProfiles = castKey()
  // A public conversation consumes viewer inputs and opens only the public history.
  const audience = viewersWaiting()
  const scope: MemoryScope = audience ? 'public' : sessionScope()
  const switchScope = scope !== conversation().scope && loadBrainConfig().kind !== 'demo'
  set({ running: true, mode: 'conversation', waitingAudience: false, until: 0, ended: '', paused: false, error: '',
    ...(switchScope ? { scope, sessionId: '', lines: [], speaking: null } : {}),
  }, !switchScope)
  return runSession(duet(c, scope, once), c)
}

function duet(c: AbortController, scope: MemoryScope, once: boolean): Policy {
  return {
    async open(signal) {
      if (profiles().length) await openRecord(scope, signal)
      else { chatHistory.reset(); set({ sessionId: '', scope }) }
      // characters still loading (a template just placed, its players not made yet) are waited for, a little
      const loading = () => participants(store.get()).some((x) => x.lines === 'ai' && !['ready', 'error'].includes(actors.get(x.id)?.status ?? ''))
      for (let i = 0; i < 60 && loading(); i++) await sleep(250, signal)
    },
    async step(signal) {
      while (inbox.queue.length) await consumeInput(signal)
      if (once) {
        // you said something on your own: one AI answer (the one named, else picked freely), and one more to what you
        // said while it answered
        for (;;) {
          const ai = voices().filter((x) => x.lines === 'ai'), last = conversation().lines.at(-1)
          const inDemo = loadBrainConfig().kind === 'demo' ? demoSpeaker(voices(), conversation().lines) : null
          if (inDemo === undefined) break  // the demo said all its lines
          const me = inDemo ?? ai.find((x) => x.id === session.forced) ?? ai.find((x) => x.name === last?.to) ?? freePick(ai)
          session.forced = null
          if (!me) break
          await talkOn(me, signal)
          if (!inbox.queue.length) break
          while (inbox.queue.length) await consumeInput(signal)
        }
        return false
      }
      // the demo goes by its script, and ends with it
      const demo = loadBrainConfig().kind === 'demo' ? demoSpeaker(voices(), conversation().lines) : null
      if (demo === undefined) return false
      const who = demo ?? aheadStill()?.who ?? nextSpeaker()
      if (!who) throw new Error(tr("舞台上还没有会说话的角色：给角色选「AI」或「我来说」"))
      if (who.lines === 'me') {
        const l = await waitFor(who, signal)
        if (l) await sayYours(l, signal)
        else { session.lastTurn = who.id; session.skipped = who.id }
      } else await talkOn(who, signal)
      signal.throwIfAborted()  // stopped during the line: it ends quietly, and the next one mustn't start
      await new Promise<void>((r, j) => {  // the pause between lines: 下一句 ends it now
        const scripted = loadBrainConfig().kind === 'demo' ? demoPause(voices(), conversation().lines) : null
        const t = clock.timeout(r, scripted !== null ? scripted * 1000 : conversation().gap * 1000 * (isCutting() ? 0.1 : 0.7 + chance() * 0.6))
        session.hurry = () => { clock.clear(t); r() }
        signal.addEventListener('abort', () => { clock.clear(t); j(signal.reason) }, { once: true })
      })
      session.hurry = null
      while (conversation().paused) await sleep(200, signal)
      return conversation().turns < turnLimit()
    },
    failed(e) {
      if (e instanceof NeedModel) set({ needModel: true, modelIntent: 'conversation' })
      else if (!c.signal.aborted) set({ error: (e as Error).message })
    },
    close() {
      if (session.ctrl === c) { session.ctrl = null; set({ running: false, paused: false, thinking: null, waiting: null }); looks(null, null) }
    },
  }
}
