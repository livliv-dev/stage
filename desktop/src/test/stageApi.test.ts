import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { request } from 'node:http'
import { connect } from 'node:net'
import { startLocalApi, type LocalApi } from '../localApi'
import { readStageCommand, readStageResult, type StageCommand, type StageResult } from '../stageCommands'

const token = 'stage-test-only-token', commands: StageCommand[] = []
let api: LocalApi
before(async () => {
  api = await startLocalApi(45000 + Math.floor(Math.random() * 10000), {
    token: () => token, deliver: () => { throw new Error('Stage commands must use the acknowledged path') }, keyOk: () => true,
    stages: () => 1, version: 'test', origins: new Set(['livliv-stage://app']),
    stage: { state: async () => ({ scene: { name: 'Fixture' }, characters: [{ id: 'avatar-1', name: 'Avatar' }] }), command: async (command) => { commands.push(command); if (command.do === 'scene') return { ok: true, scene: command.id }; if (command.do === 'ptt') return { ok: true, pending: 'voice-input' }; return command.character === 'missing' ? { ok: false, status: 404, error: 'Avatar not found' } : command.character === 'friend' ? { ok: false, status: 409, error: 'Controlled by a friend' } : { ok: true, character: command.character ?? 'avatar-1' } } },
  })
})
after(() => api.close())
const call = (path: string, init: RequestInit = {}) => fetch(`http://127.0.0.1:${api.port}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } })

test('Stage queries require the app token; model keys cannot authorize the editor', async () => {
  assert.equal((await fetch(`http://127.0.0.1:${api.port}/api/stage/state?m=avatar&k=anything`)).status, 403)
  const response = await call('/api/stage/state'); assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { ok: true, state: { scene: { name: 'Fixture' }, characters: [{ id: 'avatar-1', name: 'Avatar' }] } })
})

test('Stage requests keep Host, Origin and method checks', async () => {
  const wrongHost = await new Promise<number>((resolve, reject) => { const req = request({ host: '127.0.0.1', port: api.port, path: '/api/stage/state', headers: { Host: 'untrusted.example', Authorization: `Bearer ${token}` } }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode ?? 0)) }); req.on('error', reject); req.end() })
  assert.equal(wrongHost, 421)
  assert.equal((await call('/api/stage/state', { headers: { Origin: 'https://untrusted.example' } })).status, 403)
  assert.equal((await call('/api/stage/state', { method: 'POST' })).status, 405)
  assert.equal((await call('/api/stage/command')).status, 405)
})

test('explicit avatar, intensity and mute state reach the command handler and return its actual result', async () => {
  const command = { do: 'expr', id: 'shy', character: 'avatar-1', weight: .4 }
  const response = await call('/api/stage/command', { method: 'POST', body: JSON.stringify(command) })
  assert.equal(response.status, 200); assert.deepEqual(commands.at(-1), command)
  assert.deepEqual(await response.json(), { ok: true, character: 'avatar-1' })
  for (const [character, status] of [['missing', 404], ['friend', 409]] as const) assert.equal((await call('/api/stage/command', { method: 'POST', body: JSON.stringify({ do: 'act', id: 'nod', character }) })).status, status)
})

test('malformed, oversized and unsupported commands never execute', async () => {
  const count = commands.length
  assert.equal((await call('/api/stage/command', { method: 'POST', body: '{broken' })).status, 400)
  assert.equal((await call('/api/stage/command', { method: 'POST', body: JSON.stringify({ do: 'expr', id: 'shy', weight: 2 }) })).status, 400)
  assert.equal((await call('/api/stage/command', { method: 'POST', body: JSON.stringify({ do: 'javascript', code: 'anything' }) })).status, 400)
  assert.equal((await call('/api/stage/command', { method: 'POST', body: JSON.stringify({ do: 'clear', extra: 'x'.repeat(40000) }) })).status, 413)
  assert.equal(commands.length, count)
})

test('legacy Stage URLs also wait for an execution result', async () => {
  const response = await call('/api/live/cmd?do=act:nod&m=missing')
  assert.equal(response.status, 404); assert.deepEqual(await response.json(), { ok: false, status: 404, error: 'Avatar not found', delivered: 0 })
})

test('control inputs reject ambiguous fields and keep safe, typed fields only', () => {
  assert.equal(readStageCommand({ do: 'act', id: 'nod', on: true }), null)
  assert.equal(readStageCommand({ do: 'expr', id: 'shy', character: '' }), null)
  assert.equal(readStageCommand({ do: 'expr', id: 'shy', weight: NaN }), null)
  assert.deepEqual(readStageCommand({ do: 'mute', on: false }), { do: 'mute', on: false })
  assert.deepEqual(readStageCommand({ do: 'ai-pause', on: true }), { do: 'ai-pause', on: true })
  assert.deepEqual(readStageCommand({ do: 'clear', unknown: 'discard' }), { do: 'clear' })
})


