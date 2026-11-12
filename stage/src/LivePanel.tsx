import { tr } from './i18n'
import { useEffect, useState } from 'react'
import { Check, Pause, Play, Settings, Square, X } from 'lucide-react'
import { actors, onActors } from './actors'
import { brainReady, useBrainConfig } from './brain'
import { talk, useConversation } from './conversation'
import { participants as characters, useScene } from './scene'
import { voiceRoute, useActiveSpeech } from './voiceApi'
import { useAccount } from './livliv'
import { cancel as cancelPtt } from './ptt'
import { AudiencePanel } from './AudiencePanel'

export function LivePanel({ onClose, onSettings }: { onClose: () => void; onSettings: () => void }) {
  const { scene } = useScene(), state = useConversation(), model = useBrainConfig(), speech = useActiveSpeech()
  useAccount()
  const [, redraw] = useState(0)
  useEffect(() => onActors(() => redraw((n) => n + 1)), [])
  useEffect(() => { const timer = setInterval(() => redraw((n) => n + 1), 1000); return () => clearInterval(timer) }, [])
  const [minutes, setMinutes] = useState(30), [maxInput, setMax] = useState('100'), [warmupSeconds, setWarmup] = useState(0), [textOnly, setTextOnly] = useState(false)
  const cast = characters(scene).filter((c) => c.lines === 'ai')
  const modelReady = brainReady(model) && model.kind !== 'demo', ready = cast.length > 0 && cast.every((c) => actors.get(c.id)?.status === 'ready')
  const missingVoice = cast.filter((c) => voiceRoute(c, speech) === 'none')
  const maxGenerations = Number(maxInput), budgetReady = Number.isInteger(maxGenerations) && maxGenerations >= 1 && maxGenerations <= 500
  const canStart = budgetReady && modelReady && ready && (textOnly || !missingVoice.length)
  const active = state.running && state.mode === 'live'
  const remaining = Math.max(0, Math.ceil((state.until - Date.now()) / 60_000))
  const retryIn = Math.ceil((state.retryAt - Date.now()) / 1000)
  const status = state.paused ? tr("已暂停 · 当前句说完后等待") : state.thinking ? tr("正在准备回应…") : state.speaking ? tr("正在回应观众") : retryIn > 0 ? tr("出错了，{0} 秒后重试", retryIn) : tr("等待新弹幕")
  return <div className="card popover live-settings" onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr("AI 直播")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
    <section className="section live-readiness">
      <h3>{tr("开播准备")}</h3>
      <p className={ready ? 'ok' : 'hint'}><Check size={14} />{ready ? cast.length + tr(" 位 AI 角色已就绪") : tr("先添加并载入「AI 来演」的角色")}</p>
      <p className={modelReady ? 'ok' : 'hint'}><Check size={14} />{modelReady && model.kind === 'openai' ? model.model : tr("需要接上 AI 模型")}</p>
      <p className={textOnly || !missingVoice.length ? 'ok' : 'hint'}><Check size={14} />{textOnly ? tr("仅显示字幕") : missingVoice.length ? missingVoice.map((c) => c.name).join('、') + tr(" 还没有声音") : tr("角色声音已设置")}</p>
      <button className="link" onClick={onSettings}><Settings size={14} />{tr("设置模型与声音")}</button>
    </section>
    <AudiencePanel />
    <section className="section">
      <h3>{tr("本次会话")}</h3>
      {active ? <>
        <p className="live-status" role="status">{status}</p>
        <p className="hint num">{tr("已生成")} {state.generations} / {state.generationLimit} {tr("次 · 剩余约")} {remaining} {tr("分钟")}</p>
      </> : <>
        <div className="live-limits"><label className="field"><span>{tr("时长上限")}</span><select aria-label={tr("时长上限")} value={minutes} onChange={(e) => setMinutes(+e.target.value)}>{[1, 15, 30, 60, 120].map((n) => <option key={n} value={n}>{n} {tr("分钟")}</option>)}</select></label>
          <label className="field"><span title={tr("包含失败的生成；模型与声音按所选服务的用量计费")}>{tr("生成次数上限")}</span><input aria-label={tr("生成次数上限")} type="number" min={1} max={500} value={maxInput} aria-invalid={!budgetReady} onChange={(e) => setMax(e.target.value)} /></label></div>
        <label className="field"><span>{tr("没有弹幕时")}</span><select aria-label={tr("没有弹幕时")} value={warmupSeconds} onChange={(e) => setWarmup(+e.target.value)}><option value={0}>{tr("安静等待")}</option><option value={30}>{tr("每 30 秒聊一句")}</option><option value={60}>{tr("每分钟聊一句")}</option><option value={120}>{tr("每 2 分钟聊一句")}</option></select></label>
        <label className="switch"><span>{tr("仅字幕（不生成声音）")}</span><input type="checkbox" checked={textOnly} onChange={(e) => setTextOnly(e.target.checked)} /><i /></label>
      </>}
      {state.mode === 'live' && !state.running && state.ended && <p className="hint" role="status">{tr(state.ended ?? '')}</p>}
      {state.error && <p className="hint error" role="alert">{tr(state.error ?? '')}</p>}
    </section>
    <footer className="live-footer">{active ? <><button onClick={state.paused ? talk.resume : talk.pause}>{state.paused ? <Play size={14} /> : <Pause size={14} />}{state.paused ? tr("继续") : tr("暂停")}</button><button onClick={() => { cancelPtt(); talk.stop() }}><Square size={14} />{tr("停止 AI")}</button></>
      : <button className="primary wide" disabled={!canStart || state.running} onClick={() => talk.startLive({ minutes, maxGenerations, warmupSeconds, textOnly })}><Play size={14} />{tr("开始 AI 直播")}</button>}</footer>
  </div>
}
