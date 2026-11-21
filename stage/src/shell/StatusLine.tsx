// The console's status line: small tags for where things stand, each one a way to change it. 模型, 声音, 直播间,
// 引擎 (AIRI or the standard one, and why), and 公开记忆 / 私聊, still the one place to choose private. Running, the
// session's own state joins them.
import { tr } from '../i18n'
import { brainReady, useBrainConfig } from '../brain'
import { chooseEngine, engineReason } from '../brains/select'
import { features } from '../core/platform'
import { talk, useConversation } from '../conversation'
import { useChat } from '../danmaku'
import { participants, useScene } from '../scene'
import { useActiveSpeech, voiceRoute } from '../voiceApi'
import { optionsOf } from './goals'
import { planNow } from './start'
import type { Check } from './checks'

export function StatusLine({ partner, checks, onModel, onVoice, onAudience, onChecklist }: { partner: boolean; checks: readonly Check[] | null; onModel: () => void; onVoice: () => void; onAudience: () => void; onChecklist?: () => void }) {
  const { scene } = useScene(), brain = useBrainConfig(), speech = useActiveSpeech(), conv = useConversation(), chat = useChat()
  const ai = participants(scene).filter((c) => c.lines === 'ai' && !c.remote)
  const options = optionsOf(scene.talk, partner), plan = planNow(scene.talk.goal ?? 'chat', options)
  const model = brain.kind === 'demo' ? tr('演示') : !brainReady(brain) ? null : brain.kind === 'livliv' ? 'LivLiv' : brain.model
  const silent = ai.filter((c) => !c.muted && voiceRoute(c, speech) === 'none')
  const session = conv.running ? conv.mode : 'blocked' in plan ? null : plan.session
  // running: the engine it started on (AIRI, or the standard one for the reason the rule gives); else the one it would
  const engine = session === 'chat' || session === 'live'
    ? conv.running && conv.engine === 'airi' ? { engine: 'airi' as const, reason: 'airi' as const } : chooseEngine(brain, ai, { kind: session, voice: ai[0] && voiceRoute(ai[0], speech) }, features)
    : null
  const scope = conv.running ? conv.scope : conv.output ? 'public' : conv.chatScope
  const ready = checks ? checks.filter((c) => c.state !== 'optional' && c.state !== 'off') : []
  return <div className="status-line" role="group" aria-label={tr('状态')}>
    <button className={`st-tag${model ? ' ok' : ' need'}`} onClick={onModel}>{tr('模型')}<b>{model ?? tr('需要设置')}</b></button>
    {ai.length > 0 && <button className={`st-tag${silent.length ? ' warn' : ' ok'}`} onClick={onVoice}>{tr('声音')}<b>{silent.length ? tr('只有字幕') : '✓'}</b></button>}
    {options.audience === 'live' && <button className="st-tag" onClick={onAudience}>{tr('直播间')}<b>{chat.status === 'on' ? `Twitch ${chat.channel}` : tr('不接弹幕')}</b></button>}
    {ai.length > 0 && (session === 'conversation'
      ? <span className="st-tag">{tr('引擎')}<b>{tr('标准')}</b></span>
      : engine ? <span className="st-tag" title={engine.engine === 'airi' ? undefined : engineReason(engine, ai.length)}>{tr('引擎')}<b>{engine.engine === 'airi' ? 'AIRI' : tr('标准（{0}）', engineReason(engine, ai.length))}</b></span> : null)}
    {/* the one place to choose private: only with no output on (OBS, a recording, 好友联播, a 直播间) */}
    <button className={`st-tag scope-tag ${scope}`} aria-label={tr('对话范围')} disabled={conv.running || conv.output}
      title={tr(conv.output ? '输出开着（OBS、录制、好友联播或直播间）：只用公开记忆' : conv.running ? '对话范围' : '点一下在私聊和公开记忆之间切换')}
      onClick={() => void talk.setScope(scope === 'private' ? 'public' : 'private')}>{tr(scope === 'public' ? '公开记忆' : '私聊')}</button>
    {conv.running && <span className="st-tag live" role="status">{tr(conv.paused ? '已暂停' : conv.waitingAudience ? '等待弹幕' : conv.waitingInput ? '等你说话' : conv.thinking ? '正在思考' : '回应中')}<b className="num">{conv.mode === 'conversation' ? `${conv.turns}/${conv.limit}` : `${conv.generations}/${conv.generationLimit}`}</b></span>}
    {!conv.running && checks && onChecklist && <button className={`st-tag${ready.every((c) => c.state === 'ok') ? ' ok' : ' need'}`} onClick={onChecklist}>{tr('准备清单')}<b className="num">{ready.filter((c) => c.state === 'ok').length}/{ready.length}</b></button>}
  </div>
}
