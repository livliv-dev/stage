// The settings card: 通用, 连接, 全局热键 and the livliv.ai account, with a search over every setting.
import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { HotkeysPanel } from '../HotkeysPanel'
import { checkConnect } from '../livliv'
import { AccountPanel } from '../AccountPanel'
import { GeneralPanel } from '../GeneralPanel'
import { tr } from '../i18n'
import { features } from '../core/platform'
import { Connections, SETTINGS_INDEX, type ConnectSection } from './Connections'
import type { SettingsTab, ModelTab } from './ui'

/** Settings for general preferences, models, voice, shortcuts and the optional livliv.ai account. */
/** returns: opened from a panel or card, so saving a form closes it and goes back there */
export function SettingsCard({ onClose, onAdd, onDesktop, initialTab, initialModel, forStart, returns, forVoice, onContinue, onResetLayout }: { onClose: () => void; onAdd: () => void; onDesktop: () => void; initialTab: SettingsTab; initialModel: ModelTab; forStart: boolean; returns?: boolean; forVoice?: string; onContinue: () => void; onResetLayout: () => void }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  useEffect(() => { if (tab === 'account') void checkConnect() }, [tab])
  // providers and keys on one page (连接), and a search over every setting
  const [query, setQuery] = useState(''), [focus, setFocus] = useState<ConnectSection>(initialModel === 'chat' ? 'model' : initialModel)
  const found = query.trim() ? SETTINGS_INDEX.filter((entry) => `${tr(entry.label)} ${entry.label} ${entry.words}`.toLowerCase().includes(query.trim().toLowerCase())) : null
  return (
    <div className="card popover settings" onPointerDown={(e) => e.stopPropagation()}>
      <div className="settings-head"><header><span className="title">{tr("设置")}</span><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
      <input className="settings-search" type="search" value={query} placeholder={tr('搜索设置')} aria-label={tr('搜索设置')} onChange={(e) => setQuery(e.target.value)} />
      <div className="settings-tabs seg">{([{ id: 'general', label: tr("通用") }, { id: 'ai', label: tr('连接') }, { id: 'hotkeys', label: tr("全局热键") }, { id: 'account', label: tr("livliv.ai 帐号") }] as const).map((t) => <button className={`${tab === t.id ? 'on ' : ''}${t.id === 'account' ? 'account-tab' : ''}`} key={t.id} onClick={() => setTab(t.id)}>{t.id === 'account' && <Sparkles size={13} />}{t.label}{t.id === 'hotkeys' && !features.globalHotkeys && <span className="desk-tag">{tr('桌面版')}</span>}</button>)}</div>
      </div><div className="settings-body">
      {found && <div className="settings-found">{found.length ? found.map((entry) => <button key={entry.label} className="item" onClick={() => { setTab(entry.tab); if (entry.section) setFocus(entry.section); setQuery('') }}><b>{tr(entry.label)}</b><span>{tr(({ general: '通用', ai: '连接', hotkeys: '全局热键', account: 'livliv.ai 帐号' } as const)[entry.tab])}</span></button>) : <p className="hint">{tr('没有找到')}</p>}</div>}
      {!found && <>
      {tab === 'general' && <GeneralPanel onDesktop={features.host === 'site' ? onDesktop : undefined} onResetLayout={onResetLayout} />}
      {tab === 'hotkeys' && <HotkeysPanel />}
      {tab === 'ai' && <Connections key={focus} focus={focus} forStart={forStart} forVoice={forVoice} onAccount={() => setTab('account')} onContinue={onContinue} onDone={forStart || returns || forVoice ? onClose : undefined} />}
      {tab === 'account' && <AccountPanel onAdd={onAdd} />}
      </>}
      </div>
    </div>
  )
}
