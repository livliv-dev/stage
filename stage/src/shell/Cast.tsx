// The cast under the tools: who is on the stage and what each is doing, with 请朋友上台; and the status line for a
// stage you perform alone.
import { useEffect, useState, type ReactNode } from 'react'
import { Users, Volume2, VolumeX, StepForward } from 'lucide-react'
import { talk, useConversation } from '../conversation'
import { participants, store, useScene } from '../scene'
import { cancel as pttCancel, release as pttRelease, usePtt } from '../ptt'
import { actors, onActors } from '../actors'
import { tr } from '../i18n'
import { useRoom } from '../collab/session'
import { faceCharacter } from '../control'

/** 好友联播's state where it is entered: on (a dot), and friends asking to join (how many) */
export function FriendState() {
  const collab = useRoom()
  return <span className="friend-state">{collab.phase === 'on' && <i className="live-dot on" />}{collab.pending.length > 0 && <span className="room-count" title={tr('等你接纳')}>{collab.pending.length}</span>}</span>
}

/** who is in the conversation, in the order they'd speak, and what each is doing. A click: this one speaks next (or,
 *  one you play, the console speaks as it); a right click takes it off the stage or back */
export function Cast({ guide, onFriend, friendOn }: { guide: ReactNode; onFriend?: () => void; friendOn?: boolean }) {
  const { scene, selected } = useScene(), conv = useConversation()
  const cast = scene.items.filter((i) => i.kind === 'character')
  return <aside className="cast card" onPointerDown={(e) => e.stopPropagation()} aria-label={tr("角色列表")}>
    <div className="cast-scroll">
      <header><span className="title">{tr('cast.title')}</span><span className="hint num">{cast.length}</span></header>
    <div id="stage-cast-list">
      {!cast.length && <p className="hint">{tr("还没有角色")}</p>}
      {cast.map((c) => {
        const state = c.remote ? (c.hidden ? tr("已隐藏") : tr("朋友 · ") + c.remote.person) : conv.speaking?.who === c.id ? tr("正在说话") : conv.thinking === c.id ? tr("正在思考") : conv.waiting === c.id ? tr("轮到你") : c.hidden ? tr("已隐藏") : c.lines === 'ai' ? 'AI' : c.lines === 'me' ? tr("我来演") : tr("只展示")
        return <div className={'actor-row' + (selected === c.id ? ' selected' : '') + (c.hidden ? ' hidden' : '')} key={c.id}>
          <button className="actor-select" onClick={() => store.select(c.id)} onContextMenu={(e) => { e.preventDefault(); store.patch(c.id, { hidden: !c.hidden }) }}>
            <i style={{ background: c.color }} /><span><b>{c.name}</b><small>{state}</small></span>
          </button>
          <button className="icon" aria-label={c.name + (c.muted ? tr("取消静音") : tr("静音"))} title={tr("静音角色声音")} onClick={() => store.patch(c.id, { muted: !c.muted })}>{c.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
          {c.lines === 'ai' && <button className="icon" title={tr("让 {0} 接着说", c.name)} onClick={() => talk.nextUp(c.id)}><StepForward size={15} /></button>}
        </div>
      })}
    </div>
    </div>
    {/* 好友联播 is a way onto the stage: a friend's character comes on as one of the cast */}
    {onFriend && <button className={`cast-friend${friendOn ? ' on' : ''}`} onClick={onFriend}><Users size={15} />{tr('请朋友上台')}<FriendState /></button>}
    {guide && <div className="cast-guide">{guide}</div>}
  </aside>
}

export function SoloStatus() {
  const { scene } = useScene(), ptt = usePtt(), [, redraw] = useState(0)
  useEffect(() => { const off = onActors(() => redraw((n) => n + 1)), timer = setInterval(() => redraw((n) => n + 1), 500); return () => { off(); clearInterval(timer) } }, [])
  const cast = participants(scene)
  if (!cast.length) return null
  // the one 开播 put on the stage, else the first you play (in sight first)
  const human = cast.find((c) => c.id === faceCharacter() && !c.hidden) ?? cast.find((c) => c.lines === 'me' && !c.hidden) ?? cast.find((c) => c.lines === 'me')
  const actor = human && actors.get(human.id), track = actor?.tracking
  const label = actor?.inputPhase === 'error' ? actor.error : actor?.away ? tr("暂离中，按 B 回来") : actor?.inputPhase === 'opening' ? tr("正在连接摄像头…")
    : track ? track.face ? tr("面捕已连接") : tr("未识别到面部") : tr("画面实时更新")
  return <div className="solo-status"><span><i className={'live-dot' + (ptt.phase !== 'idle' ? ' recording' : actor?.away || (track && !track.face) ? ' waiting' : '')} />{ptt.phase === 'listening' ? tr("正在听…") : ptt.phase === 'opening' ? tr("正在打开麦克风…") : ptt.phase === 'recognizing' ? tr("正在识别…") : label}</span>
    {ptt.phase !== 'idle' ? <button onClick={ptt.phase === 'listening' ? () => void pttRelease() : pttCancel}>{ptt.phase === 'listening' ? tr("结束语音输入") : tr("取消")}</button> : track?.face && <button onClick={() => actor?.calibrate()}>{tr("校准正面")}</button>}
    {ptt.error && <span className="error">{tr(ptt.error ?? '')}</span>}</div>
}
