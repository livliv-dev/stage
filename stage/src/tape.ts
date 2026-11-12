import { tr } from './i18n'
// A take being recorded: what the stage showed, taken down as data while it plays, to be drawn again frame by frame
// afterwards at the stage's own size (render.ts), the way the site's 录制 makes its videos:
//  - each character's pose every frame it drew (its params, its move, its expressions as they eased)
//  - the scene each time it changed (moved, restyled, a character added), the conversation each time it changed (the
//    subtitles are worked out from it, as the stage does)
//  - the sound: each LivLiv clip with when it was heard and where it was cut off, and the microphone when asked for.
//    The system's own voice gives no sound to take down: those lines are in the video without it
import { actors, onFrame, onHeard, type Actor, type Heard } from './actors'
import { conversation, onConv } from './conversation'
import { store, type Scene } from './scene'
import type { Line } from './brain'
import type { Params, View } from '@livliv-dev/player'
import { routeMicrophone } from './microphone'
import { deviceError, inputs, microphoneConstraints, onInputs } from './devices'
import { onRemoteSounds, remoteSounds } from './collab/streams'

/** a pose at `t` seconds into the take: the params in the track's key order, the move (x, y, s; a full-body
 *  character's crouch and dip after them: its feet stay on the ground), the expressions */
export type Pose = { t: number; params: Float32Array; move: [number, number, number] | [number, number, number, number, number]; expr: Record<string, number>; view: View }
export type Track = { source: string | Map<string, Blob> | null; keys: (keyof Params)[]; view: View; poses: Pose[] }
export type Conv = { t: number; lines: Line[]; speaking: Line | null }

/** a wait left out of the video (performance.now()): between two lines of a running conversation (a character
 *  thinking, its voice being made, your line awaited, the pause between lines) */
export type Cut = { from: number; to: number }
/** what is left of a wait: the head turns to whoever speaks next over this long (ms). With the silence inside the
 *  voices' own clips it makes about a second between lines */
const BLEND = 350

export type Take = {
  /** performance.now() when it started; every time below is in seconds of the video */
  t0: number
  /** the waits left out; with the microphone on, none: what you say goes on in them */
  cuts: Cut[]
  seconds: number
  tracks: Map<string, Track>
  scenes: { t: number; scene: Scene }[]
  convs: Conv[]
  clips: Heard[]
  mic: { blob: Blob; at: number } | null
  remote: { blob: Blob; at: number; gain: { at: number; value: number }[] }[]
}

/** where a moment falls in the video (s): its time since the start, less the waits left out so far */
export function onTape(take: Pick<Take, 't0' | 'cuts'>, ms: number) {
  let out = ms - take.t0
  for (const c of take.cuts) {
    if (ms >= c.to) out -= c.to - c.from
    else if (ms > c.from) { out -= ms - c.from; break }
  }
  return out / 1000
}

/** the longest take: about 45 MB of poses for three characters, an 8 Mbit/s video of some 600 MB */
export const MAX_SECONDS = 10 * 60

export type Recorder = { take: Take; readonly inputError: Error | null; stop(): Promise<Take>; cancel(): void }

