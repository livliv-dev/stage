import { tr } from './i18n'
// The 开播 card, on arriving from the site's 开播 button (entry.ts, &as=face), where the first-visit checklist goes:
// three steps that tick themselves (the camera, the front, OBS), the button for the output window, and the keys.
import { useEffect, useState } from 'react'
import { Check, MonitorPlay, X } from 'lucide-react'
import { actors, onActors } from './actors'
import { openOutput, outputOpen } from './link'
import { participants, useScene } from './scene'
import { desktop } from './desktopBridge'

export function GoLiveGuide({ id, onClose }: { id: string; onClose: () => void }) {
  const { scene } = useScene()
  const [, redraw] = useState(0)
  useEffect(() => { const off = onActors(() => redraw((n) => n + 1)), timer = setInterval(() => redraw((n) => n + 1), 500); return () => { off(); clearInterval(timer) } }, [])
  const c = participants(scene).find((i) => i.id === id), a = c && actors.get(c.id)
  if (!c) return null
  const phase = a?.inputPhase, track = a?.tracking, out = outputOpen(), clear = scene.background === 'transparent'
  const open = () => { if (!outputOpen()) openOutput(scene.width, scene.height, clear) }
  const steps = [
    { ok: phase === 'on', title: tr('允许使用摄像头'), run: () => { if (phase === 'error') a?.retryInput() },
      how: phase === 'error' ? a!.error : phase === 'on' ? track?.face ? tr('面捕已连接') : tr('未识别到面部') : tr('正在连接摄像头…') },
    { ok: !!a?.calibratedAt, title: tr('校准正面'), how: tr('看向镜头，按空格'), run: () => { if (a?.canCalibrate) a.calibrate() } },
    { ok: out, title: tr('输出到 OBS'), how: tr('在 OBS 添加「窗口采集」，选择「LivLiv Stage · 输出」。') + (clear ? '' : tr('给它加「色度键」滤镜，去掉绿色。')), run: open },
  ]
  return <div className="coach golive" role="region" aria-label={tr('开播')}>
    <header><span>{tr('开播')} <small className="num">{steps.filter((s) => s.ok).length}/3</small></span><span><button className="icon" aria-label={tr("关闭")} onClick={onClose}><X size={13} /></button></span></header>
    <ol>{steps.map((s) => <li key={s.title} className={s.ok ? 'ok' : ''}><i>{s.ok && <Check size={12} />}</i><button className="coach-next" onClick={s.run}><b>{s.title}</b><span className={s.title === steps[0].title && phase === 'error' ? 'error' : undefined}>{s.how}</span></button></li>)}</ol>
    <button className={out ? 'wide' : 'primary wide'} disabled={out} onClick={open}><MonitorPlay size={14} />{out ? tr('输出窗口已打开') : tr('打开输出窗口')}</button>
    <p className="golive-keys">{tr('1–9 表情 · 0 恢复 · Q–T 动作 · B 暂离')}</p>
    {/* a browser stops drawing a window that is wholly covered, and OBS then captures a still picture (the desktop
        app's output window never stops) */}
    {!desktop && <p className="golive-keys">{tr('别让其他窗口完全盖住输出窗口，否则画面会停住。')}</p>}
  </div>
}
