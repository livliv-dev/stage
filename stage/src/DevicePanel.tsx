import { tr } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { Camera, Crosshair, Mic, RefreshCw } from 'lucide-react'
import { NetworkPanel } from './NetworkPanel'
import { GamepadPanel } from './GamepadPanel'
import { actors, onActors } from './actors'
import { refreshDevices, setInput, useInputs } from './devices'
import { AUTO_AWAY, store, type CharacterItem } from './scene'

export function DevicePanel({ character }: { character: CharacterItem }) {
  const { settings, devices, error } = useInputs()
  const [, redraw] = useState(0)
  const preview = useRef<HTMLVideoElement>(null)
  const actor = actors.get(character.id), track = actor?.tracking
  const camera = character.driver === 'face', replay = character.driver === 'replay'
  useEffect(() => { void refreshDevices(); return onActors(() => redraw((n) => n + 1)) }, [])
  useEffect(() => { const timer = setInterval(() => redraw((n) => n + 1), 300); return () => clearInterval(timer) }, [])
  const stream = actor?.faceVideo?.srcObject
  useEffect(() => { if (preview.current) preview.current.srcObject = stream ?? null }, [stream])
  const away = character.autoAway ?? AUTO_AWAY
  const status = actor?.inputPhase === 'opening' ? tr("正在打开设备…") : actor?.inputPhase === 'error' ? actor.error : actor?.away ? tr("暂离中，按 B 回来")
    : replay ? tr("面捕回放 · 无需摄像头") : track ? track.dark ? tr("画面偏暗，请增加面部光照") : track.face ? tr("已识别到面部") : tr("没有识别到面部，请面向摄像头")
      : character.driver === 'mic' && actor?.inputPhase === 'on' ? tr("麦克风已连接") : tr("在下方选择动作驱动，或使用「我来演」开启面捕")
  const picker = (kind: 'videoinput' | 'audioinput', label: string, value: string, set: (v: string) => void) => <label className="field">
    <span>{kind === 'videoinput' ? <Camera size={14} /> : <Mic size={14} />}{tr(label)}</span>
    <select aria-label={tr(label)} value={value} onChange={(e) => set(e.target.value)}>
      <option value="">{tr("系统默认")}</option>
      {devices.filter((d) => d.kind === kind && d.deviceId !== 'default').map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || label + ' ' + (i + 1)}</option>)}
    </select>
  </label>
  if (character.driver === 'network') return <NetworkPanel character={character} />
  if (character.driver === 'gamepad') return <GamepadPanel character={character} />
  return <section className="section device-panel">
    <h3>{tr("设备")}</h3>
    {picker('videoinput', tr("摄像头"), settings.camera, (camera) => setInput({ camera }))}
    {picker('audioinput', tr("麦克风"), settings.microphone, (microphone) => setInput({ microphone }))}
    {camera && stream && <video ref={preview} className="camera-preview" muted autoPlay playsInline aria-label={tr("摄像头预览")} />}
    <p className={'device-status ' + (actor?.inputPhase === 'error' ? 'error' : track?.face ? 'ok' : '')}>{status}</p>
    {track && <div className="row between"><span className="hint num">{Math.round(track.fps)} FPS</span><button disabled={!track.face} onClick={() => actor?.calibrate()}><Crosshair size={14} />{tr("校准正面")}</button></div>}
    {actor?.calibratedAt ? <p className="hint">{tr("已将刚才的姿势设为正面")}</p> : null}
    {camera && <>
      <label className="switch" title={tr("说话时嘴跟着声音动，和摄像头一起用")}><span>{tr("麦克风对口型")}</span><input type="checkbox" checked={!!character.faceMic} onChange={(e) => store.patch(character.id, { faceMic: e.target.checked })} /><i /></label>
      <label className="switch" title={tr("摄像头 {0} 秒看不到你，角色就闭眼打瞌睡，回来就醒", away || AUTO_AWAY)}><span>{tr("离开后自动暂离")}</span><input type="checkbox" checked={away > 0} onChange={(e) => store.patch(character.id, { autoAway: e.target.checked ? AUTO_AWAY : 0 })} /><i /></label>
    </>}
    {(character.driver === 'mic' || (camera && character.faceMic)) && <meter min={0} max={1} value={actor?.inputLevel ?? 0} aria-label={tr("麦克风音量")} />}
    <div className="row"><button className="link" onClick={() => void refreshDevices()}><RefreshCw size={13} />{tr("刷新设备")}</button>
      {actor?.inputPhase === 'error' && <button onClick={() => actor.retryInput()}>{tr("重新连接")}</button>}</div>
    {error && <p className="hint error">{tr(error)}</p>}
    {character.model.type === 'files' && character.model.format === 'png' && <p className="hint">{tr("嘴型与眨眼通过切换立绘表现。")}</p>}
  </section>
}
