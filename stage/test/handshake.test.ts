// 好友联播: a character goes to a friend only once both ends of the channel are listening, once per channel: as the
// channel opens, on a rejoin, to a friend who joins later, and to a friend on an older Stage that never says ready.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handshake, type Handshake } from '../src/collab/handshake'

/** timers run by hand */
function clock() {
  let next = 0
  const pending = new Map<number, () => void>()
  return {
    timers: { set: (f: () => void) => { pending.set(++next, f); return next }, clear: (id: unknown) => { pending.delete(id as number) } },
    runAll() { for (const [id, f] of [...pending]) { pending.delete(id); f() } },
    get count() { return pending.size },
  }
}

type End = { name: string; open: boolean; hs: Handshake; inbox: (() => void)[]; shares: { otherOpen: boolean }[]; said: number }
/** two ends of a channel. `early`: what reaches an end that isn't open yet: held until it opens, or lost */
function channel(early: 'held' | 'lost', time = clock(), older = true) {
  const ends: End[] = []
  const make = (name: string, silent = false) => {
    const end = { name, open: false, inbox: [], shares: [], said: 0 } as unknown as End
    end.hs = handshake(() => { end.said++; if (!silent) deliver(other(end)) }, () => end.shares.push({ otherOpen: other(end).open }), 3000, time.timers)
    ends.push(end); return end
  }
  const other = (end: End) => ends.find((e) => e !== end)!
  const deliver = (to: End) => { if (to.open) to.hs.heard(); else if (early === 'held') to.inbox.push(() => to.hs.heard()) }
  const open = (end: End) => { end.open = true; end.hs.opened(); for (const f of end.inbox.splice(0)) f() }
  return { make, open, time, older }
}

test('each end shares once, and only after the other end is open: whether early messages are held or lost', () => {
  for (const early of ['held', 'lost'] as const) {
    const { make, open, time } = channel(early)
    // the friend who announced the channel has it open first
    const announced = make('announced'), maker = make('maker')
    open(announced)
    assert.deepEqual(announced.shares, [], early + ': nothing goes before the other end has said ready')
    open(maker)
    assert.deepEqual(announced.shares, [{ otherOpen: true }], early)
    assert.deepEqual(maker.shares, [{ otherOpen: true }], early)
    time.runAll()
    assert.equal(announced.shares.length + maker.shares.length, 2, early + ': the wait for an older Stage shares nothing more')
    assert.ok(announced.said <= 2 && maker.said <= 2, early + ': a ready is said on opening and answered once at most')
  }
})

test('a ready heard before the channel says it is open is answered by the ready said on opening', () => {
  const { make, open } = channel('held')
  const a = make('a'), b = make('b')
  a.open = true; b.hs.heard() // b hears a before its own open event
  assert.deepEqual(b.shares, [])
  open(b)
  assert.deepEqual(b.shares, [{ otherOpen: true }])
})

test('a rejoin shares again on the new channel; the closed one never does', () => {
  const time = clock()
  const first = channel('held', time), host = first.make('host'), guest = first.make('guest')
  first.open(host)
  host.hs.close(); guest.hs.close() // the guest left before it opened
  first.open(guest); time.runAll()
  assert.deepEqual([host.shares, guest.shares], [[], []], 'a closed channel shares nothing')
  const again = channel('lost', time), host2 = again.make('host'), guest2 = again.make('guest')
  again.open(host2); again.open(guest2)
  assert.deepEqual([host2.shares.length, guest2.shares.length], [1, 1])
})

test('a friend who joins later gets the character on its own channel; the first friend gets it once', () => {
  const time = clock()
  const one = channel('held', time), hostToGuest = one.make('host'), guest = one.make('guest')
  one.open(hostToGuest); one.open(guest)
  const two = channel('lost', time), hostToThird = two.make('host'), third = two.make('third')
  two.open(hostToThird); two.open(third); time.runAll()
  assert.deepEqual([hostToGuest.shares.length, guest.shares.length, hostToThird.shares.length, third.shares.length], [1, 1, 1, 1])
})

test('a friend on an older Stage never says ready: it gets the character after the wait, once; not if it left first', () => {
  const time = clock(), { make, open } = channel('held', time)
  const ours = make('ours'), older = make('older', true)
  open(older); open(ours)
  assert.deepEqual(ours.shares, [], 'nothing heard yet')
  time.runAll()
  assert.deepEqual(ours.shares, [{ otherOpen: true }])
  time.runAll(); assert.equal(ours.shares.length, 1)
  const late = clock(), gone = channel('held', late), mine = gone.make('ours'); gone.make('older', true)
  gone.open(mine); mine.hs.close()
  assert.equal(late.count, 0, 'the wait ends with the channel'); assert.deepEqual(mine.shares, [])
})
