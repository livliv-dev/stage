import type { IncomingMessage, ServerResponse } from 'node:http'
import { readStageCommand, type StageCommand, type StageResult } from './stageCommands'

export type StageApiDeps = { state(): Promise<unknown>; command(command: StageCommand): Promise<StageResult> }
type Respond = (response: ServerResponse, status: number, body: object) => void
const MAX_BODY = 32 * 1024

/** Called only after the local server has checked Host, Origin, rate and the app's bearer token. */
export async function serveStageApi(request: IncomingMessage, response: ServerResponse, path: string, stage: StageApiDeps, send: Respond) {
  if (path === '/api/stage/state') {
    if (request.method !== 'GET') { send(response, 405, { error: 'Use GET' }); return }
    try { send(response, 200, { ok: true, state: await stage.state() }) }
    catch (error) { console.error('[stage-api] state unavailable:', error); send(response, 503, { ok: false, error: 'Stage is not responding' }) }
    return
  }
  if (request.method !== 'POST') { send(response, 405, { error: 'Use POST' }); return }
  let size = 0
  const chunks: Buffer[] = []
  try {
    for await (const part of request) { const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part); size += chunk.length; if (size <= MAX_BODY) chunks.push(chunk) }
    if (size > MAX_BODY) { send(response, 413, { error: 'Command is larger than 32 KB' }); return }
    let value: unknown
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { send(response, 400, { error: 'Invalid JSON command' }); return }
    const command = readStageCommand(value)
    if (!command) { send(response, 400, { error: 'Invalid Stage command' }); return }
    const result = await stage.command(command)
    send(response, result.ok ? result.pending ? 202 : 200 : result.status, result)
  } catch (error) { if (request.aborted || response.destroyed) return; console.error('[stage-api] command unavailable:', error); send(response, 503, { ok: false, error: 'Stage is not responding' }) }
}
