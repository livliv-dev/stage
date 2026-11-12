import { tr } from './i18n'
import { LivLivError, type PlaybackPose } from '@livliv-dev/player'
import { startFaceTracking, type FaceTracking } from '@livliv-dev/player/tracking'
import { createSpeech, startLipSync, type LipSync, type LipSyncOptions, type Speech } from '@livliv-dev/player/voice'
import { onQuality, pixelRatio } from './quality'
import { formatOf, makePlayer, setPixelated, sourceOf, type Format, type StagePlayer } from './bodies'
import { busGain, onMixer } from './mixer'
import { startInputTracking, type InputTracking } from './inputTracking'
import { networkSource } from './networkTracking'
import { gamepadSource } from './gamepad'
import { deviceError, inputs, microphoneConstraints, onInputs, refreshDevices } from './devices'
import type { Emotion, Move } from './brain'
import { participants as characters, store, type CharacterItem, type ModelRef } from './scene'
import { estimate, say, type Utterance } from './speech'
import { isOutput, outputOpen, post } from './link'
import { length, modelId, voiceLine, type Clip } from './livliv'
import { activeSpeech, apiVoice, speakApi, speakLive, speechProviderOf, voiceRoute } from './voiceApi'

const FACE_MODEL = { wasmUrl: import.meta.env.BASE_URL + 'mediapipe/wasm', modelUrl: import.meta.env.BASE_URL + 'mediapipe/face_landmarker.task' }
const FEELING: Record<Exclude<Emotion, 'neutral'>, string[]> = {
  happy: ['笑', '开心', 'smile', 'happy'], shy: ['害羞', 'shy'], angry: ['生气', 'angry'], sad: ['难过', 'sad'], surprised: ['惊讶', 'surprised'],
}
export const actors = new Map<string, Actor>()
const listeners = new Set<() => void>()
export const onActors = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
const changed = () => listeners.forEach((f) => f())
const frameTaps = new Set<(a: Actor) => void>()
export const onFrame = (f: (a: Actor) => void) => { frameTaps.add(f); return () => { frameTaps.delete(f) } }
export type Heard = { who: string; blob: Blob; start: number; stop: number | null; ready?: Promise<unknown>; gain: { at: number; value: number }[] }
const heardTaps = new Set<(h: Heard) => void>()
export const onHeard = (f: (h: Heard) => void) => { heardTaps.add(f); return () => { heardTaps.delete(f) } }
export type Take = { text: string; seconds: number; clip: Clip | null; aloud: boolean; mute?: boolean }
type Look = { x: number; y: number }
const mouse = { x: 0, y: 0, seen: false }
addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true })
document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) mouse.seen = false })
document.addEventListener('pointerdown', () => actors.forEach((a) => a.unlock()), { capture: true })

function refused(e: unknown) {
  if (!(e instanceof LivLivError)) return (e as Error).message
  if (e.code === 'newer-format' || e.code === 'missing-feature') return tr("这个模型需要更新版本的 Stage")
  if (e.code === 'no-webgl') return tr("这台电脑无法启动 WebGL2")
  if (e.code === 'context-lost') return tr("图形设备已重置，请重新加载角色")
  if (e.code === 'too-large') return tr("这个模型超出了播放器的大小限制")
  if (e.code === 'unreachable' || e.code === 'http') return tr("模型读取失败，请检查文件或网络")
  return tr("模型文件有问题：") + e.message
}

export class Actor {
  readonly player: StagePlayer
  readonly format: Format
  item: CharacterItem
  status: 'loading' | 'ready' | 'error' = 'loading'
  error = ''
  voiceError = ''
  inputPhase: 'idle' | 'opening' | 'on' | 'error' = 'idle'
  calibratedAt = 0
  lastPose: PlaybackPose
  source: string | Map<string, Blob> | null = null
  listening = false
  private model = ''
  private loadRun = 0
  private driverKey = ''
  private driverRun = 0
  private stopDriver: (() => void) | null = null
  private face: FaceTracking | null = null
  private input: InputTracking | null = null
  private mic: LipSync | null = null
  private micStream: MediaStream | null = null
  private voice: Speech
  private speechOptions: LipSyncOptions = { motion: 0.6 }
  private utter: Utterance | null = null
  private heard: Heard | null = null
  private pace = 0
  private next: { at: number; look: Look | null | 'free' } | null = null
  private aim: Look | null | 'free' = null
  private nodAt = 0
  private nodTime = -1
  private calm = 0
  private disposed = false
  private offInputs: () => void
  private offQuality: () => void
  private offMixer: () => void
  private systemVoice = false
  private expressionId: string | null = null
  private expressionRevision = 0
  private expressionExpiry = 0

