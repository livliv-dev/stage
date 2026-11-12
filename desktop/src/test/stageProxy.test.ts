// npm test: what Stage's /__ai pass-through may reach, with the network replaced by a record of each hop.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AI_HEADER, blockedAddress, passToModel, type HopInit, type ModelDeps, type Redirect } from '../stageProxy'

const CONTROL = 21480
const DNS: Record<string, string[]> = {
  'api.example.com': ['93.184.216.34'], 'cdn.example.net': ['93.184.216.35'], 'kokoro.lan': ['192.168.1.20'],
  'rebind.example.com': ['93.184.216.36', '169.254.169.254'], localhost: ['127.0.0.1', '::1'],
}

function network(answers: Record<string, Response | Redirect> = {}) {
  const hops: { url: string; init: HopInit }[] = []
  const deps: ModelDeps = {
    controlPort: () => CONTROL,
    resolve: async (host) => { if (!DNS[host]) throw new Error('ENOTFOUND'); return DNS[host] },
    hop: async (url, init) => { hops.push({ url: url.toString(), init: { ...init, headers: new Headers(init.headers) } }); return answers[url.toString()] ?? new Response('ok') },
  }
  return { hops, deps }
}
const page = (init: RequestInit & { ai?: boolean } = {}) => {
  const headers = new Headers(init.headers)
  if (init.ai !== false) headers.set(AI_HEADER, '1')
  return new Request('https://app.invalid/__ai', { ...init, headers })
}
const send = (to: string, deps: ModelDeps, init?: RequestInit & { ai?: boolean }) => passToModel(page(init), to, new AbortController().signal, deps)

test('blocked addresses: link-local and metadata always, loopback only on the control port', () => {
  for (const ip of ['169.254.169.254', '169.254.0.1', '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', 'fe80::1', 'febf::1', '100.100.100.200', 'fd00:ec2::254', 'not an ip'])
    assert.ok(blockedAddress(ip, 80, CONTROL), ip)
  for (const ip of ['127.0.0.1', '127.1.2.3', '::1', '::ffff:127.0.0.1', '0.0.0.0']) {
    assert.ok(blockedAddress(ip, CONTROL, CONTROL), `${ip} on the control port`)
    assert.ok(!blockedAddress(ip, 11434, CONTROL), `${ip}: Ollama`)
  }
  for (const ip of ['192.168.1.20', '10.0.0.5', '172.16.0.1', '93.184.216.34', '2606:2800:220:1::1', 'fd12::1'])
    assert.ok(!blockedAddress(ip, CONTROL, CONTROL), ip)
  assert.ok(!blockedAddress('127.0.0.1', CONTROL, null), 'the control API is off')
})

test('only the page own fetch, GET or POST, to http or https', async () => {
  const { hops, deps } = network()
  assert.equal((await send('https://api.example.com/v1/models', deps, { ai: false })).status, 403)
  assert.equal((await send('https://api.example.com/v1/models', deps, { method: 'PUT', body: 'x' })).status, 405)
  assert.equal((await send('https://api.example.com/v1/models', deps, { method: 'DELETE' })).status, 405)
  for (const bad of ['ftp://api.example.com/', 'file:///etc/passwd', 'livliv-stage://app/', 'not a url', ''])
    assert.equal((await send(bad, deps)).status, 400, bad)
  assert.equal(hops.length, 0)
})

test('the user own servers: internet, LAN and this computer', async () => {
  const { hops, deps } = network({ 'https://api.example.com/v1/chat': new Response('{}', { headers: { 'set-cookie': 'a=1', 'content-type': 'application/json' } }) })
  const r = await send('https://api.example.com/v1/chat', deps, { method: 'POST', body: '{"q":1}', headers: { Authorization: 'Bearer k', Cookie: 'c=1', 'x-livliv-request': 'ticket', 'content-type': 'application/json' } })
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('set-cookie'), null)
  assert.equal(r.headers.get('content-type'), 'application/json')
  const sent = hops[0].init
  assert.equal(sent.method, 'POST')
  assert.equal(new TextDecoder().decode(sent.body), '{"q":1}')
  assert.equal(sent.headers.get('authorization'), 'Bearer k')
  for (const h of [AI_HEADER, 'cookie', 'x-livliv-request']) assert.equal(sent.headers.get(h), null, h)
  for (const to of ['http://127.0.0.1:11434/api/chat', 'http://localhost:11434/v1/models', 'http://kokoro.lan:8880/v1/audio/speech', 'http://192.168.1.20/', 'http://[::1]:11434/'])
    assert.equal((await send(to, deps)).status, 200, to)
})

