import { useEffect, useRef, useState } from 'react'
import { PARAM_RANGES } from '@livliv-dev/player'
import { parameterRule, readTrackingProfile, TRACKING_PARAMETERS, type ParameterRule, type TrackingParameter, type TrackingSample } from '@livliv-dev/player/tracking'
import { Copy, Download, RotateCcw, Save, Trash, Upload } from 'lucide-react'
import { actors } from './actors'
import { formatOf } from './bodies'
import { tr } from './i18n'
import { BUILTIN_PROFILES, readTrackingSettings, trackingDefaults, trackingPatch, trackingSettingsOf, type TrackingPreset, type TrackingSettings } from './profiles'
import { store, useScene, type CharacterItem } from './scene'

const KEY = 'livliv-stage:tracking-presets'
const LABELS: Record<TrackingParameter, string> = { angleX: '左右转头', angleY: '上下点头', angleZ: '左右歪头', eyeLOpen: '左眼开合', eyeROpen: '右眼开合', eyeBallX: '左右眼神', eyeBallY: '上下眼神', browLY: '左眉', browRY: '右眉', mouthOpen: '张嘴', smile: '微笑', bodyX: '身体左右' }
function readPresets(): { entries: TrackingPreset[]; error: string } {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(value)) throw new Error(tr('预设列表无法读取'))
    const entries = value.filter((p): p is TrackingPreset => !!p && typeof p.id === 'string' && typeof p.name === 'string' && !!p.settings && typeof p.settings === 'object' && !Array.isArray(p.settings)).map((p) => ({ id: p.id, name: p.name, settings: readTrackingSettings(p.settings) }))
    return { entries, error: '' }
  } catch (error) { return { entries: [], error: (error as Error).message } }
}
function RangePair({ title, values, limits, set, ordered = false }: { title: string; values: [number, number]; limits: [number, number]; set: (values: [number, number]) => void; ordered?: boolean }) {
  const [draft, setDraft] = useState(values.map(String)), [error, setError] = useState('')
  useEffect(() => { setDraft(values.map(String)); setError('') }, [values[0], values[1]])
  const commit = () => {
    const next = draft.map(Number) as [number, number]
    if (draft.some((v) => !v.trim()) || next.some((v) => !Number.isFinite(v) || v < limits[0] || v > limits[1]) || (ordered && next[1] <= next[0])) { setError(ordered ? tr('输入范围需要从小到大') : tr('数值超出范围')); return }
    setError(''); if (next[0] !== values[0] || next[1] !== values[1]) set(next)
  }
  return <div className="field tracking-range"><span>{title}</span><div className="row two">{draft.map((value, index) => <input key={index} type="number" step="any" min={limits[0]} max={limits[1]} aria-label={`${title} · ${tr(index === 0 ? '起点' : '终点')}`} aria-invalid={!!error} value={value} onChange={(event) => setDraft((old) => old.map((v, i) => i === index ? event.target.value : v))} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />)}</div>{error && <p className="hint error" role="alert">{error}</p>}</div>
}

