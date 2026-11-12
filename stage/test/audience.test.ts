import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AudienceInbox, MESSAGE_MAX_AGE } from '../src/audience'
const message = (id: string, at = 100, user = 'Viewer', text = id) => ({ id, at, user, text })
test('messages expire, blocked viewers are skipped, and the oldest fresh message gets a turn', () => {
  const inbox = new AudienceInbox()
  inbox.push(message('old', 0)); inbox.push(message('blocked', MESSAGE_MAX_AGE, 'Blocked')); inbox.push(message('fresh', MESSAGE_MAX_AGE))
  assert.equal(inbox.take(MESSAGE_MAX_AGE, (user) => user === 'Blocked')?.id, 'fresh')
  assert.equal(inbox.take(MESSAGE_MAX_AGE), null)
})
test('duplicate ids and repeated text from the same viewer cannot fill the inbox', () => {
  const inbox = new AudienceInbox()
  assert.ok(inbox.push(message('1')))
  assert.equal(inbox.push(message('1', 101, 'Other', 'different')), false)
  assert.equal(inbox.push(message('2', 102, 'VIEWER', '1')), false)
  assert.ok(inbox.push(message('3', 103, 'Other', '1')))
  assert.equal(inbox.take(200)?.id, '1'); assert.equal(inbox.take(200)?.id, '3'); assert.equal(inbox.take(200), null)
})
test('a message put back is taken next, once, and still expires', () => {
  const inbox = new AudienceInbox()
  inbox.push(message('1')); inbox.push(message('2'))
  const first = inbox.take(200)!
  inbox.putBack(first); inbox.putBack(first)
  assert.equal(inbox.take(200)?.id, '1'); assert.equal(inbox.take(200)?.id, '2'); assert.equal(inbox.take(200), null)
  inbox.putBack(first); assert.equal(inbox.available(100 + MESSAGE_MAX_AGE), false)
})
test('only eight recent messages queue; a new session clears both queue and deduplication', () => {
  const inbox = new AudienceInbox()
  for (let n = 0; n < 12; n++) inbox.push(message(String(n)))
  assert.equal(inbox.take(100)?.id, '4')
  inbox.clear(); assert.equal(inbox.available(100), false); assert.ok(inbox.push(message('4')))
})
