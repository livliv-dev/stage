import { tr } from './i18n'
import { useSyncExternalStore } from 'react'
import { wav16k } from './audio'
import { inputs, microphoneConstraints, onInputs, refreshDevices } from './devices'
import { conversation, onConv, sessionScope, talk } from './conversation'
import { recognize } from './livliv'
import { livlivNow } from './brain'
import { busGain, onMixer } from './mixer'
import { routeMicrophone } from './microphone'
import { activeSpeech, asrReady, transcribeApi } from './voiceApi'
import { current } from './sessions/run'
import { hearingNow } from './sessions/spend'
import { isBackchannel, VoiceActivity } from './voiceActivity'

export type PttPhase = 'idle' | 'opening' | 'armed' | 'listening' | 'recognizing'
export type PttState = { phase: PttPhase; level: number; error: string; toggle: boolean; automatic: boolean }
let state: PttState = { phase: 'idle', level: 0, error: '', toggle: false, automatic: false }
const subs = new Set<() => void>()
const set = (change: Partial<PttState>) => { state = { ...state, ...change }; subs.forEach((f) => f()) }
export const pttState = () => state
export const usePtt = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
export const canHear = () => livlivNow().voice || asrReady(activeSpeech())

const MAX = 30, MIN = .4, WARM = 30_000
// The session owns the device; each capture owns only its recording. ASR never stops the next capture.
type Input = { stream: MediaStream; recorded: MediaStream; route: ReturnType<typeof routeMicrophone>; ctx: AudioContext; an: AnalyserNode; buf: Float32Array<ArrayBuffer>; device: string }
type Capture = { recorder: MediaRecorder; parts: Blob[]; started: number; duration: number; stopped: Promise<void>; duringReply: boolean; seconds: number; confirmed: boolean }
type MicSession = { controller: AbortController; toggle: boolean; automatic: boolean; device: string; current: Capture | null; queue: Capture[]; reading: boolean; gate: VoiceActivity | null }
let input: Input | null = null, session: MicSession | null = null
let closeTimer = 0, maxTimer = 0, meterTimer = 0
const fake = () => import.meta.env.DEV ? localStorage.getItem('livliv-stage:fake-mic') : null
const disposeInput = (value: Input) => { value.route.close(); value.stream.getTracks().forEach((t) => t.stop()); value.recorded.getTracks().forEach((t) => t.stop()); void value.ctx.close().catch(() => {}) }
function close() { clearTimeout(closeTimer); if (input) { disposeInput(input); input = null } }
const later = () => { clearTimeout(closeTimer); closeTimer = window.setTimeout(close, WARM) }
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !state.automatic && state.phase !== 'listening' && state.phase !== 'opening') close()
})

async function open(run: MicSession): Promise<Input | null> {
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
    if (session !== run) { stream.getTracks().forEach((track) => track.stop()); void ctx.close().catch(() => {}); return null }
    if (ctx.state === 'suspended') await ctx.resume()
    const route = routeMicrophone(ctx, stream), out = ctx.createMediaStreamDestination()
    route.node.connect(an); route.node.connect(out)
    const value: Input = { stream, recorded: out.stream, route, ctx, an, device, buf: new Float32Array(an.fftSize) }
    if (session !== run) { disposeInput(value); return null }
    for (const track of stream.getAudioTracks()) track.addEventListener('ended', () => {
      if (input !== value) return
      cancel(); close(); set({ error: tr('麦克风已断开，请重新选择设备') })
    }, { once: true })
    input = value; void refreshDevices()
    return value
  } catch (error) { stream?.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => {}); throw error }
}

function phase(run: MicSession) {
  if (session !== run) return
  set({ phase: run.current?.confirmed ? 'listening' : run.queue.length ? 'recognizing' : run.automatic ? 'armed' : 'idle' })
}
function releaseHold(run: MicSession) {
  if (session === run && !run.current && !run.queue.length) talk.hearing(false)
}
function record(run: MicSession, value: Input) {
  const recorder = new MediaRecorder(value.recorded), parts: Blob[] = []
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
  const speaking = conversation().speaking
  const capture: Capture = { recorder, parts, started: performance.now(), duration: 0, stopped, duringReply: !!speaking && !speaking.human, seconds: 0, confirmed: !run.automatic }
  recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data) }
  recorder.onerror = (event) => {
    if (session !== run) return
    cancel(); set({ error: tr('录音失败：{0}', (event as Event & { error?: DOMException }).error?.message ?? 'MediaRecorder error') })
  }
  recorder.start(); run.current = capture
  maxTimer = window.setTimeout(() => { if (session === run) { finish(run); run.gate?.reset() } }, MAX * 1000)
}