export function TrackingPanel({ c, patch }: { c: CharacterItem; patch: (p: Partial<CharacterItem>) => void }) {
  const { scene } = useScene(), file = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false), [parameter, setParameter] = useState<TrackingParameter>('angleX'), [sample, setSample] = useState<TrackingSample | null>(null)
  const [saved, setSaved] = useState(readPresets), [name, setName] = useState(''), [selected, setSelected] = useState(''), [target, setTarget] = useState(''), [error, setError] = useState('')
  useEffect(() => { setSelected(''); setName(''); setTarget(''); setError(''); setSample(null) }, [c.id])
  const format = formatOf(c.model)
  const available = TRACKING_PARAMETERS.filter((key) => format === 'png' ? ['angleX', 'angleY', 'angleZ', 'eyeLOpen', 'eyeROpen', 'mouthOpen', 'bodyX'].includes(key) : format === 'vrm' ? key !== 'browLY' && key !== 'browRY' : true)
  const key = available.includes(parameter) ? parameter : available[0] ?? 'angleX', rule = c.tuning.tracking[key] ?? parameterRule(key), limits = PARAM_RANGES[key]
  useEffect(() => {
    if (!open) return
    const update = () => setSample(actors.get(c.id)?.trackingSample ?? null)
    update(); const timer = setInterval(update, 150); return () => clearInterval(timer)
  }, [c.id, open])
  const setRule = (value: Partial<ParameterRule>) => { setSelected(''); patch({ tuning: { ...c.tuning, tracking: readTrackingProfile({ ...c.tuning.tracking, [key]: { ...rule, ...value } }) } }) }
  const apply = (settings: TrackingSettings) => patch(trackingPatch(c, settings))
  const persist = (entries: TrackingPreset[]) => { localStorage.setItem(KEY, JSON.stringify(entries)); setSaved({ entries, error: '' }) }
  const save = () => {
    try { const title = name.trim(); if (!title) return; const existing = saved.entries.find((p) => p.name === title), id = existing?.id ?? crypto.randomUUID(); persist([...saved.entries.filter((p) => p.id !== id), { id, name: title, settings: trackingSettingsOf(c) }]); setSelected(id); setName(''); setError('') }
    catch (e) { setError((e as Error).message) }
  }
  const exportProfile = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'livliv-stage-tracking', version: 1, name: name.trim() || c.name, settings: trackingSettingsOf(c) }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `${c.name.replace(/[\\/:*?"<>|]/g, '-')}.tracking.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
  return <details className="advanced tracking-adjustments" onToggle={(event) => setOpen(event.currentTarget.open)}><summary>{tr('动作细调与预设')}</summary>
    <div className="tracking-content">
      {!available.length ? <p className="hint">{tr('先绑定一个摇杆轴')}</p> : <>
      <label className="field"><span>{tr('预设')}</span><select aria-label={tr('预设')} value={selected} onChange={(event) => { const id = event.target.value; setSelected(id); const builtin = BUILTIN_PROFILES.find((p) => p.id === id), custom = saved.entries.find((p) => p.id === id); if (builtin) apply(builtin.settings()); else if (custom) apply(custom.settings) }}><option value="">{tr('选择预设')}</option>{BUILTIN_PROFILES.map((p) => <option key={p.id} value={p.id}>{tr(p.name)}</option>)}{saved.entries.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="field"><span>{tr('调节部位')}</span><select aria-label={tr('调节部位')} value={key} onChange={(event) => setParameter(event.target.value as TrackingParameter)}>{available.map((p) => <option key={p} value={p}>{tr(LABELS[p])}</option>)}</select></label>
      <div className="tracking-live" aria-label={tr('实时参数')}><span>{tr('输入')}<b>{sample ? sample.input[key].toFixed(2) : '—'}</b></span><span>→</span><span>{tr('输出')}<b>{sample ? sample.output[key].toFixed(2) : '—'}</b></span></div>
      <label className="switch"><span>{tr('反向')}</span><input type="checkbox" checked={rule.output[0] > rule.output[1]} onChange={() => setRule({ output: [rule.output[1], rule.output[0]] })} /><i /></label>
      <label className="field"><span>{tr('单独平滑')}<b>{Math.round(rule.smoothing * 100)}%</b></span><input type="range" min={0} max={1} step={.05} value={rule.smoothing} style={{ ['--p' as string]: `${rule.smoothing * 100}%` }} onChange={(event) => setRule({ smoothing: +event.target.value })} /></label>
      <label className="field"><span>{tr('响应曲线')}<b>{rule.curve.toFixed(1)}</b></span><input type="range" min={.2} max={3} step={.1} value={rule.curve} style={{ ['--p' as string]: `${(rule.curve - .2) / 2.8 * 100}%` }} onChange={(event) => setRule({ curve: +event.target.value })} /></label>
      <details className="tracking-mapping"><summary>{tr('范围映射')}</summary>
      <RangePair key={`${c.id}:${key}:input`} title={tr('输入范围')} values={rule.input} limits={limits} ordered set={(input) => setRule({ input })} />
      <RangePair key={`${c.id}:${key}:output`} title={tr('输出范围')} values={rule.output} limits={limits} set={(output) => setRule({ output })} />
      </details>
      <button className="link" onClick={() => { const tracking = { ...c.tuning.tracking }; delete tracking[key]; patch({ tuning: { ...c.tuning, tracking } }); setSelected('') }}><RotateCcw size={13} />{tr('恢复这个部位')}</button>
      <div className="tracking-presets"><div className="row"><input aria-label={tr('预设名称')} maxLength={60} value={name} placeholder={tr('预设名称')} onChange={(event) => setName(event.target.value)} /><button disabled={!name.trim()} onClick={save} title={tr('保存预设')}><Save size={14} /></button></div>
        <div className="row"><button onClick={() => file.current?.click()}><Upload size={13} />{tr('导入')}</button><button onClick={exportProfile}><Download size={13} />{tr('导出')}</button><button disabled={!saved.entries.some((p) => p.id === selected)} title={tr('删除预设')} onClick={() => { try { persist(saved.entries.filter((p) => p.id !== selected)); setSelected(''); setError('') } catch (e) { setError((e as Error).message) } }}><Trash size={13} /></button></div>
        <input type="file" ref={file} accept=".json" hidden onChange={async (event) => { const f = event.target.files?.[0]; event.target.value = ''; if (!f) return; try { if (f.size > 1024 * 1024) throw new Error(tr('预设文件不能超过 1 MB')); const data = JSON.parse(await f.text()); if (data?.format !== 'livliv-stage-tracking' || data.version !== 1 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error(tr('这不是动作预设文件')); apply(readTrackingSettings(data.settings)); setName(typeof data.name === 'string' ? data.name.slice(0, 60) : ''); setSelected(''); setError('') } catch (e) { setError((e as Error).message) } }} />
      </div>
      <div className="row tracking-copy"><select aria-label={tr('复制到角色')} value={target} onChange={(event) => setTarget(event.target.value)}><option value="">{tr('复制到角色')}</option>{scene.items.filter((i): i is CharacterItem => i.kind === 'character' && i.id !== c.id && !i.remote).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select><button disabled={!target} title={tr('复制配置')} onClick={() => { const next = scene.items.find((i): i is CharacterItem => i.id === target && i.kind === 'character' && !i.remote); if (next) store.patch(next.id, trackingPatch(next, trackingSettingsOf(c))) }}><Copy size={14} /></button></div>
      <button className="link" onClick={() => { apply(trackingDefaults()); setSelected('default') }}><RotateCcw size={13} />{tr('恢复动作默认设置')}</button>
      {(error || saved.error) && <p className="hint error" role="alert">{tr(error || saved.error)}</p>}
      </>}
    </div>
  </details>
}
