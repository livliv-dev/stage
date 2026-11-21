import { useEffect, useState } from 'react'
import { desktop } from './desktopBridge'
import { tr } from './i18n'
import type { NeuroCharacter, NeuroState } from '../../protocol/src/neuro'

const OFF: NeuroState = { enabled: false, port: null, url: null, character: null, connections: [], error: null }
export function NeuroPanel({ characters, onStart }: { characters: NeuroCharacter[]; onStart(character: string): void | Promise<void> }) {
  const neuro = desktop?.neuro
  const [state, setState] = useState(OFF), [selected, setSelected] = useState(characters[0]?.id ?? ''), [port, setPort] = useState('8765'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false), [copied, setCopied] = useState(false)
  useEffect(() => { if (state.enabled) setExpanded(true) }, [state.enabled])
  useEffect(() => setCopied(false), [state.url])
  useEffect(() => {
    if (!neuro) return
    let mounted = true
    const off = neuro.onState(setState)
    void neuro.get().then((value) => { if (mounted) setState(value) }, (failure: unknown) => { if (mounted) setError(failure instanceof Error ? failure.message : String(failure)) })
    return () => { mounted = false; off() }
  }, [neuro])
  const character = characters.find((entry) => entry.id === selected) ?? characters[0]
  const requestedPort = Number(port), validPort = port.trim() !== '' && Number.isInteger(requestedPort) && requestedPort >= 0 && requestedPort <= 65535
  // the web: where it is in the desktop app
  if (!neuro) return <section className="neuro-panel"><h3>{tr('游戏互动')} <span className="desk-tag">{tr('桌面版')}</span></h3><p className="hint">{tr('连接支持 Neuro SDK 的游戏，让角色参与互动。')}</p></section>
  const toggle = async () => {
    setBusy(true); setError('')
    try {
      if (state.enabled) setState(await neuro.set({ enabled: false }))
      else if (character && validPort) { await onStart(character.id); setState(await neuro.set({ enabled: true, port: requestedPort, character })) }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
      void neuro.get().then(setState, (stateError: unknown) => console.error('[Neuro state after failure]', stateError))
    } finally { setBusy(false) }
  }
  return <section className="neuro-panel">
    <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary><span>{tr('游戏互动')}</span><small>{tr(state.enabled ? state.connections.length ? '已连接游戏' : '等待游戏连接' : '未开启')}</small></summary>
    <p className="hint">{tr('连接支持 Neuro SDK 的游戏，让角色参与互动。')}</p>
    <p className="hint">{tr('开始后使用公开会话，私聊记忆不会传入。')}</p>
    <label className="field"><span>{tr('参与角色')}</span><select value={character?.id ?? ''} disabled={busy || state.enabled} onChange={(event) => setSelected(event.target.value)}>
      {characters.length ? characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>) : <option value="">{tr('先添加一个 AI 角色')}</option>}
    </select></label>
    <details className="neuro-connection"><summary>{tr('连接设置')}</summary>
      <label className="field"><span>{tr('本机端口（0 为自动）')}</span><input type="number" min={0} max={65535} step={1} value={port} aria-invalid={!validPort} disabled={busy || state.enabled} onChange={(event) => setPort(event.target.value)} /></label>
    </details>
    {!validPort && <p className="error" role="alert">{tr('端口需为 0 到 65535 的整数。')}</p>}
    <button className={state.enabled ? '' : 'primary'} disabled={busy || (!state.enabled && (!character || !validPort))} onClick={() => void toggle()}>{tr(busy ? '请稍候…' : state.enabled ? '关闭游戏接口' : '开始游戏互动')}</button>
    {state.enabled && <>
      <div className="neuro-address"><label className="field"><span>{tr('连接地址')}</span><input readOnly aria-label={tr('连接地址')} value={state.url ?? ''} /></label><button disabled={!state.url} onClick={() => { void navigator.clipboard.writeText(state.url!).then(() => { setCopied(true); setError('') }, (failure: unknown) => setError(failure instanceof Error ? failure.message : String(failure))) }}>{tr(copied ? '已复制' : '复制')}</button></div>
      <p className="hint">{state.connections.length ? state.connections.map((connection) => `${connection.game} · ${tr('可用动作')} ${connection.actions}`).join(' / ') : tr('等待游戏连接')}</p>
    </>}
    {(error || state.error) && <p className="error" role="alert">{error || state.error}</p>}
    </details>
  </section>
}
