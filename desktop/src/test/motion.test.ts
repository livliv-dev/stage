import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSocket } from 'node:dgram'
import { decodeOsc, MotionDecoder, MotionPacketError } from '../motionCodec'
import { IFACIAL_START, MotionInput } from '../motionInput'
import { defaultMotionSettings, readMotionSettings, type MotionFrame } from '../trackingProtocol'

function osc(address: string, types: string, args: (string | number)[] = []) {
  const str = (s: string) => { const value = Buffer.from(s); const out = Buffer.alloc(Math.ceil((value.length + 1) / 4) * 4); value.copy(out); return out }
  const parts = [str(address), str(',' + types)]
  for (const [i, kind] of [...types].entries()) {
    if (kind === 's') parts.push(str(String(args[i])))
    else if (kind === 'f' || kind === 'i') { const out = Buffer.alloc(4); if (kind === 'f') out.writeFloatBE(Number(args[i])); else out.writeInt32BE(Number(args[i])); parts.push(out) }
  }
  return Buffer.concat(parts)
}
const bundle = (...messages: Buffer[]) => Buffer.concat([Buffer.from('#bundle\0'), Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]), ...messages.flatMap((message) => { const size = Buffer.alloc(4); size.writeInt32BE(message.length); return [size, message] })])
const blend = (name: string, n: number) => osc('/VMC/Ext/Blend/Val', 'sf', [name, n])
const bone = (name: string, x = 0, y = 0, z = 0, w = 1) => osc('/VMC/Ext/Bone/Pos', 'sfffffff', [name, 0, 0, 0, x, y, z, w])
const near = (a: number | undefined, b: number) => assert.ok(a !== undefined && Math.abs(a - b) < 1e-4, String(a) + ' != ' + b)
const waitFor = async (predicate: () => boolean) => { const end = Date.now() + 1500; while (!predicate()) { if (Date.now() > end) throw new Error('Motion input timed out'); await new Promise((r) => setTimeout(r, 5)) } }
async function port() { const s = createSocket('udp4'); await new Promise<void>((r) => s.bind(0, '127.0.0.1', r)); const n = s.address().port; await new Promise<void>((r) => s.close(r)); return n }

