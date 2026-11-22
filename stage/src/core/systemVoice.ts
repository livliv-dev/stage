// The system voice a character that isn't on the site speaks in with livliv.ai's voices, when none is chosen in its card:
// one of the site's short list for its gender (/api/chat/voices: 少女 for f, 少年 for m, both in turn when it isn't known),
// picked by the character's id, so it keeps its voice however the stage changes. Two that would pick the same voice
// share it out by their ids (the one first by id keeps it, the other takes the next free one), and a voice chosen in
// another card is left to that one. Pure: test/systemVoice.test.ts.

export type SystemVoice = { id: string; group?: string; core?: boolean }
export type Voiced = { id: string; gender?: 'f' | 'm' | null; voice: { livliv: string }; onSite: boolean }

/** a stable number for an id (FNV-1a) */
function hash(text: string) {
  let h = 0x811c9dc5
  for (const ch of text) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0 }
  return h
}
const kind = (c: Voiced) => (c.gender === 'f' || c.gender === 'm' ? c.gender : '')

/** the voices for a gender, from the site's listing: its group's short list */
export function voicesFor(gender: 'f' | 'm' | '', voices: readonly SystemVoice[]): string[] {
  const group = (g: string) => voices.filter((v) => v.group === g && v.core !== false).map((v) => v.id)
  if (gender === 'f') return group('girl')
  if (gender === 'm') return group('man')
  const girls = group('girl'), men = group('man')
  return girls.flatMap((v, k) => (men[k] ? [v, men[k]] : [v])).concat(men.slice(girls.length))
}

/** `c`'s system voice: its own choice, else one picked by its id among the others on the stage (`cast`); '' when the
 *  site's listing has none for it (the site then speaks by its gender) */
export function systemVoiceFor(c: Voiced, cast: readonly Voiced[], voices: readonly SystemVoice[]): string {
  if (c.voice.livliv) return c.voice.livliv
  const list = voicesFor(kind(c), voices)
  if (!list.length) return ''
  const chosen = new Set(cast.filter((x) => x.id !== c.id && x.voice.livliv).map((x) => x.voice.livliv))
  const free = list.filter((v) => !chosen.has(v))
  const pool = free.length ? free : list
  // the others without a voice of their own and with the same list, in the order of their ids
  const rivals = [...new Map([...cast, c].filter((x) => !x.onSite && !x.voice.livliv && kind(x) === kind(c)).map((x) => [x.id, x])).values()]
    .sort((a, b) => hash(a.id) - hash(b.id) || (a.id < b.id ? -1 : 1))
  const taken = new Set<string>()
  for (const x of rivals) {
    const start = hash(x.id) % pool.length
    let pick = pool[start]
    for (let k = 0; k < pool.length && taken.has(pick); k++) pick = pool[(start + k) % pool.length]
    if (x.id === c.id) return pick
    taken.add(pick)
  }
  return pool[hash(c.id) % pool.length]
}
