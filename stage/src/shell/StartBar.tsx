// The one start button, named by the goal, and beside it the three rows that set the start: 谁上场 (who takes part, and
// how: you, AI, shown only), 谁在看 (only you, or a 直播间 with Twitch or without chat), 你参与吗. Limits and Twitch
// live here and nowhere else; the rest of the talk rules (language, depth, order, interrupting, pace, what a 直播间
// does without chat) are folded under the rows.
import { useRef } from 'react'
import { ChevronDown, Play, X } from 'lucide-react'
import { tr } from '../i18n'
import { useConversation, talk } from '../conversation'
import { useChat } from '../danmaku'
import { AudiencePanel } from '../AudiencePanel'
import { participants, store, useScene, ORDERS, type Goal } from '../scene'
import { CONTROLS, controlOf, controlSettings } from '../workflow'
import { AUDIENCES, YOUS, optionsOf, startLabel, youHint, type StartOptions } from './goals'
import { firstLineStart, planNow } from './start'
import { chatSourceOn, liveSetup, useLiveSetup, warmupFor } from './liveSetup'

export function StartButton({ goal, partner, onStart }: { goal: Goal; partner: boolean; onStart: () => void }) {
  const { scene } = useScene(), conv = useConversation(), options = optionsOf(scene.talk, goal, partner), label = startLabel(goal, partner, options)
  if (!label) return null
  const plan = planNow(goal, options)
  return <button className="primary start-button" disabled={conv.running || 'blocked' in plan} title={'blocked' in plan ? tr(plan.blocked) : undefined} onClick={onStart}><Play size={14} />{tr(label)}</button>
}

