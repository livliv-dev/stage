import assert from 'node:assert/strict'
import { test } from 'node:test'

test('stopping system speech clears the old watchdog even when the browser never reports completion', async (t) => {
  const names = ['speechSynthesis', 'SpeechSynthesisUtterance', 'window']
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const)
  t.after(() => { t.mock.timers.reset(); for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) } })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let cancellations = 0
  const said: { volume?: number; onstart?: () => void; onerror?: (event: { error: string }) => void }[] = []
  const synth = { getVoices: () => [{ name: 'Fixture', lang: 'en-US', localService: true }], speak: (utterance: typeof said[number]) => said.push(utterance), cancel: () => cancellations++ }
  const set = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { configurable: true, value })
  set('speechSynthesis', synth); set('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text } }); set('window', globalThis)
  const { say } = await import('../src/speech')
  const voice = { source: 'system' as const, name: 'Fixture', livliv: '', api: '', pitch: 1, rate: 1 }
  const old = say('old', voice, .4); assert.equal(said[0].volume, .4); old.stop(); await old.done
  const next = say('This new sentence should not be cancelled by an earlier stopped sentence.', voice)
  t.mock.timers.tick(5000)
  assert.equal(cancellations, 1)
  said[0].onerror?.({ error: 'audio-busy' }); assert.equal(old.level(), 0)
  next.stop(); await next.done
  t.mock.timers.tick(30000); assert.equal(cancellations, 2)
})
