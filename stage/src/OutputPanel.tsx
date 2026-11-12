import { tr } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { MonitorPlay, X } from 'lucide-react'
import { closeOutput, openOutput, outputOpen, reopenOutput } from './link'
import { store, useScene } from './scene'
import { onSite } from './host'

export function OutputPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { scene } = useScene()
  const [connected, setConnected] = useState(false)
  const shape = [scene.width, scene.height, scene.background === 'transparent'].join(':'), last = useRef(shape)
  useEffect(() => { const timer = setInterval(() => setConnected(outputOpen()), 500); return () => clearInterval(timer) }, [])
  useEffect(() => {
    if (shape !== last.current && outputOpen()) reopenOutput(scene.width, scene.height, scene.background === 'transparent')
    last.current = shape
  }, [shape, scene.width, scene.height, scene.background])
  if (!open) return null
  return <div className="card popover output-settings" onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr("输出到 OBS")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
    <p className="hint">{scene.width} × {scene.height} {tr("· 输出画面不含编辑工具")}</p>
    <div className="row">{!onSite && <button className={scene.background === 'transparent' ? 'on' : ''} onClick={() => store.set({ background: 'transparent' })}>{tr("透明背景")}</button>}
      <button className={scene.background === '#00b140' ? 'on' : ''} onClick={() => store.set({ background: '#00b140' })}>{tr("绿幕")}</button></div>
    <ol className="output-steps">
      <li>{tr("打开输出窗口。")}</li>
      <li>{tr("在 OBS 添加「窗口采集」，选择「LivLiv Stage · 输出」。")}</li>
      {onSite && scene.background === '#00b140' && <li>{tr("给它加「色度键」滤镜，去掉绿色。")}</li>}
    </ol>
    <details className="output-help"><summary>{tr("声音与背景设置")}</summary>
      <p className="hint">{tr("角色声音：采集 LivLiv Stage 的应用音频。你的声音：添加麦克风音频输入。")}</p>
      <p className="hint">{tr("透明采集出现黑底时，切换绿幕并在 OBS 添加色度键滤镜。")}</p>
    </details>
    <button className="primary wide" onClick={() => { if (outputOpen()) closeOutput(); else openOutput(scene.width, scene.height, scene.background === 'transparent'); setConnected(outputOpen()) }}>
      <MonitorPlay size={15} />{connected ? tr("关闭输出窗口") : tr("打开输出窗口")}
    </button>
    {connected && <p className="hint ok">{tr("输出窗口已打开")}</p>}
  </div>
}
