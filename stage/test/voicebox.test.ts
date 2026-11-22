// Voicebox in the desktop app (src/voicebox.ts), against a stand-in for the desktop's bridge: found or not, the open
// engines used unasked, a line in its language, what you said heard, readable errors, the checklist's voice item, and
// its Whisper counting as your own recognition (no points for hearing you).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { VoiceboxProfile } from '../../protocol/src/voicebox'
import { checklist, type CheckContext } from '../src/shell/checks'
import { asrReady, speechReady, VOICEBOX_SPEECH } from '../src/speechProviders'
import { defaultProfile, detectVoicebox, lineLanguage, openProfiles, setVoiceboxBridge, voiceboxError, voiceboxReady, voiceboxSpeak, voiceboxState, voiceboxTranscribe } from '../src/voicebox'

const lily: VoiceboxProfile = { id: 'lily', name: 'Lily', language: 'zh', kind: 'preset', engine: 'kokoro', ready: true }
const mine: VoiceboxProfile = { id: 'mine', name: 'Me', language: 'en', kind: 'cloned', engine: 'qwen', ready: true, size: '0.6B' }
const tada: VoiceboxProfile = { id: 'tada', name: 'Tada', language: 'en', kind: 'cloned', engine: 'tada', ready: true, size: '1B' }
const bare: VoiceboxProfile = { id: 'bare', name: 'Bare', language: 'en', kind: 'preset', engine: 'chatterbox', ready: false, model: 'Chatterbox' }

/** a desktop bridge to a Voicebox that lists these profiles (none: not running) */
function voicebox(profiles: VoiceboxProfile[] | null) {
  const calls: unknown[][] = []
  setVoiceboxBridge({
    profiles: async () => (profiles ? { ok: true, value: profiles } : { ok: false, error: 'not-running', detail: 'ECONNREFUSED' }),
    speak: async (id, line, language) => {
      calls.push(['speak', id, line, language])
      return profiles ? { ok: true, value: new Uint8Array([1, 2, 3]).buffer } : { ok: false, error: 'not-running', detail: '' }
    },
    transcribe: async (id, wav) => { calls.push(['transcribe', id, wav.byteLength]); return { ok: false, error: 'downloading', detail: 'Whisper model base is being downloaded' } },
    cancel: async (id) => { calls.push(['cancel', id]); return null },
  })
  return calls
}

test('found running: the open engines are used unasked, a voice of another engine only when picked', async () => {
  voicebox([tada, lily, mine])
  await detectVoicebox()
  assert.equal(voiceboxState().status, 'on')
  assert.deepEqual(openProfiles(voiceboxState().profiles).map((p) => p.id), ['lily', 'mine'], 'never HumeAI TADA unasked')
  assert.deepEqual([0, 1, 2].map(defaultProfile), ['lily', 'mine', 'lily'], 'each character a voice of its own, in turn')
  assert.equal(voiceboxReady(), true)
  voicebox([tada])
  await detectVoicebox()
  assert.equal(voiceboxReady(), false, 'only a TADA voice: not the default voice')
  voicebox([bare, lily])
  await detectVoicebox()
  assert.deepEqual([0, 1].map(defaultProfile), ['lily', 'lily'], 'a voice whose model isn\'t downloaded is not used unasked')
  voicebox([bare])
  await detectVoicebox()
  assert.equal(voiceboxReady(), false, 'no voice has its model: not the default voice')
  assert.deepEqual([voiceboxState().status, voiceboxState().error], ['on', 'no-model'], 'and it says how to get one')
  voicebox(null)
  await detectVoicebox()
  assert.deepEqual([voiceboxState().status, voiceboxState().error], ['off', 'not-running'])
  setVoiceboxBridge(undefined)
})

test('a line goes in the language it is written in; a line given up is cancelled', async () => {
  assert.deepEqual(['你好呀。', 'こんにちは', '안녕하세요', 'Hello there', '……'].map((text) => lineLanguage(text, 'ja')), ['zh', 'ja', 'ko', 'en', 'ja'])
  const calls = voicebox([lily])
  await detectVoicebox()
  const blob = await voiceboxSpeak('lily', '今天天气不错。')
  assert.equal(blob.type, 'audio/wav'); assert.equal(blob.size, 3)
  assert.deepEqual(calls[0].slice(2), [{ profile: 'lily', text: '今天天气不错。' }, 'zh'])
  const stop = new AbortController()
  const said = voiceboxSpeak('lily', 'Hi', stop.signal)
  stop.abort()
  await assert.rejects(said)
  assert.equal(calls.at(-1)?.[0], 'cancel')
  const sized = voicebox([lily, mine, bare])
  await detectVoicebox()
  await voiceboxSpeak('mine', 'Hello')
  assert.deepEqual(sized[0].slice(2), [{ profile: 'mine', text: 'Hello', size: '0.6B' }, 'en'], 'the model size it has')
  await assert.rejects(voiceboxSpeak('bare', 'Hello'), { message: voiceboxError('no-model') })
  assert.equal(sized.length, 1, 'a voice without its model is not asked')
  setVoiceboxBridge(undefined)
})

test('readable errors: not running, no voice, a model downloading; the web has no Voicebox', async () => {
  voicebox(null)
  await assert.rejects(voiceboxSpeak('lily', '你好'), { message: voiceboxError('not-running') })
  voicebox([lily])
  await assert.rejects(voiceboxTranscribe(new Blob([new Uint8Array(8)])), { message: voiceboxError('downloading') })
  setVoiceboxBridge(undefined)
  await assert.rejects(voiceboxSpeak('lily', '你好'), /桌面版/)
  assert.notEqual(voiceboxError('no-profiles'), voiceboxError('downloading'))
  assert.match(voiceboxError('no-model'), /还没下载这个声音的模型/, 'the voice\'s model is missing: Stage starts no download')
})

test('as the speech API: no key, ready to speak; its Whisper off until you switch it on, then your own recognition', () => {
  assert.equal(speechReady(VOICEBOX_SPEECH), true)
  assert.equal(asrReady(VOICEBOX_SPEECH), false, 'found running, it leaves your recognition as it was')
  assert.equal(asrReady({ ...VOICEBOX_SPEECH, asr: 'whisper' }), true, 'switched on: hearing you spends no points')
})

test('the checklist: Voicebox offered on the desktop while not found and only subtitles would play; its voice shown once in use', () => {
  const context = (c: Partial<CheckContext>): CheckContext => ({
    model: 'qwen-flash', ai: [{ name: 'Nana', voice: 'none', muted: false }], face: null, partner: false, hear: false, microphone: false,
    phone: { here: false, on: false }, twitch: { status: 'off', channel: '' }, game: { here: false, engine: { engine: 'standard', reason: 'web' }, reason: '' },
    realtime: { ready: false, provider: '' }, ...c,
  })
  const voice = (c: Partial<CheckContext>) => checklist('chat', context(c)).find((check) => check.id === 'voice')!
  assert.deepEqual(voice({ voicebox: { here: true, on: false } }).link, { label: '用 Voicebox（免费，在本机运行）', url: 'https://voicebox.sh' })
  assert.equal(voice({ voicebox: { here: false, on: false } }).link, undefined, 'not on the web')
  assert.equal(voice({}).link, undefined)
  const used = voice({ ai: [{ name: 'Nana', voice: 'api', muted: false }], voicebox: { here: true, on: true, profile: 'Lily' } })
  assert.deepEqual([used.state, used.detail, used.link], ['ok', 'Voicebox · Lily', undefined])
})
