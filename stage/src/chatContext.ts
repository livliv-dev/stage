import type { Line } from './core/lines'

export type ConversationSummary = { text: string; sourceIds: string[]; memoryIds?: string[]; memoryRevision?: number }

/** Interrupted sentences are not evidence that the character said their entire generated text. */
export function contextLine(line: Line): string {
  if (line.cut && !line.human) return `${line.name}：（这一句被打断，未完整说出）`
  return `${line.name}：${line.text}`
}

export function conversationContext(lines: Line[], summary?: ConversationSummary, maxChars = 12000) {
  const ids = new Set(lines.map((line) => line.id))
  const valid = summary && summary.sourceIds.every((id) => ids.has(id)) ? summary : undefined
  const covered = new Set(valid?.sourceIds)
  const pending = lines.filter((line) => !covered.has(line.id))
  // Keep complete human/assistant exchanges together when the context needs trimming.
  const groups: Line[][] = []
  for (const line of pending) {
    if (!groups.length || line.human) groups.push([])
    groups.at(-1)!.push(line)
  }
  const selected: Line[][] = []
  let size = valid?.text.length ?? 0
  for (const group of [...groups].reverse()) {
    const length = group.reduce((sum, line) => sum + contextLine(line).length + 1, 0)
    if (selected.length && size + length > maxChars) break
    selected.unshift(group); size += length
  }
  const recent = selected.flat()
  return {
    earlier: valid?.text ?? '',
    history: recent.map(contextLine).join('\n'),
    sourceIds: [...(valid?.sourceIds ?? []), ...recent.map((line) => line.id)],
    updateSummary: pending.length >= 18 || size > 6000,
  }
}

/** Sentence boundaries let cancellation keep completed speech and discard sentences that never played. */
export function speechSegments(text: string): string[] {
  const parts = text.match(/[^。！？!?\n]+[。！？!?\n]*|[。！？!?\n]+/g)?.map((part) => part.trim()).filter(Boolean) ?? []
  return parts.length ? parts : [text]
}
