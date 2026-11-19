import { useEffect, useState } from 'react'
import { Mic, Pause, Play, Square, X } from 'lucide-react'
import { useBrainConfig } from './brain'
import { actors, onActors } from './actors'
import { talk, useConversation } from './conversation'
import { participants, store, useScene } from './scene'
import { useSpeech } from './voiceApi'
import { loadRealtime, realtimeCredentials, startRealtime, useRealtime } from './realtime'
import { tr } from './i18n'
import { useMixer } from './mixer'

export function RealtimePanel({ onClose, onSettings }: { onClose: () => void; onSettings: () => void }) {
  const { scene } = useScene(), conversation = useConversation(), state = useRealtime()
  const microphone = useMixer().settings.microphone
  useBrainConfig(); useSpeech()
  const [settings, setSettings] = useState(loadRealtime), [character, setCharacter] = useState(store.selected() ?? '')
  const [, redraw] = useState(0)
  useEffect(() => onActors(() => redraw((value) => value + 1)), [])
  const cast = participants(scene).filter((item) => item.lines === 'ai' && !item.remote)
  const target = cast.find((item) => item.id === character) ?? cast[0]
  const active = conversation.running && conversation.mode === 'realtime'
  const effective = realtimeCredentials(settings)
  const error = state.error || (conversation.mode === 'realtime' ? conversation.error : '')
  const ready = !!target && actors.get(target.id)?.status === 'ready' && !!effective.base && !!effective.key && !!settings.model
  const label = state.phase === 'connecting' ? '正在连接实时语音…' : state.phase === 'speaking' ? '角色正在说话，你可以随时插话' : state.phase === 'thinking' ? '正在回应…' : state.phase === 'paused' ? '已暂停收音和回应' : '正在听，直接说话就可以'
  return <div className="card popover live-settings realtime-settings" onPointerDown={(event) => event.stopPropagation()}>
    <header><span className="title">{tr('实时语音')}</span><button className="icon" aria-label={tr('关闭')} onClick={onClose}><X size={16} /></button></header>
    <section className="section">
      <p className="hint">{tr('持续语音通话，支持自然接话和插话。结束后关闭麦克风。')}</p>
      {!active ? <div className="realtime-model-summary">
        <div><b>{tr('实时语音服务')}</b><span>{settings.provider === 'openai' ? 'OpenAI Realtime' : tr('阿里云百炼')} · {settings.model}</span></div>
        <button className="link" onClick={onSettings}>{tr('设置模型与声音')}</button>
      </div> : <button className="link" onClick={onSettings}>{tr('设置模型与声音')}</button>}
      {active ? <p className="live-status" role="status">{tr(conversation.scope === 'public' ? '公开记忆' : '私聊')} · {tr((microphone.muted || !microphone.volume) && state.phase === 'listening' ? '麦克风已静音' : label)}</p> : <fieldset className="realtime-fields" disabled={conversation.running}>
        <label className="field"><span>{tr('通话角色')}</span><select aria-label={tr('通话角色')} value={target?.id ?? ''} onChange={(event) => setCharacter(event.target.value)}>{cast.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field"><span>{tr('接话方式')}</span><select aria-label={tr('接话方式')} value={settings.semantic ? 'semantic' : 'fast'} onChange={(event) => setSettings({ ...settings, semantic: event.target.value === 'semantic' })}><option value="semantic">{tr('理解说完后接话')}</option><option value="fast">{tr('停顿后快速接话')}</option></select></label>
        {!settings.semantic && <label className="field"><span>{tr('停顿时间')}</span><select aria-label={tr('停顿时间')} value={settings.silence} onChange={(event) => setSettings({ ...settings, silence: +event.target.value })}>{[300, 450, 700].map((value) => <option key={value} value={value}>{value} ms</option>)}</select></label>}
        <label className="field"><span>{tr('时长上限')}</span><select aria-label={tr('时长上限')} value={settings.minutes} onChange={(event) => setSettings({ ...settings, minutes: +event.target.value })}>{[1, 5, 15, 30].map((value) => <option key={value} value={value}>{value} {tr('分钟')}</option>)}</select></label>
      </fieldset>}
      {!effective.base || !effective.key || !settings.model ? <p className="hint">{tr('先在设置中配置实时语音模型，再开始通话。')}</p> : null}
      {!cast.length && <p className="hint">{tr('先选择一个已载入的 AI 角色')}</p>}
      {!active && <p className="hint">{tr('服务商按实时模型的用量计费，到达时长上限自动结束。')} {tr('生成次数上限')}：{scene.talk.chatGenerations ?? 100}</p>}
      {(error || (conversation.mode === 'realtime' && conversation.ended)) && <p className={error ? 'error' : 'hint'} role="status">{error || conversation.ended}</p>}
    </section>
    <footer className="live-footer">{active ? <>
      <button disabled={state.phase === 'connecting'} onClick={conversation.paused ? talk.resume : talk.pause}>{conversation.paused ? <Play size={14} /> : <Pause size={14} />}{tr(conversation.paused ? '继续' : '暂停')}</button>
      <button onClick={talk.stop}><Square size={14} />{tr('结束通话')}</button>
    </> : <button className="primary wide" disabled={!ready || conversation.running} onClick={() => target && void startRealtime(settings, target.id)}><Mic size={14} />{tr('开始实时语音')}</button>}</footer>
  </div>
}
