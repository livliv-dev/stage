import { tr } from './i18n'
// The stage: the scene at its own size (1920 × 1080 by default), fitted into the room the panels leave (always the
// same room: opening a panel never moves it), or zoomed (then the room scrolls). Two layers:
//  - the stage itself, clipped like the output: the characters, subtitles, texts and pictures
//  - over it, never clipped (edit mode only): the selection with its handles and toolbar, snapping lines, safe
//    areas, the platform mask or crop, and each character's label. A character whose feet hang below the edge keeps
//    all its handles
// Under the stage: its size and the zoom. In show mode only the stage: the picture as it goes out.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Copy, FlipHorizontal2, Lock, LockOpen, Minus, Plus, Trash, EyeOff } from 'lucide-react'
import { AssetImage, imageBackground, usePicture } from './assets'
import { formatOf } from './bodies'
import { Actor, actors, crowdedOut, onActors, refused } from './actors'
import { crowd, onRetry, useCrowded } from './contexts'
import { talk, useConversation } from './conversation'
import { DRIVERS, KIND_LABEL, LINES, store, useScene, type CharacterItem, type Item, type SubtitleItem, type TextItem } from './scene'
import { estimate } from './speech'
import { geometryBounds, imageGeometry, localPoint, moveImage, turn } from './attachments'
import { propSource, useImageGeometry } from './propGeometry'
import { CONTROLS, controlOf, controlSettings, type Control } from './workflow'

export type Insets = { top: number; right: number; bottom: number; left: number }
export type Zoom = 'fit' | number
export type MenuAt = { id: string; x: number; y: number }
type Guide = { axis: 'x' | 'y'; at: number }
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2]

