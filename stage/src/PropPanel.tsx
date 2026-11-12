import { useEffect, useState } from 'react'
import type { AnchorName } from '@livliv-dev/player'
import { actors, onActors } from './actors'
import { bindImage } from './attachments'
import { propSource } from './propGeometry'
import { participants, store, useScene, type ImageItem } from './scene'
import { tr } from './i18n'

export function PropPanel({ item }: { item: ImageItem }) {
  const { scene } = useScene(), [, redraw] = useState(0)
  useEffect(() => onActors(() => redraw((n) => n + 1)), [])
  const attach = (of: string | null, part: AnchorName = item.attachment?.part ?? 'head') => {
    const next = bindImage(item, store.get(), propSource, of, part)
    if (next) store.patch(item.id, next)
  }
  return <section className="section prop-settings"><h3>{tr('图片与道具')}</h3><p className="hint">{item.name}</p>
    <label className="field"><span>{tr('跟随角色')}</span><select aria-label={tr('跟随角色')} value={item.attachment?.of ?? ''} onChange={(e) => attach(e.target.value || null)}><option value="">{tr('不跟随')}</option>{participants(scene).map((c) => <option key={c.id} value={c.id} disabled={actors.get(c.id)?.status !== 'ready'}>{c.name}</option>)}</select></label>
    {item.attachment && <><label className="field"><span>{tr('跟随部位')}</span><select aria-label={tr('跟随部位')} value={item.attachment.part} onChange={(e) => attach(item.attachment!.of, e.target.value as AnchorName)}><option value="head">{tr('头部')}</option><option value="body">{tr('身体')}</option></select></label><p className="hint">{tr('拖动图片，调整相对位置')}</p></>}
    <label className="field"><span>{tr('旋转')}<b>{Math.round((item.rotation ?? 0) * 180 / Math.PI)}°</b></span><input aria-label={tr('道具旋转')} type="range" min={-180} max={180} step={1} value={Math.round((item.rotation ?? 0) * 180 / Math.PI)} style={{ ['--p' as string]: ((item.rotation ?? 0) / (2 * Math.PI) + .5) * 100 + '%' }} onChange={(e) => store.patch(item.id, { rotation: +e.target.value * Math.PI / 180 })} /></label>
    <label className="switch"><span>{tr('左右翻转')}</span><input type="checkbox" checked={!!item.flip} onChange={(e) => store.patch(item.id, { flip: e.target.checked })} /><i /></label>
  </section>
}
