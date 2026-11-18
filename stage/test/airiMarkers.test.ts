import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseAiriMarkers } from '../src/airiMarkers.ts'

test('ACT markers become timed feelings and motions, and plain text stays unchanged', () => {
  const raw = '<|ACT {"emotion":{"name":"happy","intensity":0.8}}|>Hi! I am a LivLiv character. <|ACT {"emotion":"surprised","motion":"nod"}|>Oh, you came back!'
  const parsed = parseAiriMarkers(raw)
  assert.equal(parsed.speech.includes('<|ACT'), false)
  assert.match(parsed.speech, /Hi!/)
  assert.equal(parsed.cues[0]?.feeling, 'happy')
  assert.equal(parsed.cues[0]?.strength, 0.8)
  assert.equal(parsed.cues[0]?.at, 0)
  assert.equal(parsed.cues[1]?.feeling, 'surprised')
  assert.equal(parsed.cues[1]?.action, 'nod')
  assert.ok((parsed.cues[1]?.at ?? 0) > 0)
  const think = parseAiriMarkers('<|ACT {"emotion":"think","motion":"wave"}|>Hmm.')
  assert.equal(think.cues[0]?.feeling, 'thoughtful')
  assert.equal(think.cues[0]?.look, 'away')
  assert.equal(think.cues[0]?.action, undefined)
  const curious = parseAiriMarkers('<|ACT {"emotion":"question"}|>Really?')
  assert.equal(curious.cues[0]?.feeling, 'confused')
  assert.equal(curious.cues[0]?.action, 'tilt')
  const plain = parseAiriMarkers('Hi! I am a LivLiv character.')
  assert.equal(plain.speech, 'Hi! I am a LivLiv character.')
  assert.deepEqual(plain.cues, [])
  assert.deepEqual(parseAiriMarkers('<|ACT not-json|>Still spoken.').cues, [])
})
