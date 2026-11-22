// The desktop protocol needs an explicit cancellation ticket; ordinary browser fetch already owns its signal.
import { features } from './core/platform'
import { tr } from './i18n'
import { UNREACHABLE_HEADER } from '../../protocol/src/unreachable'

/** a request that got no answer at all (offline, the service out of reach), in words people can act on: never the
 *  browser's own "Failed to fetch", nor the desktop app's fixed text */
export class Unreachable extends Error {
  constructor(host: string, cause?: unknown) { super(tr('连不上 {0}，请检查网络后再试', host), { cause }); this.name = 'Unreachable' }
}
/** an error of a request that got no answer, as Unreachable; a request called off (its signal) stays as it was */
export function unreachable(error: unknown, host: string, signal?: AbortSignal | null): unknown {
  if (error instanceof Unreachable || signal?.aborted || (error instanceof Error && error.name === 'AbortError')) return error
  return new Unreachable(host, error)
}

/** a request of the page; in the desktop app one it passed on that got no answer comes back as a 502 naming the host
 *  (UNREACHABLE_HEADER), and fails as Unreachable like the browser's own failure */
export async function desktopFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await send(url, init)
  const host = response.status === 502 ? response.headers.get(UNREACHABLE_HEADER) : null
  if (host) { void response.body?.cancel().catch(() => {}); throw new Unreachable(host) }
  return response
}

async function send(url: string, init: RequestInit): Promise<Response> {
  const bridge = window.livlivDesktop?.requests, signal = init.signal
  if (!features.appScheme || !bridge || !signal) return fetch(url, init)
  const id = await bridge.begin()
  const cancel = () => { void bridge.cancel(id).catch((error: unknown) => console.error('Request cancellation failed', error)) }
  if (signal.aborted) { cancel(); throw signal.reason }
  signal.addEventListener('abort', cancel, { once: true })
  const done = () => signal.removeEventListener('abort', cancel)
  const headers = new Headers(init.headers); headers.set('x-livliv-request', id)
  try {
    const response = await fetch(url, { ...init, headers })
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
      async cancel(reason) { cancel(); done(); await reader.cancel(reason) },
    }), { status: response.status, statusText: response.statusText, headers: response.headers })
  } catch (error) { cancel(); done(); throw error }
}
