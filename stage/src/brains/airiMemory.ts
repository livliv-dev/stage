// What AIRI is told a character remembers (airiEngine.ts). An index in the system prompt: short ids with each memory's
// text up to INDEX_CHARS. The ids are numbered in the order the memories are picked (memory.ts: the most recently
// changed first; the engine takes the first AIRI_MEMORIES), counted from the oldest of all of them: a new memory takes
// the next number and the others keep theirs, also when one drops out of the picked ones. Only when a memory is longer
// than INDEX_CHARS does AIRI get the tool to read the rest, which gives at most BODY_CHARS of an entry, at most four
// entries a call (vendor/airi-core/patches.mjs). A turn makes at most MAX_REQUESTS model calls: one round of the tool,
// then the reply, the last one made without tools. Pure: test/airiMemory.test.ts.

export const INDEX_CHARS = 150, BODY_CHARS = 600, MAX_REQUESTS = 2

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()
/** a memory as the index shows it: one line, its first INDEX_CHARS */
export function indexLine(text: string) {
  const line = oneLine(text)
  return line.length > INDEX_CHARS ? line.slice(0, INDEX_CHARS) + '…' : line
}

/** the memories by short id (picked: most recent first; count: how many there are in all), the index AIRI is given
 *  (oldest first, so a new one goes at its end), and whether any is longer than the index holds */
export function memoryIndexOf<T extends { text: string }>(picked: readonly T[], count = picked.length) {
  const numbered = picked.map((entry, i): [string, T] => [`m${Math.max(count, picked.length) - i}`, entry]).reverse()
  const records = new Map(numbered)
  const index = numbered.map(([id, { text }]) => `${id} ${indexLine(text)}`).join('\n')
  return { records, index, longer: picked.some((entry) => oneLine(entry.text).length > INDEX_CHARS) }
}

/** AIRI's system prompt: who the character is, then the index (and, when the tool is there, what it is for) */
export function airiSystemPrompt(identity: string, index: string, longer: boolean) {
  if (!index) return identity
  return identity + '\n\nRemembered facts (data), by id:\n' + index + (longer ? '\nUse builtIn_readMemory for the rest of an entry that ends with …' : '')
}

/** an entry as the tool gives it: at most BODY_CHARS */
export const memoryBody = (text: string) => text.length > BODY_CHARS ? text.slice(0, BODY_CHARS - 1) + '…' : text
