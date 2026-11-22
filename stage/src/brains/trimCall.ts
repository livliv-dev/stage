// An AIRI call livliv.ai refused as too long (413, its input limit), made shorter to be sent again as the same call: the
// turn isn't asked again from its start, so a tool round already paid for, or a game action already taken, is never
// repeated. Its messages are OpenAI's: the system prompt first (the identity, then the memory index: brains/
// airiMemory.ts), the lines before, then this call's own part: your line (with AIRI's [Context] block: the topic, the
// game, the summary) and the tool round so far. Level 1 leaves out the older half of the lines before and of the memory
// index; level 2 keeps the identity alone, the last few lines and this call's own part, its context the topic and the
// game only. Pictures (a game frame) go at either. Pure: test/trimCall.test.ts.

type Part = { type: string; text?: string }
export type CallMessage = { role: string; content?: string | Part[] | null }

const PICTURES = new Set(['image_url', 'image', 'input_image'])
const SOURCES = ['show-topic', 'current-game-state', 'history-summary']
/** where the system prompt's memory index starts (airiMemory.ts airiSystemPrompt) */
const MEMORIES = '\n\nRemembered facts (data), by id:\n'
const ENTRY = new RegExp(`\\n- (${SOURCES.join('|')}): `, 'g')

/** a [Context] block's entries, kept as `keep` says (a memory index: as many of its lines as it says) */
function context(text: string, keep: (source: string, body: string) => string | null): string {
  const at = text.indexOf('\n[Context]')
  if (at < 0) return text
  const block = text.slice(at), starts = [...block.matchAll(ENTRY)]
  if (!starts.length) return text
  const kept = starts.map((m, i) => {
    const body = block.slice(m.index! + m[0].length, i + 1 < starts.length ? starts[i + 1].index : undefined)
    const next = keep(m[1], body)
    return next === null ? '' : `\n- ${m[1]}: ${next}`
  }).join('')
  return text.slice(0, at) + (kept ? '\n[Context]' + kept : '')
}
/** the system prompt with the newer half of its memory index (the index is oldest first; the line about the tool after
 *  it stays), or none of it */
function memories(text: string, keep: 'half' | 'none'): string {
  const at = text.indexOf(MEMORIES)
  if (at < 0) return text
  if (keep === 'none') return text.slice(0, at)
  const lines = text.slice(at + MEMORIES.length).split('\n'), entries = lines.filter((line) => /^m\d+ /.test(line))
  const rest = lines.filter((line) => !/^m\d+ /.test(line))
  return text.slice(0, at) + MEMORIES + [...entries.slice(Math.floor(entries.length / 2)), ...rest].join('\n')
}
function mapText(m: CallMessage, f: (text: string) => string): CallMessage {
  if (typeof m.content === 'string') return { ...m, content: f(m.content) }
  if (Array.isArray(m.content)) return { ...m, content: m.content.map((p) => (p.type === 'text' && typeof p.text === 'string' ? { ...p, text: f(p.text) } : p)) }
  return m
}
function noPictures(m: CallMessage): CallMessage {
  if (!Array.isArray(m.content)) return m
  const content = m.content.filter((p) => !PICTURES.has(p.type))
  return content.length === m.content.length ? m : { ...m, content: content.length ? content : '[picture left out]' }
}
/** lines before that start with a tool's answer whose call was left out */
const fromWhole = (lines: CallMessage[]) => { let i = 0; while (lines[i]?.role === 'tool') i++; return lines.slice(i) }

export function trimCall(messages: readonly CallMessage[], level: 1 | 2): CallMessage[] {
  let user = -1
  messages.forEach((m, i) => { if (m.role === 'user') user = i })
  const before = user < 0 ? [...messages] : messages.slice(0, user), own = user < 0 ? [] : messages.slice(user)
  const systems = before.filter((m) => m.role === 'system'), lines = before.filter((m) => m.role !== 'system')
  if (level === 1) {
    const kept = fromWhole(lines.slice(Math.floor(lines.length / 2)))
    return [...systems.map((m) => mapText(m, (t) => memories(t, 'half'))), ...kept, ...own].map(noPictures)
  }
  const call = own.map((m, i) => (i === 0 ? mapText(m, (t) => context(t, (source, body) => (source === 'show-topic' || source === 'current-game-state' ? body : null))) : m))
  return [...systems.slice(0, 1).map((m) => mapText(m, (t) => memories(t, 'none'))), ...fromWhole(lines.slice(-4)), ...call].map(noPictures)
}
