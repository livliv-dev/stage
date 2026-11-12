// npm test: the local endpoint over real HTTP on 127.0.0.1.
import assert from 'node:assert/strict'
import { request } from 'node:http'
import { after, before, test } from 'node:test'
import type { CmdBody } from '../commands'
import { startLocalApi, type LocalApi } from '../localApi'

const TOKEN = 'a'.repeat(32)
const got: { cmd: CmdBody; m?: string }[] = []
let api: LocalApi

before(async () => {
  api = await startLocalApi(40000 + Math.floor(Math.random() * 20000), {
    token: () => TOKEN,
    deliver: (cmd, m) => { got.push({ cmd, m }); return m && m !== 'd03' ? 0 : 1 },
    keyOk: (m, k) => m === 'd03' && k === 'key-d03',
    stages: () => 1, version: 'test', origins: new Set(['https://livliv.ai']),
  })
})
after(() => api.close())

function call(path: string, opts: { method?: string; headers?: Record<string, string> } = {}) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const r = request({ host: '127.0.0.1', port: api.port, path, method: opts.method || 'GET', headers: opts.headers }, (res) => {
      let s = ''
      res.on('data', (c) => { s += c })
      res.on('end', () => resolve({ status: res.statusCode || 0, body: JSON.parse(s) }))
    })
    r.on('error', reject)
    r.end()
  })
}

test('health without a token', async () => {
  const r = await call('/api/health')
  assert.equal(r.status, 200)
  assert.equal(r.body.app, 'livliv-desktop')
})

test('a command with the token, three ways', async () => {
  got.length = 0
  assert.deepEqual((await call(`/api/live/cmd?token=${TOKEN}&do=expr:2`)).body, { delivered: 1 })
  assert.equal((await call('/api/live/cmd?do=act:nod', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` } })).status, 200)
  assert.equal((await call('/api/live/cmd?do=clear', { headers: { 'X-LivLiv-Token': TOKEN } })).status, 200)
  assert.deepEqual(got.map((g) => g.cmd), [{ do: 'expr', id: '2' }, { do: 'act', id: 'nod' }, { do: 'clear' }])
})

test("the server's own URL works with only the host changed", async () => {
  const r = await call('/api/live/cmd?m=d03&k=key-d03&do=expr:%E5%AE%B3%E7%BE%9E:on')
  assert.equal(r.status, 200)
  assert.deepEqual(got.at(-1), { cmd: { do: 'expr', id: '害羞', on: true }, m: 'd03' })
  assert.equal((await call('/api/live/cmd?m=d03&k=wrong&do=clear')).status, 403)
})

test('refused', async () => {
  assert.equal((await call('/api/live/cmd?do=clear')).status, 403)
  assert.equal((await call(`/api/live/cmd?token=${'b'.repeat(32)}&do=clear`)).status, 403)
  assert.equal((await call(`/api/live/cmd?token=${TOKEN}&do=dance`)).status, 400)
  assert.equal((await call(`/api/live/cmd?token=${TOKEN}&do=clear`, { method: 'DELETE' })).status, 405)
  assert.equal((await call(`/api/live/cmd?token=${TOKEN}&do=clear`, { headers: { Host: 'evil.example' } })).status, 421, 'DNS rebinding')
  assert.equal((await call(`/api/live/cmd?token=${TOKEN}&do=clear`, { headers: { Origin: 'https://evil.example' } })).status, 403)
  assert.equal((await call(`/api/live/cmd?token=${TOKEN}&do=clear`, { headers: { Origin: 'https://livliv.ai' } })).status, 200)
  assert.equal((await call('/elsewhere')).status, 404)
})

test('requests without a valid token have a rate budget of their own', async () => {
  const own = await startLocalApi(40000 + Math.floor(Math.random() * 20000), { token: () => TOKEN, deliver: () => 1, keyOk: (m, k) => m === 'd03' && k === 'key-d03', stages: () => 1, version: 't', origins: new Set() })
  const status = (path: string) => fetch(`http://127.0.0.1:${own.port}${path}`).then((r) => r.status)
  try {
    const flood = await Promise.all(Array.from({ length: 80 }, (_, i) => status(i % 2 ? '/api/live/cmd?do=clear' : `/api/live/cmd?token=${'b'.repeat(32)}&do=clear`)))
    assert.ok(flood.includes(429) && flood.every((s) => s === 403 || s === 429), 'the flood is limited')
    assert.equal(await status(`/api/live/cmd?token=${TOKEN}&do=clear`), 200, 'a valid request still goes through')
    assert.equal(await status('/api/live/cmd?m=d03&k=key-d03&do=clear'), 200, 'so does a character key')
    assert.equal(await status('/api/live/cmd?do=clear'), 429, 'the flood is still limited')
    const valid = await Promise.all(Array.from({ length: 70 }, () => status(`/api/live/cmd?token=${TOKEN}&do=clear`)))
    assert.ok(valid.includes(429), 'valid requests keep their own limit')
  } finally { await own.close() }
})

test('the next port when the first is taken', async () => {
  const second = await startLocalApi(api.port, { token: () => TOKEN, deliver: () => 0, keyOk: () => false, stages: () => 0, version: 't', origins: new Set() })
  assert.equal(second.port, api.port + 1)
  await second.close()
})
