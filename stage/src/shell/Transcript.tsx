// The transcript card: the record of the conversation and the memory, side by side as tabs.
import { useEffect, useId, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { talk, useConversation } from '../conversation'
import { participants, useScene } from '../scene'
import { tr } from '../i18n'
import { features } from '../core/platform'
import { MemoryPanel } from '../MemoryPanel'
import { memory, type StoredSession } from '../memory'

export function Transcript({ view, setView, onClose, right }: { view: 'history' | 'memory'; setView: (view: 'history' | 'memory') => void; onClose: () => void; right: number }) {
  const conv = useConversation(), { scene } = useScene()
  const end = useRef<HTMLDivElement>(null)
  const tabs = useId()
  const [source, setSource] = useState<{ sessionId: string; lineIds: string[]; text: string } | undefined>()
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [archiveError, setArchiveError] = useState('')
  const cast = participants(scene).filter((character) => character.lines === 'ai' && !character.remote)
  const profileIds = cast.map((character) => character.profileId ?? character.id)
  const names = Object.fromEntries(cast.map((character) => [character.profileId ?? character.id, character.name]))
  const profilesKey = JSON.stringify([...profileIds].sort())
  const panelScope = features.desktopConsole && !conv.running && view === 'memory' && !source ? conv.chatScope : conv.scope
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [conv.lines.length, view])
  useEffect(() => { if (view === 'history') setSource(undefined) }, [view])
  useEffect(() => setSource(undefined), [conv.sessionId, conv.scope, profilesKey])
  useEffect(() => {
    let active = true
    const refresh = () => { void memory.sessions(JSON.parse(profilesKey) as string[], conv.scope).then((values) => { if (active) { setSessions(values); setArchiveError('') } }, (error: unknown) => { if (active) setArchiveError(error instanceof Error ? error.message : String(error)) }) }
    refresh(); const off = memory.subscribe(refresh)
    return () => { active = false; off() }
  }, [profilesKey, conv.scope])
  const color = (who: string) => (scene.items.find((item) => item.id === who) as { color?: string } | undefined)?.color ?? '#7a746b'
  return <div className="card transcript chat-panel" style={{ right }} onPointerDown={(event) => event.stopPropagation()}>
      <header><div role="tablist" aria-label={tr('记录与记忆')} onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault(); event.stopPropagation()
        const next = event.key === 'Home' ? 'history' : event.key === 'End' ? 'memory' : view === 'history' ? 'memory' : 'history'
        setView(next); document.getElementById(`${tabs}-${next}`)?.focus()
      }}>{(['history', 'memory'] as const).map((tab) => <button key={tab} id={`${tabs}-${tab}`} role="tab" aria-selected={view === tab} aria-controls={`${tabs}-content`} tabIndex={view === tab ? 0 : -1} onClick={() => setView(tab)}>{tr(tab === 'history' ? '对话记录' : '记忆')}</button>)}</div><span className="chat-scope">{tr(panelScope === 'public' ? '公开记忆' : '私聊')}</span><button className="icon" data-close="true" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
      <div id={`${tabs}-content`} role="tabpanel" aria-labelledby={`${tabs}-${view}`}>
      {view === 'memory' ? <MemoryPanel embedded profileIds={profileIds} profileNames={names} scope={panelScope} source={source} /> : <>
      <div className="chat-history-controls">
        <select aria-label={tr('已保存的对话')} disabled={conv.running} value={sessions.some((session) => session.id === conv.sessionId) ? conv.sessionId : ''} onChange={(event) => void talk.openSession(event.target.value)}>
          <option value="" disabled>{tr('已保存的对话')}</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title || tr('新对话')}</option>)}
        </select>
      </div>
      <div className="lines">
        {!conv.lines.length && <p className="muted">{tr('还没有人说话')}</p>}
        {conv.lines.map((line) => <div key={line.id} className={`line${conv.speaking?.id === line.id ? ' now' : ''}${line.audience ? ' audience' : ''}`}>
          <b style={{ color: color(line.who) }}>{line.name}</b><span>{line.text}{line.cut && <small className="cut-label">{tr('（未完整说出）')}</small>}</span>
          <span className="acts">
            {!line.audience && !line.cut && conv.sessionId && <button title={tr('记住这件事')} onClick={() => { setSource({ sessionId: conv.sessionId, lineIds: [line.id], text: line.text }); setView('memory') }}>{tr('记住')}</button>}
            <button className="icon" title={tr('从这里重来：删掉这句和后面的')} disabled={conv.running} onClick={() => talk.rewind(line.id)}><RotateCcw size={13} /></button>
            <button className="icon" disabled={(conv.running && conv.mode === 'realtime')} title={tr((conv.running && conv.mode === 'realtime') ? '结束通话后可删除这句记录' : '删除这条聊天记录')} onClick={() => talk.forget(line.id)}><X size={13} /></button>
          </span>
        </div>)}
        <div ref={end} />
      </div>
      {archiveError && <p className="error" role="alert">{archiveError}</p>}
      <footer className="chat-history-footer">
        <button disabled={conv.running || !conv.lines.length} onClick={talk.redo}><RotateCcw size={14} />{tr('最后一句重说')}</button>
        <button disabled={conv.running} onClick={() => void talk.newChat()}>{tr('新对话')}</button>
        <button className="danger" disabled={!conv.lines.length} onClick={talk.clear}>{tr('清空')}</button>
      </footer>
      </>}
      </div>
    </div>
}
