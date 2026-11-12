import { RotateCcw } from 'lucide-react'
import { formatOf } from './bodies'
import { tr } from './i18n'
import type { CharacterItem } from './scene'
import { defaultTuning } from './tuning'

export function AvatarView({ c, patch }: { c: CharacterItem; patch: (value: Partial<CharacterItem>) => void }) {
  const view = c.tuning.view
  const update = (key: 'x' | 'y' | 'zoom', value: number) => patch({ tuning: { ...c.tuning, view: { ...view, [key]: value } } })
  return <div className="avatar-view">
    {(['zoom', 'x', 'y'] as const).map((key) => <label key={key} className="field"><span>{tr(key === 'zoom' ? '内部缩放' : key === 'x' ? '水平取景' : '垂直取景')}<b>{Math.round(view[key] * 100)}%</b></span><input type="range" min={key === 'zoom' ? .5 : -1} max={key === 'zoom' ? 3 : 1} step={.05} value={view[key]} style={{ ['--p' as string]: `${(view[key] - (key === 'zoom' ? .5 : -1)) / (key === 'zoom' ? 2.5 : 2) * 100}%` }} onChange={(event) => update(key, +event.target.value)} /></label>)}
    {formatOf(c.model) === 'livliv' && <label className="switch"><span>{tr('头像取景')}</span><input type="checkbox" checked={view.head} onChange={(event) => patch({ tuning: { ...c.tuning, view: { ...view, head: event.target.checked } } })} /><i /></label>}
    {formatOf(c.model) === 'png' && <label className="switch"><span>{tr('像素风格')}</span><input type="checkbox" checked={c.tuning.pixelated} onChange={(event) => patch({ tuning: { ...c.tuning, pixelated: event.target.checked } })} /><i /></label>}
    <button className="link" onClick={() => patch({ tuning: { ...c.tuning, view: defaultTuning().view } })}><RotateCcw size={13} />{tr('恢复取景')}</button>
  </div>
}
