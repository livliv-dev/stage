// The session's inbox: one queue of typed items. Your lines in order (your first one in front), viewers' messages under
// their rules (30 s, eight waiting, repeats dropped, put back in front), at most sixteen events, each kind taken on its
// own, your unsaid lines dropped by the switch to public.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MESSAGE_MAX_AGE } from '../src/audience'
import type { Line } from '../src/core/lines'
import { EVENTS, Inbox, YOURS, yourLine } from '../src/sessions/queue'

const line = (text: string): Line => ({ id: text, who: 'me', name: '我', text, emotion: 'neutral', action: 'none', to: null, human: true })
const chat = (id: string, at = 100, user = 'Viewer', text = id) => ({ id, user, text, at })
const event = (id: string) => ({ id, source: 'Neuro', message: id, reply: 'always' as const })

test('your lines are taken in order, typed or heard, the first line of a chat in front', () => {
  const inbox = new Inbox()
  inbox.push(yourLine({ line: line('two'), transcribed: false })); inbox.push(yourLine({ line: line('three'), transcribed: true }))
  inbox.pushFirst(yourLine({ line: line('one'), transcribed: false }))
  assert.equal(inbox.count(YOURS), 3)
  assert.deepEqual([inbox.take(YOURS), inbox.take(YOURS), inbox.take(YOURS)].map((item) => [item?.kind, item?.line.text]), [['typed', 'one'], ['typed', 'two'], ['transcript', 'three']])
  assert.equal(inbox.take(YOURS), undefined)
})

test('each kind is taken on its own; the switch to public drops only your lines', () => {
  const inbox = new Inbox()
  inbox.push({ kind: 'viewer', chat: chat('v') }); inbox.push(yourLine({ line: line('private'), transcribed: false }))
  inbox.push({ kind: 'game', event: event('g') }); inbox.push({ kind: 'external', event: event('x') })
  assert.equal(inbox.drop(YOURS), 1)
  assert.equal(inbox.take(EVENTS)?.event.id, 'g'); assert.equal(inbox.take(EVENTS)?.event.id, 'x')
  assert.equal(inbox.takeViewer(200, () => false)?.id, 'v')
  assert.equal(inbox.has(['typed', 'transcript', 'viewer', 'external', 'game']), false)
})

test('viewers: expired and blocked ones are let go, repeats dropped, eight wait at most, one put back comes first', () => {
  const inbox = new Inbox()
  inbox.push({ kind: 'viewer', chat: chat('old', 0) }); inbox.push({ kind: 'viewer', chat: chat('blocked', MESSAGE_MAX_AGE, 'Blocked') })
  inbox.push({ kind: 'viewer', chat: chat('fresh', MESSAGE_MAX_AGE) })
  assert.equal(inbox.takeViewer(MESSAGE_MAX_AGE, (user) => user === 'Blocked')?.id, 'fresh')
  assert.equal(inbox.viewerWaiting(MESSAGE_MAX_AGE, () => false), false)
  inbox.clearViewers()
  assert.ok(inbox.push({ kind: 'viewer', chat: chat('1') }))
  assert.equal(inbox.push({ kind: 'viewer', chat: chat('1', 101, 'Other', 'different') }), false, 'the same id')
  assert.equal(inbox.push({ kind: 'viewer', chat: chat('2', 102, 'VIEWER', '1') }), false, 'the same viewer saying the same')
  for (let n = 3; n < 14; n++) inbox.push({ kind: 'viewer', chat: chat(String(n)) })
  assert.equal(inbox.count(['viewer']), 8)
  const taken = inbox.takeViewer(200, () => false)!
  assert.equal(taken.id, '6', 'the oldest of the eight newest')
  inbox.putBack(taken); inbox.putBack(taken)
  assert.equal(inbox.takeViewer(200, () => false)?.id, '6')
  assert.equal(inbox.takeViewer(200, () => false)?.id, '7')
})

test('sixteen events wait at most, the oldest let go; an event is shown once', () => {
  const inbox = new Inbox()
  for (let n = 0; n < 20; n++) inbox.push({ kind: n % 2 ? 'game' : 'external', event: event(String(n)) })
  assert.equal(inbox.count(EVENTS), 16)
  assert.equal(inbox.take(EVENTS)?.event.id, '4')
  assert.equal(inbox.hasSeen('a'), false); inbox.seenNow('a'); assert.equal(inbox.hasSeen('a'), true)
})
