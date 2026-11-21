// 录制: the top bar's button and its card (what to record, the video being made, saving it).
import { useEffect, useState } from 'react'
import { CircleAlert, ExternalLink, Volume2, VolumeX, X } from 'lucide-react'
import { useBrainConfig } from '../brain'
import { useConversation } from '../conversation'
import { participants, useScene } from '../scene'
import { useAccount } from '../livliv'
import { rec, takeLimit, useRecording } from '../recording'
import { useActiveSpeech, voiceRoute } from '../voiceApi'
import { demoFor } from '../demo'
import { actors } from '../actors'
import { tr } from '../i18n'
import { features } from '../core/platform'

/** minutes and seconds since `from` (performance.now), ticking */
export function Clock({ from }: { from: number }) {
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(t) }, [])
  const s = Math.max(0, Math.floor((performance.now() - from) / 1000))
  return <span className="num">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`

/** 录制: idle it opens the card; while recording it shows the time and stops; then how far the video is */
export function RecordButton({ on, toggle }: { on: boolean; toggle: () => void }) {
  const r = useRecording()
  if (r.phase === 'recording') {
    return <><button className="rec live" title={tr("停止录制，做成视频")} onClick={() => { void rec.stop(); if (!on) toggle() }}><i className="rec-dot" /><Clock from={r.started} />{tr("停止")}</button>{r.error && <button className="icon danger" aria-label={tr("检查录音声音")} title={r.error} onClick={toggle}><CircleAlert size={16} /></button>}</>
  }
  return (
    <button className={`rec${on ? ' on' : ''}`} title={tr("把整张舞台录成视频")} onClick={toggle}>
      <i className="rec-dot" />
      {r.phase === 'making' ? <span className="num">{tr("做视频")} {Math.round(r.progress * 100)}%</span> : r.phase === 'done' ? tr("视频好了") : tr("录制")}
    </button>
  )
}

/** the finished video, to watch before saving it */
function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u) }, [file])
  return url ? <video className="made-video" src={url} controls playsInline /> : null
}

/** what to record, then the video being made, then saving it */
export function RecordCard({ onClose, onVoices }: { onClose: () => void; onVoices: () => void }) {
  const r = useRecording(), { scene } = useScene(), conv = useConversation(), speech = useActiveSpeech(), brain = useBrainConfig()
  useAccount()  // what can be heard changes with the account (and, on livliv.ai, how long a take may run)
  const most = takeLimit()
  const [mic, setMic] = useState(false), [withTalk, setWithTalk] = useState(true)
  const voiced = participants(scene).filter((c) => c.lines === 'ai' || (c.lines === 'me' && c.readAloud))
  // the demo's lines are recordings, whatever the voice settings say
  const demo = brain.kind === 'demo' && !!demoFor(participants(scene))
  const heard = (c: (typeof voiced)[number]) => { const v = voiceRoute(c, speech); return !!actors.get(c.id)?.liveAudio || demo || v === 'api' || v === 'livliv' }
  // no character's voice can be recorded (system speech can't): the button says so, the chips lead to the voices
  const silent = voiced.length > 0 && !voiced.some(heard)
  return (
    <div className="card popover record" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("录制")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      {(r.phase === 'recording' || r.phase === 'making' || r.phase === 'done') && r.error && <p className="error" role="alert">{r.error}</p>}
      {(r.phase === 'idle' || r.phase === 'starting') && <>
        <div className="chips">
          <span className="chip num">{scene.width} × {scene.height}</span><span className="chip">30 fps</span><span className="chip">MP4</span>
          {scene.background === 'transparent' && <span className="chip warn" title={tr("视频没有透明通道：透明背景录成绿幕")}>{tr("绿幕")}</span>}
          {features.host === 'site' && <span className="chip num">{most.seconds < 60 ? tr("最长 {0} 秒", most.seconds) : tr("最长 {0} 分钟", Math.round(most.seconds / 60))}</span>}
          {features.host === 'site' && most.mark && <span className="chip">{tr("LivLiv 标记")}</span>}
        </div>
        {features.host === 'site' && most.mark && <p className="hint"><a href="/pricing" target="_blank" rel="noopener">{tr("会员录 5 分钟，没有标记")}<ExternalLink size={11} /></a></p>}
        {voiced.length > 0 && <div className="chips voices">
          {voiced.map((c) => heard(c)
            ? <span key={c.id} className="chip"><Volume2 size={12} />{c.name}</span>
            : <button key={c.id} className="chip off" title={voiceRoute(c, speech) === 'none' ? tr("没有声音，只出字幕：设置里接上语音") : tr("系统朗读录不进声音：设置里接上语音")} onClick={onVoices}><VolumeX size={12} />{c.name}</button>)}
        </div>}
        {voiced.some((c) => c.lines === 'ai') && <label className="switch"><span>{tr("同时开始对话")}</span><input type="checkbox" checked={withTalk && !conv.running} disabled={conv.running} onChange={(e) => setWithTalk(e.target.checked)} /><i /></label>}
        <label className="switch" title={tr("建议戴耳机，不然角色的声音会被录两遍")}><span>{tr("录进麦克风")}</span><input type="checkbox" checked={mic} onChange={(e) => setMic(e.target.checked)} /><i /></label>
        <div className="row end">
          <button className="primary" disabled={r.phase === 'starting'} onClick={() => { void rec.start({ mic, talk: withTalk && !conv.running && voiced.some((c) => c.lines === 'ai') }); onClose() }}><i className="rec-dot" />{silent ? tr("录无声视频") : tr("开始录制")}</button>
        </div>
      </>}
      {r.phase === 'recording' && <div className="row end recording">
        <span className="big-clock"><i className="rec-dot" /><Clock from={r.started} /></span>
        <button className="rec live" onClick={() => void rec.stop()}>{tr("停止")}</button>
      </div>}
      {r.phase === 'making' && <>
        <div className="progress"><i style={{ width: `${Math.round(r.progress * 100)}%` }} /></div>
        <div className="row end"><span className="hint num">{tr("做视频")} {Math.round(r.progress * 100)}%</span><button onClick={rec.cancel}>{tr("取消")}</button></div>
      </>}
      {r.phase === 'done' && r.made && <>
        <Preview file={r.made.file} />
        <p className="made"><b>{r.made.file.name}</b><span className="num">{Math.floor(r.made.seconds / 60)}:{String(Math.round(r.made.seconds % 60)).padStart(2, '0')} · {mb(r.made.file.size)}</span></p>
        {(r.made.missing.sounds > 0 || r.made.missing.pictures > 0) && <div className="chips">
          {r.made.missing.sounds > 0 && <span className="chip warn">{tr("缺了 {0} 段声音", r.made.missing.sounds)}</span>}
          {r.made.missing.pictures > 0 && <span className="chip warn">{tr("缺了 {0} 张图片", r.made.missing.pictures)}</span>}
        </div>}
        <div className="row end">
          <button onClick={rec.reset}>{tr("再录一段")}</button>
          <button className="primary" onClick={rec.save}>{tr("存到电脑")}</button>
        </div>
      </>}
      {r.phase === 'error' && <>
        <p className="hint error">{tr(r.error ?? '')}</p>
        <div className="row end"><button onClick={rec.reset}>{tr("知道了")}</button>{r.retry && <button className="primary" onClick={() => void rec.retry()}>{tr("重新做视频")}</button>}</div>
      </>}
    </div>
  )
}