test('metadata and the control API stay out of reach, also behind a DNS name', async () => {
  const { hops, deps } = network()
  for (const to of ['http://169.254.169.254/latest/meta-data/', 'http://[fe80::1]/', 'http://[::ffff:169.254.169.254]/', 'http://2852039166/',
    'http://metadata.google.internal/computeMetadata/v1/', 'http://METADATA.google.internal./', 'http://rebind.example.com/',
    `http://127.0.0.1:${CONTROL}/api/stage/state`, `http://localhost:${CONTROL}/api/live/cmd?do=clear`, `http://[::1]:${CONTROL}/`])
    assert.equal((await send(to, deps)).status, 400, to)
  assert.equal((await send('https://nowhere.invalid/', deps)).status, 502, 'a name that does not resolve')
  assert.equal(hops.length, 0)
})

test('each redirect is checked again, three at most', async () => {
  const redirect = (location: string, method = 'GET'): Redirect => ({ location, method })
  const blocked = network({ 'https://api.example.com/a': redirect('http://169.254.169.254/latest/') })
  assert.equal((await send('https://api.example.com/a', blocked.deps)).status, 502)
  assert.deepEqual(blocked.hops.map((h) => h.url), ['https://api.example.com/a'])

  const control = network({ 'https://api.example.com/a': redirect(`http://localhost:${CONTROL}/api/live/cmd`) })
  assert.equal((await send('https://api.example.com/a', control.deps)).status, 502)
  assert.equal(control.hops.length, 1)

  const three = network({ 'https://api.example.com/1': redirect('/2'), 'https://api.example.com/2': redirect('/3'), 'https://api.example.com/3': redirect('/4') })
  assert.equal((await send('https://api.example.com/1', three.deps)).status, 200)
  assert.equal(three.hops.length, 4)
  const four = network({ ...Object.fromEntries([1, 2, 3, 4].map((n) => [`https://api.example.com/${n}`, redirect(`/${n + 1}`)])) })
  assert.equal((await send('https://api.example.com/1', four.deps)).status, 502)
  assert.equal(four.hops.length, 4)
})

test('a redirect keeps the key on its origin and drops the body when it turns into GET', async () => {
  const { hops, deps } = network({
    'https://api.example.com/tts': { location: 'https://api.example.com/tts2', method: 'POST' },
    'https://api.example.com/tts2': { location: 'https://cdn.example.net/audio.mp3', method: 'GET' },
  })
  const r = await send('https://api.example.com/tts', deps, { method: 'POST', body: 'text', headers: { Authorization: 'Bearer k', 'content-type': 'text/plain' } })
  assert.equal(r.status, 200)
  assert.deepEqual(hops.map((h) => [h.url, h.init.method, h.init.headers.get('authorization'), h.init.body?.byteLength ?? null, h.init.headers.get('content-type')]), [
    ['https://api.example.com/tts', 'POST', 'Bearer k', 4, 'text/plain'],
    ['https://api.example.com/tts2', 'POST', 'Bearer k', 4, 'text/plain'],
    ['https://cdn.example.net/audio.mp3', 'GET', null, null, null],
  ])
})

test('a service that cannot be reached answers 502', async () => {
  const deps: ModelDeps = { ...network().deps, hop: async () => { throw new Error('ECONNREFUSED') } }
  const r = await send('http://127.0.0.1:11434/api/chat', deps)
  assert.equal(r.status, 502)
  assert.match(((await r.json()) as { error: { message: string } }).error.message, /ECONNREFUSED/)
})
