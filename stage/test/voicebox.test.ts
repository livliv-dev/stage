// Voicebox in the desktop app (src/voicebox.ts), against a stand-in for the desktop's bridge: found or not, the open
// engines used unasked, a line in its language, what you said heard, readable errors, the checklist's voice item, and
// its Whisper counting as your own recognition (no points for hearing you).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { VoiceboxProfile } from '../../desktop/src/voicebox'
import { checklist, type CheckContext } from '../src/shell/checks'
import { asrReady, speechReady, VOICEBOX_SPEECH } from '../src/speechProviders'
import { defaultProfile, detectVoicebox, lineLanguage, openProfiles, setVoiceboxBridge, voiceboxError, voiceboxReady, voiceboxSpeak, voiceboxState, voiceboxTranscribe } from '../src/voicebox'

const lily: VoiceboxProfile = { id: 'lily', name: 'Lily', language: 'zh', kind: 'preset', engine: 'kokoro' }
const mine: VoiceboxProfile = { id: 'mine', name: 'Me', language: 'en', kind: 'cloned', engine: 'chatterbox' }
const tada: VoiceboxProfile = { id: 'tada', name: 'Tada', language: 'en', kind: 'cloned', engine: 'tada' }

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
})

test('as the speech API: no key, ready to speak, and its Whisper counts as your own recognition', () => {
  assert.equal(speechReady(VOICEBOX_SPEECH), true)
  assert.equal(asrReady(VOICEBOX_SPEECH), true, 'hearing you spends no points')
  assert.equal(asrReady({ ...VOICEBOX_SPEECH, asr: '' }), false, 'turned off, it hears nothing')
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
