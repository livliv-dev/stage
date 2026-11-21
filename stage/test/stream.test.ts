// A reply that streams (AIRI), said as it comes: the next sentence made ready while one is said, the turn counted as
// the first is said, and the stream closed when it ends, fails or is stopped.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sayEach } from '../src/sessions/stream'

/** a stream of these sentences, telling what happens to it */
function stream(sentences: string[], log: string[]) {
  let i = 0
  return {
    async next() { await Promise.resolve(); return i < sentences.length ? { done: false as const, value: sentences[i++] } : { done: true as const, value: undefined } },
    async return() { log.push('closed'); return { done: true as const, value: undefined } },
  }
}

test('each sentence is made ready while the one before is said; the turn counts once, as the first is said', async () => {
  const log: string[] = []
  const said = await sayEach(stream(['a', 'b', 'c'], log), new AbortController().signal,
    async (s) => { log.push('ready ' + s); return s.toUpperCase() },
    async (s, made) => { log.push('say ' + made); await new Promise((resolve) => setTimeout(resolve, 5)); log.push('said ' + s) },
    () => log.push('first'))
  assert.equal(said, 3)
  assert.deepEqual(log, ['ready a', 'first', 'say A', 'ready b', 'said a', 'say B', 'ready c', 'said b', 'say C', 'said c', 'closed'])
})

test('a stream that says nothing, fails, or is stopped is closed', async () => {
  const log: string[] = []
  assert.equal(await sayEach(stream([], log), new AbortController().signal, async (s) => s, async () => {}, () => log.push('first')), 0)
  await assert.rejects(sayEach(stream(['a', 'b'], log), new AbortController().signal, async (s) => { if (s === 'b') throw new Error('no voice'); return s }, async () => {}, () => {}), /no voice/)
  const stop = new AbortController()
  await assert.rejects(sayEach(stream(['a', 'b'], log), stop.signal, async (s) => s, async () => stop.abort(), () => {}))
  assert.deepEqual(log, ['closed', 'closed', 'closed'], 'never a first line said for an empty stream')
})
