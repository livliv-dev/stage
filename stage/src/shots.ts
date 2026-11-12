import type { CharacterItem, Scene } from './scene'

export type Project = { active: string; scenes: Scene[] }

/** A shot owns placement and framing; the cast keeps its devices, voice and identity across cuts. */
export function shareCast(scenes: Scene[], active: Scene): Scene[] {
  const cast = new Map<string, CharacterItem>()
  for (const scene of [...scenes.filter((s) => s.id !== active.id), active]) {
    for (const item of scene.items) if (item.kind === 'character') cast.set(item.id, item)
  }
  return scenes.map((scene) => {
    const present = new Set(scene.items.map((i) => i.id))
    const items = scene.items.map((item) => {
      if (item.kind !== 'character') return item
      const source = cast.get(item.id)!
      if (source === item) return item
      return { ...source, x: item.x, y: item.y, w: item.w, h: item.h, hidden: item.hidden, locked: item.locked,
        mirror: item.mirror, shadow: item.shadow, color: item.color, tuning: { ...source.tuning, view: item.tuning.view } }
    })
    for (const item of cast.values()) if (!present.has(item.id)) items.push({ ...item, hidden: true })
    if (scene.topic === active.topic && scene.talk === active.talk && items.length === scene.items.length && items.every((item, i) => item === scene.items[i])) return scene
    return { ...scene, topic: active.topic, talk: active.talk, items }
  })
}
