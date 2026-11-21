// The console under the stage. Before a start: the topic, the start's three rows and its button; after the demo,
// watching it again or 用你的模型重来一遍 (the checklist). Once started: what you say (as whom, typed, held to talk, or
// hands-free while that is on), 跳过这句, 暂停, 结束, the transcript and the memory. Under both, the status line.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, LoaderCircle, MessagesSquare, Mic, Pause, Play, Send, SkipForward, Square } from 'lucide-react'
import { tr } from '../i18n'
import { useBrainConfig } from '../brain'
import { talk, useConversation } from '../conversation'
import { useAccount } from '../livliv'
import { cancel as pttCancel, clearError as pttClear, press as pttPress, release as pttRelease, setHandsFree, usePtt } from '../ptt'
import { useRealtime } from '../realtime'
import { participants, store, useScene, type Goal } from '../scene'
import { asrReady, useActiveSpeech } from '../voiceApi'
import { StartButton, StartRows } from './StartBar'
import { StatusLine } from './StatusLine'
import type { Check } from './checks'

export type ConsoleProps = {
  goal: Goal; partner: boolean; checks: readonly Check[] | null; optionsOpen: boolean
  onOptions: () => void; onChecklist: () => void; onStart: () => void; onOwnModel: () => void
  onModel: () => void; onVoice: () => void; onRoom: () => void; onRealtime: () => void; onLog: () => void; onMemory: () => void
}