  constructor(canvas: HTMLCanvasElement, item: CharacterItem) {
    this.item = item
    this.format = formatOf(item.model)
    this.player = makePlayer(canvas, this.format, { renderWhenHidden: !isOutput && !item.remote, autoplay: !isOutput && !item.remote, idle: !isOutput && !item.remote && (item.driver === 'pointer' || item.tuning.idle) })
    if (!isOutput && !item.remote) this.player.parameterProfile = item.tuning.tracking
    this.player.maxPixelRatio = pixelRatio()
    this.offQuality = onQuality(() => { this.player.maxPixelRatio = pixelRatio() })
    this.lastPose = this.player.getPose()
    this.voice = createSpeech(this.player, this.speechOptions)
    this.offMixer = isOutput || item.remote ? () => {} : onMixer(() => this.syncVolume())
    this.offInputs = isOutput || item.remote ? () => {} : onInputs(() => void this.drive())
    actors.set(item.id, this)
    this.player.onContextLost = () => { this.status = 'error'; this.error = tr("图形设备已重置，请重新加载角色"); changed() }
    this.player.onFrame = (pose) => {
      this.lastPose = pose
      if (outputOpen()) post({ t: 'pose', id: this.item.id, pose })
      for (const f of frameTaps) f(this)
    }
    if (!isOutput) {
      if (!item.remote) this.player.use({ order: -20, update: (f) => {
        const scale = { calm: 0.55, natural: 0.8, lively: 1.15 }[this.item.motion]
        for (const k of ['angleX', 'angleY', 'angleZ', 'bodyX', 'bodyZ'] as const) f.params[k] *= scale
        if (this.next && performance.now() >= this.next.at) { this.aim = this.next.look; this.next = null; this.applyLook() }
        if (this.item.driver === 'pointer') {
          const r = canvas.getBoundingClientRect(), x = (mouse.x - r.left) / r.width
          if (mouse.seen) this.player.lookAt((this.item.mirror ? 1 - x : x) * 2 - 1, 1 - (mouse.y - r.top) / r.height * 2)
          else this.player.lookAt(null)
        }
      } })
      if (!item.remote) this.player.use({ order: 20, update: (f) => {
        if (this.utter) { f.params.mouthOpen = Math.max(f.params.mouthOpen, this.utter.level()); f.params.vowel = this.utter.vowel() }
        if (!f.tracked && this.listening && !this.utter) {
          if (this.nodTime < 0 && f.time > this.nodAt) this.nodTime = 0
          if (this.nodTime >= 0) {
            this.nodTime += f.dt
            if (this.nodTime > 0.7) { this.nodTime = -1; this.nodAt = f.time + 2.5 + Math.random() * 4 }
            else f.add({ angleY: -3.5 * Math.sin(Math.PI * this.nodTime / 0.7) })
          }
        }
      } })
    }
    void this.sync(item)
  }

  unlock() { if (!isOutput) this.voice.unlock() }
  get faceVideo() { return this.face?.video ?? null }
  get trackingSample() { return !isOutput && !this.item.remote ? this.player.parameterSample : null }
  get expression() { return this.expressionId }
  setExpression(id: string | null, weight = this.item.tuning.expressionStrength) {
    const applied = this.player.setExpression(id, weight)
    if (applied) { clearTimeout(this.expressionExpiry); this.expressionExpiry = 0; this.expressionId = id; this.expressionRevision++; changed() }
    return applied
  }
  pulseExpression(id: string, seconds: number, weight?: number) {
    if (!this.setExpression(id, weight)) return false
    const revision = this.expressionRevision
    this.expressionExpiry = window.setTimeout(() => {
      if (!this.disposed && this.expressionRevision === revision) this.setExpression(null)
    }, seconds * 1000)
    return true
  }
  get tracking() { return this.face ? { face: this.face.face, fps: this.face.fps, dark: this.face.dark } : null }
  get inputLevel() { return this.mic?.level ?? this.voice.level }
  get speaking() { return !!this.utter }
  get audio() { return this.voice.stream }
  private get volume() { return this.item.muted ? 0 : this.item.tuning.volume * busGain('characters') }
  private syncVolume() {
    const volume = this.volume
    this.voice.volume = volume
    if (this.heard && this.heard.start > 0 && this.heard.gain.at(-1)?.value !== volume) this.heard.gain.push({ at: performance.now(), value: volume })
    if (!volume && this.systemVoice) this.silence()
  }
  get canCalibrate() { return !!this.face?.face || !!this.input?.canCalibrate }
  calibrate() {
    if (this.face?.face) this.face.calibrate()
    else if (!this.input?.calibrate()) return
    this.calibratedAt = Date.now(); changed()
  }