function finish(run: MicSession) {
  const capture = run.current
  if (session !== run || !capture) return
  clearTimeout(maxTimer); run.current = null
  capture.duration = (performance.now() - capture.started) / 1000
  capture.recorder.stop()
  let processing: Promise<void> | undefined
  if (capture.confirmed) {
    // A slow external recognizer must not accumulate an unbounded recording/billing queue.
    if (run.queue.length >= 4) { cancel(); set({ error: tr('识别暂时跟不上，请稍后重新开启免按键语音') }); return }
    run.queue.push(capture); processing = drain(run)
  }
  phase(run); releaseHold(run)
  return processing
}

async function drain(run: MicSession) {
  if (run.reading) return
  run.reading = true
  try {
    while (session === run && run.queue.length) {
      const capture = run.queue[0], signal = run.controller.signal
      try {
        await capture.stopped; signal.throwIfAborted()
        if (capture.duration < MIN) { set({ error: tr('录音太短，请再说一次') }); continue }
        const buffer = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await new Blob(capture.parts, { type: capture.recorder.mimeType }).arrayBuffer())
        const pcm = buffer.getChannelData(0).slice(0, Math.round(MAX * buffer.sampleRate))
        const wav = await wav16k(pcm, buffer.sampleRate), speech = activeSpeech()
        signal.throwIfAborted()
        // livliv.ai's recognition while its voices are on, else your own; a session that started on your own never turns
        // to livliv.ai's (points): hearing stops instead (sessions/spend.ts)
        const hearing = hearingNow(livlivNow().voice, asrReady(speech), current()?.spend)
        if (hearing === 'stop') { stopHearing(); return }
        const said = hearing === 'own' ? await transcribeApi(speech, wav, signal) : await recognize(wav, signal)
        signal.throwIfAborted()
        if (said) talk.say(said, { transcribed: run.automatic, respond: !run.automatic || !isBackchannel(said, capture.seconds, capture.duringReply) })
        set({ error: said ? '' : tr('没听清，请再说一次') })
      } catch (error) { if (!signal.aborted) set({ error: (error as Error).message }) }
      finally { run.queue.shift() }
    }
  } finally {
    run.reading = false
    if (session === run) {
      releaseHold(run)
      if (run.automatic) phase(run)
      else { session = null; later(); set({ phase: 'idle', level: 0, toggle: false }) }
    }
  }
}

function listen(run: MicSession, value: Input) {
  if (session !== run) return
  value.an.getFloatTimeDomainData(value.buf)
  let sum = 0
  for (const sample of value.buf) sum += sample * sample
  const rms = Math.sqrt(sum / value.buf.length)
  set({ level: Math.min(1, rms * 6) })
  const gate = run.gate
  if (gate) {
    const event = gate.sample(rms, performance.now())
    if (run.current) run.current.seconds = gate.seconds
    if (event?.type === 'candidate') {
      try { record(run, value) }
      catch (error) { cancel(); set({ error: tr('录音失败：{0}', (error as Error).message) }); return }
    } else if (event?.type === 'speech' && run.current) {
      run.current.confirmed = true; phase(run); talk.hearing(true, { interrupt: true })
    } else if (event?.type === 'noise' || event?.type === 'end') finish(run)
    if (session !== run) return
  }
  meterTimer = window.setTimeout(() => listen(run, value), 20)
}

async function begin(toggle: boolean, automatic: boolean) {
  const run: MicSession = { controller: new AbortController(), toggle, automatic, device: inputs().microphone, current: null, queue: [], reading: false, gate: automatic ? new VoiceActivity() : null }
  session = run; clearTimeout(closeTimer)
  set({ phase: 'opening', ...(!automatic ? { error: '' } : {}), toggle })
  try {
    const value = await open(run)
    if (!value || session !== run) return
    if (automatic) { phase(run); listen(run, value) }
    else { record(run, value); phase(run); talk.hearing(); listen(run, value) }
  } catch (error) {
    if (session === run) { session = null; close(); set({ phase: 'idle', automatic: false, toggle: false, error: tr('麦克风没有打开：{0}', (error as Error).message) }) }
  }
}

