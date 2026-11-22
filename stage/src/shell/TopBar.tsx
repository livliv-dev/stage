// The top bar: the stage's name and its menu, edit / show, undo, templates, the mixer, 录制, 输出到 OBS, the project,
// settings and the keys; on a phone, one menu for what doesn't fit.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Menu, CircleHelp, FolderOpen, LayoutTemplate, LoaderCircle, Volume2, MonitorPlay, Pencil, Play, Redo2, Save, Settings, Undo2 } from 'lucide-react'
import { playDemo } from '../brain'
import { talk } from '../conversation'
import { store, useScene } from '../scene'
import { cancel as pttCancel } from '../ptt'
import { TEMPLATES, type TemplateId } from '../templates'
import { downloadProject, openProject, projectFile } from '../project'
import { ScenesMenu } from '../ScenesMenu'
import { tr } from '../i18n'
import { features } from '../core/platform'
import { ui, useUi } from './ui'
import { useNarrow } from './hooks'
import { FriendState } from './Cast'
import { RecordButton } from './RecordCard'

export function TopBar({ onTemplate }: { onTemplate: (id: TemplateId) => void }) {
  const { pop, castOpen } = useUi(), toggle = ui.toggle, say = ui.say
  const onStartPage = () => ui.setPop('start'), onCast = () => ui.set((now) => ({ castOpen: !now.castOpen }))
  const { scene, canUndo, canRedo } = useScene()
  const narrow = useNarrow()
  const file = useRef<HTMLInputElement>(null)
  const [io, setIO] = useState<'save' | 'open' | null>(null), [progress, setProgress] = useState(0)
  const task = useRef<AbortController | null>(null)
  useEffect(() => () => task.current?.abort(), [])
  const save = async () => {
    if (task.current) return
    const ctrl = new AbortController(); task.current = ctrl; setIO('save'); setProgress(0)
    try { const blob = await projectFile(store.project(), ctrl.signal, setProgress); ctrl.signal.throwIfAborted(); downloadProject(blob, scene.name) }
    catch (error) { if (!ctrl.signal.aborted) say((error as Error).message) }
    finally { if (task.current === ctrl) { task.current = null; setIO(null) } }
  }
  const open = async (file?: File) => {
    if (!file || task.current) return
    const ctrl = new AbortController(); task.current = ctrl; setIO('open')
    try {
      const { project, missing, dropped } = await openProject(file, ctrl.signal)
      ctrl.signal.throwIfAborted(); pttCancel(); talk.detach(); playDemo(false); store.replaceProject(project)
      const notes = [missing ? tr("{0} 个角色要重新导入", missing) : '', dropped ? tr("{0} 张图片的地址不受支持，已跳过", dropped) : '']
      if (missing || dropped) say(notes.filter(Boolean).join(' '))
    } catch (error) { if (!ctrl.signal.aborted) say((error as Error).message) }
    finally { if (task.current === ctrl) { task.current = null; setIO(null) } }
  }
  return (
    <header className="topbar" onPointerDown={(e) => e.stopPropagation()}>
      <div className="left">
        <img className="mark" src={`${import.meta.env.BASE_URL}wordmark.svg`} alt="LivLiv Stage" />
        <div className="menu-anchor scene-switcher"><input className="name" value={scene.name} aria-label={tr("舞台名字")} onChange={(e) => store.set({ name: e.target.value })} /><button className={pop === "scenes" ? "icon on" : "icon"} title={tr("切换镜头")} aria-expanded={pop === "scenes"} onClick={() => toggle("scenes")}><ChevronDown size={15} /></button>{pop === "scenes" && <ScenesMenu close={() => toggle(null)} onStartPage={() => { toggle(null); onStartPage() }} />}</div>
      </div>
      <div className="seg mode">
        <button className="on" title={tr("编辑")} aria-label={tr("编辑")}><Pencil size={13} /><span className="mode-label">{tr("编辑")}</span></button>
        <button onClick={() => store.setMode('show')} title={tr("只留画面（Esc 回来）")} aria-label={tr("预览")}><Play size={13} /><span className="mode-label">{tr("预览")}</span></button>
      </div>
      <div className="right">
        <button className="icon" title={tr("撤销（⌘Z）")} disabled={!canUndo} onClick={store.undo}><Undo2 size={16} /></button>
        <button className="icon" title={tr("重做（⇧⌘Z）")} disabled={!canRedo} onClick={store.redo}><Redo2 size={16} /></button>
        <span className="sep" />
        <div className="menu-anchor">
          <button className={pop === 'templates' ? 'on' : ''} onClick={() => toggle('templates')}><LayoutTemplate size={15} />{tr("模板")}<ChevronDown size={13} /></button>
          {pop === 'templates' && (
            <div className="card dropdown">
              {TEMPLATES.map((t) => <button key={t.id} className="item" onClick={() => onTemplate(t.id)}><b>{tr(t.label ?? '')}</b><span>{tr(t.hint ?? '')}</span></button>)}
            </div>
          )}
        </div>
        <button className={pop === 'mixer' ? 'icon on' : 'icon'} title={tr('调音台')} onClick={() => toggle('mixer')}><Volume2 size={16} /></button>
        <RecordButton on={pop === 'record'} toggle={() => toggle('record')} />
        <button className="primary output-button" title={tr("输出到 OBS")} onClick={() => toggle('output')}><MonitorPlay size={15} />{narrow ? 'OBS' : tr("输出到 OBS")}</button>
        <span className="sep" />
        <button className="icon" title={tr("打开项目")} disabled={!!io} onClick={() => file.current?.click()}><FolderOpen size={16} /></button>
        <button className="icon" title={tr("保存项目")} disabled={!!io} onClick={() => void save()}><Save size={16} /></button>
        <input ref={file} type="file" accept=".livstage,.json,.zip" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = '' }} />
        {/* a phone: what the top bar and the left column hold, in one menu */}
        {narrow && <div className="menu-anchor narrow-menu">
          <button className={`icon${pop === 'more' ? ' on' : ''}`} aria-label={tr('更多')} aria-expanded={pop === 'more'} onClick={() => { if (castOpen && pop !== 'more') onCast(); toggle('more') }}><Menu size={16} /><FriendState /></button>
          {pop === 'more' && <div className="card dropdown">
            <button className={`item${castOpen ? ' on' : ''}`} onClick={() => { toggle(null); onCast() }}><b>{tr('角色列表')}</b></button>
            {features.collab && <button className="item" onClick={() => toggle('collab')}><b>{tr('请朋友上台')}<FriendState /></b></button>}
            <button className="item" disabled={!canUndo} onClick={store.undo}><b>{tr('撤销')}</b></button>
            <button className="item" disabled={!canRedo} onClick={store.redo}><b>{tr('重做')}</b></button>
            <button className="item" onClick={() => toggle('mixer')}><b>{tr('调音台')}</b></button>
            <button className="item" disabled={!!io} onClick={() => { toggle(null); file.current?.click() }}><b>{tr('打开项目')}</b></button>
            <button className="item" disabled={!!io} onClick={() => { toggle(null); void save() }}><b>{tr('保存项目')}</b></button>
          </div>}
        </div>}
        <button className={`icon${pop === 'settings' ? ' on' : ''}`} title={tr("设置")} onClick={() => toggle('settings')}><Settings size={16} /></button>
        <button className={`icon${pop === 'help' ? ' on' : ''}`} title={tr("快捷键（?）")} onClick={() => toggle('help')}><CircleHelp size={16} /></button>
      </div>
      {io && createPortal(<div className="project-progress" role="dialog" aria-modal="true" onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); task.current?.abort() } if (event.key === 'Tab') { event.preventDefault(); event.currentTarget.querySelector('button')?.focus() } }} aria-label={tr(io === 'open' ? '正在打开项目…' : '正在保存项目…')}>
        <div className="card"><LoaderCircle className="spin" size={22} /><b>{tr(io === 'open' ? '正在打开项目…' : '正在保存项目…')}</b>{io === 'save' && <progress value={progress} max={1} />}<button autoFocus onClick={() => task.current?.abort()}>{tr('取消')}</button></div>
      </div>, document.body)}
    </header>
  )
}
