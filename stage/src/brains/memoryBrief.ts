// What Stage's own brain is told it remembers: each memory's text alone (no ids, owners or times: those stay in Stage),
// the most recent first as memory.ts gives them, up to MEMORY_CHARS in all; a long one is cut to the room left. They go
// to the model ahead of the conversation (brain.ts), where they change least, so the start of each call stays the same
// from one turn to the next and the provider's cache can keep it. Pure: test/memoryBrief.test.ts.

/** how much remembered text one call carries */
export const MEMORY_CHARS = 2000

export function memoryBrief(memories: readonly { text: string }[] | undefined, cap = MEMORY_CHARS): string[] {
  const out: string[] = []
  let room = cap
  for (const memory of memories ?? []) {
    const text = memory.text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (room <= 1) break
    const kept = text.length <= room ? text : text.slice(0, room - 1) + '…'
    out.push(kept)
    room -= kept.length
  }
  return out
}
