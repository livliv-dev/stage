// A goal's 准备清单 from what Stage knows now (shell/checks.ts decides the items).
import { useEffect, useState } from 'react'
import { actors } from '../actors'
import { brainReady, useBrainConfig } from '../brain'
import { chooseEngine, engineReason } from '../brains/select'
import { features } from '../core/platform'
import { useChat } from '../danmaku'
import { useInputs } from '../devices'
import { useAccount } from '../livliv'
import { currentMotion } from '../networkTracking'
import { loadRealtime, realtimeCredentials } from '../realtime'
import { participants, useScene, type Goal } from '../scene'
import { asrReady, useActiveSpeech, voiceRoute } from '../voiceApi'
import { checklist, type Check, type CheckContext } from './checks'

export function useChecks(goal: Goal, partner: boolean): Check[] {
  const { scene } = useScene(), brain = useBrainConfig(), speech = useActiveSpeech(), account = useAccount(), chat = useChat(), devices = useInputs()
  const [, redraw] = useState(0)
  useEffect(() => { const timer = setInterval(() => redraw((n) => n + 1), 700); return () => clearInterval(timer) }, [])
  const cast = participants(scene).filter((c) => !c.remote), ai = cast.filter((c) => c.lines === 'ai'), me = cast.find((c) => c.lines === 'me')
  const actor = me && actors.get(me.id), realtime = realtimeCredentials(loadRealtime())
  const engine = chooseEngine(brain, ai, { kind: 'live', needsAiri: true, voice: ai[0] && voiceRoute(ai[0], speech) }, features)
  const context: CheckContext = {
    model: brain.kind === 'demo' || !brainReady(brain) ? null : brain.kind === 'livliv' ? 'LivLiv' : brain.model,
    ai: ai.map((c) => ({ name: c.name, voice: voiceRoute(c, speech), muted: c.muted })),
    face: me ? { name: me.name, tracking: actor?.inputPhase === 'on' && !!actor.tracking?.face, calibrated: !!actor && actor.calibratedAt > 0 } : null,
    partner, hear: asrReady(speech) || account.status === 'in', microphone: devices.settings.microphone !== '',
    phone: { here: features.tracking, on: currentMotion().active },
    twitch: { status: chat.status, channel: chat.channel },
    game: { here: features.games, engine, reason: engineReason(engine, ai.length) },
    realtime: { ready: !!(realtime.key && realtime.base && realtime.model), provider: realtime.provider === 'openai' ? 'OpenAI' : '阿里云百炼' },
  }
  return checklist(goal, context)
}
