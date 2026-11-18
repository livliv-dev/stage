import { actors } from './actors'
import { AIRI_MOTIONS, type AiriCharacterBrief } from './airiCharacter'
import { speechTarget } from './control'
import { store, type CharacterItem } from './scene'

/** The character AIRI should remember: the chosen one, otherwise whoever would speak. */
export function airiCharacterBrief(preferred?: string): AiriCharacterBrief | null {
  const cast = store.get().items.filter((item): item is CharacterItem => item.kind === 'character' && !item.remote)
  const chosen = preferred ? cast.find((item) => item.id === preferred) : undefined
  const target = speechTarget(preferred || undefined)
  const item = chosen ?? (target.ok ? cast.find((entry) => entry.id === target.character) : undefined) ?? cast.find((entry) => !entry.hidden)
  if (!item) return null
  const actor = actors.get(item.id)
  const expressions = actor && actor.status === 'ready' && actor.format !== 'png' ? actor.player.expressions.map((expression) => expression.id) : []
  return { id: item.id, name: item.name, persona: item.persona, style: item.style, expressions, motions: [...AIRI_MOTIONS] }
}
