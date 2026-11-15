import test from 'node:test'
import assert from 'node:assert/strict'
import { isBackchannel, VoiceActivity } from '../src/voiceActivity'

test('quiet input never starts a recording', () => {
  const gate = new VoiceActivity()
  for (let time = 0; time < 3000; time += 20) assert.equal(gate.sample(.004, time), null)
})

test('a short transient is discarded before yielding the AI', () => {
  const gate = new VoiceActivity(), events: string[] = []
  for (let time = 0; time <= 500; time += 20) {
    const event = gate.sample(time >= 100 && time < 180 ? .08 : 0, time)
    if (event) events.push(event.type)
  }
  assert.deepEqual(events, ['candidate', 'noise'])
})

test('sustained speech yields once and a brief pause keeps the same utterance', () => {
  const gate = new VoiceActivity(), events: { type: string; at: number; seconds: number }[] = []
  for (let time = 0; time <= 2000; time += 20) {
    const voice = (time >= 100 && time < 500) || (time >= 900 && time < 1100)
    const event = gate.sample(voice ? .04 : 0, time)
    if (event) events.push({ ...event, at: time })
  }
  assert.deepEqual(events.map((event) => event.type), ['candidate', 'speech', 'end'])
  assert.ok(events[1].at < 400)
  assert.equal(events[2].at, 1880)
  assert.ok(Math.abs(events[2].seconds - .6) < .001)
})

test('the quiet noise floor adapts without suppressing a louder voice', () => {
  const gate = new VoiceActivity()
  for (let time = 0; time < 5000; time += 20) assert.equal(gate.sample(.008, time), null)
  for (let time = 5000; time < 5200; time += 20) assert.equal(gate.sample(.015, time), null)
  assert.equal(gate.sample(.05, 5200)?.type, 'candidate')
})

test('a delayed frame cannot confirm a brief transient as sustained speech', () => {
  const gate = new VoiceActivity()
  gate.sample(0, 0)
  assert.equal(gate.sample(.05, 20)?.type, 'candidate')
  assert.equal(gate.sample(.05, 2000), null)
  assert.equal(gate.sample(0, 2200)?.type, 'noise')
})

test('a duration cut resets the gate so continued speech can begin a new recording', () => {
  const gate = new VoiceActivity()
  for (let time = 0; time <= 400; time += 20) gate.sample(.05, time)
  assert.ok(gate.seconds >= .4)
  gate.reset()
  assert.equal(gate.sample(.05, 420)?.type, 'candidate')
  let speech = false
  for (let time = 440; time <= 620; time += 20) if (gate.sample(.05, time)?.type === 'speech') speech = true
  assert.equal(speech, true)
})

test('only brief acknowledgements during a reply skip a new model turn', () => {
  assert.equal(isBackchannel('嗯。', .3, true), true)
  assert.equal(isBackchannel('yeah', .4, true), true)
  assert.equal(isBackchannel('はい', .4, true), true)
  assert.equal(isBackchannel('嗯？', .3, true), false)
  assert.equal(isBackchannel('嗯', .3, false), false)
  assert.equal(isBackchannel('嗯', 1, true), false)
  assert.equal(isBackchannel('不对', .3, true), false)
})
