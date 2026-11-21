import { useEffect, useId, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { desktop } from './desktopBridge'
import { features } from './core/platform'
import { resetInputs } from './devices'
import { resetLocale, tr } from './i18n'
import { resetMixer } from './mixer'
import { resetQuality } from './quality'

export function ResetPreferences({ onResetLayout }: { onResetLayout: () => void }) {
  const [confirm, setConfirm] = useState(false), [restored, setRestored] = useState(false)
  return <section className="reset-preferences">
    <h3>{tr('恢复应用偏好')}</h3>
    <p className="hint">{tr('保留模型配置、密钥、登录状态、场景、聊天记录和记忆。')}</p>
    <button onClick={() => { setRestored(false); setConfirm(true) }}><RotateCcw size={14} />{tr('恢复默认')}</button>
    {restored && <p className="hint ok" role="status">{tr('已恢复默认偏好')}</p>}
    {confirm && <ResetDialog onResetLayout={onResetLayout} onClose={() => setConfirm(false)} onDone={() => { setConfirm(false); setRestored(true) }} />}
  </section>
}

function ResetDialog({ onResetLayout, onClose, onDone }: { onResetLayout: () => void; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), title = useId(), description = useId()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  const restore = async () => {
    setBusy(true); setError('')
    try {
      if (desktop) {
        await desktop.hotkeys.enable?.(false)
        await desktop.hotkeys.reset()
      }
      resetInputs(); resetMixer(); resetQuality(); onResetLayout(); resetLocale()
      onDone()
    } catch (cause) { setError(tr('部分偏好未恢复，请重试：{0}', (cause as Error).message)) }
    finally { setBusy(false) }
  }
  return <dialog ref={ref} className="card reset-confirm" aria-labelledby={title} aria-describedby={description} onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <div className="reset-confirm-content">
      <h2 id={title}>{tr('恢复默认偏好？')}</h2>
      <div id={description}>
        <p>{tr('将重置界面语言、画面质量、设备选择、音量和面板布局。')}</p>
        {features.globalHotkeys && <p>{tr('全局热键将恢复默认并关闭。')}</p>}
        <p className="hint">{tr('保留模型配置、密钥、登录状态、场景、聊天记录和记忆。')}</p>
      </div>
      {error && <p className="hint error" role="alert">{error}</p>}
      <div className="row end"><button autoFocus disabled={busy} onClick={onClose}>{tr('取消')}</button><button className="primary" disabled={busy} onClick={() => void restore()}>{tr(busy ? '正在恢复…' : '确认恢复')}</button></div>
    </div>
  </dialog>
}
