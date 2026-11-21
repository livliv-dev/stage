import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { createServer } from 'node:net'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { CollabHost } from '../collabHost'
import { readCollabConfig } from '#protocol/collab'

class Editor extends EventEmitter {
  destroyed = false
  loading = false
  isDestroyed() { return this.destroyed }
  isLoadingMainFrame() { return this.loading }
  send() {}
}
const interfaces = () => ({ en0: ['192.168.1.8', '127.0.0.1', '203.0.113.8'].map((address): import('node:os').NetworkInterfaceInfo => ({
  address, family: 'IPv4', internal: address.startsWith('127.'), netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: address + '/24',
})) })
const free = async (port: number) => {
  const server = createServer(); server.listen(port, '127.0.0.1'); await once(server, 'listening')
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

test('IPC accepts only an explicit port and local/network choice', () => {
  assert.deepEqual(readCollabConfig({ port: 0, network: true }), { port: 0, network: true })
  for (const value of [null, [], { port: -1, network: true }, { port: 65536, network: true }, { port: '5234', network: true }, { port: 5234 }, { port: 1.5, network: false }]) assert.equal(readCollabConfig(value), null)
})

test('the installed production package loads from CommonJS without Stage source or TypeScript support', () => {
  const module = createRequire(__filename)('livliv-stage-collab') as { startRelay: unknown }
  assert.equal(typeof module.startRelay, 'function')
})

test('a host starts off, opens an actual server only on request, then releases its port', async () => {
  const editor = new Editor(), host = new CollabHost({ editor: () => editor, interfaces })
  assert.equal(host.state().enabled, false)
  try {
    const running = await host.start({ port: 0, network: false })
    assert.equal(running.enabled, true); assert.ok(running.port)
    assert.deepEqual(running.urls, [`ws://127.0.0.1:${running.port}/room`])
    assert.equal((await fetch(`http://127.0.0.1:${running.port}/health`)).status, 200)
    assert.equal((await host.start({ port: 0, network: false })).port, running.port, 'starting again does not restart rooms')
    await host.close(); await free(running.port)
    assert.equal(host.state().enabled, false)
  } finally { await host.close() }
})

test('network hosting advertises private network addresses rather than the loopback or wildcard', async () => {
  const editor = new Editor(), host = new CollabHost({ editor: () => editor, interfaces })
  try {
    const running = await host.start({ port: 0, network: true })
    assert.deepEqual(running.urls, [`ws://192.168.1.8:${running.port}/room`])
    assert.ok(running.localUrl?.includes('127.0.0.1'))
  } finally { await host.close() }
  const offline = new CollabHost({ editor: () => editor, interfaces: () => ({}) })
  try { assert.deepEqual((await offline.start({ port: 0, network: true })).urls, []) }
  finally { await offline.close() }
})

test('port conflicts are explicit errors and a different port can recover', async () => {
  const occupied = createServer(); occupied.listen(0, '127.0.0.1'); await once(occupied, 'listening')
  const port = (occupied.address() as import('node:net').AddressInfo).port
  const host = new CollabHost({ editor: () => new Editor() })
  try {
    const failed = await host.start({ port, network: false })
    assert.equal(failed.enabled, false); assert.equal(failed.error, 'port-in-use'); assert.equal(failed.port, null)
    const recovered = await host.start({ port: 0, network: false })
    assert.equal(recovered.enabled, true); assert.equal(recovered.error, null)
  } finally { await host.close(); occupied.close() }
})

test('reload or destruction stops the listener; queued close also stops a start still in progress', async () => {
  for (const event of ['did-start-loading', 'destroyed'] as const) {
    const editor = new Editor(), host = new CollabHost({ editor: () => editor })
    const state = await host.start({ port: 0, network: false })
    editor.emit(event); await host.close()
    assert.equal(host.state().enabled, false); await free(state.port!)
  }
  const editor = new Editor(), host = new CollabHost({ editor: () => editor })
  const pending = host.start({ port: 0, network: false }), stopped = host.close()
  const [started, finished] = await Promise.all([pending, stopped])
  assert.equal(finished.enabled, false); await free(started.port!)
})
