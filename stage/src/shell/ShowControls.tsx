// Show mode's controls, for a moment after the mouse moves.
import { useEffect, useState } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { useBrainConfig } from '../brain'
import { talk, useConversation } from '../conversation'
import { store, useScene, type Goal } from '../scene'
import { rec, useRecording } from '../recording'
import { cancel as pttCancel } from '../ptt'
import { tr } from '../i18n'
import { optionsOf, startLabel } from './goals'
import { Clock } from './RecordCard'

/** show mode's controls, for a moment after the mouse moves: the stage's start (the demo again, or the goal's), pause,
 *  stop, the recording, back to editing */
export function ShowControls({ goal, partner, onStart }: { goal: Goal; partner: boolean; onStart: () => void }) {
  const conv = useConversation(), r = useRecording(), brain = useBrainConfig(), { scene } = useScene()
  const label = brain.kind === 'demo' ? '再看一次' : startLabel(goal, partner, optionsOf(scene.talk, goal, partner))
  const [on, setOn] = useState(true)
  useEffect(() => {
    let t = window.setTimeout(() => setOn(false), 2500)
    const wake = () => { setOn(true); clearTimeout(t); t = window.setTimeout(() => setOn(false), 2500) }
    addEventListener('pointermove', wake)
    return () => { removeEventListener('pointermove', wake); clearTimeout(t) }
  }, [])
  return (
    <div className={`show-controls${on ? ' on' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      {label && !conv.running && <button className="primary" onClick={brain.kind === 'demo' ? () => talk.start() : onStart}><Play size={14} />{tr(label)}</button>}
      {conv.running && !conv.paused && <button onClick={talk.pause}><Pause size={14} />{tr("暂停")}</button>}
      {conv.running && conv.paused && <button onClick={talk.resume}><Play size={14} />{tr("继续")}</button>}
      <button className="icon" title={tr("停止")} disabled={!conv.running} onClick={() => { pttCancel(); talk.stop() }}><Square size={14} /></button>
      {r.phase === 'recording' && <><span className="sep" /><button className="rec live" title={tr("停止录制，做成视频")} onClick={() => void rec.stop()}><i className="rec-dot" /><Clock from={r.started} />{tr("停止录制")}</button></>}
      <span className="sep" />
      <button onClick={() => store.setMode('edit')}>{tr("回到编辑")}<kbd>Esc</kbd></button>
    </div>
  )
}
