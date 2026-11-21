// The console under the stage. Before a start: the topic, the start's three rows and its button. Once started: what
// you say (typed, or held to talk), 跳过这句, 暂停, 结束. Under both, the status line.
import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MessagesSquare, Mic, Pause, Play, Send, SkipForward, Square } from 'lucide-react'
import { tr } from '../i18n'
import { talk, useConversation } from '../conversation'
import { useAccount } from '../livliv'
import { cancel as pttCancel, clearError as pttClear, press as pttPress, release as pttRelease, usePtt } from '../ptt'
import { participants, store, useScene, type Goal } from '../scene'
import { asrReady, useActiveSpeech } from '../voiceApi'
import { StartButton, StartRows } from './StartBar'
import { StatusLine } from './StatusLine'
import type { Check } from './checks'

export function Console({ goal, partner, checks, optionsOpen, onOptions, onChecklist, onStart, onModel, onVoice, onLog, onMemory }: {
  goal: Goal; partner: boolean; checks: readonly Check[] | null; optionsOpen: boolean; onOptions: () => void; onChecklist: () => void; onStart: () => void
  onModel: () => void; onVoice: () => void; onLog: () => void; onMemory: () => void
}) {
  const { scene } = useScene(), conv = useConversation(), ptt = usePtt(), account = useAccount(), speech = useActiveSpeech()
  const hear = asrReady(speech) || account.status === 'in'
  const [mine, setMine] = useState(''), input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (conv.waiting) input.current?.focus() }, [conv.waiting])
  const yours = participants(scene).filter((c) => c.lines === 'me')
  const as = conv.waiting ?? (yours.some((c) => c.id === conv.as) || conv.as === 'narrator' ? conv.as : yours[0]?.id ?? 'narrator')
  const send = async () => { const text = mine; if (await talk.say(text) !== false) setMine((now) => now === text ? '' : now) }
  const status = <StatusLine partner={partner} checks={checks} onModel={onModel} onVoice={onVoice} onAudience={onOptions} onChecklist={onChecklist} />
  if (!conv.running) return <div className="console next" onPointerDown={(e) => e.stopPropagation()}>
    <div className="talkbar run-bar">
      <input className="topic" value={scene.topic} placeholder={tr('话题，比如：周末去哪儿玩')} aria-label={tr('话题')} onChange={(e) => store.set({ topic: e.target.value })} />
      <StartRows partner={partner} open={optionsOpen} onToggle={onOptions} />
      <StartButton goal={goal} partner={partner} onStart={onStart} />
      <button className="icon" title={tr('对话记录')} aria-label={tr('对话记录')} onClick={onLog}><MessagesSquare size={16} />{conv.lines.length > 0 && <em>{conv.lines.length}</em>}</button>
    </div>
    {status}
    {conv.error && <p className="talk-err">{conv.error}</p>}
    {conv.storageError && <p className="talk-err" role="alert">{conv.storageError}</p>}
  </div>
  return <div className="console next running" onPointerDown={(e) => e.stopPropagation()}>
    <div className={`talkbar say-bar${conv.waiting ? ' waiting' : ''}`}>
      {(yours.length > 0 || conv.mode === 'conversation') && <select className="as" value={as} aria-label={tr('以谁的身份说')} disabled={!!conv.waiting} onChange={(e) => talk.setAs(e.target.value)}>
        {yours.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="narrator">{tr('旁白')}</option>
      </select>}
      <input ref={input} value={mine} aria-label={tr('你说的话')} placeholder={tr(ptt.phase === 'listening' ? '正在听，松开就说出去' : conv.waiting ? '轮到你了' : '说点什么…')} onChange={(e) => { setMine(e.target.value); pttClear() }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void send() }} />
      <button className="icon" title={tr('说')} aria-label={tr('说')} disabled={!mine.trim()} onClick={() => void send()}><Send size={15} /></button>
      <button className={`hold mic ${ptt.phase}`} disabled={!hear || (!ptt.automatic && ptt.phase === 'recognizing')} title={tr(hear ? '按住说话，松开说出去（也可以按住 ` 键）' : '按住说话：在「设置 → 连接」接上语音识别后可用')}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); void pttPress() }} onPointerUp={() => void pttRelease()} onPointerCancel={pttCancel} onContextMenu={(e) => e.preventDefault()}>
        {ptt.phase === 'recognizing' ? <LoaderCircle size={15} className="spin" /> : <Mic size={15} />}{tr('按住说话')}</button>
      <button onClick={talk.next}><SkipForward size={14} />{tr('跳过这句')}</button>
      {conv.paused ? <button onClick={talk.resume}><Play size={14} />{tr('继续')}</button> : <button onClick={talk.pause}><Pause size={14} />{tr('暂停')}</button>}
      <button className="danger" onClick={() => { pttCancel(); talk.stop() }}><Square size={13} />{tr('结束')}</button>
      <button className="icon" title={tr('对话记录')} aria-label={tr('对话记录')} onClick={onLog}><MessagesSquare size={16} /></button>
      <button className="console-memory" onClick={onMemory}>{tr('记忆')}</button>
    </div>
    {status}
    {(conv.error || ptt.error) && <p className="talk-err">{conv.error || ptt.error}</p>}
  </div>
}
