import { useEffect, useState } from 'react'
import { Check, Copy, LoaderCircle, RefreshCw } from 'lucide-react'
import type { StageApiState } from '../../desktop/src/stageCommands'
import { desktop } from './desktop'
import { tr } from './i18n'

export function StageApiPanel() {
  const api = desktop?.stageApi
  const [state, setState] = useState<StageApiState | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState('')
  useEffect(() => {
    if (!api) return
    let active = true
    void api.get().then((value) => { if (active) setState(value) }, (e) => { if (active) setError((e as Error).message) })
    return () => { active = false }
  }, [api])
  if (!api) return null
  const change = async (operation: () => Promise<StageApiState>) => {
    setBusy(true); setError('')
    try { setState(await operation()) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const copy = async (value: string, key: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); setTimeout(() => setCopied((current) => current === key ? '' : current), 1800) }
    catch (e) { setError((e as Error).message) }
  }
  const address = state?.port ? `http://127.0.0.1:${state.port}` : ''
  const query = address && state ? `curl -H 'Authorization: Bearer ${state.token}' '${address}/api/stage/state'` : ''
  const action = address && state ? `curl -X POST -H 'Authorization: Bearer ${state.token}' -H 'Content-Type: application/json' --data '{"do":"act","id":"nod"}' '${address}/api/stage/command'` : ''
  return <section className="stage-api">
    <h3>{tr('外部控制 API')}</h3>
    {state ? <label className="switch"><span>{tr('允许本机工具控制')}</span><input type="checkbox" checked={state.enabled} disabled={busy} onChange={(event) => void change(() => api.set(event.target.checked))} /><i /></label> : !error && <span className="hint"><LoaderCircle size={13} className="spin" /> {tr('读取设置…')}</span>}
    {state?.enabled && address && <>
      <label className="field"><span>{tr('连接地址')}</span><div className="row stage-api-copy"><input readOnly value={address} /><button title={tr('复制地址')} onClick={() => void copy(address, 'address')}>{copied === 'address' ? <Check size={14} /> : <Copy size={14} />}</button></div></label>
      <label className="field"><span>{tr('连接令牌')}</span><div className="row stage-api-copy"><input readOnly type="password" value={state.token} /><button title={tr('复制令牌')} onClick={() => void copy(state.token, 'token')}>{copied === 'token' ? <Check size={14} /> : <Copy size={14} />}</button></div></label>
      <div className="row"><button onClick={() => void copy(query, 'query')}>{copied === 'query' ? <Check size={13} /> : <Copy size={13} />}{tr('复制查询示例')}</button><button onClick={() => void copy(action, 'action')}>{copied === 'action' ? <Check size={13} /> : <Copy size={13} />}{tr('复制动作示例')}</button></div>
      <button className="link stage-api-rotate" disabled={busy} onClick={() => void change(() => api.rotate())}><RefreshCw size={12} />{tr('更换令牌')}</button>
    </>}
    {(error || state?.error) && <p className="hint error" role="alert">{tr(error || state?.error || '')}</p>}
  </section>
}
