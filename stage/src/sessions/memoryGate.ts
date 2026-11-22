// A line is made from the memories saved when it was asked for. If they change before it is said (you edited or
// forgot one, a summary was written), the line is not said: it may rest on what is no longer remembered.
import { tr } from '../i18n'
import type { Line } from '../core/lines'
import type { MemoryScope } from '../memory'

/** what the gate reads of the memory archive: its revision for a character and scope */
export type MemoryRevisions = { context(profileIds: string[], scope: MemoryScope): Promise<{ revision: number }> }

/** the memories saved now are the ones of `revision` */
export async function memoryUnchanged(memory: MemoryRevisions, profileId: string, scope: MemoryScope, revision: number) {
  return (await memory.context([profileId], scope)).revision === revision
}

/** throws (the line is not said) when the memories changed since `revision` */
export async function checkMemory(memory: MemoryRevisions, profileId: string, scope: MemoryScope, revision: number) {
  if (!(await memoryUnchanged(memory, profileId, scope, revision))) throw new Error(tr('记忆已更新，请重新发送这一句'))
}

/** every memory a turn's context draws on, by id, once each: its memories, those its summary was made from, and those
 *  the lines it carries were made from (kept on each line said, so forgetting a memory can find what used it) */
export function memoryIdsOf(context: { memories: { id: string }[]; summary?: { memoryIds?: string[] }; lines: Pick<Line, 'memoryIds'>[] }): string[] {
  return [...new Set([...context.memories.map((entry) => entry.id), ...(context.summary?.memoryIds ?? []), ...context.lines.flatMap((line) => line.memoryIds ?? [])])]
}
