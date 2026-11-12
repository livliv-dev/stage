import { RotateCcw } from 'lucide-react'
import type { Fit } from '@livliv-dev/player'
import { actors } from './actors'
import { formatOf } from './bodies'
import { tr } from './i18n'
import type { CharacterItem } from './scene'
import { defaultTuning } from './tuning'

export function AvatarView({ c, patch }: { c: CharacterItem; patch: (value: Partial<CharacterItem>) => void }) {
  const view = c.tuning.view
  const update = (key: 'x' | 'y' | 'zoom', value: number) => patch({ tuning: { ...c.tuning, view: { ...view, [key]: value } } })
  // a full-body character stands on the ground: what the canvas shows of it
  const model = actors.get(c.id)?.player.model, fullBody = !!model && 'fullBody' in model && model.fullBody === true
  return <div className="avatar-view">
    {(['zoom', 'x', 'y'] as const).map((key) => <label key={key} className="field"><span>{tr(key === 'zoom' ? '内部缩放' : key === 'x' ? '水平取景' : '垂直取景')}<b>{Math.round(view[key] * 100)}%</b></span><input type="range" min={key === 'zoom' ? .5 : -1} max={key === 'zoom' ? 3 : 1} step={.05} value={view[key]} style={{ ['--p' as string]: `${(view[key] - (key === 'zoom' ? .5 : -1)) / (key === 'zoom' ? 2.5 : 2) * 100}%` }} onChange={(event) => update(key, +event.target.value)} /></label>)}
    {fullBody && <label className="field"><span>{tr('全身取景')}</span><select value={view.fit ?? 'frame'} onChange={(event) => patch({ tuning: { ...c.tuning, view: { ...view, fit: event.target.value as Fit } } })}><option value="frame">{tr('头和上身')}</option><option value="knee">{tr('到膝盖')}</option><option value="whole">{tr('整个人')}</option></select></label>}
    {formatOf(c.model) === 'livliv' && <label className="switch"><span>{tr('头像取景')}</span><input type="checkbox" checked={view.head} onChange={(event) => patch({ tuning: { ...c.tuning, view: { ...view, head: event.target.checked } } })} /><i /></label>}
    {formatOf(c.model) === 'png' && <label className="switch"><span>{tr('像素风格')}</span><input type="checkbox" checked={c.tuning.pixelated} onChange={(event) => patch({ tuning: { ...c.tuning, pixelated: event.target.checked } })} /><i /></label>}
    <button className="link" onClick={() => patch({ tuning: { ...c.tuning, view: defaultTuning().view } })}><RotateCcw size={13} />{tr('恢复取景')}</button>
  </div>
}
