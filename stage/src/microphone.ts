import { busGain, onMixer, setBus } from './mixer'
import { deviceError, inputs, microphoneConstraints, onInputs } from './devices'
import { tr } from './i18n'

/** The microphone has one gain policy for recording, publishing and the user's sound check. Lip sync can still use raw input. */
export function routeMicrophone(context: AudioContext, stream: MediaStream) {
  const node = context.createGain(), analyser = context.createAnalyser()
  let source: MediaStreamAudioSourceNode | null = null
  const input = (stream: MediaStream | null) => {
    source?.disconnect(); source = stream ? context.createMediaStreamSource(stream) : null
    source?.connect(node); source?.connect(analyser)
  }
  analyser.fftSize = 1024
  const data = new Float32Array(analyser.fftSize)
  node.gain.value = busGain('microphone')
  input(stream)
  const off = onMixer(() => node.gain.setTargetAtTime(busGain('microphone'), context.currentTime, .005))
  return {
    node, input,
    sample() {
      analyser.getFloatTimeDomainData(data)
      let peak = 0, squares = 0
      for (const value of data) { peak = Math.max(peak, Math.abs(value)); squares += value * value }
      return { peak, rms: Math.sqrt(squares / data.length) }
    },
    close() { off(); input(null); node.disconnect(); analyser.disconnect() },
  }
}
export function microphoneGain(noise: number[], speech: number[]) {
  const quantile = (values: number[], portion: number) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * portion)] ?? 0
  const floor = quantile(noise, .5), voice = quantile(speech, .9)
  if (voice < Math.max(.005, floor * 2)) throw new Error(tr('没有听清说话声，请靠近麦克风再试一次'))
  return Math.max(.2, Math.min(2, .18 / voice))
}
type Phase = 'off' | 'opening' | 'on' | 'recording' | 'quiet' | 'speaking'
export class MicrophoneCheck {
  phase: Phase = 'off'
  error = ''
  calibrated = false
  level = { peak: 0, rms: 0 }
  clip: Blob | null = null
  monitoring = false
  remaining = 0
  changed = () => {}
  private run = 0
  private raw: MediaStream | null = null
  private context: AudioContext | null = null
  private route: ReturnType<typeof routeMicrophone> | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private monitor: GainNode | null = null
  private recorder: MediaRecorder | null = null
  private playback: HTMLAudioElement | null = null
  private clipUrl = ''
  private timer = 0
  private until = 0
  private noise: number[] = []
  private speech: number[] = []
  private offInput: () => void
  constructor() {
    let microphone = inputs().microphone
    this.offInput = onInputs(() => { const next = inputs().microphone; if (next !== microphone) { microphone = next; if (this.phase !== 'off') void this.open() } })
  }
  async open() {
    this.close()
    const run = ++this.run
    this.phase = 'opening'; this.error = ''; this.calibrated = false; this.changed()
    try {
      const raw = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints() })
      if (run !== this.run) { raw.getTracks().forEach((track) => track.stop()); return }
      this.raw = raw
      const context = new AudioContext(); this.context = context
      await context.resume()
      if (run !== this.run) return
      const route = routeMicrophone(context, raw), destination = context.createMediaStreamDestination(), monitor = context.createGain()
      this.route = route; this.destination = destination; this.monitor = monitor
      monitor.gain.value = 0; route.node.connect(destination); route.node.connect(monitor); monitor.connect(context.destination)
      this.phase = 'on'
      this.timer = window.setInterval(() => this.tick(), 50); this.changed()
    } catch (error) {
      if (run !== this.run) return
      this.close(); this.error = deviceError(tr('麦克风'), error as Error); this.changed()
    }
  }
  listen(on: boolean) { this.monitoring = on; if (this.monitor) this.monitor.gain.value = on ? 1 : 0; this.changed() }
  calibrate() {
    if (this.phase !== 'on') return
    this.noise = []; this.speech = []; this.calibrated = false; this.error = ''
    this.phase = 'quiet'; this.until = performance.now() + 2000; this.changed()
  }
  record() {
    if (this.phase !== 'on' || !this.destination) return
    this.stopPlayback(); this.clip = null; this.error = ''
    const run = this.run, chunks: Blob[] = []; let failed = false
    try {
      const recorder = new MediaRecorder(this.destination.stream); this.recorder = recorder
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => {
        if (run !== this.run) return
        this.recorder = null; this.clip = failed ? null : new Blob(chunks, { type: recorder.mimeType }); this.phase = 'on'; this.changed()
      }
      recorder.onerror = (event) => {
        if (run !== this.run) return
        failed = true; this.error = tr('麦克风试听录制失败'); console.error(this.error, event)
        if (recorder.state !== 'inactive') recorder.stop()
        this.phase = 'on'; this.changed()
      }
      this.phase = 'recording'; this.until = performance.now() + 3000; recorder.start(); this.changed()
    } catch (error) { this.recorder = null; this.phase = 'on'; this.error = (error as Error).message; this.changed() }
  }
  async play() {
    if (!this.clip) return
    this.stopPlayback()
    const audio = new Audio(); this.playback = audio; this.clipUrl = URL.createObjectURL(this.clip); audio.src = this.clipUrl
    audio.onended = () => { if (this.playback === audio) this.stopPlayback() }
    try { await audio.play() } catch (error) { if (this.playback === audio) { this.error = (error as Error).message; this.stopPlayback(); this.changed() } }
  }
  private tick() {
    if (!this.route) return
    this.level = this.route.sample()
    this.remaining = Math.max(0, Math.ceil((this.until - performance.now()) / 1000))
    if (this.phase === 'quiet') {
      this.noise.push(this.level.rms)
      if (!this.remaining) { this.phase = 'speaking'; this.until = performance.now() + 4000 }
    } else if (this.phase === 'speaking') {
      this.speech.push(this.level.rms)
      if (!this.remaining) {
        this.phase = 'on'
        try { setBus('microphone', { volume: microphoneGain(this.noise, this.speech) }); this.calibrated = true }
        catch (error) { this.error = (error as Error).message }
      }
    } else if (this.phase === 'recording' && !this.remaining && this.recorder?.state === 'recording') this.recorder.stop()
    this.changed()
  }
  private stopPlayback() {
    const audio = this.playback; this.playback = null
    if (audio) { audio.onended = null; audio.pause(); audio.src = ''; audio.load() }
    if (this.clipUrl) URL.revokeObjectURL(this.clipUrl)
    this.clipUrl = ''
  }
  close() {
    this.run++; clearInterval(this.timer)
    if (this.recorder?.state !== 'inactive') this.recorder?.stop()
    this.recorder = null; this.stopPlayback()
    this.raw?.getTracks().forEach((track) => track.stop()); this.raw = null
    this.route?.close(); this.route = null
    this.destination?.stream.getTracks().forEach((track) => track.stop()); this.destination = null
    this.monitor?.disconnect(); this.monitor = null
    if (this.context && this.context.state !== 'closed') void this.context.close()
    this.context = null; this.phase = 'off'; this.clip = null; this.monitoring = false; this.level = { peak: 0, rms: 0 }; this.changed()
  }
  dispose() { this.close(); this.offInput(); this.changed = () => {} }
}
