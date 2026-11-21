// The start page: four goals, the demo, and the rest quieter (the other templates, your own characters, and on
// livliv.ai creating a character and signing in). The same on the web, the site and the desktop app. Picking a goal
// sets up the stage (its template, or your characters when you have some) and opens the goal's 准备清单.
import { useState } from 'react'
import { Bot, Camera, Clapperboard, LoaderCircle, MessageCircle, Play, Plus, UserPlus, X } from 'lucide-react'
import { tr } from '../i18n'
import { features } from '../core/platform'
import { signInUrl } from '../host'
import { useAccount } from '../livliv'
import { TEMPLATES, type TemplateId } from '../templates'
import type { Goal } from '../scene'
import { GOALS } from './goals'
import { beginDemo } from './demoStart'

const ICONS = { perform: Camera, live: Bot, chat: MessageCircle, video: Clapperboard }
const CAST = ['d03ft', 'k01', 'v04']

export function StartPage({ onGoal, onTemplate, onAdd, onClose }: { onGoal: (goal: Goal, partner: boolean) => void; onTemplate: (id: TemplateId) => void; onAdd: () => void; onClose?: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), account = useAccount()
  const demo = async () => { setBusy(true); setError(''); try { await beginDemo(); onClose?.() } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  const [big, small] = [GOALS.filter((g) => g.big), GOALS.filter((g) => !g.big)]
  return <div className={`start-page${onClose ? ' card' : ''}`} role="dialog" aria-label={tr('开始')} onPointerDown={(e) => e.stopPropagation()}>
    {onClose && <button className="icon close" aria-label={tr('关闭')} data-close="true" onClick={onClose}><X size={16} /></button>}
    <p className="big">{tr('今天做什么')}</p>
    <div className="goal-grid big">
      {big.map((g) => { const Icon = ICONS[g.id]; return <div key={g.id} className="goal-tile big">
        <button className="goal-main" onClick={() => onGoal(g.id, false)}><Icon size={22} /><b>{tr(g.label)}</b><span>{tr(g.hint)}</span></button>
        {g.id === 'perform' && <button className="goal-extra" onClick={() => onGoal('perform', true)}><Plus size={13} />{tr('加一个 AI 搭档')}</button>}
      </div> })}
    </div>
    <div className="goal-grid">
      {small.map((g) => { const Icon = ICONS[g.id]; return <button key={g.id} className="goal-tile" onClick={() => onGoal(g.id, false)}><Icon size={18} /><b>{tr(g.label)}</b><span>{tr(g.hint)}</span></button> })}
    </div>
    <button className="welcome-demo" disabled={busy} onClick={() => void demo()}>
      <span className="welcome-cast" aria-hidden="true">{CAST.map((id) => <img key={id} src={`${import.meta.env.BASE_URL}characters/${id}/avatar.webp`} alt="" />)}</span>
      <span className="welcome-demo-copy"><b>{tr('先看一段演示')}</b><span>{tr('Nana、Sena 与 Kai 三人聊天 · 不用任何设置')}</span></span>
      <span className="welcome-play">{busy ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}{tr('看演示')}</span>
    </button>
    {error && <p className="hint error" role="alert">{error}</p>}
    <div className="start-secondary">
      <span>{tr('其他模板')}</span>
      {TEMPLATES.filter((t) => ['duo', 'trio', 'cohost', 'blank'].includes(t.id)).map((t) => <button key={t.id} className="link" title={tr(t.hint)} onClick={() => onTemplate(t.id)}>{tr(t.label)}</button>)}
      <button className="link" onClick={onAdd}><UserPlus size={13} />{tr('自己放角色')}</button>
    </div>
    {features.host === 'site' && <div className="start-secondary site">
      <a href="/create" target="_blank" rel="noopener">{tr('在 livliv.ai 创建角色')}</a>
      {account.status !== 'in' && <a href={signInUrl()}>{tr('登录 livliv.ai')}</a>}
    </div>}
  </div>
}
