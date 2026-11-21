import assert from 'node:assert/strict'
import { test } from 'node:test'
import { engineOf, readProfiles, voiceboxClient } from '../voicebox'

type Call = { url: string; init: RequestInit }
/** a Voicebox that answers each path as given: a response, or a refused connection */
function stand(answers: Record<string, () => Response | Promise<Response>>) {
  const calls: Call[] = []
  const fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    const path = new URL(url).pathname, answer = answers[path]
    if (!answer) throw new TypeError('fetch failed: connect ECONNREFUSED 127.0.0.1:17493')
    // as fetch does: a call whose signal aborts rejects with its reason
    const signal = init.signal
    return Promise.race([answer(), new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(signal.reason), { once: true }))])
  }) as typeof globalThis.fetch
  return { calls, client: voiceboxClient({ fetch, base: 'http://127.0.0.1:17493' }) }
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

test('profiles: presets, cloned and designed voices, each with the engine that makes it; nothing malformed', () => {
  assert.deepEqual(readProfiles([
    { id: 'a', name: 'Lily', language: 'zh', voice_type: 'preset', preset_engine: 'kokoro' },
    { id: 'b', name: 'Me', language: 'en', voice_type: 'cloned', default_engine: 'chatterbox' },
    { id: 'c', name: 'Calm narrator', voice_type: 'designed' },
    { id: 'd', name: 'Old', voice_type: 'cloned' },
    { name: 'no id' }, 'nonsense', null,
  ]), [
    { id: 'a', name: 'Lily', language: 'zh', kind: 'preset', engine: 'kokoro' },
    { id: 'b', name: 'Me', language: 'en', kind: 'cloned', engine: 'chatterbox' },
    { id: 'c', name: 'Calm narrator', language: '', kind: 'designed', engine: 'qwen_voice_design' },
    { id: 'd', name: 'Old', language: '', kind: 'cloned', engine: 'qwen' },
  ])
  assert.equal(engineOf({ voice_type: 'cloned', default_engine: 'tada' }), 'tada')
  assert.deepEqual(readProfiles({ profiles: [] }), [])
})

test('not running, no voice yet, or listed', async () => {
  assert.deepEqual((await stand({}).client.profiles()).ok, false)
  assert.equal(((await stand({}).client.profiles()) as { error: string }).error, 'not-running')
  assert.equal(((await stand({ '/profiles': () => json([]) }).client.profiles()) as { error: string }).error, 'no-profiles')
  const listed = await stand({ '/profiles': () => json([{ id: 'a', name: 'Lily', voice_type: 'preset', preset_engine: 'kokoro' }]) }).client.profiles()
  assert.deepEqual(listed, { ok: true, value: [{ id: 'a', name: 'Lily', language: '', kind: 'preset', engine: 'kokoro' }] })
})

test('a line: the profile, the text and its language, made whole; a model still downloading says so', async () => {
  const wav = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4])
  const { calls, client } = stand({ '/generate/stream': () => new Response(wav, { headers: { 'content-type': 'audio/wav' } }) })
  const said = await client.speak('a', '你好呀。', 'zh')
  assert.ok(said.ok && new Uint8Array(said.value).length === wav.length)
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { profile_id: 'a', text: '你好呀。', language: 'zh' })
  const notYet = await stand({ '/generate/stream': () => json({ detail: 'Model 1.7B is not downloaded yet. Use /generate to trigger a download.' }, 400) }).client.speak('a', 'hi', 'en')
  assert.deepEqual(notYet, { ok: false, error: 'downloading', detail: 'Model 1.7B is not downloaded yet. Use /generate to trigger a download.' })
  const missing = await stand({ '/generate/stream': () => json({ detail: 'Profile not found' }, 404) }).client.speak('gone', 'hi', 'en')
  assert.deepEqual(missing, { ok: false, error: 'failed', detail: 'Profile not found' })
  assert.equal(((await stand({}).client.speak('a', 'hi', 'en')) as { error: string }).error, 'not-running')
})

test('what you said: the recording sent as `file`, the text back; Whisper still downloading says so', async () => {
  const { calls, client } = stand({ '/transcribe': () => json({ text: ' 你好 ', duration: 1.2 }) })
  assert.deepEqual(await client.transcribe(new ArrayBuffer(16), 'zh'), { ok: true, value: '你好' })
  const form = calls[0].init.body as FormData
  assert.ok(form.get('file') instanceof Blob); assert.equal(form.get('language'), 'zh')
  const downloading = await stand({ '/transcribe': () => json({ detail: { message: 'Whisper model base is being downloaded. Please wait and try again.', downloading: true } }, 202) }).client.transcribe(new ArrayBuffer(16))
  assert.deepEqual(downloading, { ok: false, error: 'downloading', detail: 'Whisper model base is being downloaded. Please wait and try again.' })
})

test('a line given up stops the call', async () => {
  const stop = new AbortController()
  const { client } = stand({ '/generate/stream': () => new Promise<Response>(() => {}) })
  const fetchSeen = client.speak('a', 'hi', 'en', stop.signal)
  stop.abort(new DOMException('given up', 'AbortError'))
  await assert.rejects(fetchSeen, /given up/)
})
