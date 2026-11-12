import { tr } from './i18n'
import { AudienceActions } from './AudienceActions'
import { useState } from 'react'
import { X } from 'lucide-react'
import { blockUser, connectTwitch, disconnect, simulate, useChat } from './danmaku'
import { store, useScene } from './scene'

export function AudiencePanel({ preferences = false, heading = true }: { preferences?: boolean; heading?: boolean }) {
  const { scene } = useScene(), chat = useChat()
  const [channel, setChannel] = useState(chat.channel), [test, setTest] = useState('')
  const send = () => { if (test.trim()) { simulate(tr("测试观众"), test); setTest('') } }
  return <section className="section audience-panel">
    {heading && <h3>{tr("观众弹幕")}</h3>}
    <div className="row">
      <input value={channel} placeholder={tr("Twitch 频道名")} aria-label={tr("Twitch 频道名")} onChange={(e) => setChannel(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') connectTwitch(channel) }} />
      {chat.status === 'on' || chat.status === 'connecting' ? <button onClick={disconnect}>{tr("断开")}</button> : <button disabled={!channel.trim()} onClick={() => connectTwitch(channel)}>{tr("连接")}</button>}
    </div>
    {chat.status === 'on' && <p className="hint ok">{tr("已连接 twitch.tv/")}{chat.channel} {tr("· 只读取公开聊天")}</p>}
    {chat.status === 'connecting' && <p className="hint">{chat.error || tr("正在连接…")}</p>}
    {chat.status === 'error' && <p className="hint error">{tr(chat.error ?? '')}</p>}
    {preferences && <label className="field spaced"><span>{tr("对谈时回应弹幕")}</span><select value={scene.talk.danmaku} onChange={(e) => store.setTalk({ danmaku: +e.target.value as 0 | 1 | 2 })}>
      <option value={0}>{tr("不回")}</option><option value={1}>{tr("偶尔")}</option><option value={2}>{tr("积极")}</option>
    </select></label>}
    <AudienceActions />
    <details className="test-chat"><summary>{tr("试发一条弹幕")}</summary><div className="row spaced">
      <input value={test} placeholder={tr("模拟一条弹幕")} aria-label={tr("模拟一条弹幕")} onChange={(e) => setTest(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send() }} />
      <button disabled={!test.trim()} onClick={send}>{tr("发送")}</button>
    </div></details>
    {chat.recent.length > 0 && <ul className="chat">{chat.recent.slice(-5).map((message) => <li key={message.id}><div><b>{message.user}</b><span>{message.text}</span></div><button className="link" title={tr("屏蔽 ") + message.user} onClick={() => blockUser(message.user)}>{tr("屏蔽")}</button></li>)}</ul>}
    {chat.blocked.length > 0 && <details className="blocked"><summary>{tr("已屏蔽")} {chat.blocked.length} {tr("位观众")}</summary>{chat.blocked.map((user) => <button className="chip" key={user} title={tr("点击解除屏蔽")} onClick={() => blockUser(user)}>{user} ×</button>)}</details>}
  </section>
}

export function AudiencePopover({ onClose }: { onClose: () => void }) {
  return <div className="card popover audience-settings" onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr('观众弹幕')}</span><button className="icon" data-close="true" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
    <div className="audience-body"><AudiencePanel heading={false} /></div>
  </div>
}