  follow(pose: PlaybackPose) {
    const now = performance.now(), dt = Math.min(0.05, (now - this.followedAt) / 1000)
    this.followedAt = now
    this.lastPose = pose
    if (this.status === 'ready') this.player.renderPose(pose, dt)
  }
  private followedAt = performance.now()

  async sync(item: CharacterItem) {
    const gazeChanged = item.gaze !== this.item.gaze
    const mutedChanged = item.muted !== this.item.muted
    const oldProfile = this.item.tuning.tracking, oldStrength = this.item.tuning.expressionStrength
    this.item = item
    setPixelated(this.player, item.tuning.pixelated)
    if (!isOutput && !item.remote) Object.assign(this.player.view, item.tuning.view)
    if (!isOutput && !item.remote && oldProfile !== item.tuning.tracking) this.player.parameterProfile = item.tuning.tracking
    if (oldStrength !== item.tuning.expressionStrength) this.player.setExpression(this.expressionId, item.tuning.expressionStrength)
    this.speechOptions.motion = item.talk
    this.speechOptions.bounce = item.tuning.bounce
    this.player.idle = !isOutput && !item.remote && (item.driver === 'pointer' || item.tuning.idle)
    if (this.mic) this.mic.gain = item.micGain
    this.syncVolume()
    if (mutedChanged && item.muted && item.voice.source === 'system') this.silence()
    if (gazeChanged) this.rest()
    const key = JSON.stringify(item.model)
    if (key !== this.model) { this.model = key; await this.load(item.model) }
    if (!this.disposed && !isOutput && !this.item.remote) await this.drive()
  }

  private async load(ref: ModelRef) {
    const run = ++this.loadRun
    this.status = 'loading'; changed()
    try {
      const source = await sourceOf(ref)
      if (this.disposed || run !== this.loadRun) return
      await this.player.load(source)
      if (this.disposed || run !== this.loadRun) return
      this.source = source
      this.status = 'ready'; this.error = ''
      if (isOutput || this.item.remote) this.player.renderPose(this.lastPose)
      else this.rest()
    } catch (e) {
      if ((e as Error).name === 'AbortError' || this.disposed) return
      this.status = 'error'; this.error = refused(e)
    }
    changed()
  }

