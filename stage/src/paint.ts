// The stage drawn on a 2D canvas, at its own size, for a recorded video (render.ts): the same things the stage shows
// with CSS (Stage.tsx, styles.css), drawn by hand: the background (a colour, a gradient, a picture), text, pictures,
// subtitles in their four styles, and each character's canvas (flipped, with its shadow). What a subtitle shows at a
// moment is worked out from the conversation as the stage does (SubtitleView): the latest line of its speaker, shown
// while said and `linger` seconds after, typed out at the voice's pace, a cut line stopping where it was.
import { assetUrl, backgroundUrl } from './assets'
import { tr } from './i18n'
import type { ImageGeometry } from './attachments'
import type { Conv } from './tape'
import type { CharacterItem, ImageItem, Scene, SubtitleItem, TextItem } from './scene'
import { estimate } from './speech'

/** a transparent stage records as green screen: a video has no transparency */
export const GREEN = '#00b140'
const FG = '#1f1d1a'
const font = () => getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif'

/** the pictures a take shows (its image items, a picture background), loaded before drawing. One that can't be had
 *  (gone from this browser, or not loading) is left out of the video: `missing` counts them */
export async function pictures(scenes: Scene[]) {
  const urls = new Map<string, Promise<string>>()
  for (const scene of scenes) {
    const bg = backgroundUrl(scene.background)
    if (bg) urls.set(bg, scene.backgroundAsset ? assetUrl(scene.backgroundAsset) : Promise.resolve(bg))
    for (const item of scene.items) if (item.kind === 'image' && !item.hidden) urls.set(item.url, item.asset ? assetUrl(item.asset) : Promise.resolve(item.url))
  }
  const out = new Map<string, HTMLImageElement>()
  let missing = 0
  await Promise.all([...urls].map(async ([key, source]) => {
    try {
      const url = await source
      await new Promise<void>((resolve, reject) => {
        const image = new Image()
        image.onload = () => { out.set(key, image); resolve() }
        image.onerror = () => reject(new Error(tr('素材读取失败')))
        image.src = url
      })
    } catch (e) { missing++; console.warn('A picture left out of the video', key, e) }
  }))
  return { images: out, missing }
}

// ---------------------------------------------------------------- background

/** a CSS list split at its top-level commas */
const parts = (s: string) => {
  const out: string[] = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && !depth) { out.push(cur.trim()); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
const stops = (g: CanvasGradient, list: string[]) => list.forEach((s, i) => {
  const m = s.match(/^(.*?)\s+(-?[\d.]+)%$/)
  g.addColorStop(Math.min(1, Math.max(0, m ? +m[2] / 100 : i / Math.max(1, list.length - 1))), m ? m[1] : s)
})

export function paintBackground(g: CanvasRenderingContext2D, bg: string, W: number, H: number, pics: Map<string, HTMLImageElement>) {
  if (bg === 'transparent') { g.fillStyle = GREEN; g.fillRect(0, 0, W, H); return }
  const url = bg.match(/url\("?([^")]+)"?\)/)?.[1]
  if (url) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
    const img = pics.get(url)
    if (img) { const k = Math.max(W / img.width, H / img.height); g.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k) }
    return
  }
  const lin = bg.match(/^linear-gradient\((.*)\)$/), rad = bg.match(/^radial-gradient\((.*)\)$/)
  if (lin) {
    const [first, ...rest] = parts(lin[1])
    const angle = /deg$/.test(first) ? parseFloat(first) : 180, list = /deg$/.test(first) ? rest : [first, ...rest]
    // CSS: 0deg points up, clockwise; the line is long enough for the corners to get the end colours
    const a = (angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2
    const gr = g.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half)
    stops(gr, list)
    g.fillStyle = gr
  } else if (rad) {
    const [first, ...rest] = parts(rad[1])
    const at = first.match(/at\s+([\d.]+)%\s+([\d.]+)%/), list = /circle|ellipse|at /.test(first) ? rest : [first, ...rest]
    const cx = at ? (+at[1] / 100) * W : W / 2, cy = at ? (+at[2] / 100) * H : H / 2
    // farthest-corner, as CSS sizes a circle by default
    const r = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy))
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r)
    stops(gr, list)
    g.fillStyle = gr
  } else g.fillStyle = bg
  g.fillRect(0, 0, W, H)
}