export function Console({ goal, partner, checks, optionsOpen, onOptions, onChecklist, onStart, onOwnModel, onModel, onVoice, onRoom, onRealtime, onLog, onMemory }: ConsoleProps) {
  const { scene } = useScene(), conv = useConversation(), ptt = usePtt(), account = useAccount(), speech = useActiveSpeech(), brain = useBrainConfig(), realtime = useRealtime()
  const hear = asrReady(speech) || account.status === 'in'
  useEffect(() => { if (ptt.automatic && !hear) pttCancel() }, [hear, ptt.automatic])
  const [mine, setMine] = useState(''), input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (conv.waiting) input.current?.focus() }, [conv.waiting])
  const measure = useConsoleHeight()
  const yours = participants(scene).filter((c) => c.lines === 'me')
  const as = conv.waiting ?? (yours.some((c) => c.id === conv.as) || conv.as === 'narrator' ? conv.as : yours[0]?.id ?? 'narrator')
  const send = async () => { const text = mine; if (await talk.say(text) !== false) setMine((now) => now === text ? '' : now) }
  const live = conv.running && conv.mode === 'live', inRealtime = conv.running && conv.mode === 'realtime'
  const status = <StatusLine goal={goal} partner={partner} checks={checks} onModel={onModel} onVoice={onVoice} onAudience={live ? onRoom : onOptions} onChecklist={onChecklist} onRealtime={onRealtime} />
  const errors = <>
    {(conv.error || ptt.error) && <p className="talk-err">{conv.error || ptt.error}</p>}
    {conv.storageError && <p className="talk-err" role="alert">{conv.storageError}</p>}
  </>
  if (!conv.running) return <div className="console next" ref={measure} onPointerDown={(e) => e.stopPropagation()}>
    <div className="talkbar run-bar">
      <input className="topic" value={scene.topic} placeholder={tr('话题，比如：周末去哪儿玩')} aria-label={tr('话题')} onChange={(e) => store.set({ topic: e.target.value })} />
      {brain.kind === 'demo' ? <>
        <button className="primary" onClick={() => talk.start()}><Play size={14} />{tr('再看一次')}</button>
        {/* after the demo: the same characters, with a model of one's own (the checklist, then its start) */}
        <button className="demo-own-model" onClick={onOwnModel}><Bot size={14} /><span>{tr('用你的模型重来一遍')}</span></button>
      </> : <>
        <StartRows goal={goal} partner={partner} open={optionsOpen} onToggle={onOptions} />
        <StartButton goal={goal} partner={partner} onStart={onStart} />
      </>}
      <button className="icon" title={tr('对话记录')} aria-label={tr('对话记录')} onClick={onLog}><MessagesSquare size={16} />{conv.lines.length > 0 && <em>{conv.lines.length}</em>}</button>
    </div>
    {/* push to talk (the ` key) before a start: what it is doing, and a way to end it */}
    {ptt.phase !== 'idle' && <p className="handsfree-status" role="status">{tr(ptt.phase === 'listening' ? '正在听…' : ptt.phase === 'opening' ? '正在打开麦克风…' : '正在识别…')}
      <button onClick={ptt.phase === 'listening' ? () => void pttRelease() : pttCancel}>{tr(ptt.phase === 'listening' ? '结束语音输入' : '取消')}</button></p>}
    {status}
    {errors}
  </div>
  const closed = inRealtime && (realtime.phase === 'connecting' || conv.paused)
  return <div className="console next running" ref={measure} onPointerDown={(e) => e.stopPropagation()}>
    <div className={`talkbar say-bar${conv.waiting ? ' waiting' : ''}`}>
      {(yours.length > 0 || conv.mode === 'conversation') && <select className="as" value={as} aria-label={tr('以谁的身份说')} disabled={!!conv.waiting} onChange={(e) => talk.setAs(e.target.value)}>
        {yours.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="narrator">{tr('旁白')}</option>
      </select>}
      <input ref={input} value={mine} disabled={closed} aria-label={tr('你说的话')} placeholder={tr(ptt.phase === 'listening' ? ptt.automatic ? '正在听，停顿后自动发送' : '正在听，松开就说出去' : ptt.phase === 'recognizing' ? '正在识别…' : conv.waiting ? '轮到你了' : '说点什么…')} onChange={(e) => { setMine(e.target.value); pttClear() }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void send() }} />
      <button className="icon" title={tr('说')} aria-label={tr('说')} disabled={!mine.trim() || closed} onClick={() => void send()}><Send size={15} /></button>
      {!ptt.automatic && <button className={`hold mic ${ptt.phase}`} aria-label={tr('按住说话')} disabled={!hear || inRealtime || ptt.phase === 'recognizing'} style={{ ['--level' as string]: ptt.level }}
        title={tr(ptt.phase === 'recognizing' ? '正在识别，Esc 取消' : hear ? '按住说话，松开说出去（也可以按住 ` 键）' : '按住说话：在「设置 → 连接」接上语音识别后可用')}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); void pttPress() }} onPointerUp={() => void pttRelease()} onPointerCancel={pttCancel} onContextMenu={(e) => e.preventDefault()}>
        {ptt.phase === 'recognizing' ? <LoaderCircle size={15} className="spin" /> : <Mic size={15} />}{tr('按住说话')}</button>}
      {(ptt.automatic || (hear && !inRealtime && conv.mode !== 'conversation')) && <button className={`handsfree${ptt.automatic ? ' on' : ''}`} aria-label={tr('免按键语音')} aria-pressed={ptt.automatic}
        title={tr('自动判断说完；外放时建议戴耳机。')} onClick={() => void setHandsFree(!ptt.automatic)}>{tr(ptt.automatic ? '关闭免按键' : '免按键')}</button>}
      {conv.waiting && <button onClick={talk.skip} title={tr('这次不说，跳过')}><SkipForward size={14} />{tr('这次不说')}</button>}
      {!conv.waiting && !inRealtime && <button onClick={talk.next} title={tr('下一句：跳过等待，或者让正在说的停下')}><SkipForward size={14} />{tr('跳过这句')}</button>}
      {conv.paused ? <button onClick={talk.resume} disabled={inRealtime && realtime.phase === 'connecting'}><Play size={14} />{tr('继续')}</button> : <button onClick={talk.pause} disabled={inRealtime && realtime.phase === 'connecting'}><Pause size={14} />{tr('暂停')}</button>}
      <button className="danger" onClick={() => { pttCancel(); talk.stop() }}><Square size={13} />{tr('结束')}</button>
      <button className="icon" title={tr('对话记录')} aria-label={tr('对话记录')} onClick={onLog}><MessagesSquare size={16} />{conv.lines.length > 0 && <em>{conv.lines.length}</em>}</button>
      <button className="console-memory" onClick={onMemory}>{tr('记忆')}</button>
    </div>
    {ptt.automatic && <p className="handsfree-status" role="status">{tr(conv.paused ? '已暂停收音，继续后恢复' : '免按键已开启 · 停顿后自动发送 · Esc 关闭')}</p>}
    {status}
    {errors}
  </div>
}

/** the console's height as --console-h, for what sits above it on a phone: the character sheet and the cards */
function useConsoleHeight() {
  const watch = useRef<ResizeObserver | null>(null)
  return useCallback((el: HTMLDivElement | null) => {
    watch.current?.disconnect(); watch.current = null
    if (!el || typeof ResizeObserver === 'undefined') return
    watch.current = new ResizeObserver(() => document.documentElement.style.setProperty('--console-h', `${Math.ceil(el.getBoundingClientRect().height)}px`))
    watch.current.observe(el)
  }, [])
}
