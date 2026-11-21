// The one start button, named by the goal, and beside it the three rows that set the start: 谁上场 (who takes part, and
// how: you, AI, shown only), 谁在看 (only you, or a 直播间 with Twitch or without chat), 你参与吗. Limits and Twitch
// live here and nowhere else; the rest of the talk rules are folded under the rows.
import { useRef, useState } from 'react'
import { ChevronDown, Play, X } from 'lucide-react'
import { tr } from '../i18n'
import { useConversation, talk } from '../conversation'
import { connectTwitch, disconnect, useChat } from '../danmaku'
import { participants, store, useScene, ORDERS, type Goal } from '../scene'
import { CONTROLS, controlOf, controlSettings } from '../workflow'
import { AUDIENCES, YOUS, optionsOf, startLabel, type StartOptions } from './goals'
import { planNow } from './start'

export function StartButton({ goal, partner, onStart }: { goal: Goal; partner: boolean; onStart: () => void }) {
  const { scene } = useScene(), conv = useConversation(), label = startLabel(goal, partner)
  if (!label) return null
  const plan = planNow(goal, optionsOf(scene.talk, partner))
  return <button className="primary start-button" disabled={conv.running || 'blocked' in plan} title={'blocked' in plan ? tr(plan.blocked) : undefined} onClick={onStart}><Play size={14} />{tr(label)}</button>
}

/** the three rows, short, beside the button: a click opens them in full */
export function StartRows({ partner, open, onToggle }: { partner: boolean; open: boolean; onToggle: () => void }) {
  const { scene } = useScene(), options = optionsOf(scene.talk, partner)
  const cast = participants(scene).filter((c) => !c.remote && c.lines !== 'none')
  const who = cast.length ? cast.map((c) => c.name).join('、') : tr('还没有')
  return <button className={`start-rows${open ? ' on' : ''}`} aria-expanded={open} aria-label={tr('开始选项')} onClick={onToggle}>
    <span title={tr('谁上场')}>{who}</span>
    <span title={tr('谁在看')}>{tr(AUDIENCES.find((a) => a.id === options.audience)!.label)}</span>
    <span title={tr('你参与吗')}>{tr(YOUS.find((y) => y.id === options.you)!.label)}</span>
    <ChevronDown size={13} />
  </button>
}

