import { tr } from './i18n'
import { useEffect, useState } from 'react'
import { desktop, shortcutName, type Shortcut } from './desktop'
export function HotkeysPanel() {
  const [bindings, setBindings] = useState<Shortcut[]>([]), [error, setError] = useState('')
  // global hotkeys start off: they take keys away from every other program while on
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    if (!desktop) return
    void desktop.hotkeys.list().then(setBindings, (e: Error) => setError(e.message))
    void (desktop.hotkeys.enabled?.() ?? Promise.resolve(true)).then(setOn, () => setOn(true))
  }, [])
  const save = async () => {
    try { setBindings(await desktop!.hotkeys.set(bindings.map(({ accelerator, do: cmd }) => ({ accelerator, do: cmd })))); setError('') }
    catch (e) { setError((e as Error).message) }
  }
  const toggle = async (next: boolean) => {
    if (!desktop?.hotkeys.enable) return
    try { setBindings(await desktop.hotkeys.enable(next)); setOn(next); setError('') }
    catch (e) { setError((e as Error).message) }
  }
  if (!desktop) return <p className="hint">{tr("全局热键在桌面版中可用，切到游戏窗口后仍能控制角色。网页中的编辑快捷键见「快捷键」。")}</p>
  return <div className="hotkey-settings">
    {desktop.hotkeys.enable && <label className="switch spaced"><span>{tr("启用全局热键")}</span><input type="checkbox" checked={!!on} disabled={on === null} onChange={(e) => void toggle(e.target.checked)} /><i /></label>}
    <p className="hint">{tr("表情和校准作用于选中的角色；未选中时，优先控制「我来演」的角色。语音输入按一次开始，再按一次结束。")}</p>
    {bindings.map((binding, index) => <label className="hotkey-row" key={binding.do}><span>{shortcutName(binding.do)}</span>
      <input aria-label={shortcutName(binding.do) + tr("热键")} value={binding.accelerator} onChange={(e) => setBindings((all) => all.map((b, i) => i === index ? { ...b, accelerator: e.target.value } : b))} />
      {on && !binding.ok && <small className="error">{tr(binding.why ?? '')}</small>}
    </label>)}
    {error && <p className="error">{tr(error)}</p>}
    <div className="row end"><button onClick={() => void desktop!.hotkeys.reset().then(setBindings, (e: Error) => setError(e.message))}>{tr("恢复默认")}</button><button className="primary" onClick={() => void save()}>{tr("保存热键")}</button></div>
  </div>
}
