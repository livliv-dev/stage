// One AIRI chat session per LivLiv character. A new binding makes AIRI open a new
// session (session-store ensureBoundSession), so the turn number stays off the binding.

export function airiBinding(characterId: string) {
  const id = characterId.trim().replace(/\s+/g, '-').replace(/[^\w.:-]/g, '').slice(0, 120)
  return `livliv-stage:${id || 'stage'}`
}

/** Same character binding is one session. An older livlivTurn of that session is stale. */
export function acceptAiriReply(reply: { binding?: string; turn?: number }, current: { binding: string; turn: number }) {
  if (!reply.binding?.startsWith('livliv-stage:')) return true
  if (reply.binding !== current.binding) return false
  if (reply.turn !== undefined && reply.turn !== current.turn) return false
  return true
}
