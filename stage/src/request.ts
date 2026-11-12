// The desktop protocol needs an explicit cancellation ticket; ordinary browser fetch already owns its signal.
export async function desktopFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const bridge = window.livlivDesktop?.requests, signal = init.signal
  if (location.protocol !== 'livliv-stage:' || !bridge || !signal) return fetch(url, init)
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