/** the three rows, short, beside the button: a click opens them in full */
export function StartRows({ goal, partner, open, onToggle }: { goal: Goal; partner: boolean; open: boolean; onToggle: () => void }) {
  const { scene } = useScene(), options = optionsOf(scene.talk, goal, partner)
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
  const { scene } = useScene(), conv = useConversation(), chat = useChat(), live = useLiveSetup()
  const t = scene.talk, options = optionsOf(t, goal, partner)
  const set = (change: Partial<StartOptions>) => store.setTalk({ ...options, ...change })
  const cast = participants(scene).filter((c) => !c.remote), ai = cast.filter((c) => c.lines === 'ai').length
  const plan = planNow(goal, options)
  const reason = (you: StartOptions['you']) => { const p = planNow(goal, { ...options, you }); return 'blocked' in p && /语音识别|我来演/.test(p.blocked) ? p.blocked : '' }
  const lines = options.audience === 'me' && options.you === 'none', toRoom = options.audience === 'live'
  const limitRef = useRef<HTMLInputElement>(null)
  return <div className="card popover start-options" role="dialog" aria-label={tr('开始选项')} onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr('开始选项')}</span><button className="icon" data-close="true" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
    {/* the console's field takes your first line here: the topic is set in the options */}
    {firstLineStart(goal, options) && <section className="option-topic"><label className="field"><span>{tr('话题')}</span><input value={scene.topic} placeholder={tr('话题，比如：周末去哪儿玩')} onChange={(e) => store.set({ topic: e.target.value })} /></label></section>}
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
      {options.audience === 'live' && <div className="twitch-row"><p className="hint">{tr('Twitch 频道（可选，只读弹幕，不需要登录）')}</p><AudiencePanel heading={false} /></div>}
    </section>
    <section className="option-row">
      <h3>{tr('你参与吗')}</h3>
      <div className="seg">{YOUS.map((y) => { const why = reason(y.id); return <button key={y.id} className={options.you === y.id ? 'on' : ''} disabled={conv.running || !!why} title={tr(why || youHint(y.id, options.audience, ai))} onClick={() => set({ you: y.id })}>{tr(y.label)}</button> })}</div>
      <p className="hint">{tr(youHint(options.you, options.audience, ai))}</p>
    </section>
    <section className="option-row limits">
      <h3>{tr('上限')}</h3>
      {/* a 直播间 keeps its own limits (30 minutes unless changed, a minute at the least); a chat its own (60) */}
      {toRoom ? <label className="field"><span>{tr('时长')}</span><select value={live.minutes} disabled={conv.running} onChange={(e) => liveSetup.set({ minutes: +e.target.value })}>{[1, 15, 30, 60, 120].map((m) => <option key={m} value={m}>{tr('{0} 分钟', m)}</option>)}</select></label>
        : !lines && <label className="field"><span>{tr('时长')}</span><select value={t.chatMinutes ?? 60} disabled={conv.running} onChange={(e) => store.setTalk({ chatMinutes: +e.target.value })}>{[15, 30, 60, 120].map((m) => <option key={m} value={m}>{tr('{0} 分钟', m)}</option>)}</select></label>}
      <label className="field"><span>{tr('最多几句')}</span><input ref={limitRef} type="number" min={1} max={lines ? 60 : 500} disabled={conv.running} value={toRoom ? live.maxGenerations : lines ? conv.limit : t.chatGenerations ?? 100}
        onChange={(e) => { const n = +e.target.value; if (!Number.isInteger(n) || n < 1) return; if (toRoom) { if (n <= 500) liveSetup.set({ maxGenerations: n }) } else if (lines) talk.setLimit(n); else if (n <= 500) store.setTalk({ chatGenerations: n }) }} /></label>
    </section>
    <details className="advanced"><summary>{tr('更多：语言、节奏、谁先说')}</summary>
      <label className="field"><span>{tr('说什么语言')}</span><select value={t.language} onChange={(e) => store.setTalk({ language: e.target.value as typeof t.language })}><option value="auto">{tr('跟话题一样')}</option><option value="zh">{tr('中文')}</option><option value="en">English</option><option value="ja">{tr('日本語')}</option></select></label>
      <div className="field"><span>{tr('聊天方式')}</span><div className="seg">{([['casual', '日常陪聊'], ['discussion', '深入讨论']] as const).map(([id, label]) => <button key={id} className={(t.depth ?? 'casual') === id ? 'on' : ''} onClick={() => store.setTalk({ depth: id })}>{tr(label)}</button>)}</div></div>
      <p className="hint">{tr(t.depth === 'discussion' ? '围绕观点和理由继续聊，回复可以更充分。' : '轻松接话，回复简短自然。')}</p>
      {options.audience === 'live'
        ? <label className="field"><span>{tr('没有弹幕时')}</span><select aria-label={tr('没有弹幕时')} value={warmupFor(live, chatSourceOn(chat.status))} onChange={(e) => liveSetup.set({ warmupSeconds: +e.target.value as 0 | 30 | 60 | 120 })}><option value={0}>{tr('安静等待')}</option><option value={30}>{tr('每 30 秒聊一句')}</option><option value={60}>{tr('每分钟聊一句')}</option><option value={120}>{tr('每 2 分钟聊一句')}</option></select></label>
        : options.you !== 'none' && <><label className="field"><span>{tr('主动接话')}</span><select value={t.proactiveSeconds ?? 0} onChange={(e) => store.setTalk({ proactiveSeconds: +e.target.value })}><option value={0}>{tr('等我说话')}</option>{[30, 60, 120].map((s) => <option key={s} value={s}>{tr('安静 {0} 秒后接话', s)}</option>)}</select></label>
          <p className="hint">{tr('没有回应时最多主动接话一次，然后继续等待。')}</p></>}
      <div className="field"><span>{tr('谁先说、谁接话')}</span><div className="seg">{ORDERS.map((o) => <button key={o.id} className={t.order === o.id ? 'on' : ''} title={tr(o.hint)} onClick={() => store.setTalk({ order: o.id, host: o.id === 'host' ? t.host ?? cast[0]?.id ?? null : t.host })}>{tr(o.label)}</button>)}</div></div>
      {t.order === 'host' && <label className="field"><span>{tr('主持人')}</span><select value={t.host ?? ''} onChange={(e) => store.setTalk({ host: e.target.value || null })}>{cast.filter((c) => c.lines !== 'none').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      <div className="field"><span>{tr('AI 抢话')}</span><div className="seg">{([[0, '不抢'], [1, '偶尔'], [2, '经常']] as const).map(([id, label]) => <button key={id} className={t.interrupt === id ? 'on' : ''} onClick={() => store.setTalk({ interrupt: id })}>{tr(label)}</button>)}</div></div>
      <div className="field"><span>{tr('角色之间聊时，你在控制台说话')}</span><div className="seg">{([['wait', '等这句说完'], ['cut', '立刻打断']] as const).map(([id, label]) => <button key={id} className={(t.cutIn ? 'cut' : 'wait') === id ? 'on' : ''} onClick={() => store.setTalk({ cutIn: id === 'cut' })}>{tr(label)}</button>)}</div></div>
      <label className="field"><span>{tr('句子之间停多久')}<b className="num"> {tr('{0} 秒', conv.gap.toFixed(1))}</b></span><input type="range" min={0} max={3} step={0.1} value={conv.gap} onChange={(e) => talk.setGap(+e.target.value)} /></label>
      {chat.status === 'on' && <label className="field"><span>{tr('角色之间聊时回应弹幕')}</span><select value={t.danmaku} onChange={(e) => store.setTalk({ danmaku: +e.target.value as 0 | 1 | 2 })}><option value={0}>{tr('不回')}</option><option value={1}>{tr('偶尔')}</option><option value={2}>{tr('积极')}</option></select></label>}
    </details>
    {'blocked' in plan && <p className="hint error" role="alert">{tr(plan.blocked)}</p>}
  </div>
}
