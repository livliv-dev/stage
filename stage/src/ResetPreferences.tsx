import { useEffect, useId, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { desktop } from './desktopBridge'
import { features } from './core/platform'
import { resetInputs } from './devices'
import { resetLocale, tr } from './i18n'
import { resetMixer } from './mixer'
import { resetQuality } from './quality'
import { clearGroups, RESET_GROUPS, type ResetGroup } from './core/prefs'

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
  const ref = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), title = useId(), description = useId()
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  // the groups to reset (all, unless you untick some), and the global hotkeys on the desktop
  const [chosen, setChosen] = useState<Set<ResetGroup>>(() => new Set(RESET_GROUPS.map((g) => g.id)))
  const [hotkeys, setHotkeys] = useState(features.globalHotkeys)
  const toggle = (id: ResetGroup) => setChosen((now) => { const next = new Set(now); if (next.has(id)) next.delete(id); else next.add(id); return next })
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    // 取消 first, not the first of the groups
    cancel.current?.focus()
    return () => dialog.close()
  }, [])
  const restore = async () => {
    setBusy(true); setError('')
    try {
      if (desktop && hotkeys) {
        await desktop.hotkeys.enable?.(false)
        await desktop.hotkeys.reset()
      }
      // the saved values first (core/prefs.ts), then what each part holds now
      clearGroups([...chosen])
      const now: Record<ResetGroup, () => void> = { inputs: resetInputs, mixer: resetMixer, quality: resetQuality, layout: onResetLayout, locale: resetLocale }
      for (const group of RESET_GROUPS) if (chosen.has(group.id)) now[group.id]()
      onDone()
    } catch (cause) { setError(tr('部分偏好未恢复，请重试：{0}', (cause as Error).message)) }
    finally { setBusy(false) }
  }
  return <dialog ref={ref} className="card reset-confirm" aria-labelledby={title} aria-describedby={description} onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <div className="reset-confirm-content">
      <h2 id={title}>{tr('恢复默认偏好？')}</h2>
      <div id={description}>
        <p>{tr('选择要恢复默认的项：')}</p>
        <div className="reset-groups">
          {RESET_GROUPS.map((group) => <label key={group.id} className="switch"><span>{tr(group.label)}</span><input type="checkbox" checked={chosen.has(group.id)} disabled={busy} onChange={() => toggle(group.id)} /><i /></label>)}
          {features.globalHotkeys && <label className="switch"><span>{tr('全局热键（恢复默认并关闭）')}</span><input type="checkbox" checked={hotkeys} disabled={busy} onChange={(e) => setHotkeys(e.target.checked)} /><i /></label>}
        </div>
        <p className="hint">{tr('保留模型配置、密钥、登录状态、场景、聊天记录和记忆。')}</p>
      </div>
      {error && <p className="hint error" role="alert">{error}</p>}
      <div className="row end"><button ref={cancel} autoFocus disabled={busy} onClick={onClose}>{tr('取消')}</button><button className="primary" disabled={busy || (!chosen.size && !hotkeys)} onClick={() => void restore()}>{tr(busy ? '正在恢复…' : '确认恢复')}</button></div>
    </div>
  </dialog>
}
