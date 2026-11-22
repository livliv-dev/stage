// An image attached to a character (a hat on its head), as a scene saves it: which character and part, and where on
// it. Where it is drawn as the character moves is attachments.ts.
import type { AnchorName, AttachmentAnchor } from '@livliv-dev/player'

export type PropAttachment = { of: string; part: AnchorName; width: number; mirror: boolean; anchor: AttachmentAnchor }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function readAttachment(v: unknown): PropAttachment | null {
  if (!record(v) || typeof v.of !== 'string' || !v.of || v.of.length > 160 || (v.part !== 'head' && v.part !== 'body') || typeof v.width !== 'number' || !Number.isFinite(v.width) || v.width < 1 || v.width > 16384 || typeof v.mirror !== 'boolean' || !record(v.anchor)) return null
  for (const key of ['x', 'y', 'rotation', 'scale']) if (typeof v.anchor[key] !== 'number' || !Number.isFinite(v.anchor[key]) || Math.abs(v.anchor[key] as number) > 1e6) return null
  if ((v.anchor.scale as number) < 1e-5) return null
  return { of: v.of, part: v.part, width: v.width, mirror: v.mirror, anchor: { x: v.anchor.x as number, y: v.anchor.y as number, rotation: v.anchor.rotation as number, scale: v.anchor.scale as number } }
}
