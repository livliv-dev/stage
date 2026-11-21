import { tr } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { Check, Copy, LoaderCircle, Mic, MicOff, UserPlus, Volume2, VolumeX, X } from 'lucide-react'
import { actors, onActors } from './actors'
import { participants, useScene } from './scene'
import { voiceRoute } from './voiceApi'
import { decodeInvite } from './collab/protocol'
import { room, useRoom, type PeerState } from './collab/session'
import { unlockSounds, useAudioBlocked } from './collab/streams'
import { CollabService, useCollabService } from './CollabService'

const relayOf = (code: string) => { try { return new URL(decodeInvite(code).server).host } catch { return '' } }
const statusOf = (peer: PeerState) => peer.phase === 'ready' ? tr("已同台") : peer.phase === 'receiving' ? tr("接收角色 {0}%", Math.round(peer.progress * 100)) : peer.phase === 'loading' ? tr("载入角色") : peer.phase === 'error' ? peer.error : tr("正在连接")
export function CollabPanel({ onClose, onSettings }: { onClose: () => void; onSettings: () => void }) {
  const { scene, selected } = useScene(), state = useRoom(), blocked = useAudioBlocked()
  const service = useCollabService()
  const attempt = useRef(0)
  useEffect(() => () => { attempt.current++ }, [])
  const [, redraw] = useState(0)
  useEffect(() => onActors(() => redraw((value) => value + 1)), [])
  const cast = participants(scene).filter((character) => !character.remote)
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState(() => localStorage.getItem('livliv-stage:person') || '')
  const [characterId, setCharacter] = useState(() => cast.some((character) => character.id === selected) ? selected! : cast[0]?.id || '')
  const [microphone, setMicrophone] = useState(true)
  const [server, setServer] = useState(() => localStorage.getItem('livliv-stage:relay') || 'ws://127.0.0.1:5234/room')
  const [invite, setInvite] = useState(''), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState('')
  const current = cast.find((character) => character.id === characterId), relay = tab === 'join' ? relayOf(invite) : ''
  const active = state.phase === 'on' || state.phase === 'waiting' || state.phase === 'connecting'
  const start = async () => {
    const currentAttempt = ++attempt.current
    localStorage.setItem('livliv-stage:person', name.trim()); localStorage.setItem('livliv-stage:relay', server.trim())
    if (tab === 'create') {
      const address = service.local ? await service.start() : { connect: server, invite: server }
      if (address && currentAttempt === attempt.current) room.create(address.connect, name, characterId, microphone, address.invite)
    }
    else room.join(invite, name, characterId, microphone)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(state.invite); setCopied(true); setCopyError(''); setTimeout(() => setCopied(false), 2000) }
    catch { setCopyError(tr("复制未完成，请选中邀请码复制")) }
  }
  const stopService = async () => {
    if ((service.local && state.role === 'host') || (state.invite && [service.state.localUrl, ...service.state.urls].includes(decodeInvite(state.invite).server))) room.leave()
    await service.stop()
  }
  return <div className="card popover collab-panel" role="dialog" aria-label={tr("好友联播")} onPointerDown={(event) => event.stopPropagation()}>
    <header className="card-head"><div><h2>{tr("好友联播")}</h2><p className="hint">{tr("各自演自己的角色，一起同台")}</p></div><button className="icon" data-close="true" aria-label={tr("关闭")} onClick={onClose}><X size={16} /></button></header>
    {!active ? <>
      <div className="seg collab-tabs"><button disabled={service.busy} className={tab === 'create' ? 'on' : ''} onClick={() => setTab('create')}>{tr("邀请朋友")}</button><button disabled={service.busy} className={tab === 'join' ? 'on' : ''} onClick={() => setTab('join')}>{tr("加入好友联播")}</button></div>
      <label className="field"><span>{tr("你的名字")}</span><input disabled={service.busy} value={name} maxLength={24} placeholder={tr("朋友怎么称呼你")} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span>{tr("分享哪个角色")}</span><select disabled={service.busy} value={current ? characterId : ''} onChange={(event) => setCharacter(event.target.value)}><option value="" disabled>{tr("选择自己的角色")}</option>{cast.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      {!cast.length && <p className="hint">{tr("先在舞台上添加一个角色。")}</p>}
      {current && <div className="share-summary"><span>{tr("角色动作")} <b>{tr("同步")}</b></span><span>{tr("角色声音")} <b>{voiceRoute(current) === 'system' ? tr("系统朗读 · 仅本机") : voiceRoute(current) === 'none' ? tr("未启用") : tr("同步")}</b></span>{voiceRoute(current) === 'system' && <button className="link" onClick={onSettings}>{tr("接入语音接口")}</button>}</div>}
      <label className="switch collab-microphone"><span><Mic size={15} />{tr("分享麦克风")}</span><input type="checkbox" checked={microphone} disabled={service.busy} onChange={(event) => setMicrophone(event.target.checked)} /><i /></label>
      {tab === 'join' ? <><label className="field"><span>{tr("朋友的邀请码")}</span><textarea rows={3} value={invite} placeholder={tr("粘贴邀请码")} onChange={(event) => setInvite(event.target.value)} spellCheck={false} /></label>{relay && <p className="hint">{tr("将连接好友联播服务 {0}", relay)}</p>}</> : <CollabService service={service} active={false} server={server} setServer={setServer} onStop={stopService} />}
      <p className="hint share-consent">{tr("所选角色文件会分享给加入的朋友。")}</p>
      {state.error && <p className="hint error" role="alert">{tr(state.error ?? '')}</p>}
      <button className="primary collab-start" disabled={service.busy || !name.trim() || !current || actors.get(current.id)?.status !== 'ready' || (tab === 'join' ? !invite.trim() : service.local && (!service.ready || !service.validPort))} onClick={() => void start()}>{service.busy ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />}{tab === 'create' ? tr("分享并创建好友联播") : tr("分享并申请加入")}</button>
    </> : <>
      {service.native && service.state.enabled && <CollabService service={service} active server={server} setServer={setServer} onStop={stopService} />}
      {state.phase === 'on' ? <>
        {state.role === 'host' && <div className="invite-code"><label className="field"><span>{tr("邀请码")}</span><input aria-label={tr("邀请码")} readOnly value={state.invite} onFocus={(event) => event.target.select()} /></label><button onClick={() => void copy()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? tr("已复制") : tr("复制邀请")}</button>{copyError && <p className="hint error">{copyError}</p>}</div>}
        {!!state.pending.length && <div className="collab-pending"><h3>{tr("申请加入")}</h3>{state.pending.map((person) => <div className="room-member" key={person.id}><b>{person.name}</b><button className="primary" disabled={state.members.length >= 4} onClick={() => room.admit(person.id)}>{tr("接纳")}</button><button className="icon" aria-label={tr("拒绝 ") + person.name} onClick={() => room.remove(person.id)}><X size={15} /></button></div>)}</div>}
        <div className="room-members" aria-label={tr("好友联播成员")}>{state.members.map((person) => <div className="room-member" key={person.id}><span className={'room-avatar ' + person.phase}>{person.name.slice(0, 1)}</span><div className="room-person"><b>{person.name}{person.id === state.id && <small>{tr("你")}</small>}{person.host && <small>{tr("房主")}</small>}</b><span className={person.phase === 'error' ? 'hint error' : 'hint'}>{person.id === state.id ? tr("正在分享角色") : statusOf(person)}</span></div>{person.id !== state.id && <><button className="icon" aria-label={(person.muted ? tr("听到 ") : tr("静音 ")) + person.name} onClick={() => room.mute(person.id)}>{person.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>{state.role === 'host' && <button className="icon" aria-label={tr("移除 ") + person.name} onClick={() => room.remove(person.id)}><X size={15} /></button>}</>}</div>)}</div>
        {blocked && <button className="primary" onClick={unlockSounds}><Volume2 size={15} />{tr("启用朋友的声音")}</button>}
        <button className={state.microphone ? 'mic-share on' : 'mic-share'} onClick={() => room.mic(!state.microphone)}>{state.microphone ? <Mic size={16} /> : <MicOff size={16} />}{state.microphone ? tr("麦克风已开启") : tr("麦克风已关闭")}</button>
        {state.microphoneError && <div className="room-mic-error"><p className="hint error">{state.microphoneError}</p><button onClick={() => room.mic(true)}>{tr("重试麦克风")}</button></div>}
      </> : <div className="room-wait"><LoaderCircle className="spin" size={22} /><b>{state.phase === 'waiting' ? tr("等待房主接纳") : tr("正在连接好友联播")}</b></div>}
      <footer className="room-footer"><span className="hint">{state.members.length ? tr("{0} / 4 人", state.members.length) : tr("好友联播")}</span><button className="danger" onClick={() => room.leave()}>{state.role === 'host' ? tr("结束好友联播") : tr("离开好友联播")}</button></footer>
    </>}
  </div>
}
