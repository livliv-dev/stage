import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, LoaderCircle, Play, Search, Square, X } from 'lucide-react'
import { tr } from './i18n'
import type { Voices } from './livliv'
import './voices.css'

const RECENT = 'livliv-stage:recent-livliv-voices'
const GROUPS = [{ id: 'girl', label: '少女' }, { id: 'woman', label: '姐姐' }, { id: 'man', label: '男声' }, { id: 'other', label: '特色' }]
function recentVoices(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(RECENT) ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 6) : [] }
  catch { return [] }
}

type Props = {
  value: string; catalog: Voices | null; loading: boolean; error: string; disabledReason?: string
  onRetry(): void; onChange(voice: string): void
  onPreview(voice: string, signal: AbortSignal): Promise<void>
}

export function VoicePicker(props: Props) {
  const [open, setOpen] = useState(false)
  const { value, catalog } = props
  const own = catalog?.own
  const name = (id: string) => id === own?.id ? tr('角色原声') : catalog?.voices.find((voice) => voice.id === id)?.name
  const current = value ? name(value) ?? tr('已保存的音色') : tr('默认声音')
  const detail = value ? value === own?.id ? own.name : catalog?.voices.find((voice) => voice.id === value)?.desc : catalog ? tr('跟随角色设置 · {0}', name(catalog.voice) ?? tr('默认')) : tr('跟随角色设置')
  return <div className="voice-picker">
    <button className="voice-current" aria-haspopup="dialog" aria-label={tr('更换音色')} onClick={() => setOpen(true)}>
      <span><b>{current}</b><small>{detail}</small></span><ChevronDown size={16} />
    </button>
    {open && <VoiceDialog {...props} onClose={() => setOpen(false)} />}
  </div>
}

function VoiceDialog({ value, catalog, loading, error, disabledReason, onRetry, onChange, onPreview, onClose }: Props & { onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null), preview = useRef<AbortController | null>(null), group = useId(), title = useId()
  const [draft, setDraft] = useState(value), [query, setQuery] = useState(''), [filter, setFilter] = useState('all')
  const [recent] = useState(recentVoices), [playing, setPlaying] = useState<string | null>(null), [previewError, setPreviewError] = useState('')
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => { preview.current?.abort(); element.close() } }, [])
  useEffect(() => { if (disabledReason) { preview.current?.abort(); preview.current = null; setPlaying(null) } }, [disabledReason])
  const stop = () => { preview.current?.abort(); preview.current = null; setPlaying(null) }
  const close = () => { stop(); onClose() }
  const test = async (id: string) => {
    const repeated = playing === id
    stop(); setPreviewError('')
    if (repeated || disabledReason) return
    const controller = new AbortController(); preview.current = controller; setPlaying(id)
    try { await onPreview(id, controller.signal) }
    catch (failure) { if (!controller.signal.aborted) setPreviewError(failure instanceof Error ? failure.message : String(failure)) }
    finally { if (preview.current === controller) { preview.current = null; setPlaying(null) } }
  }
  const own = catalog?.own
  const choices = catalog ? [
    { id: '', name: tr('默认声音'), desc: tr('跟随角色的默认设置'), group: 'default' },
    ...(own ? [{ id: own.id, name: tr('角色原声'), desc: own.name || tr('这个角色自己的声音'), group: 'default' }] : []),
    ...catalog.voices.filter((voice, index, all) => voice.id !== own?.id && all.findIndex((entry) => entry.id === voice.id) === index),
  ] : []
  const search = query.trim().toLocaleLowerCase()
  const filtered = choices.filter((voice) => (filter === 'all' || (filter === 'recent' ? recent.includes(voice.id) : voice.group === filter)) && `${voice.name} ${voice.desc} ${voice.id}`.toLocaleLowerCase().includes(search))
  const shown = filter === 'recent' ? filtered.toSorted((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id)) : filtered
  const picked = choices.find((voice) => voice.id === draft)
  return createPortal(<dialog ref={dialog} className="card voice-dialog" aria-labelledby={title} onCancel={(event) => { event.preventDefault(); close() }} onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
    if (event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
  }}>
    <header><div><h2 id={title}>{tr('选择角色音色')}</h2></div><button className="icon" aria-label={tr('关闭')} onClick={close}><X size={18} /></button></header>
    <p className="voice-provider">{tr('livliv.ai 音色')}</p>
    <div className="voice-search"><Search size={16} /><input autoFocus type="search" aria-label={tr('搜索音色')} placeholder={tr('搜名字或声音特点，如温柔、低沉')} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <div className="voice-filters" aria-label={tr('音色分类')}>
      {[{ id: 'all', label: '全部' }, { id: 'recent', label: '最近使用' }, ...GROUPS.filter((entry) => catalog?.voices.some((voice) => voice.group === entry.id))].map((entry) => <button key={entry.id} aria-pressed={filter === entry.id} onClick={() => setFilter(entry.id)}>{tr(entry.label)}</button>)}
    </div>
    <div className="voice-results" aria-busy={loading}>
      {loading ? <p role="status" className="voice-empty"><LoaderCircle size={18} className="spin" />{tr('正在读取音色…')}</p> : error ? <div className="voice-empty"><p className="error" role="alert">{tr('音色读取失败：{0}', error)}</p><button onClick={onRetry}>{tr('重试')}</button></div> : <>
        <p className="voice-result-count">{tr('{0} 个音色', shown.length)}</p>
        {!shown.length && <div className="voice-empty"><p>{tr(filter === 'recent' && !search ? '还没有最近使用的音色' : '没有找到匹配的音色')}</p><button onClick={() => { setQuery(''); setFilter('all') }}>{tr('查看全部音色')}</button></div>}
        <div className="voice-grid">{shown.map((voice) => <article key={voice.id} className={`voice-option${draft === voice.id ? ' selected' : ''}`}>
          <label><input type="radio" name={group} checked={draft === voice.id} onChange={() => setDraft(voice.id)} /><span><b>{voice.name}{voice.id === value && <small className="voice-in-use">{tr('使用中')}</small>}</b><small>{voice.desc}</small></span></label>
          <button className="voice-preview" disabled={!!disabledReason} aria-label={tr(playing === voice.id ? '停止试听 {0}' : '试听 {0}', voice.name)} onClick={() => void test(voice.id)}>{playing === voice.id ? <Square size={13} /> : <Play size={13} />}{tr(playing === voice.id ? '停止' : '试听')}</button>
        </article>)}</div>
      </>}
    </div>
    <div className="voice-preview-note"><p className="hint">{disabledReason ?? tr('试听按积分')}</p>{previewError && <p className="error" role="alert">{tr('试听失败：{0}', previewError)}</p>}</div>
    <footer><span>{picked?.name ?? tr('请选择音色')}</span><button onClick={close}>{tr('取消')}</button><button className="primary" disabled={!picked || loading || !!error} onClick={() => {
      stop(); onChange(draft)
      try { localStorage.setItem(RECENT, JSON.stringify([draft, ...recent.filter((id) => id !== draft)].slice(0, 6))) } catch { /* The voice is selected even if recent choices cannot be saved. */ }
      onClose()
    }}><Check size={14} />{tr('应用音色')}</button></footer>
  </dialog>, document.body)
}
