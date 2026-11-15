import { useEffect, useRef, useState } from 'react'
import { tr } from './i18n'
import { memory, type MemoryRecord, type MemoryScope } from './memory'
import './memory.css'

export type MemoryPanelProps = {
  profileIds: string[]
  profileNames?: Record<string, string>
  scope: MemoryScope
  source?: { sessionId: string; lineIds: string[]; text: string }
  onClose?: () => void
  embedded?: boolean
}

export function MemoryPanel({ profileIds, profileNames, scope, source, onClose, embedded = false }: MemoryPanelProps) {
  const [entries, setEntries] = useState<MemoryRecord[]>([])
  const [enabled, setEnabled] = useState(true), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(!!source), [query, setQuery] = useState('')
  const [rememberSource, setRememberSource] = useState(source)
  const [profileId, setProfile] = useState(profileIds[0] ?? '')
  const [text, setText] = useState(source?.text ?? ''), [entryScope, setEntryScope] = useState(scope)
  const [editing, setEditing] = useState<string | null>(null), [draft, setDraft] = useState(''), [draftScope, setDraftScope] = useState<MemoryScope>('private')
  const [sourcePreview, setSourcePreview] = useState<{ id: string; title: string; text: string } | null>(null)
  const generation = useRef(0), mounted = useRef(true)
  const profilesKey = JSON.stringify(profileIds)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++ } }, [])
  useEffect(() => {
    const profiles = JSON.parse(profilesKey) as string[]
    if (!profiles.includes(profileId)) setProfile(profiles[0] ?? '')
    const refresh = () => {
      const run = ++generation.current
      void Promise.all([memory.listMemories(profiles, scope), memory.context(profiles, scope)]).then(([records, context]) => {
        if (run !== generation.current) return
        setEntries(records); setEnabled(context.enabled); setLoading(false)
      }, (cause: unknown) => {
        if (run !== generation.current) return
        setLoading(false); setError(cause instanceof Error ? cause.message : String(cause))
      })
    }
    setLoading(true); setError(''); setEntries([]); setEditing(null); setSourcePreview(null)
    refresh()
    return memory.subscribe(refresh)
  }, [profilesKey, scope])
  useEffect(() => { setText(source?.text ?? ''); setEntryScope(scope); setNotice(''); setAdding(!!source); setRememberSource(source) }, [source, scope])

  const perform = async (action: () => Promise<unknown>, done?: () => void) => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await action(); if (mounted.current) done?.() }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { if (mounted.current) setBusy(false) }
  }
  const remember = () => perform(() => memory.remember({
    profileId, scope: entryScope, text,
    ...(rememberSource ? { sourceSessionId: rememberSource.sessionId, sourceLineIds: rememberSource.lineIds } : {}),
  }), () => { setText(''); setAdding(false); setRememberSource(undefined); setNotice(tr('已记住')) })
  const showSource = (entry: MemoryRecord) => perform(async () => {
    const session = entry.sourceSessionId ? await memory.session(entry.sourceSessionId) : null
    const lines = session?.lines.filter((line) => entry.sourceLineIds?.includes(line.id)) ?? []
    if (mounted.current) setSourcePreview({ id: entry.id, title: session?.title ?? '', text: lines.map((line) => `${line.name}：${line.text}`).join('\n') || tr('来源对话已删除') })
  })
  const toggleMemory = (value: boolean) => {
    const previous = enabled
    setEnabled(value)
    void perform(async () => {
      try { await memory.setEnabled(value) }
      catch (cause) { if (mounted.current) setEnabled(previous); throw cause }
    })
  }
  const name = (id: string) => profileNames?.[id] ?? tr('角色 {0}', profileIds.indexOf(id) + 1)

  const shown = entries.filter((entry) => `${name(entry.profileId)} ${entry.text}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section className="memory-panel" aria-label={tr('记忆')} onPointerDown={(event) => event.stopPropagation()}>
    {!embedded && <header><span className="title">{tr('记忆')}</span>{onClose && <button className="icon" aria-label={tr('关闭')} onClick={onClose}>×</button>}</header>}
    <label className="memory-toggle"><input type="checkbox" checked={enabled} disabled={busy || loading} onChange={(event) => toggleMemory(event.target.checked)} />{tr('在对话中使用长期记忆')}</label>
    <p className="hint">{tr(scope === 'public' ? '这里只显示可在直播中使用的记忆。' : '私聊记忆只用于私聊。设为公开后，角色才能在直播中使用。')}</p>
    {!enabled && <p className="hint">{tr('长期记忆已关闭，已保存的条目仍可管理。')}</p>}
    <div className="memory-toolbar"><span>{loading ? tr('正在读取记忆…') : tr('已保存 {0} 条记忆', entries.length)}</span><button disabled={busy || !profileIds.length} onClick={() => { setAdding(true); setRememberSource(undefined); setText(''); setEntryScope(scope); setNotice('') }}>{tr('添加记忆')}</button></div>
    {adding && <div className="memory-add">
      {profileIds.length > 1 && <label className="field"><span>{tr('让角色记住')}</span><select aria-label={tr('记忆所属角色')} value={profileId} disabled={busy} onChange={(event) => setProfile(event.target.value)}>{profileIds.map((id) => <option value={id} key={id}>{name(id)}</option>)}</select></label>}
      <label className="field"><span>{tr('记忆内容')}</span><textarea autoFocus aria-label={tr('记忆内容')} rows={3} value={text} disabled={busy || !profileIds.length} maxLength={2000} placeholder={tr('写下希望角色长期记住的事实或共同经历')} onChange={(event) => setText(event.target.value)} /></label>
      <label className="memory-toggle"><input type="checkbox" checked={entryScope === 'public'} onChange={(event) => setEntryScope(event.target.checked ? 'public' : 'private')} disabled={busy} />{tr('可在直播中使用')}</label>
      <div className="row"><button className="primary" disabled={busy || !profileId || !text.trim()} onClick={() => void remember()}>{tr('记住')}</button><button disabled={busy} onClick={() => { setAdding(false); setRememberSource(undefined) }}>{tr('取消')}</button></div>
    </div>}
    {!profileIds.length && <p className="hint">{tr('先添加一个 AI 角色')}</p>}
    {(entries.length > 5 || query) && <input className="memory-search" type="search" aria-label={tr('搜索记忆')} placeholder={tr('搜索记忆')} value={query} onChange={(event) => setQuery(event.target.value)} />}
    {loading && <p className="hint" role="status">{tr('正在读取记忆…')}</p>}
    <div className="memory-list">
      {!loading && !entries.length && <div className="memory-empty"><b>{tr('还没有长期记忆')}</b><p>{tr('聊天时说“记住：……”就能保存，也可以点击添加记忆。')}</p></div>}
      {!loading && !!entries.length && !shown.length && <p className="muted">{tr('没有找到匹配的记忆')}</p>}
      {shown.map((entry) => <article className="memory-entry" key={entry.id}>
        <div className="memory-entry-meta"><b>{name(entry.profileId)}</b><span>{tr(entry.scope === 'public' ? '公开' : '仅私聊')}</span></div>
        {editing === entry.id ? <>
          <label className="field"><span>{tr('记忆内容')}</span><textarea aria-label={tr('记忆内容')} rows={3} value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} /></label>
          <label className="memory-toggle"><input type="checkbox" checked={draftScope === 'public'} onChange={(event) => setDraftScope(event.target.checked ? 'public' : 'private')} />{tr('可在直播中使用')}</label>
          <div className="row"><button disabled={busy || !draft.trim()} onClick={() => void perform(() => memory.editMemory(entry.id, { text: draft, scope: draftScope }), () => { setEditing(null); setNotice(tr('记忆已更新')) })}>{tr('保存')}</button><button disabled={busy} onClick={() => setEditing(null)}>{tr('取消')}</button></div>
        </> : <>
          <p>{entry.text}</p>
          <div className="row memory-entry-actions">
            <button disabled={busy} onClick={() => { setEditing(entry.id); setDraft(entry.text); setDraftScope(entry.scope); setNotice('') }}>{tr('编辑')}</button>
            {entry.sourceSessionId && <button disabled={busy} onClick={() => void showSource(entry)}>{tr('查看来源')}</button>}
            <button className="danger" disabled={busy} onClick={() => void perform(() => memory.forgetMemory(entry.id), () => { setSourcePreview(null); setNotice(tr('记忆已删除')) })}>{tr('删除')}</button>
          </div>
          {sourcePreview?.id === entry.id && <div className="memory-source"><b>{sourcePreview.title || tr('来源对话')}</b><p>{sourcePreview.text}</p></div>}
        </>}
      </article>)}
    </div>
    {!!entries.length && <p className="hint">{tr('聊天原文仍保留，可在对话记录中单独删除。')}</p>}
    {notice && <p className="hint" role="status">{notice}</p>}
    {error && <p className="error" role="alert">{tr('记忆操作失败：{0}', tr(error))}</p>}
  </section>
}
