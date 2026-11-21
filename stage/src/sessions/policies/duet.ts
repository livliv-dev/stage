import { tr } from '../../i18n'
// The characters among themselves (角色之间聊, the console's 不参与): who speaks when follows the stage's talk order
// (scene.ts Talk: free, round, host), and your characters wait for your line on their turn; a pause between lines
// (下一句 ends it), and the conversation ends after its lines. The demo goes by its script, and ends with it. A line of
// yours with nothing running (once) is answered once: by the character named, else one picked freely, and once more
// for what you said meanwhile. A voice that fails keeps its subtitle and the talk goes on.
import type { CharacterItem } from '../../scene'
import { chance } from '../chance'
import { clock } from '../clock'
import { VoiceFailed } from '../errors'
import { freePick, nextSpeaker } from '../order'
import { order, type Run } from '../run'
import type { Env, Policy } from '../runner'
import { sleep } from '../wake'

const voiceFailureGoesOn = (error: unknown) => error instanceof VoiceFailed ? 'on' as const : null
const ended: Policy['ended'] = { needModel: 'conversation', failure: (error) => ({ error: (error as Error).message }) }

/** who speaks next by the stage's talk order; a character picked by hand goes once */
export function speakerByOrder(env: Env): CharacterItem | null {
  const who = nextSpeaker(env.talk(), env.cast(), { lines: env.state().lines, lastTurn: order.lastTurn, skipped: order.skipped, forced: order.forced }, chance)
  order.forced = null
  return who
}

/** 对谈: they talk until the lines are said */
export function duetPolicy(run: Run, env: Env, open: Policy['open']): Policy {
  return {
    kind: 'conversation', open, waitsWhileHeld: false, ended,
    limits: { reached: () => env.state().turns >= env.lineLimit() },
    next() {
      // the demo goes by its script, and ends with it
      const demo = env.demo(), scripted = demo ? demo.speaker() : null
      if (scripted === undefined) return { end: true }
      const who = scripted ?? env.ahead(run) ?? speakerByOrder(env)
      if (!who) throw new Error(tr("舞台上还没有会说话的角色：给角色选「AI」或「我来说」"))
      return who.lines === 'me' ? { yours: who } : { speak: who }
    },
    failedTurn: voiceFailureGoesOn,
    async between(signal) {
      await new Promise<void>((resolve, reject) => {  // the pause between lines: 下一句 ends it now
        const demo = env.demo(), scripted = demo ? demo.pause() : null
        const t = clock.timeout(resolve, scripted !== null ? scripted * 1000 : env.state().gap * 1000 * (env.cutting() ? 0.1 : 0.7 + chance() * 0.6))
        run.hurry = () => { clock.clear(t); resolve() }
        signal.addEventListener('abort', () => { clock.clear(t); reject(signal.reason) }, { once: true })
      })
      run.hurry = null
      while (env.state().paused) await sleep(200, signal)
    },
  }
}

/** a line of yours with nothing running: one AI answer (the one named, else picked freely), and one more to what you
 *  said while it answered */
export function oncePolicy(env: Env, open: Policy['open']): Policy {
  let answered = false
  return {
    kind: 'conversation', open, waitsWhileHeld: false, ended,
    limits: { reached: () => answered && !env.inbox.has(['typed', 'transcript']) },
    next() {
      const ai = env.cast().filter((x) => x.lines === 'ai'), last = env.state().lines.at(-1)
      const demo = env.demo(), scripted = demo ? demo.speaker() : null
      if (scripted === undefined) return { end: true }  // the demo said all its lines
      const me = scripted ?? ai.find((x) => x.id === order.forced) ?? ai.find((x) => x.name === last?.to) ?? freePick(ai, env.state().lines, chance)
      order.forced = null
      return me ? { speak: me } : { end: true }
    },
    after() { answered = true },
    failedTurn: voiceFailureGoesOn,
  }
}
