import { tr } from '../../i18n'
// A chat with you (和角色聊天): a character answers what you say and then waits for you; it may speak up once after a
// quiet while (proactiveSeconds), and answers an event (in public) or the character you pick: the one named in your
// last line, else one picked freely. It runs within its time (a turn in hand is cut when it is up) and its
// generations (sessions/budget.ts), on AIRI when the one rule says so (sessions/airiBinding.ts).
import { chance } from '../chance'
import { clock } from '../clock'
import { freePick } from '../order'
import { order, type Run } from '../run'
import type { Env, Policy } from '../runner'

export function chatPolicy(run: Run, env: Env, setup: { until: number; close(): void }): Policy {
  // your line answered next; your last line is what it answers (AIRI); a word of its own after a quiet while, once
  let requested = false, replyToOwner = false, lastReply = 0, nudges = 0
  return {
    kind: 'chat', waitsWhileHeld: true,
    // the record and the cast were opened when it started: a chat begun with nothing said starts with a line
    async open() { requested = !env.state().lines.length; lastReply = clock.now() },
    limits: { until: setup.until, timeUp: 'cut', generations: { again: true } },
    heard(n) { if (n) { requested = true; replyToOwner = true; nudges = 0 } },
    next() {
      run.event = env.state().scope === 'public' && !(run.airi && replyToOwner) ? env.inbox.take(['external', 'game'])?.event ?? null : null
      if (run.event) requested = true
      if (order.forced) requested = true
      if (!requested) {
        env.set({ waitingInput: true })
        env.waitingForYou()
        const seconds = env.talk().proactiveSeconds ?? 0
        const remaining = seconds && nudges < 1 ? lastReply + seconds * 1000 - clock.now() : Infinity
        if (remaining > 0) return { wait: true, ms: Number.isFinite(remaining) ? remaining : undefined }
        requested = true; nudges++
      }
      env.set({ waitingInput: false })
      const pool = env.cast().filter((character) => character.lines === 'ai')
      const lastHuman = [...env.state().lines].reverse().find((line) => line.human && !line.audience)
      const speaker = pool.find((character) => character.id === (run.event?.character ?? order.forced))
        ?? pool.find((character) => lastHuman?.text.includes(character.name)) ?? freePick(pool, env.state().lines, chance)
      order.forced = null
      if (!speaker) throw new Error(tr('舞台上没有已就绪的 AI 角色'))
      return { speak: speaker, viewer: null, replyToOwner }
    },
    after({ said, input }) {
      // cut off by you (you spoke, or skipped): what you say next is answered; cut off otherwise: tried again
      requested = !said && !input
      replyToOwner &&= requested
      run.event = null; lastReply = clock.now()
    },
    ended: { limit: tr('已达到本次生成次数上限'), failure: (error) => ({ error: error instanceof Error ? error.message : String(error) }) },
    close: setup.close,
  }
}