/** starts taking down the stage (mic: the microphone too) */
export async function record(mic: boolean, inputStatus?: (error: Error | null) => void): Promise<Recorder> {
  // the microphone first: it may be refused, and then nothing has started
  let microphoneId = inputs().microphone, inputRun = 0, offInput = () => {}, inputError: Error | null = null
  const stream = mic ? await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints() }) : null
  let microphone: { context: AudioContext; route: ReturnType<typeof routeMicrophone>; raw: MediaStream | null; output: MediaStreamAudioDestinationNode } | null = null
  if (stream) {
    const context = new AudioContext()
    try {
      await context.resume()
      const route = routeMicrophone(context, stream), output = context.createMediaStreamDestination()
      route.node.connect(output); microphone = { context, route, output, raw: stream }
    } catch (error) { stream.getTracks().forEach((track) => track.stop()); void context.close(); throw error }
  }
  const closeMicrophone = () => {
    inputRun++; offInput()
    if (microphone) {
      const value = microphone; microphone = null
      value.route.close(); value.raw?.getTracks().forEach((track) => track.stop())
      value.output.stream.getTracks().forEach((track) => track.stop()); void value.context.close()
    }
    stream?.getTracks().forEach((track) => track.stop())
  }
  const switchMicrophone = () => {
    const next = inputs().microphone
    if (!microphone || next === microphoneId) return
    microphoneId = next
    const run = ++inputRun
    microphone.route.input(null); microphone.raw?.getTracks().forEach((track) => track.stop()); microphone.raw = null
    void navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints() }).then((raw) => {
      if (!microphone || run !== inputRun) { raw.getTracks().forEach((track) => track.stop()); return }
      microphone.route.input(raw); microphone.raw = raw; inputError = null; inputStatus?.(null)
    }, (error: Error) => {
      if (!microphone || run !== inputRun) return
      inputError = new Error(deviceError(tr('麦克风'), error), { cause: error }); inputStatus?.(inputError)
    })
  }
  if (microphone) { offInput = onInputs(switchMicrophone); switchMicrophone() }

  const t0 = performance.now()
  const take: Take = { t0, cuts: [], seconds: 0, tracks: new Map(), scenes: [{ t: 0, scene: store.get() }], convs: [], clips: [], mic: null, remote: [] }
  const sec = () => onTape(take, performance.now())
  let waiting: Cut | null = null
  let liveAudio = remoteSounds().length > 0
  const endWait = () => { if (waiting) { waiting.to = Math.max(waiting.from, performance.now() - BLEND); waiting = null } }
  const conv = () => {
    const c = conversation()
    if (stream || liveAudio || !c.running || c.speaking || c.mode === 'live') endWait()
    else if (!waiting) { waiting = { from: performance.now(), to: Infinity }; take.cuts.push(waiting) }
    take.convs.push({ t: sec(), lines: c.lines, speaking: c.speaking })
  }
  conv()
  const pose = (a: Actor) => {
    if (waiting || a.status !== 'ready' || !a.source) return
    const p = a.lastPose
    let tr = take.tracks.get(a.item.id)
    if (!tr) take.tracks.set(a.item.id, tr = { source: a.source, keys: Object.keys(p.params) as (keyof Params)[], view: { ...p.view }, poses: [] })
    const P = p.params as unknown as Record<string, number>, params = new Float32Array(tr.keys.length)
    tr.keys.forEach((k, i) => { params[i] = P[k] })
    const expr: Record<string, number> = {}
    for (const [k, v] of Object.entries(p.expr)) if (v > 0.002) expr[k] = v
    const move: Pose['move'] = p.crouch !== undefined ? [p.move.x, p.move.y, p.move.s, p.crouch, p.dip ?? 0] : [p.move.x, p.move.y, p.move.s]
    tr.poses.push({ t: sec(), params, move, expr, view: { ...p.view } })
  }
  const offs = [
    onFrame(pose),
    store.subscribe(() => { const s = store.get(); if (s !== take.scenes.at(-1)!.scene) take.scenes.push({ t: sec(), scene: s }) }),
    onConv(conv),
    onHeard((h) => take.clips.push(h)),
  ]
  // Keep the original source for export even when a friend leaves and releases their session assets.
  for (const actor of actors.values()) if (actor.status === 'ready') pose(actor)
  let failure: Error | null = null
  type Capture = { stream: MediaStream; stop(): void; done: Promise<void> }
  const captures: Capture[] = [], active = new Map<string, Capture & { sound: Take['remote'][number] }>()
  function capture(source: MediaStream, sound: { blob: Blob; at: number }) {
    const recorder = new MediaRecorder(source), chunks: Blob[] = []
    let finish!: () => void
    const done = new Promise<void>((resolve) => { finish = resolve })
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
    recorder.onstart = () => { sound.at = sec() }
    recorder.onstop = () => { sound.blob = new Blob(chunks, { type: recorder.mimeType }); finish() }
    recorder.onerror = (event) => { failure = new Error(tr("联播声音录制失败"), { cause: event }); finish() }
    const value = { stream: source, stop: () => { if (recorder.state !== 'inactive') recorder.stop() }, done }
    // kept for stop() to wait on only once it has started: one that never started never ends
    recorder.start(1000); captures.push(value)
    return value
  }
  const updateSounds = () => {
    const sounds = remoteSounds()
    if (sounds.length) { liveAudio = true; conv() }
    for (const [id, value] of active) if (!sounds.some((sound) => sound.id === id && sound.stream === value.stream)) { value.stop(); active.delete(id) }
    for (const source of sounds) {
      let value = active.get(source.id)
      if (!value) {
        const sound = { blob: new Blob(), at: sec(), gain: [{ at: performance.now(), value: source.volume }] }
        take.remote.push(sound); value = { ...capture(source.stream, sound), sound }; active.set(source.id, value)
      } else if (value.sound.gain.at(-1)?.value !== source.volume) value.sound.gain.push({ at: performance.now(), value: source.volume })
    }
  }
  try {
    if (stream) { take.mic = { blob: new Blob(), at: 0 }; capture(microphone!.output.stream, take.mic) }
    updateSounds()
    offs.push(onRemoteSounds(() => { try { updateSounds() } catch (error) { failure = error as Error } }))
  } catch (error) { offs.forEach((off) => off()); captures.forEach((value) => value.stop()); closeMicrophone(); throw error }
  const end = () => { offs.forEach((off) => off()); endWait(); take.seconds = sec(); captures.forEach((value) => value.stop()); closeMicrophone() }
  return {
    take,
    get inputError() { return inputError },
    async stop() { end(); await Promise.all(captures.map((value) => value.done)); if (failure) throw failure; return take },
    cancel: end,
  }
}
