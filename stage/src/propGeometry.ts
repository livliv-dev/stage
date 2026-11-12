import { useEffect, useState } from 'react'
import { actors, onActors, onFrame } from './actors'
import { imageGeometry } from './attachments'
import { store, type Item } from './scene'

export const propSource = (id: string) => actors.get(id)?.player
/** Only attached images and their selection update with their source's final frame. */
export function useImageGeometry(item: Item) {
  const [, redraw] = useState(0), of = item.kind === 'image' ? item.attachment?.of : undefined
  useEffect(() => {
    if (!of) return
    const off = onFrame((actor) => { if (actor.item.id === of) redraw((n) => n + 1) }), loaded = onActors(() => redraw((n) => n + 1))
    return () => { off(); loaded() }
  }, [of])
  return item.kind === 'image' ? imageGeometry(item, store.get(), propSource) : null
}
