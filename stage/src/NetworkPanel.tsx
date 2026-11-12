import { useEffect, useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { defaultMotionSettings, lanIP, readMotionSettings, type MotionSettings } from '../../desktop/src/trackingProtocol'
import { actors, onActors } from './actors'
import { configureMotion, currentMotion, motionError, motionSupported, refreshMotion, useMotion } from './networkTracking'
import { store, type CharacterItem } from './scene'
import { tr } from './i18n'

export function NetworkPanel({ character }: { character?: CharacterItem }) {
  const state = useMotion(), [draft, setDraft] = useState(state.settings), [port, setPort] = useState(String(state.settings.port)), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(''), [, redraw] = useState(0)
  useEffect(() => { setDraft(state.settings); setPort(String(state.settings.port)); setError('') }, [state.settings])
  useEffect(() => { const timer = setInterval(() => redraw((n) => n + 1), 250), off = onActors(() => redraw((n) => n + 1)); return () => { clearInterval(timer); off() } }, [])
  const motion = currentMotion(), locked = busy || state.listening, actor = character && actors.get(character.id)
  const candidate = readMotionSettings({ ...draft, port: Number(port), enabled: true }), invalidPhone = !!draft.phone.trim() && !lanIP(draft.phone.trim()), invalidSender = !!draft.sender.trim() && !lanIP(draft.sender.trim()), invalidPort = !port.trim() || !Number.isInteger(Number(port)) || +port < 1024 || +port > 65535
  const apply = async (enabled: boolean) => {
    const value = enabled ? candidate : { ...state.settings, enabled: false }
    if (!value) return
    setBusy(true); setError('')
    try { await configureMotion(value) } catch (error) { setError((error as Error).message) } finally { setBusy(false) }
  }
  const provider = (kind: MotionSettings['kind']) => { const next = kind === 'ifacial' ? { ...draft, kind, scope: 'lan' as const, port: 49983 } : { ...draft, kind, port: defaultMotionSettings().port }; setDraft(next); setPort(String(next.port)); setError('') }
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setCopied(value) } catch (error) { setError(tr('复制失败，请手动选择地址复制')); console.warn('Address copy failed', error) } }
  if (!motionSupported()) return <section className="section network-panel"><h3>{tr('手机与网络追踪')}</h3><p className="hint">{tr('此输入在桌面版连接')}</p>{character && <button onClick={() => store.patch(character.id, { driver: 'face' })}>{tr('使用本机摄像头')}</button>}</section>
  return <section className="section network-panel"><h3>{tr('手机与网络追踪')}</h3>
    <label className="field"><span>{tr('输入来源')}</span><select aria-label={tr('追踪来源')} value={draft.kind} disabled={locked} onChange={(e) => provider(e.target.value as MotionSettings['kind'])}><option value="vmc">OSC / VMC</option><option value="ifacial">iFacialMocap</option></select></label>
    {draft.kind === 'ifacial' ? <label className="field"><span>{tr('手机 IP 地址')}</span><input aria-label={tr('手机 IP 地址')} value={draft.phone} maxLength={15} placeholder="192.168.1.20" disabled={locked} aria-invalid={invalidPhone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />{invalidPhone && <small className="error">{tr('请输入局域网中的 IP 地址')}</small>}</label> : <>
      <label className="field"><span>{tr('接收范围')}</span><select aria-label={tr('接收范围')} value={draft.scope} disabled={locked} onChange={(e) => setDraft({ ...draft, scope: e.target.value as MotionSettings['scope'], sender: '' })}><option value="local">{tr('仅本机')}</option><option value="lan">{tr('本机与局域网')}</option></select></label>
      <label className="field"><span>{tr('接收端口')}</span><input type="number" aria-label={tr('接收端口')} value={port} min={1024} max={65535} disabled={locked} aria-invalid={invalidPort} onChange={(e) => setPort(e.target.value)} />{invalidPort && <small className="error">{tr('端口范围：1024–65535')}</small>}</label>
    </>}
    <div className="row"><button className={state.listening ? '' : 'primary'} disabled={busy || (!state.listening && !candidate)} onClick={() => void apply(!state.listening)}>{state.listening ? tr('停止接收') : draft.kind === 'ifacial' ? tr('连接手机') : tr('开始接收')}</button>{state.settings.enabled && !state.listening && <button disabled={busy} onClick={() => void apply(false)}>{tr('断开')}</button>}{character && <button disabled={!actor?.canCalibrate} onClick={() => actor?.calibrate()}>{tr('校准正面')}</button>}</div>
    <p className={'network-status hint ' + (motion.active ? 'ok' : '')} role="status"><i className={'live-dot ' + (motion.active ? 'on' : state.listening ? 'waiting' : '')} />{busy ? tr('正在连接…') : motion.active ? tr('追踪已连接') + ' · ' + state.source : state.listening ? draft.kind === 'ifacial' ? tr('等待手机数据') : tr('等待追踪数据') : tr('尚未连接')}</p>
    {(error || state.error) && <p className="hint error" role="alert">{error || motionError(state.error)}</p>}
    {draft.kind === 'vmc' && state.listening && <div className="network-destination"><span>{tr('在追踪软件中填写')}</span>{state.addresses.map((address) => <div className="row" key={address}><code>{address}</code><button className="icon" aria-label={tr('复制地址 {0}', address)} onClick={() => void copy(address)}>{copied === address ? <Check size={14} /> : <Copy size={14} />}</button></div>)}<b className="num">UDP {state.settings.port}</b></div>}
    <details className="network-more"><summary>{tr('连接设置')}</summary>
      {draft.kind === 'vmc' && draft.scope === 'lan' && <label className="field"><span>{tr('只接收这个 IP（可选）')}</span><input aria-label={tr('追踪来源 IP')} disabled={locked} value={draft.sender} placeholder={tr('自动选择')} maxLength={15} aria-invalid={invalidSender} onChange={(e) => setDraft({ ...draft, sender: e.target.value })} />{invalidSender && <small className="error">{tr('请输入局域网中的 IP 地址')}</small>}</label>}
      {draft.kind === 'ifacial' && <><p className="hint">{tr('打开手机上的 iFacialMocap，再连接。')}</p><a href="https://www.ifacialmocap.com/for-developer/" target="_blank" rel="noopener noreferrer">{tr('连接方法')}</a></>}
      <button className="link" disabled={busy} onClick={() => { void refreshMotion().catch((error) => setError((error as Error).message)) }}><RefreshCw size={13} />{tr('刷新接收地址')}</button>
    </details>
  </section>
}