  private async drive() {
    const kind = this.item.driver, device = kind === 'face' ? inputs().camera : kind === 'mic' ? inputs().microphone : ''
    const key = JSON.stringify([kind, device, kind === 'face' || kind === 'replay' ? [this.item.smooth, this.item.tuning.faceFollow, this.item.tuning.faceFps] : 0])
    if (key === this.driverKey) return
    this.driverKey = key
    const run = ++this.driverRun
    this.stopDriver?.(); this.stopDriver = null; this.face = null; this.input = null; this.mic = null
    this.micStream?.getTracks().forEach((t) => t.stop()); this.micStream = null
    this.inputPhase = kind === 'face' || kind === 'replay' || kind === 'mic' || kind === 'gamepad' || kind === 'network' ? 'opening' : 'idle'
    this.error = ''; changed()
    try {
      if (kind === 'face' || kind === 'replay') {
        const t = await startFaceTracking(this.player, { ...FACE_MODEL, deviceId: device || undefined,
          trace: kind === 'replay' ? 'synth' : undefined, remember: 'stage:' + this.item.id + ':' + device, smoothing: this.item.smooth, profile: {}, follow: this.item.tuning.faceFollow, maxFps: this.item.tuning.faceFps })
        if (run !== this.driverRun || this.disposed) { t.stop(); return }
        this.face = t; this.stopDriver = () => t.stop()
        this.inputPhase = 'on'
        void refreshDevices()
      } else if (kind === 'network') {
        const tracking = startInputTracking(this.player, networkSource(), { profile: {}, smoothing: () => this.item.smooth,
          status: (active, error) => {
            if (run !== this.driverRun || this.disposed) return
            this.inputPhase = error ? 'error' : active ? 'on' : 'opening'; this.error = error?.message ?? ''; changed()
          } })
        this.input = tracking; this.stopDriver = () => tracking.stop()
      } else if (kind === 'gamepad') {
        const source = gamepadSource(() => this.item.tuning.gamepad, (effect) => {
          if (effect.do === 'act') this.player.act(effect.id)
          else this.pulseExpression(effect.id, effect.seconds)
        })
        const tracking = startInputTracking(this.player, source.poll, { calibrate: source.calibrate, profile: {}, smoothing: () => this.item.smooth,
          status: (active, error) => {
            if (run !== this.driverRun || this.disposed) return
            this.inputPhase = error ? 'error' : active ? 'on' : 'opening'; this.error = error?.message ?? ''; changed()
          } })
        this.input = tracking; this.stopDriver = () => { tracking.stop(); source.stop() }
      } else if (kind === 'mic') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints() })
        if (run !== this.driverRun || this.disposed) { stream.getTracks().forEach((t) => t.stop()); return }
        this.micStream = stream
        const m = await startLipSync(this.player, stream, { motion: 0 })
        if (run !== this.driverRun || this.disposed) { m.stop(); stream.getTracks().forEach((t) => t.stop()); return }
        this.mic = m; m.gain = this.item.micGain
        this.stopDriver = () => m.stop(); this.inputPhase = 'on'
        void refreshDevices()
      }
    } catch (e) {
      if (run !== this.driverRun || this.disposed) return
      this.inputPhase = 'error'
      this.error = deviceError(kind === 'mic' ? tr("麦克风") : tr("摄像头"), e as Error)
      this.micStream?.getTracks().forEach((t) => t.stop()); this.micStream = null
    }
    changed()
  }

  retryInput() { this.driverKey = ''; void this.drive() }

  async prepare(text: string, emotion: Emotion, aloud = true, signal?: AbortSignal, recorded?: string): Promise<Take> {
    const v = this.item.voice, route = aloud ? voiceRoute(this.item) : 'none'
    this.voiceError = ''
    if (recorded) {
      const r = await fetch(recorded, { signal })
      if (!r.ok) throw new Error(tr("演示声音读取失败（") + r.status + '）')
      const blob = await r.blob()
      return { text, seconds: await length(blob), clip: { blob, seconds: await length(blob), expression: null }, aloud: true }
    }
    if (route === 'livliv' || route === 'api') {
      try {
        const clip = route === 'livliv' ? await voiceLine(modelId(this.item)!, text, emotion, v.livliv, signal) : await this.fromApi(text, emotion, signal)
        if (clip.seconds <= 0) throw new Error(tr("声音文件无法播放"))
        this.voiceError = ''; changed()
        return { text, seconds: clip.seconds, clip, aloud }
      } catch (e) {
        if (signal?.aborted) throw e
        this.voiceError = (e as Error).message; changed()
      }
    }
    return { text, seconds: estimate(text, route === 'system' ? v.rate : 1), clip: null, aloud: route === 'system', mute: aloud && route !== 'system' }
  }

  private async fromApi(text: string, emotion: Emotion, signal?: AbortSignal): Promise<Clip> {
    const s = activeSpeech(), v = this.item.voice, voice = apiVoice(this.item, s, characters(store.get()))
    if (!speechProviderOf(s).live) {
      const blob = await speakApi(s, text, voice, emotion, v.rate, signal)
      return { blob, seconds: await length(blob), expression: null }
    }
    const live = await speakLive(s, text, voice, emotion, v.rate, signal), chars = [...text].length
    const clip: Clip = { blob: new Blob(), seconds: this.pace ? chars / this.pace : estimate(text, v.rate), expression: null, live }
    void live.whole.then((blob) => { clip.blob = blob; const seconds = live.seconds(); if (seconds) { clip.seconds = seconds; if (!signal?.aborted) this.pace = chars / seconds } }, (e) => { if (!signal?.aborted && !this.disposed) { this.voiceError = (e as Error).message; changed() } })
    return clip
  }

  async speak(text: string, emotion: Emotion, move: Move, aloud = true) { await this.perform(await this.prepare(text, emotion, aloud), emotion, move) }

  async perform(take: Take, emotion: Emotion, move: Move, signal?: AbortSignal) {
    // Removing an actor cancels any speech that was still being prepared for it.
    if (this.disposed) return
    signal?.throwIfAborted()
    clearTimeout(this.calm)
    this.listening = false
    const picked = take.clip?.expression
    this.setExpression(picked && this.player.expressions.some((x) => x.id === picked) ? picked : this.expressionFor(emotion))
    const expressionRevision = this.expressionRevision
    if (move !== 'none') this.player.act(move)
    this.systemVoice = !take.clip && take.aloud
    const u = take.clip ? this.play(take.clip) : take.aloud && this.volume > 0 ? say(take.text, this.item.voice, this.volume) : quiet(take.text, take.mute)
    this.utter = u; changed()
    const cancel = () => { if (this.utter === u) this.silence() }
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) cancel()
    try { await u.done } finally {
      signal?.removeEventListener('abort', cancel)
      if (this.utter === u) { this.utter = null; this.systemVoice = false }
      changed()
      this.calm = window.setTimeout(() => { if (!this.disposed && this.expressionRevision === expressionRevision) this.setExpression(null) }, 1200)
    }
  }

  private play(clip: Clip): Utterance {
    const heard: Heard = { who: this.item.id, blob: clip.blob, start: 0, stop: null, gain: [] }
    this.heard = heard
    if (clip.live) { heard.ready = clip.live.whole.then((b) => { heard.blob = b }); void heard.ready.catch(() => {}) }
    let resolve!: () => void
    const done = new Promise<void>((r) => { resolve = r })
    const over = () => { if (this.heard === heard) this.heard = null; resolve() }
    this.voice.volume = this.volume
    this.voice.say(clip.live ? clip.live.open() : clip.blob, {
      onStart: () => { heard.start = performance.now(); heard.gain.push({ at: heard.start, value: this.volume }); heardTaps.forEach((f) => f(heard)) },
      onEnd: over,
      onFail: () => { if (heard.stop === null) { this.voiceError = tr("声音播放失败，请检查声音设置"); changed() } over() },
    })
    return { level: () => this.voice.level, vowel: () => this.voice.vowel, done,
      stop: () => { heard.stop = performance.now(); this.voice.stop() } }
  }

  silence() { this.utter?.stop(); this.utter = null; this.systemVoice = false }
  private expressionFor(e: Emotion) {
    if (e === 'neutral') return null
    const std = e === 'happy' ? 'smile' : e
    return this.player.expressions.find((x) => x.id === std)?.id ?? this.player.expressions.find((x) => FEELING[e].some((w) => [x.label, ...Object.values(x.labels ?? {})].some((label) => label.toLowerCase().includes(w))))?.id ?? null
  }
  look(at: Look | null | 'free', delay = 0) {
    this.next = { at: performance.now() + delay * 1000, look: at && at !== 'free' ? {
      x: Math.max(-1, Math.min(1, (at.x - this.item.x) / this.item.w * 2 - 1)),
      y: Math.max(-1, Math.min(1, 1 - (at.y - this.item.y) / this.item.h * 2)),
    } : at }
  }
  private applyLook() {
    if (this.aim === 'free') this.player.lookAt(null)
    else this.player.lookAt(this.aim ? this.aim.x * (this.item.mirror ? -1 : 1) : 0, this.aim?.y ?? 0.5)
  }
  rest(delay = 0) { this.listening = false; this.look(this.item.gaze === 'free' ? 'free' : null, delay) }
  dispose() {
    this.disposed = true; this.driverRun++
    clearTimeout(this.calm); clearTimeout(this.expressionExpiry); this.silence(); this.offInputs(); this.offQuality(); this.offMixer(); this.stopDriver?.()
    this.micStream?.getTracks().forEach((t) => t.stop())
    this.voice.dispose(); this.player.dispose({ release: true })
    if (actors.get(this.item.id) === this) actors.delete(this.item.id)
    changed()
  }
}
export const faceOf = (c: CharacterItem) => ({ x: c.x + c.w / 2, y: c.y + c.h * 0.28 })
function quiet(text: string, mouth = false): Utterance {
  let stop = () => {}
  const t0 = performance.now(), done = new Promise<void>((r) => { const timer = setTimeout(r, estimate(text) * 1000); stop = () => { clearTimeout(timer); r() } })
  return { level: mouth ? () => Math.max(0.08, 0.55 * Math.sin(Math.PI * ((performance.now() - t0) / 220 % 1))) : () => 0, vowel: () => 0, done, stop: () => stop() }
}