export function Stage({ insets, empty, onMenu, zoom, setZoom }: {
  insets: Insets; empty: ReactNode; onMenu: (m: MenuAt) => void; zoom: Zoom; setZoom: (z: Zoom) => void
}) {
  const { scene, selected, mode } = useScene()
  const box = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState({ W: 1200, H: 800 })
  const [guides, setGuides] = useState<Guide[]>([])
  const [hover, setHover] = useState<string | null>(null)
  useLayoutEffect(() => {
    const el = box.current!
    const measure = () => setRoom({ W: el.clientWidth, H: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const edit = mode === 'edit'
  const pad = edit ? 32 : 0, foot = edit ? 28 : 0  // room under the stage for its caption
  const availW = room.W - insets.left - insets.right - pad * 2, availH = room.H - insets.top - insets.bottom - pad * 2 - foot
  const fit = Math.max(0.05, Math.min(availW / scene.width, availH / scene.height))
  const s = !edit || zoom === 'fit' ? fit : zoom
  const w = scene.width * s, h = scene.height * s
  const left = insets.left + pad + Math.max(0, (availW - w) / 2), top = insets.top + pad + Math.max(0, (availH - h) / 2)
  const zoomed = edit && (w > availW + 1 || h > availH + 1)

  const deselect = (e: RPointerEvent) => { if (e.target === e.currentTarget) store.select(null) }
  const drag = useDrag(s, setGuides)
  const sel = edit ? scene.items.find((i) => i.id === selected && !i.hidden) : undefined
  const background = usePicture(scene.backgroundAsset), backgroundValue = scene.backgroundAsset ? background.url ? imageBackground(background.url) : '#f7f4ef' : scene.background
  const checker = 16 / s  // 8 screen pixels a square, whatever the zoom
  const bg: CSSProperties = backgroundValue === 'transparent'
    ? (edit ? { backgroundColor: '#fff', backgroundImage: 'conic-gradient(#ebe9e5 25%, #fff 0 50%, #ebe9e5 0 75%, #fff 0)', backgroundSize: `${checker}px ${checker}px` } : { background: 'transparent' })
    : { background: backgroundValue }
  return (
    <div className={`stage-box ${mode}`} ref={box} onPointerDown={deselect} style={{ overflow: zoomed ? 'auto' : 'hidden' }}>
      {zoomed && <div className="scroll-size" style={{ width: left + w + pad + insets.right, height: top + h + pad + foot + insets.bottom }} onPointerDown={deselect} />}
      <div className="stage" style={{ width: scene.width, height: scene.height, transform: `scale(${s})`, left, top, ...bg }} onPointerDown={deselect}>
        {scene.items.map((it) => (it.kind === 'character' || !it.hidden) && <Placed key={it.id} item={it} edit={edit} drag={drag} onMenu={onMenu} onHover={setHover} />)}
      </div>
      {edit && (
        <div className="overlay" style={{ left, top, width: w, height: h }}>
          {scene.guides && <Safe />}
          {scene.mask && scene.height > scene.width && <PlatformMask />}
          {scene.crop && scene.width > scene.height && <span className="crop" style={{ width: h * 9 / 16 }}><em>{tr("9:16 裁切")}</em></span>}
          {scene.items.map((c) => c.kind === 'character' && !c.hidden && c.x + c.w / 2 > 0 && c.x + c.w / 2 < scene.width && c.y < scene.height && <Tag key={c.id} c={c} s={s} stageH={scene.height} near={c.id === hover || c.id === selected} />)}
          {guides.map((g, i) => <span key={i} className={`snap ${g.axis}`} style={g.axis === 'x' ? { left: g.at * s } : { top: g.at * s }} />)}
          {sel && <Selection item={sel} s={s} drag={drag} />}
        </div>
      )}
      {edit && (
        <div className="caption" style={{ left, top: top + h + 8, width: Math.max(w, 260) }} onPointerDown={(e) => e.stopPropagation()}>
          <span>{scene.width} × {scene.height}</span>
          <span className="zoom">
            <button className="icon" title={tr("缩小")} onClick={() => setZoom(ZOOMS.filter((z) => z < s - 0.001).at(-1) ?? ZOOMS[0])}><Minus size={13} /></button>
            <button className="pct" title="100%（⇧0）" onClick={() => setZoom(1)}>{Math.round(s * 100)}%</button>
            <button className="icon" title={tr("放大")} onClick={() => setZoom(ZOOMS.find((z) => z > s + 0.001) ?? ZOOMS.at(-1)!)}><Plus size={13} /></button>
            <button className={`fit${zoom === 'fit' ? ' on' : ''}`} title={tr("适应窗口（⇧1）")} onClick={() => setZoom('fit')}>{tr("适应")}</button>
          </span>
        </div>
      )}
      {edit && !scene.items.length && <div className="empty" style={{ left: insets.left, right: insets.right, top: insets.top, bottom: insets.bottom }}>{empty}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- moving and resizing

type Drag = (e: RPointerEvent, item: Item, handle: Handle | null) => void

/** where an item's edges and middle may snap to: the stage's, and every other visible item's */
function snapTargets(self: string) {
  const s = store.get(), xs = [0, s.width / 2, s.width], ys = [0, s.height / 2, s.height]
  for (const i of s.items) {
    if (i.id === self || i.hidden) continue
    const picture = i.kind === 'image' ? imageGeometry(i, s, propSource) : null
    if (picture?.hidden) continue
    const r = picture ? geometryBounds(picture) : i
    xs.push(r.x, r.x + r.w / 2, r.x + r.w); ys.push(r.y, r.y + r.h / 2, r.y + r.h)
  }
  return { xs, ys }
}

/** the smallest shift (within `reach`) that puts one of `edges` on one of `targets` */
function snap(edges: number[], targets: number[], reach: number): { d: number; at: number } | null {
  let best: { d: number; at: number } | null = null
  for (const e of edges) for (const t of targets) {
    const d = t - e
    if (Math.abs(d) <= reach && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, at: t }
  }
  return best
}

/** a press on an item (move) or a handle (resize): the pointer is followed on the window until it lets go; one undo
 *  step for the whole drag. A drag starts after 3 pixels, so a click only selects */
function useDrag(s: number, setGuides: (g: Guide[]) => void): Drag {
  const scale = useRef(s)
  scale.current = s
  return (e, item, handle) => {
    if (e.button !== 0 || item.locked) return
    e.stopPropagation()
    store.select(item.id)
    const x0 = e.clientX, y0 = e.clientY, o = item, sceneId = store.get().id
    const picture = item.kind === 'image' ? imageGeometry(item, store.get(), propSource) : null
    let started = false
    const move = (ev: PointerEvent) => {
      if (store.get().id !== sceneId) { up(); return }
      const k = scale.current, dx = (ev.clientX - x0) / k, dy = (ev.clientY - y0) / k
      if (!started) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 3) return; started = true; store.begin() }
      if (picture && o.kind === 'image') {
        if (!handle && (o.attachment || o.rotation)) { store.patch(o.id, moveImage(o, picture, dx, dy)); return }
        if (handle) {
        const delta = turn(dx, dy, -picture.rotation), sx = handle.includes('w') ? -1 : 1, sy = handle.includes('n') ? -1 : 1
        const rx = delta.x * sx / picture.w, ry = delta.y * sy / picture.h
        const ratio = 1 + (Math.abs(rx) >= Math.abs(ry) ? rx : ry), w = Math.max(40, picture.w * ratio), h = w * picture.h / picture.w
        const shift = turn(sx * (w - picture.w) / 2, sy * (h - picture.h) / 2, picture.rotation)
        const center = localPoint(picture, picture.x + picture.w / 2 + shift.x, picture.y + picture.h / 2 + shift.y), scale = Math.max(1e-6, picture.parent.scale)
        store.patch(o.id, { w: w / scale, h: h / scale, x: center.x - w / scale / 2, y: center.y - h / scale / 2 }); return
        }
      }
      if (!handle) {
        let x = o.x + dx, y = o.y + dy
        const g: Guide[] = []
        if (!ev.altKey) {
          const { xs, ys } = snapTargets(o.id), reach = 6 / k
          const sx = snap([x, x + o.w / 2, x + o.w], xs, reach), sy = snap([y, y + o.h / 2, y + o.h], ys, reach)
          if (sx) { x += sx.d; g.push({ axis: 'x', at: sx.at }) }
          if (sy) { y += sy.d; g.push({ axis: 'y', at: sy.at }) }
        }
        setGuides(g)
        store.patch(o.id, { x: Math.round(x), y: Math.round(y) })
        return
      }
      const keep = o.kind === 'character' || o.kind === 'image'
      let w = o.w, h = o.h
      if (handle.includes('e')) w = o.w + dx
      if (handle.includes('w')) w = o.w - dx
      if (handle.includes('s')) h = o.h + dy
      if (handle.includes('n')) h = o.h - dy
      if (keep) h = w * (o.h / o.w)
      w = Math.max(40, w); h = Math.max(30, h)
      store.patch(o.id, {
        w: Math.round(w), h: Math.round(h),
        x: Math.round(handle.includes('w') ? o.x + o.w - w : o.x), y: Math.round(handle.includes('n') ? o.y + o.h - h : o.y),
      })
    }
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
      if (started) store.end()
      setGuides([])
    }
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
}

function Placed({ item, edit, drag, onMenu, onHover }: { item: Item; edit: boolean; drag: Drag; onMenu: (m: MenuAt) => void; onHover: (id: string | null) => void }) {
  const [editing, setEditing] = useState(false), picture = useImageGeometry(item), hidden = picture?.hidden ?? item.hidden
  return (
    <div className={`placed ${item.kind}${edit ? ' editable' : ''}${item.locked ? ' locked' : ''}`} style={{ left: picture?.x ?? item.x, top: picture?.y ?? item.y, width: picture?.w ?? item.w, height: picture?.h ?? item.h, transform: picture ? 'rotate(' + picture.rotation + 'rad) scaleX(' + (picture.flip ? -1 : 1) + ')' : undefined, visibility: hidden ? 'hidden' : undefined, pointerEvents: hidden ? 'none' : undefined }}
      onPointerDown={(e) => { if (edit && !editing) { if (item.locked) { e.stopPropagation(); store.select(item.id) } else drag(e, item, null) } }}
      onContextMenu={(e) => { if (!edit) return; e.preventDefault(); store.select(item.id); onMenu({ id: item.id, x: e.clientX, y: e.clientY }) }}
      onPointerEnter={() => onHover(item.id)} onPointerLeave={() => onHover(null)}
      onDoubleClick={() => { if (edit && item.kind === 'text' && !item.locked) setEditing(true) }}>
      {item.kind === 'character' && <CharacterView item={item} />}
      {item.kind === 'text' && <TextView item={item} editing={editing} done={() => setEditing(false)} />}
      {item.kind === 'image' && <AssetImage item={item} edit={edit} />}
      {item.kind === 'subtitle' && <SubtitleView item={item} edit={edit} />}
    </div>
  )
}

// ---------------------------------------------------------------- the layer over the stage

const subtitleOf = (i: SubtitleItem, items: Item[]) => i.of === 'all' ? tr("所有人") : (items.find((c) => c.id === i.of) as CharacterItem | undefined)?.name ?? ''

function Selection({ item, s, drag }: { item: Item; s: number; drag: Drag }) {
  const { scene } = useScene()
  const picture = useImageGeometry(item)
  if (picture?.hidden) return null
  const r = picture ?? { ...item, rotation: 0 }, bounds = geometryBounds(r)
  const x = r.x * s, y = r.y * s, w = r.w * s, h = r.h * s
  const keep = item.kind === 'character' || item.kind === 'image'
  const handles: Handle[] = keep ? ['nw', 'ne', 'se', 'sw'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const small = item.kind === 'image' ? w < 24 || h < 12 : w < 40 || h < 40
  const label = item.kind === 'character' ? null : item.kind === 'subtitle' ? tr("字幕 · {0}", subtitleOf(item, scene.items)) : tr(KIND_LABEL[item.kind])
  // the toolbar above, or under the item when there is no room above it
  const above = bounds.y * s > 52, half = item.kind === 'character' ? 160 : 100
  const toolbarX = Math.max(Math.min(half, scene.width * s / 2), Math.min(scene.width * s - half, x + w / 2))
  const toolbarY = above ? Math.min(scene.height * s, bounds.y * s) - 10 : Math.max(0, (bounds.y + bounds.h) * s) + 34
  return <>
    <span className="sel-frame" style={{ left: x, top: y, width: w, height: h, transform: r.rotation ? "rotate(" + r.rotation + "rad)" : undefined }} />
    {label && <span className="sel-label" style={{ left: bounds.x * s, top: (bounds.y + bounds.h) * s + 6 }}>{tr(label)}</span>}
    {!item.locked && !small && handles.map((k) => {
      const p = turn((k.includes('w') ? -1 : k.includes('e') ? 1 : 0) * w / 2, (k.includes('n') ? -1 : k.includes('s') ? 1 : 0) * h / 2, r.rotation)
      return <span key={k} className={'handle ' + k} style={{ left: x + w / 2 + p.x, top: y + h / 2 + p.y, transform: r.rotation ? 'rotate(' + r.rotation + 'rad)' : undefined }} onPointerDown={(e) => drag(e, item, k)} />
    })}
    <Toolbar item={item} style={{ left: toolbarX, top: toolbarY, transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)' }} />
  </>
}

/** the few things one changes most, next to the selection */
function Toolbar({ item, style }: { item: Item; style: CSSProperties }) {
  const c = item.kind === 'character' ? item : null
  return (
    <div className="mini" style={style} onPointerDown={(e) => e.stopPropagation()}>
      {c && <>
        {c.remote ? <span className="remote-control">{tr("朋友控制")}</span> : <select value={controlOf(c)} title={tr("谁来控制")} aria-label={tr("谁来控制")} onChange={(e) => { const control = e.target.value as Control; store.patch(c.id, controlSettings(control)); if (control === 'human') talk.setAs(c.id) }}>
          {CONTROLS.map((mode) => <option key={mode.id} value={mode.id}>{tr(mode.label ?? '')}</option>)}
        </select>}
        <button className={`icon${c.mirror ? ' on' : ''}`} title={tr("左右翻转")} onClick={() => store.patch(c.id, { mirror: !c.mirror })}><FlipHorizontal2 size={15} /></button>
        <span className="sep" />
      </>}
      <button className="icon" title={tr("往前一层")} onClick={() => store.restack(item.id, 1)}><ArrowUp size={15} /></button>
      <button className="icon" title={tr("往后一层")} onClick={() => store.restack(item.id, -1)}><ArrowDown size={15} /></button>
      <button disabled={!!c?.remote} className="icon" title={tr("复制（⌘D）")} onClick={() => store.duplicate(item.id)}><Copy size={15} /></button>
      <button className={`icon${item.locked ? ' on' : ''}`} title={item.locked ? tr("解锁") : tr("锁定（不能拖动）")} onClick={() => store.patch(item.id, { locked: !item.locked })}>
        {item.locked ? <Lock size={15} /> : <LockOpen size={15} />}
      </button>
      <button className="icon danger" title={c?.remote ? tr("隐藏朋友角色") : tr("删除（Delete）")} onClick={() => store.remove(item.id)}>{c?.remote ? <EyeOff size={15} /> : <Trash size={15} />}</button>
    </div>
  )
}

/** a character's name and who gives its lines, at its feet (inside the stage, however low it stands): under the
 *  mouth or selected, and while it thinks or waits for you (the cast below the stage says it all the time) */
function Tag({ c, s, stageH, near }: { c: CharacterItem; s: number; stageH: number; near: boolean }) {
  const conv = useConversation()
  const speaking = conv.speaking?.who === c.id, yours = conv.waiting === c.id, thinking = conv.thinking === c.id
  const lines = LINES.find((l) => l.id === c.lines)
  const driver = c.driver === 'auto' ? null : DRIVERS.find((d) => d.kind === c.driver)
  return (
    <span className={`tag${speaking ? ' speaking' : ''}${yours ? ' yours' : ''}${c.locked ? ' locked' : ''}${near || yours || thinking ? '' : ' quiet'}`}
      style={{ left: (c.x + c.w / 2) * s, top: Math.min(c.y + c.h, stageH) * s - 10, ['--who' as string]: c.color }}>
      <i />{c.name}
      {yours ? <em>{tr("轮到你了")}</em> : thinking ? <em>{tr("在想…")}</em> : speaking ? <em>{tr("在说")}</em> : <><em>{tr(lines?.label ?? '')}</em>{driver && <em>{tr(driver.label ?? '')}</em>}</>}
      {c.locked && <Lock size={11} />}
    </span>
  )
}

/** title-safe (90 %) and action-safe (93 %) areas */
function Safe() {
  return <><span className="safe title"><em>{tr("标题安全区")}</em></span><span className="safe action" /></>
}

/** where Douyin / TikTok draw over a 9:16 picture (on 1080 × 1920: 240 at the top, 660 at the bottom, a 180 wide
 *  column of buttons from y = 840 on the right, 120 at the sides) */
function PlatformMask() {
  const pct = (v: number, of: number) => `${(v / of) * 100}%`
  return <>
    <span className="mask" style={{ left: 0, right: 0, top: 0, height: pct(240, 1920) }}><em>{tr("平台顶栏")}</em></span>
    <span className="mask" style={{ left: 0, right: 0, bottom: 0, height: pct(660, 1920) }}><em>{tr("标题、简介和评论")}</em></span>
    <span className="mask" style={{ right: 0, width: pct(180, 1080), top: pct(840, 1920), height: pct(420, 1920) }}><em>{tr("按钮")}</em></span>
    <span className="mask-side" style={{ left: pct(120, 1080), right: pct(120, 1080) }} />
  </>
}

// ---------------------------------------------------------------- what is drawn on the stage

function TextView({ item, editing, done }: { item: TextItem; editing: boolean; done: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editing || !ref.current) return
    const el = ref.current
    el.focus()
    const r = document.createRange(); r.selectNodeContents(el)
    const sl = getSelection(); sl?.removeAllRanges(); sl?.addRange(r)
  }, [editing])
  return (
    <div ref={ref} className={`text-item${editing ? ' editing' : ''}`} style={{ fontSize: item.size, color: item.color, background: item.bg }}
      contentEditable={editing} suppressContentEditableWarning
      onPointerDown={(e) => { if (editing) e.stopPropagation() }}
      onKeyDown={(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing)) { e.preventDefault(); (e.target as HTMLElement).blur() } }}
      onBlur={(e) => { const t = e.currentTarget.innerText.trim(); if (t && t !== item.text) store.patch(item.id, { text: t }); done() }}>
      {item.text}
    </div>
  )
}

function CharacterView({ item }: { item: CharacterItem }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const actor = useRef<Actor | null>(null)
  const [, redraw] = useState(0)
  const [revision, setRevision] = useState(0), [error, setError] = useState('')
  const conv = useConversation()
  // too many characters for the page's WebGL contexts (contexts.ts): this one says so, and starts again on a new
  // canvas when there is room. Hidden while any is short of one, it gives its own up until shown again
  const crowded = useCrowded(), [parked, setParked] = useState(false)
  const park = !!item.hidden && (parked || crowded.size > 0)
  useEffect(() => setParked(park), [park])
  useEffect(() => onRetry(item.id, () => setRevision((n) => n + 1)), [item.id])
  useEffect(() => () => crowd(item.id, false), [item.id])
  // one player for the item's life, later changes go through sync below; another kind of model (LivLiv, VRM, PNG)
  // needs a new canvas (its context kind) and a new player
  const format = formatOf(item.model)
  useEffect(() => {
    if (park) { setError(''); crowd(item.id, false); return }
    let a: Actor
    try { a = new Actor(canvas.current!, item); setError(''); crowd(item.id, false) } catch (e) { setError(refused(e)); crowd(item.id, crowdedOut(e)); return }
    actor.current = a
    const off = onActors(() => redraw((n) => n + 1))
    return () => { off(); a.dispose(); actor.current = null }
  }, [item.id, format, revision, park])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void actor.current?.sync(item) }, [item])
  const a = actor.current ?? actors.get(item.id)
  return <>
    <canvas key={format + revision + (park ? ' parked' : '')} ref={canvas} style={{ imageRendering: item.tuning.pixelated && format === 'png' ? 'pixelated' : undefined }} className={`character${item.mirror ? ' flip' : ''}${item.shadow ? ' shadow' : ''}`} />
    {a?.status === 'loading' && <span className="badge">{tr("载入中…")}</span>}
    {(error || a?.status === 'error') && <span className="badge err">{crowded.has(item.id) ? tr("角色太多，这个角色显示不出来") : error || a?.error}<button onClick={() => setRevision((n) => n + 1)}>{tr("重新加载")}</button></span>}
    {a?.status === 'ready' && a.error && <span className="badge err">{tr(a.error ?? '')}</span>}
    {conv.thinking === item.id && <span className="thinking"><i /><i /><i /></span>}
  </>
}

/** A line stays up while it is said and `linger` seconds after. Typewriter: the words come at the voice's pace, and
 *  a line cut off stops where it was, with a dash */
function SubtitleView({ item, edit }: { item: SubtitleItem; edit: boolean }) {
  const conv = useConversation()
  const { scene } = useScene()
  const line = [...conv.lines].reverse().find((l) => !l.audience && (item.of === 'all' || l.who === item.of))  // 弹幕 stay off the stage
  const [shown, setShown] = useState<string | null>(null)
  const [n, setN] = useState(0)
  const speaking = !!line && conv.speaking?.id === line.id
  const of = scene.items.find((i): i is CharacterItem => i.kind === 'character' && i.id === line?.who)
  useEffect(() => {
    if (!line) { setShown(null); return }
    setShown(line.id)
    if (speaking) return
    const t = setTimeout(() => setShown((s) => (s === line.id ? null : s)), item.linger * 1000)
    return () => clearTimeout(t)
  }, [line?.id, speaking, item.linger])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!line || !item.typewriter || !speaking) return
    const chars = [...line.text], per = ((line.seconds ?? estimate(line.text, of?.voice.rate ?? 1)) * 1000) / Math.max(1, chars.length), t0 = performance.now()
    setN(0)
    const t = setInterval(() => setN(Math.min(chars.length, Math.ceil((performance.now() - t0) / per))), 40)
    return () => clearInterval(t)
  }, [line?.id, speaking, item.typewriter])  // eslint-disable-line react-hooks/exhaustive-deps
  const owner = scene.items.find((i): i is CharacterItem => i.kind === 'character' && i.id === item.of)
  const color = of?.color ?? owner?.color ?? '#7a746b'
  const visible = !!line && shown === line.id
  // while said: as far as the voice got; after: all of it, or up to the cut
  const words = !line ? '' : item.typewriter && (speaking || line.cut) && n > 0 ? [...line.text].slice(0, n).join('') : line.text
  return (
    <div className={`subtitle ${item.style}${visible ? ' on' : ''}${edit && !visible ? ' empty' : ''}`} style={{ fontSize: item.size, ['--who' as string]: color }}>
      {visible
        ? <span key={line!.id}>{item.showName && <b>{of?.name ?? line!.name}</b>}{words}{line!.cut && '——'}</span>
        : edit && <span className="placeholder">{item.of === 'all' ? tr("字幕 · 所有人") : tr("字幕 · {0}", owner?.name ?? '')}</span>}
    </div>
  )
}
