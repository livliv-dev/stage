import { useEffect, useState } from 'react'
import { Plus, Trash } from 'lucide-react'
import { actors, onActors } from './actors'
import { connectedGamepads, defaultGamepad, PAD_AXES, type GamepadSettings } from './gamepad'
import type { CharacterItem } from './scene'
import { store } from './scene'
import { AUDIENCE_ACTIONS, type AudienceEffect } from './triggers'
import { getLocale, tr } from './i18n'

const labels = { angleX: '左右转头', angleY: '上下点头', angleZ: '左右歪头', bodyX: '身体左右', bodyZ: '身体倾斜' }
const moves = { nod: '点头', shake: '摇头', tilt: '歪头', hop: '跳一下', shy: '害羞' }
export function GamepadPanel({ character: c }: { character: CharacterItem }) {
  const [pads, setPads] = useState<Gamepad[]>([]), [error, setError] = useState(''), [, redraw] = useState(0)
  const config = c.tuning.gamepad, actor = actors.get(c.id), pad = config.device < 0 ? pads[0] : pads.find((p) => p.index === config.device)
  useEffect(() => {
    const update = () => { try { setPads(connectedGamepads()); setError('') } catch (error) { setError((error as Error).message) } }
    update(); const timer = setInterval(update, 250), off = onActors(() => redraw((n) => n + 1))
    return () => { clearInterval(timer); off() }
  }, [])
  const save = (patch: Partial<GamepadSettings>) => store.patch(c.id, { tuning: { ...c.tuning, gamepad: { ...config, ...patch } } })
  const reaction = (text: string): AudienceEffect | null => {
    const split = text.indexOf(':'), kind = text.slice(0, split), id = text.slice(split + 1)
    const action = AUDIENCE_ACTIONS.find((x) => x === id)
    return kind === 'act' && action ? { do: 'act', id: action } : kind === 'expr' && actor?.player.expressions.some((e) => e.id === id) ? { do: 'expr', id, seconds: 2 } : null
  }
  return <section className="section gamepad-panel"><h3>{tr('手柄')}</h3>
    <label className="field"><span>{tr('输入手柄')}</span><select aria-label={tr('输入手柄')} value={config.device} onChange={(e) => save({ device: +e.target.value })}><option value={-1}>{tr('自动选择')}</option>{!pads.some((p) => p.index === config.device) && config.device >= 0 && <option value={config.device}>{tr('手柄 {0}', config.device + 1)}</option>}{pads.map((p) => <option key={p.index} value={p.index}>{p.index + 1} · {p.id}</option>)}</select></label>
    <p className={'hint ' + (error ? 'error' : pad ? 'ok' : '')} role="status">{error || (pad ? tr('手柄已连接') : tr('连接手柄后，按一下任意按钮'))}</p>
    {pad && <div className="pad-axis-preview" aria-label={tr('摇杆输入')}>{pad.axes.slice(0, 4).map((value, i) => <label key={i}><span>{i + 1}</span><meter min={-1} max={1} value={value} /><b className="num">{value.toFixed(2)}</b></label>)}</div>}
    <label className="field"><span>{tr('摇杆死区')}<b>{Math.round(config.deadzone * 100)}%</b></span><input aria-label={tr('摇杆死区')} type="range" min={0} max={.5} step={.01} value={config.deadzone} style={{ ['--p' as string]: config.deadzone * 200 + '%' }} onChange={(e) => save({ deadzone: +e.target.value })} /></label>
    <label className="field"><span>{tr('手柄灵敏度')}<b>{config.sensitivity.toFixed(1)}×</b></span><input aria-label={tr('手柄灵敏度')} type="range" min={.2} max={2} step={.1} value={config.sensitivity} style={{ ['--p' as string]: (config.sensitivity - .2) / 1.8 * 100 + '%' }} onChange={(e) => save({ sensitivity: +e.target.value })} /></label>
    <button disabled={!actor?.canCalibrate} onClick={() => actor?.calibrate()}>{tr('把摇杆现在的位置设为中心')}</button>
    <details className="pad-mappings"><summary>{tr('摇杆与按键映射')}</summary>
      {PAD_AXES.map((key) => <div className="pad-axis-binding" key={key}><label className="field"><span>{tr(labels[key])}</span><select aria-label={tr(labels[key]) + ' · ' + tr('摇杆轴')} value={config.axes[key].axis} onChange={(e) => save({ axes: { ...config.axes, [key]: { ...config.axes[key], axis: +e.target.value } } })}><option value={-1}>{tr('不绑定')}</option>{Array.from({ length: Math.max(4, Math.min(16, pad?.axes.length ?? 4), config.axes[key].axis + 1) }, (_, i) => <option key={i} value={i}>{tr('轴 {0}', i + 1)}</option>)}</select></label><label className="switch"><span>{tr('反向')}</span><input aria-label={tr(labels[key]) + ' · ' + tr('反向')} type="checkbox" checked={config.axes[key].inverted} onChange={(e) => save({ axes: { ...config.axes, [key]: { ...config.axes[key], inverted: e.target.checked } } })} /><i /></label></div>)}
      {Object.entries(config.buttons).map(([key, effect]) => <div className="pad-button-binding" key={key}>
        <label className="field"><span>{tr('按钮 {0}', +key + 1)}{pad?.buttons[+key]?.pressed && <i className="live-dot on" />}</span><select aria-label={tr('按钮 {0}', +key + 1)} value={effect.do + ':' + effect.id} onChange={(e) => { const next = reaction(e.target.value); if (next) save({ buttons: { ...config.buttons, [key]: next } }) }}><optgroup label={tr('动作')}>{AUDIENCE_ACTIONS.map((id) => <option key={id} value={'act:' + id}>{tr(moves[id])}</option>)}</optgroup>{actor?.format !== 'png' && <optgroup label={tr('表情')}>{actor?.player.expressions.map((e) => <option key={e.id} value={'expr:' + e.id}>{e.labels?.[getLocale()] ?? e.labels?.en ?? e.label}</option>)}</optgroup>}{effect.do === 'expr' && !actor?.player.expressions.some((e) => e.id === effect.id) && <option value={'expr:' + effect.id}>{tr('重新选择表情')}</option>}</select></label>
        <button className="icon danger" aria-label={tr('取消按钮 {0} 映射', +key + 1)} onClick={() => { const buttons = { ...config.buttons }; delete buttons[+key]; save({ buttons }) }}><Trash size={14} /></button>
      </div>)}
      <button className="wide spaced" disabled={Object.keys(config.buttons).length >= 32} onClick={() => { const n = Array.from({ length: 32 }, (_, i) => i).find((i) => !config.buttons[i]); if (n !== undefined) save({ buttons: { ...config.buttons, [n]: { do: 'act', id: 'nod' } } }) }}><Plus size={13} />{tr('添加按键映射')}</button>
      <button className="link spaced" onClick={() => save(defaultGamepad())}>{tr('恢复手柄设置')}</button>
    </details>
  </section>
}
