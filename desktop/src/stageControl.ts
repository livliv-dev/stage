import { randomUUID } from 'node:crypto'
import { ipcMain, type WebContents } from 'electron'
import { trusted } from './security'
import type { StageApiDeps } from './stageApi'
import { readStageResult, type StageControlRequest } from './stageCommands'

/** Requests are tied to one editor; another window cannot acknowledge or execute its requests. */
export function stageControl(editor: () => WebContents | null): StageApiDeps {
  const pending = new Map<string, { sender: WebContents; resolve(value: unknown): void; reject(error: Error): void; timer: NodeJS.Timeout }>()
  const watched = new WeakSet<WebContents>()
  const cancel = (sender: WebContents) => {
    for (const [id, request] of pending) if (request.sender === sender) { clearTimeout(request.timer); pending.delete(id); request.reject(new Error('Stage editor closed or reloaded')) }
  }
  ipcMain.on('livliv:control-result', (event, id: unknown, value: unknown) => {
    if (typeof id !== 'string' || !trusted(event)) return
    const request = pending.get(id)
    if (!request || request.sender !== event.sender || editor() !== event.sender) return
    clearTimeout(request.timer); pending.delete(id); request.resolve(value)
  })
  const request = (command: StageControlRequest['command']) => new Promise<unknown>((resolve, reject) => {
    const sender = editor()
    if (!sender || sender.isDestroyed() || sender.isLoadingMainFrame()) { reject(new Error('Stage editor is not ready')); return }
    if (pending.size >= 32) { reject(new Error('Stage has too many pending commands')); return }
    if (!watched.has(sender)) { watched.add(sender); sender.on('destroyed', () => cancel(sender)); sender.on('did-start-loading', () => cancel(sender)) }
    const id = randomUUID(), expires = Date.now() + 4000
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Stage editor response timed out')) }, 4000)
    pending.set(id, { sender, resolve, reject, timer })
    sender.send('livliv:control', { id, expires, command } satisfies StageControlRequest)
  })
  return { state: () => request(null), command: async (command) => readStageResult(await request(command)) }
}
