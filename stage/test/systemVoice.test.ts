// A character that isn't on the site gets a system voice from the site's listing by its id (src/core/systemVoice.ts):
// stable however the stage changes, different from the others' while there are voices enough.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { systemVoiceFor, voicesFor, type SystemVoice, type Voiced } from '../src/core/systemVoice'

const listing: SystemVoice[] = [
  ...['g1', 'g2', 'g3', 'g4', 'g5'].map((id) => ({ id, group: 'girl', core: true })),
  { id: 'g6', group: 'girl', core: false },
  ...['m1', 'm2', 'm3', 'm4'].map((id) => ({ id, group: 'man', core: true })),
  { id: 'w1', group: 'woman', core: true },
]
const girl = (id: string, livliv = ''): Voiced => ({ id, gender: 'f', voice: { livliv }, onSite: false })

test('the list for a gender: its group\'s short list, from the site; unknown, both in turn', () => {
  assert.deepEqual(voicesFor('f', listing), ['g1', 'g2', 'g3', 'g4', 'g5'])
  assert.deepEqual(voicesFor('m', listing), ['m1', 'm2', 'm3', 'm4'])
  assert.deepEqual(voicesFor('', listing), ['g1', 'm1', 'g2', 'm2', 'g3', 'm3', 'g4', 'm4', 'g5'])
  assert.deepEqual(voicesFor('f', []), [], 'no listing: none (the site speaks by the gender)')
})

test('by its id: the same however the stage changes, others removed or added', () => {
  const cast = ['vrm-a', 'vrm-b', 'vrm-c'].map((id) => girl(id))
  const before = Object.fromEntries(cast.map((c) => [c.id, systemVoiceFor(c, cast, listing)]))
  assert.equal(new Set(Object.values(before)).size, 3, 'three different voices: ' + JSON.stringify(before))
  for (const gone of cast) {
    const rest = cast.filter((c) => c !== gone)
    for (const c of rest) assert.equal(systemVoiceFor(c, rest, listing), before[c.id], `${gone.id} removed: ${c.id} keeps its voice`)
  }
  const reversed = [...cast].reverse()
  for (const c of cast) assert.equal(systemVoiceFor(c, reversed, listing), before[c.id], 'the order on the stage doesn\'t matter')
  assert.equal(systemVoiceFor(cast[0], [cast[0]], listing), systemVoiceFor(cast[0], [cast[0]], listing))
})

test('a voice chosen in a card is its own, and left to it', () => {
  const pinned = girl('pinned', 'g3')
  assert.equal(systemVoiceFor(pinned, [pinned], listing), 'g3')
  for (const id of ['x', 'y', 'z', 'w']) assert.notEqual(systemVoiceFor(girl(id), [pinned, girl(id)], listing), 'g3', 'another doesn\'t take it')
})

test('characters on the site, and other genders, don\'t compete for the list', () => {
  const a = girl('a'), onSite: Voiced = { id: 'site', gender: 'f', voice: { livliv: '' }, onSite: true }, boy: Voiced = { id: 'boy', gender: 'm', voice: { livliv: '' }, onSite: false }
  assert.equal(systemVoiceFor(a, [a, onSite, boy], listing), systemVoiceFor(a, [a], listing))
  assert.ok(['m1', 'm2', 'm3', 'm4'].includes(systemVoiceFor(boy, [a, boy], listing)))
})