// ---------------------------------------------------------------- text

type Run = { text: string; color: string; gap?: number }
/** runs of text broken into lines no wider than `max`: CJK at any character, other words at spaces, at newlines */
function lines(g: CanvasRenderingContext2D, runs: Run[], max: number) {
  const out: { runs: Run[]; width: number }[] = [{ runs: [], width: 0 }]
  for (const r of runs) {
    for (const tok of r.text.match(/\n|[　-鿿＀-￯]|[^\s　-鿿＀-￯]+|[^\S\n]+/g) || []) {
      let line = out.at(-1)!
      if (tok === '\n') { out.push({ runs: [], width: 0 }); continue }
      const w = g.measureText(tok).width
      if (line.width > 0 && line.width + w > max && tok.trim()) { out.push(line = { runs: [], width: 0 }) }
      if (!line.width && !tok.trim()) continue  // no space at the start of a line
      line.runs.push({ text: tok, color: r.color }); line.width += w
    }
    if (r.gap) { const line = out.at(-1)!; line.runs.push({ text: '', color: r.color, gap: r.gap }); line.width += r.gap }
  }
  return out
}
function drawLine(g: CanvasRenderingContext2D, l: { runs: Run[]; width: number }, cx: number, y: number, mode: 'fill' | 'stroke') {
  let x = cx - l.width / 2
  for (const r of l.runs) {
    if (r.gap) { x += r.gap; continue }
    if (mode === 'fill') { g.fillStyle = r.color; g.fillText(r.text, x, y) } else g.strokeText(r.text, x, y)
    x += g.measureText(r.text).width
  }
}
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}

export function paintText(g: CanvasRenderingContext2D, it: TextItem) {
  if (it.bg && it.bg !== 'transparent') { g.fillStyle = it.bg; roundRect(g, it.x, it.y, it.w, it.h, 16); g.fill() }
  g.font = `650 ${it.size}px ${font()}`
  g.textBaseline = 'middle'
  const ls = lines(g, [{ text: it.text, color: it.color }], it.w), lh = it.size * 1.2
  ls.forEach((l, i) => drawLine(g, l, it.x + it.w / 2, it.y + it.h / 2 + (i - (ls.length - 1) / 2) * lh, 'fill'))
}

export function paintImage(g: CanvasRenderingContext2D, it: ImageItem, pics: Map<string, HTMLImageElement>, geometry?: ImageGeometry) {
  const img = pics.get(it.url)
  if (!img) return
  const r = geometry ?? { ...it, rotation: it.rotation ?? 0, flip: it.flip ?? false }
  if (r.hidden) return
  const k = Math.min(r.w / img.width, r.h / img.height), w = img.width * k, h = img.height * k
  g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(r.rotation); if (r.flip) g.scale(-1, 1)
  g.drawImage(img, -w / 2, -h / 2, w, h); g.restore()
}

export function paintCharacter(g: CanvasRenderingContext2D, it: CharacterItem, cv: HTMLCanvasElement) {
  g.save()
  if (it.tuning.pixelated) g.imageSmoothingEnabled = false
  if (it.shadow) g.filter = 'drop-shadow(0 18px 28px rgb(40 30 20 / .16))'
  if (it.mirror) { g.translate(it.x + it.w, it.y); g.scale(-1, 1); g.drawImage(cv, 0, 0, it.w, it.h) } else g.drawImage(cv, it.x, it.y, it.w, it.h)
  g.restore()
}

// ---------------------------------------------------------------- subtitles

/** when each line came up, started being said and stopped being said (seconds into the take) */
export type Spans = Map<string, { start: number; said?: number; end?: number }>
export function spans(convs: Conv[]): Spans {
  const out: Spans = new Map()
  let speaking: string | null = null
  for (const c of convs) {
    for (const l of c.lines) if (!out.has(l.id)) out.set(l.id, { start: c.t })
    const now = c.speaking?.id ?? null
    if (speaking && now !== speaking) { const s = out.get(speaking); if (s && s.end === undefined) s.end = c.t }
    if (now) { const s = out.get(now); if (s && s.said === undefined) s.said = c.t }
    speaking = now
  }
  return out
}

