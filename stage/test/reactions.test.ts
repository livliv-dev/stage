import test from 'node:test'
import assert from 'node:assert/strict'
import { ReactionDirector, readListenerReactions, planReaction, reactionExpression, readReactionCues, readReactionSettings, type ReactionSettings, type ReactionClock, type ReactionHost } from '../src/reactions'

function setup(overrides: Partial<ReactionSettings> = {}) {
  let now = 0, sequence = 0, enabled = true, controllable = true
  const timers = new Map<number, { at: number; callback: () => void }>()
  const events: { kind: string; value: unknown; at: number }[] = []
  const time: ReactionClock = {
    now: () => now,
    later: (callback, milliseconds) => { const id = ++sequence; timers.set(id, { at: now + milliseconds, callback }); return id },
    cancel: (id) => { if (typeof id === 'number') timers.delete(id) },
  }
  const host: ReactionHost = {
    settings: () => ({ enabled, intensity: 0.8, ...overrides }), canReact: () => controllable,
    expressions: () => [{ id: 'smile', label: 'Smile' }, { id: 'sad', label: 'Sad' }], expressionStrength: () => 0.5,
    expression: (id, weight) => { events.push({ kind: 'expression', value: [id, weight], at: now }); return true },
    act: (action) => { events.push({ kind: 'action', value: action, at: now }) },
    look: (direction) => { events.push({ kind: 'look', value: direction, at: now }) },
  }
  const advance = (milliseconds: number) => {
    const until = now + milliseconds
    for (;;) {
      const next = [...timers.entries()].filter(([, event]) => event.at <= until).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!next) break
      now = next[1].at; timers.delete(next[0]); next[1].callback()
    }
    now = until
  }
  return { director: new ReactionDirector(host, time), events, advance, timers, enable: (value: boolean) => { enabled = value }, control: (value: boolean) => { controllable = value } }
}

test('only valid bounded model cues enter a sorted timeline', () => {
  assert.deepEqual(readReactionCues([
    { at: 0.9, feeling: 'curious', strength: 0.4 }, { at: -1, feeling: 'happy' },
    { at: 0.2, action: 'tilt', duration: Infinity }, { at: NaN, feeling: 'sad' },
    { at: 0.4, feeling: 'invented', look: 'away' }, { at: 0.8, feeling: 'sad' },
    { at: 0.1, feeling: 'angry' },
  ]), [
    { at: 0.2, action: 'tilt' }, { at: 0.4, look: 'away' },
    { at: 0.8, feeling: 'sad' }, { at: 0.9, feeling: 'curious', strength: 0.4 },
  ])
  assert.deepEqual(readReactionCues(null), [])
  assert.deepEqual(readReactionCues([{ at: 0, action: 'do_shell_command', strength: 20 }]), [])
})

test('semantic expressions resolve against the real model catalog', () => {
  assert.equal(reactionExpression('happy', [{ id: 'smile', label: 'Smile' }]), 'smile')
  assert.equal(reactionExpression('shy', [{ id: 'expr09', label: 'Custom', labels: { ja: '照れ' } }]), 'expr09')
  assert.equal(reactionExpression('curious', [{ id: 'smile', label: 'Smile' }]), null)
  const plan = planReaction({ at: 0, feeling: 'curious', strength: 0.5 }, [], 0.8, 0.5)
  assert.equal(plan.expression, undefined)
  assert.equal(plan.action, 'tilt')
  assert.equal(plan.weight, 0.2)
})

test('manual expression holds survive scheduled cues and old automatic cleanup', () => {
  const s = setup()
  s.director.play([{ at: 0, feeling: 'happy' }, { at: 0.5, feeling: 'sad' }], 4)
  assert.deepEqual(s.events.map((e) => e.value), [['smile', 0.4]])
  s.advance(500)
  s.director.manual(true)
  s.advance(5000)
  s.director.stop()
  assert.deepEqual(s.events.map((e) => e.value), [['smile', 0.4]])
  s.director.manual(false)
  assert.equal(s.director.react({ at: 0, feeling: 'sad' }), true)
  s.advance(1800)
  assert.deepEqual(s.events.at(-1)?.value, [null, 0.5])
})

test('manual actions and unplanned reactions have cooldowns; planned speech cues may change mid-sentence', () => {
  const s = setup()
  s.director.manualAction()
  assert.equal(s.director.react({ at: 0, action: 'nod' }, true), false)
  s.advance(1600)
  assert.equal(s.director.react({ at: 0, action: 'nod' }), true)
  assert.equal(s.director.react({ at: 0, action: 'tilt' }), false)
  assert.equal(s.director.react({ at: 0, action: 'tilt' }, true), true)
  assert.deepEqual(s.events.map((e) => e.value), ['nod', 'tilt'])
})

test('stopping removes all pending effects and releases only its own expression', () => {
  const s = setup()
  s.director.play([{ at: 0, feeling: 'happy' }, { at: 0.5, feeling: 'sad', action: 'shake' }], 6)
  s.advance(1000)
  s.director.stop()
  assert.equal(s.timers.size, 0)
  s.advance(10_000)
  assert.deepEqual(s.events.map((e) => e.value), [['smile', 0.4], [null, 0.5]])
})