test('OSC bundles preserve types and UTF-8 and refuse truncated or unbounded packets', () => {
  const message = osc('/livliv/param', 'sfis', ['mouthOpen', .5, 2, '测试'])
  assert.equal(decodeOsc(bundle(osc('/unknown', 'x'), message)).length, 1)
  assert.deepEqual(decodeOsc(message)[0], { address: '/livliv/param', types: 'sfis', args: ['mouthOpen', .5, 2, '测试'] })
  let deep = message; for (let n = 0; n < 10; n++) deep = bundle(deep)
  for (const bad of [message.subarray(0, -1), Buffer.alloc(20000), osc('/livliv/face/angleX', 'f', [NaN]), deep]) assert.throws(() => decodeOsc(bad), MotionPacketError)
})
test('VMC maps only face and torso channels and calibrates the original local bone rest', () => {
  const d = new MotionDecoder()
  assert.equal(d.osc(bundle(bone('Head'), bone('Neck'), bone('Spine'), blend('Blink_L', .7), blend('jawOpen', .55), blend('mouthSmile_R', .4))), true)
  near(d.pose.eyeLOpen, .3); near(d.pose.mouthOpen, .55); near(d.pose.smile, .4)
  const radians = (n: number) => n * Math.PI / 180 / 2
  d.osc(bundle(bone('Head', 0, Math.sin(radians(10)), 0, Math.cos(radians(10))), bone('Neck', 0, Math.sin(radians(5)), 0, Math.cos(radians(5))), bone('Spine', 0, 0, Math.sin(radians(-8)), Math.cos(radians(-8)))))
  near(d.pose.angleX, 15); near(d.pose.bodyZ, 8)
  assert.equal(d.osc(blend('TongueOut', 1)), false)
  assert.equal(Object.hasOwn(d.pose, 'TongueOut'), false)
  d.osc(osc('/livliv/face/mouthOpen', 'f', [.8])); near(d.pose.mouthOpen, .8)
  d.osc(osc('/VMC/Ext/OK', 'iiii', [1, 3, 0, 0])); assert.equal(d.available, false)
  d.osc(osc('/VMC/Ext/OK', 'i', [1])); assert.equal(d.available, true)
  const rest = new MotionDecoder(); rest.osc(bone('Head', 0, Math.sin(radians(170)), 0, Math.cos(radians(170)))); rest.osc(bone('Head', 0, Math.sin(radians(-170)), 0, Math.cos(radians(-170)))); near(rest.pose.angleX, 20)
})
test('iFacialMocap v1/v2 values retain a neutral head and bad packets cannot partially replace it', () => {
  const d = new MotionDecoder(), packet = (text: string) => Buffer.from(text)
  assert.equal(d.ifacial(packet('eyeBlink_L&70|jawOpen&55|=head#-10,20,30,0,0,0|')), true)
  near(d.pose.eyeLOpen, .3); near(d.pose.mouthOpen, .55); near(d.pose.angleX, 0)
  d.ifacial(packet('mouthSmile_R-40|=head#-12,25,33,0,0,0|')); near(d.pose.angleX, 5); near(d.pose.angleY, 2); near(d.pose.angleZ, -3)
  const before = d.pose
  assert.throws(() => d.ifacial(packet('jawOpen&99|=head#NaN,0,0|')), MotionPacketError); assert.deepEqual(d.pose, before)
  assert.throws(() => d.ifacial(packet('jawOpen&' + '9'.repeat(5000))), MotionPacketError); assert.deepEqual(d.pose, before)
  for (const value of ['jawOpen&99|=head#|', 'jawOpen&99|=head#0,,0,0,0,0|', 'jawOpen&99|=head#0,0,0|', 'jawOpen&|=head#0,0,0,0,0,0|']) {
    assert.throws(() => d.ifacial(packet(value)), MotionPacketError); assert.deepEqual(d.pose, before)
  }
  assert.equal(d.ifacial(packet('some-other-protocol')), false)
  assert.equal(IFACIAL_START.endsWith('|sendDataVersion=v2'), true)
})
test('network tracking settings keep input off by default and constrain the phone protocol', () => {
  assert.equal(defaultMotionSettings().enabled, false)
  assert.deepEqual(readMotionSettings(defaultMotionSettings()), defaultMotionSettings())
  for (const patch of [{ phone: '8.8.8.8' }, { port: 0 }, { port: 1.5 }, { phone: 'example.org' }, { sender: '224.0.0.1' }, { kind: 'ifacial', enabled: true }]) assert.equal(readMotionSettings({ ...defaultMotionSettings(), ...patch }), null)
  assert.ok(readMotionSettings({ ...defaultMotionSettings(), enabled: true, kind: 'ifacial', scope: 'lan', port: 49983, phone: '192.168.1.2' }))
})
test('actual UDP accepts normalized motion, reports port failures, and stops pending frames when disabled', async () => {
  const frames: MotionFrame[] = [], input = new MotionInput((event) => { if (event.type === 'frame') frames.push(event.frame) }), sender = createSocket('udp4'), occupied = createSocket('udp4')
  const n = await port(), config = { ...defaultMotionSettings(), enabled: true, port: n }
  try {
    assert.equal((await input.configure(config)).listening, true)
    sender.send(bundle(blend('jawOpen', .5), osc('/livliv/face/angleX', 'f', [17])), n, '127.0.0.1')
    await waitFor(() => frames.length === 1); near(frames[0].params.mouthOpen, .5); near(frames[0].params.angleX, 17)
    sender.send(Buffer.from([1, 2, 3]), n, '127.0.0.1'); await waitFor(() => input.state().discarded > 0)
    assert.equal(input.state().error, null); assert.equal(input.state().listening, true)
    await input.configure({ ...config, sender: '127.0.0.2' }); const count = frames.length
    sender.send(blend('jawOpen', 1), n, '127.0.0.1'); await waitFor(() => input.state().discarded > 0); assert.equal(frames.length, count)
    await input.configure(config); sender.send(blend('jawOpen', 1), n, '127.0.0.1'); await input.configure({ ...config, enabled: false }); await new Promise((r) => setTimeout(r, 25)); assert.equal(frames.length, count)
    assert.equal(input.state().frame, null); assert.equal(input.state().listening, false)
    await new Promise<void>((r) => occupied.bind(n, '127.0.0.1', r))
    const failure = await input.configure(config); assert.equal(failure.listening, false); assert.equal(failure.error?.code, 'EADDRINUSE')
    await new Promise<void>((r) => occupied.close(r))
    assert.equal((await input.configure(config)).listening, true)
  } finally { await input.close(); sender.close(); try { occupied.close() } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ERR_SOCKET_DGRAM_NOT_RUNNING') throw error } }
})

test('original VMC neck and hips rest bases do not rotate a nod into yaw', () => {
  const radians = (n: number) => n * Math.PI / 180 / 2, s = Math.sin(radians(90)), c = Math.cos(radians(90)), y = Math.sin(radians(10)), w = Math.cos(radians(10))
  const d = new MotionDecoder()
  d.osc(bundle(bone('Neck', 0, 0, s, c), bone('Head', 0, 0, -s, c)))
  // Ry10 * Rz-90
  d.osc(bone('Head', -y * s, y * c, -w * s, w * c)); near(d.pose.angleX, 0); near(d.pose.angleY, 10)
  const hips = new MotionDecoder()
  hips.osc(bundle(bone('Hips', 0, 0, s, c), bone('Spine', 0, 0, -s, c), bone('Neck'), bone('Head')))
  hips.osc(bone('Head', 0, y, 0, w)); near(hips.pose.angleX, 10); near(hips.pose.angleY, 0)
})