async function arm() {
  const conv = conversation()
  if (!state.automatic || session || conv.paused || !conv.running || !['chat', 'live'].includes(conv.mode)) return
  await begin(true, true)
}

export async function setHandsFree(on: boolean) {
  if (!on) { cancel(); return }
  if (state.automatic) return
  if (!canHear()) { set({ error: tr('需要语音识别') }); return }
  const conv = conversation()
  if (!conv.running || !['chat', 'live'].includes(conv.mode)) { set({ error: tr('先开始聊天，再开启免按键语音') }); return }
  if (!busGain('microphone')) { set({ error: tr('请先取消麦克风静音，再开启免按键语音') }); return }
  cancel(); set({ automatic: true, error: '' }); await arm()
}

export async function press(toggle = false) {
  if (conversation().running && conversation().mode === 'realtime') return
  if (state.automatic) cancel()
  if (state.phase !== 'idle') return
  if (!canHear()) { set({ error: tr('需要语音识别') }); return }
  await begin(toggle, false)
}

export async function release() {
  if (state.phase === 'opening') { cancel(); return }
  const run = session
  if (!run || !run.current?.confirmed || state.phase !== 'listening') return
  if (!run.automatic) { clearTimeout(meterTimer); set({ level: 0 }) }
  await finish(run)
}

function abortSession() {
  const run = session; session = null
  run?.controller.abort()
  if (run) {
    if (run.current?.recorder.state !== 'inactive') run.current?.recorder.stop()
    run.current = null; run.queue.length = 0; talk.hearing(false)
  }
  clearTimeout(maxTimer); clearTimeout(meterTimer)
  set({ phase: 'idle', level: 0, toggle: false })
}
export function cancel() {
  const automatic = state.automatic
  set({ automatic: false }); abortSession()
  if (automatic) close(); else later()
}

const inputScope = (conv: ReturnType<typeof conversation>) => conv.running ? conv.scope : sessionScope()
let previous = conversation()
onConv(() => {
  const conv = conversation(), active = conv.running && conv.mode !== 'conversation'
  const ended = previous.running && previous.mode !== 'conversation' && !active
  const openedLive = conv.running && conv.mode === 'live' && (!previous.running || previous.mode !== 'live')
  const changedScope = inputScope(conv) !== inputScope(previous)
  previous = conv
  // A pending capture must not be published into a new live session or a different scope.
  if (ended || (session && (openedLive || changedScope)) || (state.automatic && conv.mode === 'realtime')) { cancel(); return }
  if (state.automatic && conv.paused) { abortSession(); close() }
  else if (state.automatic && !session) void arm()
})
onInputs(() => {
  if (state.automatic && session && session.device !== inputs().microphone) { abortSession(); close(); void arm() }
})
onMixer(() => {
  if (state.automatic && !busGain('microphone')) { cancel(); set({ error: tr('麦克风已静音，免按键语音已关闭') }) }
})

export const clearError = () => { if (state.error) set({ error: '' }) }
/** nothing can hear you any more (your own recognition gone, livliv.ai's voices off or started without): hands-free
 *  stops, and says why */
export function stopHearing() { cancel(); set({ error: tr('语音识别停了，已停止听你说话') }) }
export const togglePtt = () => state.automatic ? press(true) : state.phase === 'recognizing' ? cancel() : state.phase === 'idle' ? press(true) : release()

export function holdKey() {
  const down = (event: KeyboardEvent) => {
    if (event.code !== 'Backquote' || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault(); if (!event.repeat) void press()
  }
  const up = (event: KeyboardEvent) => { if (event.code === 'Backquote') { event.preventDefault(); void release() } }
  const esc = (event: KeyboardEvent) => {
    // A native modal owns Escape; dismissing it must not also stop the microphone.
    if (event.key !== 'Escape' || document.querySelector('dialog:modal')) return
    if (state.automatic || state.phase !== 'idle') { event.stopImmediatePropagation(); cancel() }
  }
  const blur = () => { if (session && !session.toggle && (state.phase === 'opening' || state.phase === 'listening')) cancel() }
  addEventListener('keydown', esc, true); addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur)
  return () => { removeEventListener('keydown', esc, true); removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur) }
}
