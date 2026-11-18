import assert from 'node:assert/strict'
import { test } from 'node:test'
import { planAiriSpeech, speakSentences } from '../src/airiSpeech.ts'

test('a long reply starts the first sentence before the next sentence is prepared', async () => {
  const segments = planAiriSpeech('你好。第二句！')
  assert.deepEqual(segments.map((segment) => segment.text), ['你好。', '第二句！'])
  const order: string[] = []
  let releaseSecond: () => void = () => {}
  const second = new Promise<void>((resolve) => { releaseSecond = resolve })
  const outcome = await speakSentences({
    segments,
    signal: new AbortController().signal,
    prepare: (segment) => {
      order.push('prepare:' + segment.text)
      return segment.text.startsWith('第二') ? second.then(() => segment.text) : Promise.resolve(segment.text)
    },
    play: async (segment, prepared, onStart) => {
      assert.equal(order.includes('prepare:第二句！'), true)
      onStart()
      order.push('play:' + prepared)
      if (segment.text.startsWith('你好')) releaseSecond()
    },
    onStart: () => order.push('audible'),
  })
  assert.equal(outcome, 'ended')
  assert.deepEqual(order, ['prepare:你好。', 'prepare:第二句！', 'audible', 'play:你好。', 'play:第二句！'])
})

test('interrupting a reply drops the sentence that has not started', async () => {
  const segments = planAiriSpeech('一句。两句！')
  const played: string[] = []
  const controller = new AbortController()
  const outcome = await speakSentences({
    segments,
    signal: controller.signal,
    prepare: async (segment) => segment.text,
    play: async (segment) => {
      played.push(segment.text)
      controller.abort()
    },
    onStart: () => {},
  })
  assert.equal(outcome, 'cancelled')
  assert.deepEqual(played, ['一句。'])
})

test('marked text places the later emotion on the later sentence', () => {
  const raw = '<|ACT {"emotion":"happy"}|>你好。<|ACT {"emotion":"awkward"}|>第二句！'
  const segments = planAiriSpeech('你好。第二句！', raw)
  assert.equal(segments[0]?.emotion, 'happy')
  assert.equal(segments[1]?.emotion, 'shy')
  assert.equal(segments[1]?.cues[0]?.feeling, 'shy')
})
