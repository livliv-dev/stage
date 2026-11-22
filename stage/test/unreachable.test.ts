// A request that gets no answer (offline, the service out of reach) reads as words people can act on, in every
// language: never the browser's own "Failed to fetch" (src/request.ts unreachable; LivLiv's API, a LivLiv voice's
// audio and the model APIs go through it; test/points.mjs takes a LivLiv line offline in the page). A request called off
// stays an abort.
import assert from 'node:assert/strict'
import { test } from 'node:test'

// the page's storage, which the language is kept in
const kept = new Map<string, string>()
globalThis.localStorage ??= { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, v) }, removeItem: (k: string) => { kept.delete(k) }, clear: () => kept.clear(), key: () => null, length: 0 } as Storage
const { resetLocale, setLocale } = await import('../src/i18n')
type Locale = Parameters<typeof setLocale>[0]
import { unreachable } from '../src/request'

const offline = () => new TypeError('Failed to fetch')

test('no answer at all: the same plain line in every language, naming the service', () => {
  const said: [Locale, string][] = [
    ['zh-Hans', '连不上 livliv.ai，请检查网络后再试'], ['zh-Hant', '連不上 livliv.ai，請檢查網路後再試'],
    ['en', 'Could not connect to livliv.ai. Check your network and try again'], ['ja', 'livliv.aiに接続できません。ネットワークを確認してもう一度お試しください'],
  ]
  try {
    for (const [locale, text] of said) {
      setLocale(locale)
      const error = unreachable(offline(), 'livliv.ai') as Error
      assert.equal(error.message, text, locale)
      assert.ok(error.cause instanceof TypeError, 'the browser\'s error kept as the cause')
    }
  } finally { resetLocale() }
})

test('a request called off stays an abort', () => {
  const called = new AbortController(); called.abort()
  const abort = new DOMException('The operation was aborted.', 'AbortError')
  assert.equal(unreachable(abort, 'livliv.ai'), abort)
  assert.equal(unreachable(offline(), 'livliv.ai', called.signal) instanceof TypeError, true, 'its own signal aborted: as it was')
})
