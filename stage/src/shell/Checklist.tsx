// A goal's 准备清单, over the console: each item with where it stands, a test that says what went wrong in words, and a
// way into the right setting (which comes back here).
import { useEffect, useRef, useState } from 'react'
import { Check as Tick, CircleAlert, ChevronRight, ExternalLink, LoaderCircle, Minus, X } from 'lucide-react'
import { tr } from '../i18n'
import { actors } from '../actors'
import { brainReady, loadBrainConfig, modelOf, testModel, useBrainConfig } from '../brain'
import { useConversation } from '../conversation'
import { participants, store, type Goal } from '../scene'
import { GOALS } from './goals'
import { readiness, type Check, type CheckId } from './checks'
import { useChecks } from './useChecks'

/** where an item is set: the connections page, the character card (who plays it, or its voice), the start options, the
 *  直播间 card (a game, in the desktop app), the general settings; 实时通话 once set up opens its own card, where the call
 *  starts */
export type Fix = 'connect:model' | 'connect:speech' | 'connect:realtime' | 'realtime' | 'live-room' | 'character:who' | 'character:voice' | 'options' | 'settings:general'
const FIX: Partial<Record<CheckId, Fix>> = {
  model: 'connect:model', voice: 'character:voice', 'record-voice': 'character:voice', camera: 'character:who', microphone: 'character:who',
  phone: 'settings:general', twitch: 'options', game: 'live-room', hearing: 'connect:speech', realtime: 'realtime',
}
const TESTS: CheckId[] = ['model', 'voice', 'record-voice', 'camera']

export function Checklist({ goal, partner, startLabel, onStart, onFix, onClose }: { goal: Goal; partner: boolean; startLabel: string | null; onStart: () => void; onFix: (fix: Fix) => void; onClose: () => void }) {
  const checks = useChecks(goal, partner), { ready, of } = readiness(checks), conv = useConversation()
  // livliv.ai's text is tested by using it: a test would be a paid call
  const paidText = useBrainConfig().kind === 'livliv'
  const title = GOALS.find((g) => g.id === goal)!.label
  return <div className="card popover checklist" role="dialog" aria-label={tr('准备清单')} onPointerDown={(e) => e.stopPropagation()}>
    <header><span className="title">{tr(title)}{partner && <small>{tr('和 AI 搭档')}</small>}</span><span className="hint num">{tr('准备 {0}/{1}', ready, of)}</span><button className="icon" data-close="true" aria-label={tr('收起')} onClick={onClose}><X size={16} /></button></header>
    <ol className="checks">{checks.map((check) => { const fix = check.id === 'twitch' && goal === 'perform' && !partner ? 'live-room' : FIX[check.id]; return <CheckRow key={check.id} check={check} onFix={fix ? () => onFix(fix) : undefined} test={TESTS.includes(check.id) && !(check.id === 'model' && paidText)} /> })}</ol>
    <footer className="row end">
      {startLabel ? <button className="primary" disabled={conv.running} onClick={onStart}>{tr(startLabel)}</button> : <span className="hint">{tr('准备好后点上方的「输出到 OBS」')}</span>}
    </footer>
  </div>
}

function CheckRow({ check, onFix, test }: { check: Check; onFix?: () => void; test: boolean }) {
  const [st, setSt] = useState<{ busy?: boolean; ok?: string; err?: string }>({})
  const run = useRef<AbortController | null>(null)
  useEffect(() => () => run.current?.abort(), [])
  const go = async () => {
    run.current?.abort(); const controller = new AbortController(); run.current = controller
    setSt({ busy: true })
    try { setSt({ ok: await testItem(check.id, controller.signal) }) }
    catch (error) { if (!controller.signal.aborted) setSt({ err: (error as Error).message }) }
  }
  const icon = check.state === 'ok' ? <Tick size={12} /> : check.state === 'todo' ? <CircleAlert size={12} /> : check.state === 'warn' ? <CircleAlert size={12} /> : <Minus size={12} />
  return <li className={`check ${check.state}`}>
    <i aria-hidden="true">{icon}</i>
    <span className="check-text"><b>{tr(check.label)}{check.desktop && <span className="desk-tag">{tr('桌面版')}</span>}</b>{check.detail && <small>{tr(check.detail)}</small>}
      {check.link && <a className="check-link" href={check.link.url} target="_blank" rel="noreferrer">{tr(check.link.label)}<ExternalLink size={11} /></a>}
      {st.err && <small className="error" role="alert">{st.err}</small>}{st.ok && <small className="ok" role="status">{st.ok}</small>}</span>
    {test && check.state !== 'off' && <button disabled={st.busy} onClick={() => void go()}>{st.busy ? <LoaderCircle size={13} className="spin" /> : null}{tr('测试')}</button>}
    {onFix && check.state !== 'off' && <button className="icon" aria-label={tr('去设置')} title={tr('去设置')} onClick={onFix}><ChevronRight size={15} /></button>}
  </li>
}

/** an item's test: what it found, in words, or an error that says what went wrong */
async function testItem(id: CheckId, signal: AbortSignal): Promise<string> {
  const ai = participants(store.get()).filter((c) => c.lines === 'ai' && !c.remote)
  if (id === 'model') {
    const brain = loadBrainConfig()
    const model = modelOf(brain)
    if (!model || !brainReady(brain)) throw new Error(tr('先在「设置 → 连接」填好文字模型'))
    return tr('{0} 秒后回复', (await testModel(model, signal)).toFixed(1))
  }
  if (id === 'voice' || id === 'record-voice') {
    const a = ai.map((c) => actors.get(c.id)).find((x) => x?.status === 'ready')
    if (!a) throw new Error(tr('角色载入后可试听。'))
    // one sentence for every voice: a voice heard before is free on livliv.ai (the site keeps what it voiced)
    const take = await a.prepare(tr('你好，很高兴见到你。'), 'happy', true, signal)
    if (take.mute) throw new Error(a.voiceError || tr('角色还没有声音，在角色卡里选一个'))
    await a.perform(take, 'happy', 'nod', signal)
    return tr('{0} 说完了', a.item.name)
  }
  const me = participants(store.get()).find((c) => c.lines === 'me'), a = me && actors.get(me.id)
  if (!a) throw new Error(tr('先放一个「我来演」的角色'))
  if (!a.canCalibrate) throw new Error(a.inputPhase === 'error' ? a.error : tr('没有看到脸'))
  a.calibrate()
  return tr('已把现在的姿势设为正面')
}
