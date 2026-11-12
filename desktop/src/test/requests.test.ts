import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import type { WebContents } from 'electron'
import { beginRequest, cancelRequest, proxyRequest, REQUEST_HEADER } from '../requests'
const owner = (id: number) => Object.assign(new EventEmitter(), { id }) as unknown as WebContents
const request = (id: string) => new Request('https://app.invalid/__ai', { headers: { [REQUEST_HEADER]: id } })
test('cancelling before protocol dispatch never starts the upstream call', async () => {
  const window = owner(1), id = beginRequest(window)
  cancelRequest(window.id, id)
  let called = false
  await assert.rejects(proxyRequest(request(id), async () => { called = true; return new Response() }), { name: 'AbortError' })
  assert.equal(called, false); window.emit('destroyed')
})
test('only the owning window can cancel, including after response headers', async () => {
  const window = owner(2), id = beginRequest(window)
  let signal!: AbortSignal
  const response = await proxyRequest(request(id), async (s) => { signal = s; return new Response(new ReadableStream()) })
  cancelRequest(99, id); assert.equal(signal.aborted, false)
  cancelRequest(window.id, id); assert.equal(signal.aborted, true)
  await response.body!.cancel(); window.emit('destroyed')
})
test('the deadline covers the streamed body and an expired ticket cannot restart', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const window = owner(3), id = beginRequest(window)
  let signal!: AbortSignal
  const response = await proxyRequest(request(id), async (s) => { signal = s; return new Response(new ReadableStream()) })
  t.mock.timers.tick(45_000)
  assert.equal(signal.aborted, true); assert.equal(signal.reason.name, 'TimeoutError')
  await assert.rejects(proxyRequest(request(id), async () => new Response()), { name: 'AbortError' })
  await response.body!.cancel(); window.emit('destroyed')
})
test('closing a window aborts its active requests and successful completion retires a ticket', async () => {
  const window = owner(4), id = beginRequest(window)
  let signal!: AbortSignal
  const response = await proxyRequest(request(id), async (s) => { signal = s; return new Response(new ReadableStream()) })
  window.emit('destroyed'); assert.equal(signal.aborted, true); await response.body!.cancel()
  const next = owner(5), done = beginRequest(next)
  assert.equal(await (await proxyRequest(request(done), async () => new Response('ok'))).text(), 'ok')
  await assert.rejects(proxyRequest(request(done), async () => new Response()), { name: 'AbortError' }); next.emit('destroyed')
})
