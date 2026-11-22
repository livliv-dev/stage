// What AIRI is told a character remembers (airiEngine.ts). An index in the system prompt: short ids (m1, m2…, in the
// order the memories were made, so a new one goes at its end and the rest keep theirs) with each memory's text up to
// INDEX_CHARS. Only when a memory is longer than that does AIRI get the tool to read the rest, which gives at most
// BODY_CHARS of an entry (and the vendored core lets one call ask for at most four: vendor/airi-core/patches.mjs).
// A turn makes at most MAX_REQUESTS model calls: one round of the tool, then the reply. Pure: test/airiMemory.test.ts.

export const INDEX_CHARS = 150, BODY_CHARS = 600, MAX_REQUESTS = 2

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

/** the memories by short id, the index AIRI is given, and whether any is longer than the index holds */
export function memoryIndexOf<T extends { text: string; createdAt: number }>(memories: readonly T[]) {
  const ordered = [...memories].sort((a, b) => a.createdAt - b.createdAt)
  const records = new Map(ordered.map((entry, i) => [`m${i + 1}`, entry]))
  const index = [...records].map(([id, { text }]) => {
    const line = oneLine(text)
    return `${id} ${line.length > INDEX_CHARS ? line.slice(0, INDEX_CHARS) + '…' : line}`
  }).join('\n')
  return { records, index, longer: ordered.some((entry) => oneLine(entry.text).length > INDEX_CHARS) }
}

/** an entry as the tool gives it: at most BODY_CHARS */
export const memoryBody = (text: string) => text.length > BODY_CHARS ? text.slice(0, BODY_CHARS - 1) + '…' : text
