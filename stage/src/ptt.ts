import { tr } from './i18n'
// Hold to speak in the editor; desktop shortcuts toggle a recording instead. Each capture owns its recorder,
// bytes and cancellation signal. The microphone stays warm briefly between captures.
import { useSyncExternalStore } from 'react'
import { wav16k } from './audio'
import { inputs, microphoneConstraints, refreshDevices } from './devices'
import { conversation, onConv, talk } from './conversation'
import { recognize, signedIn } from './livliv'
import { activeSpeech, asrReady, transcribeApi } from './voiceApi'

export type PttPhase = 'idle' | 'opening' | 'listening' | 'recognizing'
export type PttState = { phase: PttPhase; level: number; error: string; toggle: boolean }
let state: PttState = { phase: 'idle', level: 0, error: '', toggle: false }
const subs = new Set<() => void>()
const set = (change: Partial<PttState>) => { state = { ...state, ...change }; subs.forEach((f) => f()) }
export const pttState = () => state
export const usePtt = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
export const canHear = () => asrReady(activeSpeech()) || signedIn()

const MAX = 30, MIN = .4, WARM = 30_000
type Input = { stream: MediaStream; ctx: AudioContext; an: AnalyserNode; buf: Float32Array<ArrayBuffer>; device: string }
type Capture = { controller: AbortController; toggle: boolean; recorder: MediaRecorder | null; parts: Blob[]; started: number; stopped: Promise<void> }
let input: Input | null = null, capture: Capture | null = null
let closeTimer = 0, maxTimer = 0, raf = 0
const fake = () => import.meta.env.DEV ? localStorage.getItem('livliv-stage:fake-mic') : null
const disposeInput = (value: Input) => { value.stream.getTracks().forEach((t) => t.stop()); void value.ctx.close().catch(() => {}) }
function close() { if (input) { disposeInput(input); input = null } }
const later = () => { clearTimeout(closeTimer); closeTimer = window.setTimeout(close, WARM) }
document.addEventListener('visibilitychange', () => { if (document.hidden && state.phase !== 'listening' && state.phase !== 'opening') close() })

async function open(run: Capture): Promise<Input | null> {
  const source = fake(), device = inputs().microphone
  if (!source && input?.device === device && input.stream.getAudioTracks().some((t) => t.readyState === 'live')) return input
  close()
  const ctx = new AudioContext(), an = ctx.createAnalyser()
  let stream: MediaStream | null = null
  an.fftSize = 1024
  try {
    if (source) {
      const node = ctx.createBufferSource(), out = ctx.createMediaStreamDestination()
      node.buffer = await ctx.decodeAudioData(await (await fetch(source, { signal: run.controller.signal })).arrayBuffer())
      node.connect(out); node.start(); stream = out.stream
    } else stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints() })
    const value: Input = { stream, ctx, an, device, buf: new Float32Array(an.fftSize) }
    if (capture !== run) { disposeInput(value); return null }
    ctx.createMediaStreamSource(stream).connect(an)
    input = value; void refreshDevices()
    return value
  } catch (error) { stream?.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => {}); throw error }
}

function listen(run: Capture, value: Input) {
  if (capture !== run || state.phase !== 'listening') return
  value.an.getFloatTimeDomainData(value.buf)
  let sum = 0
  for (const sample of value.buf) sum += sample * sample
  set({ level: Math.min(1, Math.sqrt(sum / value.buf.length) * 6) })
  raf = requestAnimationFrame(() => listen(run, value))
}

export async function press(toggle = false) {
  if (state.phase !== 'idle') return
  if (!canHear()) { set({ error: tr("在设置里接上语音识别后可用") }); return }
  const run: Capture = { controller: new AbortController(), toggle, recorder: null, parts: [], started: 0, stopped: Promise.resolve() }
  capture = run; clearTimeout(closeTimer)
  set({ phase: 'opening', error: '', toggle })
  try {
    const value = await open(run)
    if (!value || capture !== run) return
    const recorder = run.recorder = new MediaRecorder(value.stream)
    run.stopped = new Promise((resolve) => { recorder.onstop = () => resolve() })
    recorder.ondataavailable = (event) => { if (event.data.size) run.parts.push(event.data) }
    recorder.start(); run.started = performance.now()
    maxTimer = window.setTimeout(() => void release(), MAX * 1000)
    set({ phase: 'listening' }); listen(run, value)
  } catch (error) {
    if (capture === run) { capture = null; later(); set({ phase: 'idle', toggle: false, error: tr("麦克风没有打开：{0}", (error as Error).message) }) }
  }
}

export async function release() {
  if (state.phase === 'opening') { cancel(); return }
  const run = capture, recorder = run?.recorder
  if (!run || !recorder || state.phase !== 'listening') return
  clearTimeout(maxTimer); cancelAnimationFrame(raf)
  set({ phase: 'recognizing', level: 0 })
  try {
    recorder.stop(); await run.stopped
    run.controller.signal.throwIfAborted()
    if ((performance.now() - run.started) / 1000 < MIN) { set({ error: tr("录音太短，请再说一次") }); return }
    const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await new Blob(run.parts, { type: recorder.mimeType }).arrayBuffer())
    const pcm = buffer.getChannelData(0).slice(0, Math.round(MAX * buffer.sampleRate))
    const wav = await wav16k(pcm, buffer.sampleRate), speech = activeSpeech(), signal = run.controller.signal
    signal.throwIfAborted()
    const said = asrReady(speech) ? await transcribeApi(speech, wav, signal) : await recognize(wav, signal)
    signal.throwIfAborted()
    if (said) talk.say(said)
    set({ error: said ? '' : tr("没听清，请再说一次") })
  } catch (error) { if (!run.controller.signal.aborted) set({ error: (error as Error).message }) }
  finally { if (capture === run) { capture = null; later(); set({ phase: 'idle', level: 0, toggle: false }) } }
}

export function cancel() {
  const run = capture; capture = null
  run?.controller.abort()
  if (run?.recorder && run.recorder.state !== 'inactive') run.recorder.stop()
  clearTimeout(maxTimer); cancelAnimationFrame(raf)
  if (state.phase !== 'idle') { later(); set({ phase: 'idle', level: 0, toggle: false }) }
}
// Input begun during a live session ends with it, including an automatic budget or duration stop.
let liveActive = false
onConv(() => {
  const state = conversation(), active = state.running && state.mode === 'live', ended = liveActive && !active
  liveActive = active
  if (ended) cancel()
})

export const clearError = () => { if (state.error) set({ error: '' }) }
export const togglePtt = () => state.phase === 'recognizing' ? cancel() : state.phase === 'idle' ? press(true) : release()

export function holdKey() {
  const down = (event: KeyboardEvent) => {
    if (event.code !== 'Backquote' || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault(); if (!event.repeat) void press()
  }
  const up = (event: KeyboardEvent) => { if (event.code === 'Backquote') { event.preventDefault(); void release() } }
  const esc = (event: KeyboardEvent) => { if (event.key === 'Escape' && state.phase !== 'idle') { event.stopImmediatePropagation(); cancel() } }
  const blur = () => { if (capture && !capture.toggle && (state.phase === 'opening' || state.phase === 'listening')) cancel() }
  addEventListener('keydown', esc, true); addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur)
  return () => { removeEventListener('keydown', esc, true); removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur) }
}
