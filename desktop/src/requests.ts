// Chromium does not reliably abort a custom-protocol Request when its renderer stops fetch().
// A ticket binds that request's lifetime to the calling window, including the streamed body.
import { randomUUID } from 'node:crypto'
import type { WebContents } from 'electron'

export const REQUEST_HEADER = 'x-livliv-request'
const requests = new Map<string, { owner: number; controller: AbortController; timer: ReturnType<typeof setTimeout> }>()
const owners = new Set<number>()
function finish(id: string) {
  const entry = requests.get(id)
  if (entry) { clearTimeout(entry.timer); requests.delete(id) }
}
export function beginRequest(owner: WebContents): string {
  if (!owners.has(owner.id)) {
    owners.add(owner.id)
    owner.once('destroyed', () => {
      owners.delete(owner.id)
      for (const [id, request] of requests) if (request.owner === owner.id) { request.controller.abort(); finish(id) }
    })
  }
  const id = randomUUID(), controller = new AbortController()
  const timer = setTimeout(() => { controller.abort(new DOMException('Request exceeded 45 seconds', 'TimeoutError')); finish(id) }, 45_000)
  timer.unref()
  requests.set(id, { owner: owner.id, controller, timer })
  return id
}
export function cancelRequest(owner: number, id: unknown) {
  if (typeof id !== 'string') throw new TypeError('request id must be a string')
  const request = requests.get(id)
  if (request?.owner === owner) { request.controller.abort(); finish(id) }
}
export async function proxyRequest(request: Request, send: (signal: AbortSignal) => Promise<Response>): Promise<Response> {
  const id = request.headers.get(REQUEST_HEADER), entry = id ? requests.get(id) : null
  // A cancellation can arrive before the protocol handler. An expired ticket never starts a new upstream call.
  if (id && !entry) throw new DOMException('Request was cancelled', 'AbortError')
  const signal = entry ? AbortSignal.any([request.signal, entry.controller.signal]) : request.signal
  const done = () => { if (id) finish(id) }
  try {
    signal.throwIfAborted()
    const response = await send(signal)
    if (!response.body) { done(); return response }
    const reader = response.body.getReader()
    return new Response(new ReadableStream({
      async pull(controller) {
        try {
          const { value, done: over } = await reader.read()
          if (over) { reader.releaseLock(); done(); controller.close() }
          else controller.enqueue(value)
        } catch (error) { done(); controller.error(error) }
      },
      async cancel(reason) { entry?.controller.abort(reason); done(); await reader.cancel(reason) },
    }), { status: response.status, statusText: response.statusText, headers: response.headers })
  } catch (error) { done(); throw error }
}
