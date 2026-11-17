import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { desktop } from './desktopBridge'
import { tr } from './i18n'
import type { CollabState } from '../../desktop/src/collabProtocol'

const OFF: CollabState = { enabled: false, port: null, network: true, localUrl: null, urls: [], error: null }
const errors = { 'port-in-use': '联播端口已被占用，请更换端口或设为 0 自动选择。', 'permission-denied': '系统不允许监听此端口，请更换端口。', 'start-failed': '本机联播服务启动失败，请重试。' } as const

export function useCollabService() {
  const native = desktop?.collab
  const [state, setState] = useState(OFF), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [ready, setReady] = useState(!native)
  const [local, setLocal] = useState(() => !!native && localStorage.getItem('livliv-stage:collab-service') !== 'other')
  const [port, setPort] = useState('5234'), [network, setNetwork] = useState(true), [address, setAddress] = useState('')
  const validPort = port.trim() !== '' && Number.isInteger(Number(port)) && Number(port) >= 0 && Number(port) <= 65535
  useEffect(() => {
    if (!native) return
    let mounted = true, changed = false
    const apply = (value: CollabState) => { setState(value); setNetwork(value.network); if (value.enabled) setPort(String(value.port)) }
    const off = native.onState((value) => { if (mounted) { changed = true; apply(value); setReady(true) } })
    void native.get().then((value) => { if (mounted && !changed) { apply(value); setReady(true) } }, () => { if (mounted && !changed) setError('无法读取本机服务状态，请重新打开联播。') })
    return () => { mounted = false; off() }
  }, [native])
  const choose = (value: boolean) => { setLocal(value); setError(''); localStorage.setItem('livliv-stage:collab-service', value ? 'local' : 'other') }
  const selected = state.urls.includes(address) ? address : state.urls[0] ?? ''
  const start = async () => {
    if (!native || !ready || !validPort) return null
    setBusy(true); setError('')
    try {
      const value = await native.start({ port: Number(port), network }); setState(value)
      if (value.error) return null
      const url = value.urls.includes(address) ? address : value.urls[0]
      if (!url) { setError('未找到局域网地址，请连接网络，或停止服务后选择仅本机测试。'); return null }
      return { connect: value.localUrl!, invite: url }
    } catch { setError('本机联播服务启动失败，请重试。'); return null }
    finally { setBusy(false) }
  }
  const stop = async () => {
    if (!native) return
    setBusy(true); setError('')
    try { setState(await native.stop()) }
    catch { setError('停止服务失败，请重试。') }
    finally { setBusy(false) }
  }
  return { native: !!native, ready, state, local, choose, busy, error: error || (state.error ? errors[state.error] : ''), port, setPort, network, setNetwork, selected, setAddress, validPort, start, stop }
}

export function CollabService({ service, active, server, setServer, onStop }: { service: ReturnType<typeof useCollabService>; active: boolean; server: string; setServer(value: string): void; onStop(): Promise<void> }) {
  return <>
    {service.native && !active && <div className="seg collab-service-modes" aria-label={tr('联播连接方式')}>
      <button aria-pressed={service.local} className={service.local ? 'on' : ''} disabled={service.busy} onClick={() => service.choose(true)}>{tr('本机托管')}</button>
      <button aria-pressed={!service.local} className={!service.local ? 'on' : ''} disabled={service.busy} onClick={() => service.choose(false)}>{tr('其他服务')}</button>
    </div>}
    {service.native && (service.local || service.state.enabled) && <section className="collab-host" aria-label={tr('本机联播服务')}>
      <div className="collab-host-status"><b role="status">{tr(service.busy ? '请稍候…' : service.state.enabled ? '本机服务运行中' : '创建时自动启动本机服务')}</b>
        <button disabled={service.busy || !service.ready || (!service.state.enabled && !service.validPort)} onClick={() => void (service.state.enabled ? onStop() : service.start())}>{service.busy && <LoaderCircle size={12} className="spin" />}{tr(service.state.enabled ? '停止服务' : '启动服务')}</button></div>
      <p className="hint">{tr(service.state.enabled ? '关闭应用或重载编辑器会停止服务。' : '应用内直接托管，无需源码或额外安装 Node。')}</p>
      {service.state.enabled ? <>
        {service.state.urls.length > 0 && <label className="field"><span>{tr('朋友连接的地址')}</span><select aria-label={tr('朋友连接的地址')} value={service.selected} disabled={active} onChange={(event) => service.setAddress(event.target.value)}>{service.state.urls.map((url) => <option key={url} value={url}>{url}</option>)}</select></label>}
        <p className="hint">{tr(service.state.network ? '朋友需连接同一网络。公网访问需要另行配置。' : '仅本机测试，邀请码不能用于其他电脑。')}</p>
        {active && <p className="hint">{tr('停止服务会结束该服务上的所有联播。')}</p>}
      </> : <details className="collab-host-options"><summary>{tr('服务设置')}</summary>
        <label className="switch"><span>{tr('允许同一网络的朋友加入')}</span><input type="checkbox" checked={service.network} disabled={service.busy || !service.ready} onChange={(event) => service.setNetwork(event.target.checked)} /><i /></label>
        <p className="hint">{tr(service.network ? '朋友需连接同一网络。公网访问需要另行配置。' : '仅本机测试，邀请码不能用于其他电脑。')}</p>
        <label className="field"><span>{tr('本机端口（0 为自动）')}</span><input type="number" min={0} max={65535} value={service.port} aria-invalid={!service.validPort} disabled={service.busy} onChange={(event) => service.setPort(event.target.value)} /></label>
        {!service.validPort && <p className="error" role="alert">{tr('端口需为 0 到 65535 的整数。')}</p>}
      </details>}
    </section>}
    {!active && !service.local && <details className="collab-service"><summary>{tr('联播服务')}</summary><label className="field"><span>{tr('服务地址')}</span><input value={server} onChange={(event) => setServer(event.target.value)} placeholder="wss://…/room" spellCheck={false} /></label>
      <span className="hint">{tr(service.native ? '连接已有的自托管服务。' : '网页无法启动本机服务，请使用桌面版或填写已有服务地址。')}</span></details>}
    {service.error && <p className="hint error" role="alert">{tr(service.error)}</p>}
  </>
}