test('a new utterance replaces the old timeline and cues use relative playback time', () => {
  const s = setup()
  s.director.play([{ at: 0.5, action: 'hop' }], 10)
  s.advance(500)
  s.director.play([{ at: 0.25, action: 'tilt' }, { at: 0.75, feeling: 'amused' }], 4)
  s.advance(999)
  assert.equal(s.events.length, 0)
  s.advance(1)
  assert.deepEqual(s.events[0], { kind: 'action', value: 'tilt', at: 1500 })
  s.advance(2000)
  assert.equal(s.events[1]?.kind, 'expression')
  s.advance(4000)
  assert.equal(s.events.some((e) => e.value === 'hop'), false)
})

test('disabled, tracked, and remote hosts do not receive automatic effects', () => {
  const s = setup()
  s.enable(false)
  assert.equal(s.director.react({ at: 0, feeling: 'happy', action: 'hop' }), false)
  s.enable(true); s.control(false)
  assert.equal(s.director.react({ at: 0, feeling: 'happy', action: 'hop' }), false)
  assert.equal(s.events.length, 0)
})

test('thinking and interruption states react once, waiting looks at the camera, and idle cancels cues', () => {
  const s = setup()
  s.director.setPhase('thinking'); s.director.setPhase('thinking')
  assert.deepEqual(s.events.map((e) => e.value), ['away'])
  s.advance(1600)
  s.director.setPhase('interrupted')
  assert.deepEqual(s.events.at(-1)?.value, 'tilt')
  s.advance(1600)
  s.director.setPhase('waiting')
  assert.deepEqual(s.events.at(-1)?.value, 'camera')
  s.director.play([{ at: 0.5, action: 'hop' }], 4)
  s.director.setPhase('idle'); s.advance(4000)
  assert.equal(s.events.some((e) => e.value === 'hop'), false)
})

test('content reactions take priority over phase effects and still obey the configured interval', () => {
  const s = setup({ cooldownSeconds: 4 })
  s.director.setPhase('waiting')
  s.advance(100)
  assert.equal(s.director.react({ at: 0, feeling: 'happy' }), true)
  s.advance(100)
  assert.equal(s.director.react({ at: 0, action: 'tilt' }), false)
  s.director.setPhase('interrupted')
  assert.equal(s.events.some(event => event.value === 'tilt'), false)
  s.advance(3900)
  assert.equal(s.director.react({ at: 0, action: 'tilt' }), true)
  const phases = setup()
  phases.director.setPhase('thinking'); phases.advance(100); phases.director.setPhase('interrupted')
  assert.deepEqual(phases.events.map(event => event.value), ['away'], 'phase effects retain their own interval')
})


test('per-character mappings, hold time and reaction interval use the actual expression catalog', () => {
  const s = setup({ mapping: { curious: 'sad' }, holdSeconds: 3, cooldownSeconds: 4 })
  assert.equal(s.director.react({ at: 0, feeling: 'curious' }), true)
  assert.deepEqual(s.events[0]?.value, ['sad', 0.4])
  s.advance(2999)
  assert.equal(s.events.length, 1)
  s.advance(1)
  assert.deepEqual(s.events.at(-1)?.value, [null, 0.5])
  assert.equal(s.director.react({ at: 0, feeling: 'happy' }), false)
  s.advance(1000)
  assert.equal(s.director.react({ at: 0, feeling: 'happy' }), true)
  assert.deepEqual(readReactionSettings({ intensity: Infinity, holdSeconds: -1, cooldownSeconds: 99, mapping: { invented: 'sad', curious: 'custom', happy: '' } }), { enabled: true, intensity: 0.8, listen: true, motion: 0.85, holdSeconds: 1.8, cooldownSeconds: 1.6, mapping: { curious: 'custom' } })
})


test('listener output resolves only permitted names and limits a reply to one small response', () => {
  const cast = [{ id: 'kai-id', name: 'Kai' }]
  const read = readListenerReactions([{ who: 'User', at: 0.3, action: 'shake' }, { who: 'Kai', at: 0, feeling: 'curious', strength: 1, duration: 8 }, { who: 'Kai', at: 0.8, action: 'nod' }], cast)
  assert.deepEqual(read, [{ who: 'kai-id', cue: { at: 0.15, feeling: 'curious', strength: 0.7, duration: 2 } }])
  assert.deepEqual(readListenerReactions([{ who: 'Kai', at: NaN, action: 'nod' }], cast), [])
  assert.deepEqual(readListenerReactions([{ who: 'Kai', at: 0.4, action: 'run_code' }], cast), [])
})

test('gesture strength is passed independently of expression strength', () => {
  let strength = -1
  const host: ReactionHost = { settings: () => ({ enabled: true, intensity: 0.8, motion: 0.6 }), canReact: () => true, expressions: () => [], expressionStrength: () => 0.2, expression: () => true, act: (_action, value) => { strength = value }, look: () => {} }
  new ReactionDirector(host).react({ at: 0, action: 'shake', strength: 0.5 })
  assert.equal(strength, 0.3)
})


test('zero gesture strength leaves expression reactions available without playing an action', () => {
  const s = setup({ motion: 0 })
  assert.equal(s.director.react({ at: 0, feeling: 'happy', action: 'hop' }), true)
  assert.deepEqual(s.events.map(event => event.kind), ['expression'])
})
