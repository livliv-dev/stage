// Small overlays of the editor: a panel kept while a form it opened is in front, the notice when the stage has more
// characters than it can draw, the keys card, the right-click menu, and the site's age question.
import type { ReactNode } from 'react'
import { CircleAlert, X } from 'lucide-react'
import { store, useScene } from '../scene'
import type { Insets, MenuAt } from '../Stage'
import { ROOM, useCrowded } from '../contexts'
import { tr } from '../i18n'
import { features } from '../core/platform'

/** a panel kept as it was while a settings form it opened is in front (App: back) */
export function Kept({ on, children }: { on: boolean; children: ReactNode }) {
  return <div className="kept-panel" style={{ display: on ? 'contents' : 'none' }}>{children}</div>
}

/** said once over the stage while a character shows nothing because the page has no WebGL context left for it
 *  (contexts.ts); gone when there is room again: characters removed or hidden */
export function CrowdNotice({ insets }: { insets: Insets }) {
  const crowded = useCrowded(), { scene } = useScene()
  if (!scene.items.some((i) => i.kind === 'character' && !i.hidden && crowded.has(i.id))) return null
  return (
    <div className="crowd-notice" role="status" style={{ left: insets.left + 16, right: insets.right + 16 }}>
      <p><CircleAlert size={15} />{features.shell
        ? tr("舞台上的角色太多，显示不过来。桌面版大约 {0} 个能正常显示。请隐藏或移除一些角色。", ROOM)
        : tr("舞台上的角色太多，这个浏览器显示不过来。浏览器里大约 {0} 个能正常显示，桌面版可以更多。请隐藏或移除一些角色。", ROOM)}</p>
    </div>
  )
}

const KEYS: [string, string][] = [
  ['空格', '开始 / 暂停 AI；没有 AI 角色时校准正面'], ['1–9 / 0', '表情 / 恢复'], ['Q W E R T', '点头、摇头、歪头、跳一下、害羞'], ['B', '暂离 / 回来'], ['⌘Z / ⇧⌘Z', '撤销 / 重做'], ['⌘D', '复制选中的'], ['Delete', '删除选中的'],
  ['方向键', '移动 1 像素（按住 ⇧ 移动 10）'], ['拖动时按住 Alt', '不吸附'], ['⇧1 / ⇧0', '适应窗口 / 100%'], ['⌘\\', '收起 / 展开右边的面板'],
  ['按住 `', '按住说话，松开说出去'], ['双击文字', '直接改字'], ['右键', '更多操作'], ['Esc', '取消选中 / 回到编辑'], ['?', '这张表'],
]

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="card popover help" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title">{tr("快捷键")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <dl>{KEYS.map(([k, v]) => <div key={k}><dt><kbd>{tr(k)}</kbd></dt><dd>{tr(v)}</dd></div>)}</dl>
    </div>
  )
}

export function ContextMenu({ at, close }: { at: MenuAt; close: () => void }) {
  const it = store.get().items.find((i) => i.id === at.id)
  if (!it) return null
  const run = (f: () => void) => () => { f(); close() }
  const items: [string, () => void, string?][] = [
    ...(!(it.kind === 'character' && it.remote) ? [[tr("复制"), () => store.duplicate(it.id), '⌘D']] as [string, () => void, string][] : []),
    [tr("往前一层"), () => store.restack(it.id, 1)], [tr("往后一层"), () => store.restack(it.id, -1)],
    [tr("放到最前"), () => store.restack(it.id, 'front')], [tr("放到最后"), () => store.restack(it.id, 'back')],
    [tr("隐藏"), () => store.patch(it.id, { hidden: true })],
  ]
  return (
    <div className="card ctx" style={{ left: Math.min(at.x, innerWidth - 200), top: Math.min(at.y, innerHeight - 280) }} onPointerDown={(e) => e.stopPropagation()}>
      {items.map(([l, f, k]) => <button key={l} className="item" onClick={run(f)}>{l}{k && <kbd>{k}</kbd>}</button>)}
      <span className="sep" />
      <button className="item danger" onClick={run(() => store.remove(it.id))}>{it.kind === 'character' && it.remote ? tr("隐藏") : tr("删除")}<kbd>Delete</kbd></button>
    </div>
  )
}

/** the site's age question, asked once before LivLiv's points AI speaks (chat's rule: 18 and over) */
export function AgeDialog({ onAnswer }: { onAnswer: (adult: boolean) => void }) {
  return <>
    <div className="scrim" />
    <div className="card popover settings age-check" role="dialog" aria-modal="true" aria-labelledby="age-title" onPointerDown={(e) => e.stopPropagation()}>
      <header><span className="title" id="age-title">{tr("确认年龄")}</span></header>
      <p className="hint">{tr("用 AI 让角色说话前，请确认你已年满 18 岁。")}</p>
      <div className="row end"><button onClick={() => onAnswer(false)}>{tr("未满 18 岁")}</button><button className="primary" autoFocus onClick={() => onAnswer(true)}>{tr("已满 18 岁")}</button></div>
    </div>
  </>
}
