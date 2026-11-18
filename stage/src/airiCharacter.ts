// What Stage tells AIRI about the character on stage. AIRI stores a replace-self
// context update; it does not receive the model file.

export const AIRI_MOTIONS = ['nod', 'shake', 'tilt', 'hop', 'shy', 'away'] as const

export type AiriCharacterBrief = {
  id: string
  name: string
  persona: string
  style?: string
  expressions: string[]
  motions: string[]
}

export function characterContextText(card: AiriCharacterBrief) {
  const persona = card.persona.replace(/\s+/g, ' ').trim().slice(0, 1500)
  const style = (card.style ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
  const expressions = card.expressions.map((item) => item.trim()).filter(Boolean).slice(0, 40)
  const motions = (card.motions.length ? card.motions : [...AIRI_MOTIONS]).slice(0, 12)
  return [
    'LivLiv Stage character',
    `name: ${card.name.trim().slice(0, 80) || 'character'}`,
    `id: ${card.id.trim().slice(0, 120) || 'stage'}`,
    persona ? `personality: ${persona}` : '',
    style ? `speaking style: ${style}` : '',
    `expressions: ${expressions.length ? expressions.join(', ') : 'none loaded'}`,
    `motions: ${motions.join(', ')}`,
  ].filter(Boolean).join('\n')
}

export function characterContextUpdate(card: AiriCharacterBrief) {
  const id = card.id.trim().slice(0, 120) || 'stage'
  return {
    id: `livliv-stage-character-${id}`.slice(0, 180),
    contextId: `livliv-stage:character:${id}`.slice(0, 180),
    strategy: 'replace-self' as const,
    lane: 'livliv-stage:character',
    text: characterContextText(card),
    destinations: { all: true as const },
  }
}