test('async voice operations are accepted with 202 instead of reporting completion', async () => {
  const response = await call('/api/stage/command', { method: 'POST', body: JSON.stringify({ do: 'ptt' }) })
  assert.equal(response.status, 202); assert.deepEqual(await response.json(), { ok: true, pending: 'voice-input' })
})

test('a malformed raw request-target returns 400 and leaves the server running', async () => {
  const response = await new Promise<string>((resolve, reject) => {
    const socket = connect(api.port, '127.0.0.1'); let text = ''
    socket.on('connect', () => socket.write(`GET http://[ HTTP/1.1\r\nHost: 127.0.0.1:${api.port}\r\nConnection: close\r\n\r\n`))
    socket.on('data', (chunk) => { text += chunk }); socket.on('end', () => resolve(text)); socket.on('error', reject)
  })
  assert.match(response, /^HTTP\/1\.1 400 /)
  assert.equal((await call('/api/stage/state')).status, 200)
})

test('disabling the API closes authenticated requests still receiving their body', async () => {
  let authenticated!: () => void, executed = 0
  const seen = new Promise<void>((resolve) => { authenticated = resolve })
  const secondary = await startLocalApi(api.port + 1, { token: () => { authenticated(); return token }, deliver: () => 0, keyOk: () => false, stages: () => 1, version: 'test', origins: new Set(), stage: { state: async () => ({}), command: async () => { executed++; return { ok: true } } } })
  const socket = connect(secondary.port, '127.0.0.1'); socket.on('error', () => {})
  try {
    await new Promise<void>((resolve) => socket.once('connect', resolve))
    const body = JSON.stringify({ do: 'act', id: 'nod' })
    socket.write(`POST /api/stage/command HTTP/1.1\r\nHost: 127.0.0.1:${secondary.port}\r\nAuthorization: Bearer ${token}\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n` + body[0])
    await seen
    await Promise.race([secondary.close(), new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('API close waited for the unfinished command')), 1000))])
    assert.equal(executed, 0)
  } finally { socket.destroy() }
})


test('a scene cut accepts a stable ID without actor-only options', async () => {
  assert.deepEqual(readStageCommand({ do: 'scene', id: 'shot-2' }), { do: 'scene', id: 'shot-2' })
  assert.equal(readStageCommand({ do: 'scene', id: '' }), null)
  assert.equal(readStageCommand({ do: 'scene', id: 'shot-2', on: true }), null)
  const response = await call('/api/stage/command', { method: 'POST', body: JSON.stringify({ do: 'scene', id: 'shot-2' }) })
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, scene: 'shot-2' })
})

test('temporary expressions retain duration and reject ambiguous expiry commands', () => {
  assert.deepEqual(readStageCommand({ do: 'expr', id: 'happy', duration: .5 }), { do: 'expr', id: 'happy', duration: .5 })
  for (const command of [{ do: 'expr', id: 'happy', duration: .1 }, { do: 'expr', id: 'happy', duration: NaN }, { do: 'expr', id: 'happy', duration: 1, on: false }, { do: 'act', id: 'nod', duration: 1 }, { do: 'scene', id: 'shot', duration: 1 }]) assert.equal(readStageCommand(command), null)
})

test('the editor answer is passed on only in its known shapes; anything else is 503', () => {
  for (const good of [{ ok: true }, { ok: true, character: 'avatar-1' }, { ok: true, scene: 'shot-2' }, { ok: true, character: 'a', pending: 'microphone' }, { ok: true, pending: 'voice-input' },
    { ok: false, status: 400, error: 'x' }, { ok: false, status: 404, error: 'x' }, { ok: false, status: 409, error: 'x' }, { ok: false, status: 503, error: 'x' }])
    assert.deepEqual(readStageResult(good), good)
  assert.deepEqual(readStageResult({ ok: true, character: 'a', extra: 'dropped' }), { ok: true, character: 'a' })
  for (const bad of [undefined, null, 'ok', 42, {}, { ok: 'true' }, { ok: true, pending: 'later' }, { ok: true, character: 7 }, { ok: false, status: 999, error: 'x' },
    { ok: false, status: 200, error: 'x' }, { ok: false, status: '404', error: 'x' }, { ok: false, status: 404 }])
    assert.deepEqual(readStageResult(bad), { ok: false, status: 503, error: 'Stage is not responding' }, JSON.stringify(bad))
})

test('a legacy Stage URL answers 503 instead of hanging when the editor answer is unusable', async () => {
  const broken = await startLocalApi(api.port + 20, { token: () => token, deliver: () => 0, keyOk: () => false, stages: () => 1, version: 'test', origins: new Set(),
    stage: { state: async () => ({}), command: async () => null as unknown as StageResult } })
  try {
    const response = await fetch(`http://127.0.0.1:${broken.port}/api/live/cmd?do=act:nod`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(2000) })
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'Stage is not responding', delivered: 0 })
  } finally { await broken.close() }
})