export type Shown = { name: string | null; color: string; words: string; cut: boolean; since: number }

/** what a subtitle shows at `t`, the conversation being `c` then */
export function subtitleAt(it: SubtitleItem, scene: Scene, c: Conv, sp: Spans, t: number): Shown | null {
  const line = [...c.lines].reverse().find((l) => !l.audience && (it.of === 'all' || l.who === it.of))
  const s = line && sp.get(line.id)
  if (!line || !s) return null
  const speaking = c.speaking?.id === line.id
  if (!speaking && t >= (s.end ?? s.start) + it.linger) return null
  const chars = [...line.text]
  const char = scene.items.find((i): i is CharacterItem => i.kind === 'character' && i.id === line.who)
  const owner = scene.items.find((i): i is CharacterItem => i.kind === 'character' && i.id === it.of)
  let words = line.text
  if (it.typewriter && (speaking || line.cut)) {
    const per = (line.seconds ?? estimate(line.text, char?.voice.rate ?? 1)) / Math.max(1, chars.length), from = s.said ?? s.start
    const n = Math.min(chars.length, Math.max(1, Math.ceil(((speaking ? t : s.end ?? t) - from) / per)))
    words = chars.slice(0, n).join('')
  }
  return { name: it.showName ? char?.name ?? line.name : null, color: char?.color ?? owner?.color ?? '#7a746b', words, cut: !!line.cut, since: s.start }
}

/** a colour made brighter (the CSS brightness(1.35) on names over dark strips) */
function bright(c: string) {
  const m = c.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (!m) return c
  return `rgb(${m.slice(1).map((h) => Math.min(255, Math.round(parseInt(h, 16) * 1.35))).join(' ')})`
}

export function paintSubtitle(g: CanvasRenderingContext2D, it: SubtitleItem, s: Shown, t: number) {
  const S = it.size, pop = it.style === 'pop'
  const nameColor = it.style === 'bubble' ? s.color : it.style === 'pop' ? '#fff' : bright(s.color)
  const textColor = it.style === 'bubble' ? FG : '#fff'
  const runs: Run[] = []
  if (s.name) runs.push({ text: s.name, color: nameColor, gap: S * (pop ? 0.4 : it.style === 'bubble' ? 0.45 : 0.5) })
  runs.push({ text: s.words + (s.cut ? '——' : ''), color: textColor })
  g.save()
  g.font = `${pop ? 900 : it.style === 'plain' ? 700 : 600} ${S}px ${font()}`
  g.textBaseline = 'middle'
  const padX = S * (pop ? 0.3 : 0.85), padY = S * (pop ? 0.1 : 0.45), lh = S * 1.35
  const ls = lines(g, runs, it.w - padX * 2)
  const bw = Math.max(...ls.map((l) => l.width)) + padX * 2, bh = ls.length * lh + padY * 2
  const x = it.x + (it.w - bw) / 2, y = it.y + it.h - bh, cx = it.x + it.w / 2
  // coming up: rise 0.22 s (pop: grow with a little overshoot, 0.3 s), as the stage's CSS animations
  const k = Math.min(1, (t - s.since) / (pop ? 0.3 : 0.22)), ease = 1 - (1 - k) ** 3
  g.globalAlpha = Math.min(1, ease * (pop ? 1.4 : 1))
  if (pop) {
    const back = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2  // overshoots past 1, settles at 1
    g.translate(cx, y + bh / 2); g.rotate((-2 * Math.PI) / 180); g.scale(0.6 + 0.4 * back, 0.6 + 0.4 * back); g.translate(-cx, -(y + bh / 2))
  } else g.translate(0, (1 - ease) * S * 0.3)
  if (it.style === 'bubble') {
    g.save()
    g.shadowColor = 'rgb(0 0 0 / .08)'; g.shadowBlur = S * 0.8; g.shadowOffsetY = S * 0.2
    g.fillStyle = '#fff'; roundRect(g, x, y, bw, bh, S * 1.1); g.fill()
    g.restore()
    g.lineWidth = S * 0.12; g.strokeStyle = s.color; roundRect(g, x, y, bw, bh, S * 1.1); g.stroke()
    // the tail: a square turned 45°, its lower edges outlined
    const tw = S * 0.9, ty = y + bh + S * 0.62 - tw / 2
    g.save(); g.translate(cx, ty); g.rotate(Math.PI / 4)
    g.fillStyle = '#fff'; g.fillRect(-tw / 2, -tw / 2, tw, tw)
    g.beginPath(); g.moveTo(tw / 2, -tw / 2); g.lineTo(tw / 2, tw / 2); g.lineTo(-tw / 2, tw / 2); g.stroke()
    g.restore()
  } else if (it.style === 'bar') {
    g.fillStyle = 'rgb(20 18 16 / .74)'; roundRect(g, x, y, bw, bh, S * 0.5); g.fill()
  }
  const lineY = (i: number) => y + padY + lh * (i + 0.5)
  if (pop) {
    g.save()
    g.shadowColor = 'rgb(0 0 0 / .18)'; g.shadowOffsetY = S * 0.08
    g.lineJoin = 'round'; g.lineWidth = S * 0.14; g.strokeStyle = s.color  // text-stroke .14em, its inner half under the fill
    ls.forEach((l, i) => drawLine(g, l, cx, lineY(i), 'stroke'))
    g.restore()
  }
  if (it.style === 'plain') { g.shadowColor = 'rgb(0 0 0 / .55)'; g.shadowBlur = S * 0.25 }
  ls.forEach((l, i) => drawLine(g, l, cx, lineY(i), 'fill'))
  g.restore()
}