export function StartOptionsCard({ goal, partner, onClose }: { goal: Goal; partner: boolean; onClose: () => void }) {
  const { scene } = useScene(), conv = useConversation(), chat = useChat()
  const t = scene.talk, options = optionsOf(t, partner)
  const set = (change: Partial<StartOptions>) => store.setTalk({ ...options, ...change })
  const cast = participants(scene).filter((c) => !c.remote)
  const plan = planNow(goal, options)
  const reason = (you: StartOptions['you']) => { const p = planNow(goal, { ...options, you }); return 'blocked' in p && /语音识别|我来演/.test(p.blocked) ? p.blocked : '' }
  const [channel, setChannel] = useState(chat.channel)
  const lines = options.audience === 'me' && options.you === 'none'
  const limitRef = useRef<HTMLInputElement>(null)
  return <div className="card popover start-options" role="dialog" aria-label={tr('开始选项')} onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr('开始选项')}</span><button className="icon" data-close="true" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
    <section className="option-row">
      <h3>{tr('谁上场')}</h3>
      {!cast.length && <p className="hint">{tr('舞台上还没有角色')}</p>}
      {cast.map((c) => <div className="who" key={c.id}><b>{c.name}</b>
        <div className="seg">{CONTROLS.map((x) => <button key={x.id} className={controlOf(c) === x.id ? 'on' : ''} disabled={conv.running} title={tr(x.hint)} onClick={() => { store.patch(c.id, controlSettings(x.id)); if (x.id === 'me') talk.setAs(c.id) }}>{tr(x.label)}</button>)}</div>
      </div>)}
    </section>
    <section className="option-row">
      <h3>{tr('谁在看')}</h3>
      <div className="seg">{AUDIENCES.map((a) => <button key={a.id} className={options.audience === a.id ? 'on' : ''} disabled={conv.running} title={tr(a.hint)} onClick={() => set({ audience: a.id })}>{tr(a.label)}</button>)}</div>
      {options.audience === 'live' && <div className="twitch-row">
        <label className="field"><span>{tr('Twitch 频道')}</span><input value={channel} placeholder={tr('不接弹幕也能开播')} onChange={(e) => setChannel(e.target.value)} /></label>
        {chat.status === 'on' || chat.status === 'connecting' ? <button onClick={disconnect}>{tr(chat.status === 'on' ? '断开' : '取消')}</button>
          : <button disabled={!channel.trim()} onClick={() => connectTwitch(channel.trim())}>{tr('连接')}</button>}
        <small className={`hint${chat.status === 'error' ? ' error' : ''}`}>{chat.status === 'on' ? tr('已连接 {0}', chat.channel) : chat.status === 'error' ? chat.error : chat.status === 'connecting' ? tr('正在连接…') : tr('只读弹幕，不需要登录')}</small>
      </div>}
    </section>
    <section className="option-row">
      <h3>{tr('你参与吗')}</h3>
      <div className="seg">{YOUS.map((y) => { const why = reason(y.id); return <button key={y.id} className={options.you === y.id ? 'on' : ''} disabled={conv.running || !!why} title={tr(why || y.hint)} onClick={() => set({ you: y.id })}>{tr(y.label)}</button> })}</div>
      <p className="hint">{tr(YOUS.find((y) => y.id === options.you)!.hint)}</p>
    </section>
    <section className="option-row limits">
      <h3>{tr('上限')}</h3>
      {!lines && <label className="field"><span>{tr('时长')}</span><select value={t.chatMinutes ?? 60} disabled={conv.running} onChange={(e) => store.setTalk({ chatMinutes: +e.target.value })}>{[15, 30, 60, 120].map((m) => <option key={m} value={m}>{tr('{0} 分钟', m)}</option>)}</select></label>}
      <label className="field"><span>{tr('最多几句')}</span><input ref={limitRef} type="number" min={1} max={lines ? 60 : 500} disabled={conv.running} value={lines ? conv.limit : t.chatGenerations ?? 100}
        onChange={(e) => { const n = +e.target.value; if (!Number.isInteger(n) || n < 1) return; if (lines) talk.setLimit(n); else if (n <= 500) store.setTalk({ chatGenerations: n }) }} /></label>
    </section>
    <details className="advanced"><summary>{tr('更多：语言、节奏、谁先说')}</summary>
      <label className="field"><span>{tr('说什么语言')}</span><select value={t.language} onChange={(e) => store.setTalk({ language: e.target.value as typeof t.language })}><option value="auto">{tr('跟话题一样')}</option><option value="zh">{tr('中文')}</option><option value="en">English</option><option value="ja">{tr('日本語')}</option></select></label>
      <div className="field"><span>{tr('聊天方式')}</span><div className="seg">{([['casual', '日常陪聊'], ['discussion', '深入讨论']] as const).map(([id, label]) => <button key={id} className={(t.depth ?? 'casual') === id ? 'on' : ''} onClick={() => store.setTalk({ depth: id })}>{tr(label)}</button>)}</div></div>
      <div className="field"><span>{tr('谁先说、谁接话')}</span><div className="seg">{ORDERS.map((o) => <button key={o.id} className={t.order === o.id ? 'on' : ''} title={tr(o.hint)} onClick={() => store.setTalk({ order: o.id })}>{tr(o.label)}</button>)}</div></div>
      <div className="field"><span>{tr('AI 抢话')}</span><div className="seg">{([[0, '不抢'], [1, '偶尔'], [2, '经常']] as const).map(([id, label]) => <button key={id} className={t.interrupt === id ? 'on' : ''} onClick={() => store.setTalk({ interrupt: id })}>{tr(label)}</button>)}</div></div>
      <label className="field"><span>{tr('主动接话')}</span><select value={t.proactiveSeconds ?? 0} onChange={(e) => store.setTalk({ proactiveSeconds: +e.target.value })}><option value={0}>{tr('等我说话')}</option>{[30, 60, 120].map((s) => <option key={s} value={s}>{tr('安静 {0} 秒后接话', s)}</option>)}</select></label>
    </details>
    {'blocked' in plan && <p className="hint error" role="alert">{tr(plan.blocked)}</p>}
  </div>
}
