import type { AnchorName, AttachmentAnchor } from '@livliv-dev/player'
import type { CharacterItem, ImageItem, Scene } from './scene'

export type PropAttachment = { of: string; part: AnchorName; width: number; mirror: boolean; anchor: AttachmentAnchor }
export type AnchorSource = { getAnchor(name: AnchorName): AttachmentAnchor | null }
export type SourceFor = (id: string) => AnchorSource | undefined
export type ImageGeometry = {
  x: number; y: number; w: number; h: number; rotation: number; flip: boolean; hidden: boolean
  parent: { x: number; y: number; rotation: number; scale: number; flip: boolean }
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function readAttachment(v: unknown): PropAttachment | null {
  if (!record(v) || typeof v.of !== 'string' || !v.of || v.of.length > 160 || (v.part !== 'head' && v.part !== 'body') || typeof v.width !== 'number' || !Number.isFinite(v.width) || v.width < 1 || v.width > 16384 || typeof v.mirror !== 'boolean' || !record(v.anchor)) return null
  for (const key of ['x', 'y', 'rotation', 'scale']) if (typeof v.anchor[key] !== 'number' || !Number.isFinite(v.anchor[key]) || Math.abs(v.anchor[key] as number) > 1e6) return null
  if ((v.anchor.scale as number) < 1e-5) return null
  return { of: v.of, part: v.part, width: v.width, mirror: v.mirror, anchor: { x: v.anchor.x as number, y: v.anchor.y as number, rotation: v.anchor.rotation as number, scale: v.anchor.scale as number } }
}
export const turn = (x: number, y: number, rotation: number) => ({ x: x * Math.cos(rotation) - y * Math.sin(rotation), y: x * Math.sin(rotation) + y * Math.cos(rotation) })

export function imageGeometry(item: ImageItem, scene: Scene, sourceFor: SourceFor): ImageGeometry {
  const result: ImageGeometry = { x: item.x, y: item.y, w: item.w, h: item.h, rotation: item.rotation ?? 0, flip: item.flip ?? false, hidden: !!item.hidden,
    parent: { x: 0, y: 0, rotation: 0, scale: 1, flip: false } }
  const attached = item.attachment
  if (!attached) return result
  const character = scene.items.find((c): c is CharacterItem => c.kind === 'character' && c.id === attached.of)
  if (!character) return { ...result, hidden: true }
  const current = sourceFor(character.id)?.getAnchor(attached.part), anchor = current ?? attached.anchor
  const flip = character.mirror !== attached.mirror
  const angle = (character.mirror ? -anchor.rotation : anchor.rotation) + (flip ? 1 : -1) * (attached.mirror ? -attached.anchor.rotation : attached.anchor.rotation)
  const scale = character.w * anchor.scale / (attached.width * attached.anchor.scale)
  const parent = { x: character.x + (character.mirror ? 1 - anchor.x : anchor.x) * character.w, y: character.y + anchor.y * character.h, rotation: angle, scale, flip }
  const center = turn((item.x + item.w / 2) * (flip ? -1 : 1), item.y + item.h / 2, angle)
  const w = item.w * scale, h = item.h * scale
  return { x: parent.x + center.x * scale - w / 2, y: parent.y + center.y * scale - h / 2, w, h, rotation: angle + (flip ? -1 : 1) * (item.rotation ?? 0), flip: result.flip !== flip,
    hidden: result.hidden || !!character.hidden || !current || scale <= 0, parent }
}

export function localPoint(geometry: ImageGeometry, x: number, y: number) {
  const p = geometry.parent, delta = turn(x - p.x, y - p.y, -p.rotation), scale = Math.max(1e-6, p.scale)
  return { x: delta.x * (p.flip ? -1 : 1) / scale, y: delta.y / scale }
}
export function moveImage(item: ImageItem, geometry: ImageGeometry, dx: number, dy: number) {
  const a = localPoint(geometry, geometry.x + geometry.w / 2, geometry.y + geometry.h / 2), b = localPoint(geometry, geometry.x + geometry.w / 2 + dx, geometry.y + geometry.h / 2 + dy)
  return { x: item.x + b.x - a.x, y: item.y + b.y - a.y }
}

/** Binding and unbinding preserve the rendered rectangle, including its mirror and angle. */
export function bindImage(item: ImageItem, scene: Scene, sourceFor: SourceFor, of: string | null, part: AnchorName = 'head'): ImageItem | null {
  const world = imageGeometry(item, scene, sourceFor)
  const free: ImageItem = { ...item, x: world.x, y: world.y, w: world.w, h: world.h, rotation: Math.atan2(Math.sin(world.rotation), Math.cos(world.rotation)), flip: world.flip, attachment: undefined }
  if (!of) return free
  const c = scene.items.find((c): c is CharacterItem => c.kind === 'character' && c.id === of), anchor = c && sourceFor(of)?.getAnchor(part)
  if (!c || !anchor || anchor.scale < 1e-5) return null
  return { ...free, x: free.x - c.x - (c.mirror ? 1 - anchor.x : anchor.x) * c.w, y: free.y - c.y - anchor.y * c.h,
    attachment: { of, part, width: c.w, mirror: c.mirror, anchor: { ...anchor } } }
}

export function geometryBounds(r: Pick<ImageGeometry, 'x' | 'y' | 'w' | 'h' | 'rotation'>) {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => { const p = turn(x * r.w / 2, y * r.h / 2, r.rotation); return { x: r.x + r.w / 2 + p.x, y: r.y + r.h / 2 + p.y } })
  const xs = corners.map((p) => p.x), ys = corners.map((p) => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}
