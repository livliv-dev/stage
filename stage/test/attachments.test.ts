import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AttachmentAnchor } from '@livliv-dev/player'
import { bindImage, imageGeometry, moveImage, readAttachment } from '../src/attachments'
import type { CharacterItem, ImageItem, Scene } from '../src/scene'

test('binding, moving and unbinding preserve world geometry under posed scale, rotation and mirror', () => {
  const c = { id: 'actor', kind: 'character', x: 100, y: 50, w: 200, h: 400, mirror: false } as CharacterItem
  const scene = { items: [c] } as Scene
  const image: ImageItem = { id: 'hat', kind: 'image', name: 'Hat', url: 'test', x: 170, y: 110, w: 60, h: 20 }
  let anchor: AttachmentAnchor = { x: .5, y: .25, rotation: 0, scale: .3 }
  const source = () => ({ getAnchor: () => ({ ...anchor }) })
  const bound = bindImage(image, scene, source, c.id)!
  const first = imageGeometry(bound, scene, source)
  for (const key of ['x', 'y', 'w', 'h'] as const) assert.equal(first[key], image[key])
  anchor = { x: .6, y: .2, rotation: Math.PI / 2, scale: .6 }
  const moved = imageGeometry(bound, scene, source)
  assert.ok(Math.abs(moved.x - 220) < 1e-9 && Math.abs(moved.y - 110) < 1e-9)
  assert.equal(moved.w, 120); assert.equal(moved.h, 40); assert.equal(moved.rotation, Math.PI / 2)
  const offset = moveImage(bound, moved, 10, 20), after = imageGeometry({ ...bound, ...offset }, scene, source)
  assert.ok(Math.abs(after.x - moved.x - 10) < 1e-9 && Math.abs(after.y - moved.y - 20) < 1e-9)
  c.mirror = true
  const flipped = imageGeometry(bound, scene, source)
  assert.equal(flipped.flip, true); assert.equal(flipped.rotation, -Math.PI / 2)
  const free = bindImage(bound, scene, source, null)!, detached = imageGeometry(free, scene, source)
  for (const key of ['x', 'y', 'w', 'h', 'rotation', 'flip'] as const) assert.equal(detached[key], flipped[key])
  c.hidden = true; assert.equal(imageGeometry(bound, scene, source).hidden, true)
})
test('saved attachments validate their reference frame without accepting broken scale or targets', () => {
  const value = { of: 'avatar', part: 'head', width: 200, mirror: false, anchor: { x: .5, y: .2, rotation: 0, scale: .3 } }
  assert.deepEqual(readAttachment(value), value)
  for (const bad of [null, { ...value, width: 0 }, { ...value, part: 'hand' }, { ...value, anchor: { ...value.anchor, scale: 0 } }, { ...value, anchor: { ...value.anchor, x: NaN } }]) assert.equal(readAttachment(bad), null)
})