/** the LivLiv mark in the corner (recordings and the output window on livliv.ai/stage on the free plan): px its name's
 *  size, pad its distance from the edges. The output shows it in CSS (Stage.tsx) */
export const markBox = (w: number, h: number) => { const short = Math.min(w, h); return { px: Math.round(short * 0.042), pad: Math.round(short * 0.035) } }
/** the mark: the name and the address, white over a soft shadow, so it reads on any background */
export function paintMark(g: CanvasRenderingContext2D, w: number, h: number) {
  const { px, pad } = markBox(w, h)
  g.save()
  g.textAlign = 'right'; g.textBaseline = 'alphabetic'
  g.shadowColor = 'rgb(0 0 0 / .45)'; g.shadowBlur = px * 0.35; g.shadowOffsetY = px * 0.05
  g.fillStyle = 'rgb(255 255 255 / .92)'
  g.font = `700 ${px}px "Inter Variable", Inter, system-ui, sans-serif`
  g.fillText('LivLiv', w - pad, h - pad - px * 0.62)
  g.font = `500 ${Math.round(px * 0.46)}px "Inter Variable", Inter, system-ui, sans-serif`
  g.fillText('livliv.ai/stage', w - pad, h - pad)
  g.restore()
}

/** an AI character is in sight: the picture carries the 「AI 生成」 label */
export const showsAI = (s: Scene) => s.items.some((i) => i.kind === 'character' && i.lines === 'ai' && !i.hidden)
/** the label: a pill in the top left corner, its text about 28 px on a 1080p stage (size), `at` from the edges, white
 *  on dark glass so it reads on any background. The stage and the output show the same in CSS (Stage.tsx) */
export const aiLabelBox = (w: number, h: number) => { const short = Math.min(w, h); return { size: Math.round(short * 0.026), at: Math.round(short * 0.022) } }
export function paintAiLabel(g: CanvasRenderingContext2D, w: number, h: number) {
  const { size, at } = aiLabelBox(w, h), text = tr('AI 生成')
  g.save()
  g.font = `650 ${size}px ${font()}`
  const bw = g.measureText(text).width + size * 1.5, bh = size * 1.85
  g.fillStyle = 'rgb(0 0 0 / .42)'
  g.beginPath(); g.roundRect(at, at, bw, bh, bh / 2); g.fill()
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(text, at + bw / 2, at + bh / 2)
  g.restore()
}
