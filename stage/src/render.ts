import { tr } from './i18n'
// A recorded take (tape.ts) made into a video, in the browser, nothing uploaded, the way the site's 录制 makes its:
// every frame drawn again at the stage's own size, a fixed 1/30 s apart, so the video is sharp and steady whatever
// the editor's zoom or frame rate was while it played.
//  - each character gets a player of its own, at its size on the stage, with nothing driving it: each frame it takes
//    the pose taken down then (between two poses, part of the way), its hair and body swaying from there; the mark
//    its package carries is drawn on it as on the stage (a recording never takes a mark off). Each of those players
//    takes a WebGL context: when they don't fit beside the stage's, the stage lends its own meanwhile (contexts.ts)
//  - the background, text, pictures and subtitles are drawn as the stage draws them (paint.ts)
//  - the sound: each LivLiv clip where it was heard (cut where it was cut), the microphone, mixed into one track
//  - H.264 + AAC in an MP4 through WebCodecs and Mediabunny (Opus where AAC can't be encoded), written to the page's
//    private files (OPFS) as it is made, so a long take never sits in memory whole
import type { PlaybackPose } from '@livliv-dev/player'
import { formatOf, makePlayer, setPixelated, sourceOf, type StagePlayer } from './bodies'
import { lend, released, ROOM, settled } from './contexts'
import { actors, onActors } from './actors'
import { type CharacterItem, type Scene } from './scene'
import { imageGeometry } from './attachments'
import type { AnchorName } from '@livliv-dev/player'
import { GREEN, paintAiLabel, paintBackground, paintCharacter, paintImage, paintMark, paintSubtitle, paintText, pictures, showsAI, spans, subtitleAt } from './paint'
import { onTape, type Take, type Track } from './tape'

export const FPS = 30
const RATE = 48000

/** whether this browser can make the video, and in what */
export async function videoCodecs(w: number, h: number) {
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined') return null
  const { canEncodeVideo, canEncodeAudio } = await import('mediabunny')
  if (!(await canEncodeVideo('avc', { width: w, height: h, bitrate: bitrate(w, h) }))) return null
  if (await canEncodeAudio('aac', { numberOfChannels: 1, sampleRate: RATE, bitrate: 128e3 })) return { audio: 'aac' as const }
  if (await canEncodeAudio('opus', { numberOfChannels: 1, sampleRate: RATE, bitrate: 128e3 })) return { audio: 'opus' as const }
  return null
}
/** 8 Mbit/s for 1080p, by the frame's area, at least 4 */
const bitrate = (w: number, h: number) => Math.max(4e6, Math.round((8e6 * w * h) / (1920 * 1080)))

/** a new file among the page's private ones (OPFS; the last video is replaced), or null where there are none */
async function privateFile(name: string) {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('videos', { create: true })
    for await (const k of (dir as unknown as { keys(): AsyncIterable<string> }).keys()) await dir.removeEntry(k).catch(() => {})
    const fh = await dir.getFileHandle(name, { create: true })
    if (typeof fh.createWritable !== 'function') return null
    return { writable: await fh.createWritable(), file: () => fh.getFile() }
  } catch { return null }
}

/** the take's sound, mono at RATE: the clips where they were heard, the microphone from where it started. One that
 *  can't be had (a voice that failed while coming in, a file that doesn't decode) is left out: `missing` counts them */
async function sound(take: Take, n: number): Promise<{ pcm: Float32Array; missing: number }> {
  const ctx = new OfflineAudioContext(1, Math.max(1, n), RATE)
  let missing = 0
  const place = async (blob: Blob, at: number, until: number | null, gains: { at: number; value: number }[] = []) => {
    try {
      if (!blob.size) throw new Error('no sound came in')
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
      const s = ctx.createBufferSource()
      const gain = ctx.createGain()
      s.buffer = buf; s.connect(gain); gain.connect(ctx.destination)
      for (const point of gains) gain.gain.setValueAtTime(point.value, Math.max(0, onTape(take, point.at)))
      s.start(Math.max(0, at), Math.max(0, -at))
      if (until !== null) s.stop(Math.max(0, until))
    } catch (e) { missing++; console.warn('A sound left out of the video', e) }
  }
  await Promise.allSettled(take.clips.map((c) => c.ready))  // a line still coming in when the take ended
  const sec = (ms: number) => onTape(take, ms)
  await Promise.all([
    ...take.clips.map((c) => place(c.blob, sec(c.start), c.stop === null ? null : sec(c.stop), c.gain)),
    ...take.remote.filter((clip) => clip.blob.size).map((clip) => place(clip.blob, clip.at, null, clip.gain)),
    ...(take.mic ? [place(take.mic.blob, take.mic.at, null)] : []),
  ])
  return { pcm: (await ctx.startRendering()).getChannelData(0), missing }
}

/** what was in force at `t`: the last entry at or before it (entries in time order; i: where the last search ended) */
function at<T extends { t: number }>(list: T[], t: number, i: { n: number }): T {
  while (i.n + 1 < list.length && list[i.n + 1].t <= t) i.n++
  return list[i.n]
}

/** a character's player for the video, its pose set from its track each frame */
class Double {
  readonly canvas = document.createElement('canvas')
  private player!: StagePlayer
  private webgl = false
  private pose!: PlaybackPose
  private i = { n: 0 }
  readonly track: Track
  constructor(track: Track) {
    this.track = track
  }
  async load(it: CharacterItem) {
    const ref = it.model, format = formatOf(ref)
    this.player = makePlayer(this.canvas, format, { autoplay: false })
    this.webgl = format !== 'png'
    // the mark a LivLiv package carries; the other kinds have none
    await this.player.load(this.track.source ?? await sourceOf(ref))
    this.pose = this.player.getPose()
  }
  /** the pose at `t` (s), drawn at w × h; false before its first pose */
  draw(t: number, dt: number, w: number, h: number, pixelated = false) {
    setPixelated(this.player, pixelated)
    const ps = this.track.poses, p = this.pose
    if (!ps.length) return false
    t = Math.max(t, ps[0].t)  // the first frames, before the first pose was taken: else the video opens on an empty stage
    while (this.i.n + 1 < ps.length && ps[this.i.n + 1].t <= t) this.i.n++
    const a = ps[this.i.n], b = ps[this.i.n + 1] ?? a, k = b.t > a.t ? Math.min(1, (t - a.t) / (b.t - a.t)) : 0
    const P = p.params as unknown as Record<string, number>
    this.track.keys.forEach((key, j) => { P[key] = a.params[j] + (b.params[j] - a.params[j]) * k })
    p.move = { x: a.move[0] + (b.move[0] - a.move[0]) * k, y: a.move[1] + (b.move[1] - a.move[1]) * k, s: a.move[2] + (b.move[2] - a.move[2]) * k }
    // a full-body character's crouch and dip (its feet on the ground); a half-body one has none
    if (a.move.length > 3) {
      const ac = a.move[3] ?? 0, ad = a.move[4] ?? 0
      p.crouch = ac + ((b.move[3] ?? 0) - ac) * k; p.dip = ad + ((b.move[4] ?? 0) - ad) * k
    } else { delete p.crouch; delete p.dip }
    p.expr = { ...(k < 0.5 ? a : b).expr }
    const av = a.view ?? this.track.view, bv = b.view ?? this.track.view
    p.view = { x: av.x + (bv.x - av.x) * k, y: av.y + (bv.y - av.y) * k, zoom: av.zoom + (bv.zoom - av.zoom) * k, head: (k < .5 ? av : bv).head, fit: (k < .5 ? av : bv).fit }
    this.player.renderPose(p, dt, [Math.round(w), Math.round(h)])
    return true
  }
  getAnchor(name: AnchorName) { return this.player.getAnchor(name) }
  /** a character on the stage that lost its context to this one can have it back (contexts.ts) */
  dispose() {
    if (!this.player) return
    const live = this.webgl && !this.player.contextLost
    this.player.dispose({ release: true })
    if (live) released()
  }
}

/** the stage's characters give their WebGL contexts up while the video's `need` more are used, when both wouldn't fit
 *  in the page's (contexts.ts): resolves once they are gone, with how to give them back (null: nothing lent) */
async function makeRoom(need: number): Promise<(() => Promise<void>) | null> {
  const held = () => [...actors.values()].filter((a) => a.format !== 'png' && !a.player.contextLost).length
  const now = held()
  if (!need || !now || now + need <= ROOM) return null
  lend(true)
  // each character gives its own up as the stage draws it again (CharacterView)
  await new Promise<void>((resolve) => {
    const done = () => { off(); clearTimeout(timer); resolve() }
    const off = onActors(() => { if (!held()) done() }), timer = setTimeout(done, 5000)
    if (!held()) done()
  })
  await settled()
  return async () => { await settled(); lend(false) }
}

/** missing: the sounds and pictures that couldn't go in */
export type Made = { file: File; seconds: number; missing: { sounds: number; pictures: number } }

/** mark: draw the LivLiv mark on every frame (the free plan on livliv.ai/stage) */
export async function renderTake(take: Take, name: string, onProgress: (share: number) => void, signal: AbortSignal, opts: { mark?: boolean } = {}): Promise<Made> {
  const first = take.scenes[0].scene, W = first.width, H = first.height
  const codecs = await videoCodecs(W, H)
  if (!codecs) throw new Error(tr("这个浏览器做不了视频（要能用 WebCodecs 编 H.264）"))
  await document.fonts.ready
  const { images: pics, missing: pictureMissing } = await pictures(take.scenes.map((s) => s.scene))
  // a player for each character on the tape that shows at some point (each takes one of the browser's few WebGL
  // contexts), loaded as the scene had it when it first appeared
  const cast: { id: string; track: Track; it: CharacterItem }[] = []
  for (const [id, track] of take.tracks) {
    const seen = take.scenes.map((s) => s.scene.items.find((i) => i.id === id)).filter((i): i is CharacterItem => i?.kind === 'character')
    const it = seen[0]
    if (it && seen.some((i) => !i.hidden) && track.poses.length) cast.push({ id, track, it })
  }
  const giveBack = await makeRoom(cast.filter((c) => formatOf(c.it.model) !== 'png').length)
  const doubles = new Map<string, Double>()
  try {
    for (const { id, track, it } of cast) {
      const d = new Double(track)
      doubles.set(id, d)
      await d.load(it)
    }
    if (signal.aborted) throw new DOMException(tr("已取消"), 'AbortError')
    const frames = Math.max(1, Math.round(take.seconds * FPS)), dt = 1 / FPS, n = Math.ceil(frames / FPS * RATE)
    const { pcm, missing: soundMissing } = await sound(take, n)

    const mb = await import('mediabunny')
    const pf = await privateFile(`${name}.mp4`)
    const mem = pf ? null : new mb.BufferTarget()
    const target = pf ? new mb.StreamTarget(pf.writable as unknown as WritableStream<import('mediabunny').StreamTargetChunk>, { chunked: true, chunkSize: 4 << 20 }) : mem!
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: pf ? false : 'in-memory' }), target })
    output.setMetadataTags({ title: name, comment: tr("AI 生成：LivLiv Stage（livliv.ai）") })  // the implicit AIGC label, as the site's videos
    const out = document.createElement('canvas')
    out.width = W; out.height = H
    const g = out.getContext('2d')!
    const video = new mb.CanvasSource(out, { codec: 'avc', bitrate: bitrate(W, H), keyFrameInterval: 2 })
    output.addVideoTrack(video, { frameRate: FPS })
    const audio = new mb.AudioBufferSource({ codec: codecs.audio, bitrate: 128e3 })
    output.addAudioTrack(audio)
    await output.start()
    try {
      const sp = spans(take.convs), si = { n: 0 }, ci = { n: 0 }
      // a second at the first pose first: hair and body settle where the take starts
      for (const d of doubles.values()) for (let i = 0; i < FPS; i++) d.draw(d.track.poses[0].t, dt, 8, 8)
      let sent = 0
      for (let i = 0; i < frames; i++) {
        if (signal.aborted) throw new DOMException(tr("已取消"), 'AbortError')
        const t = i * dt, scene: Scene = at(take.scenes, t, si).scene, conv = at(take.convs, t, ci)
        g.clearRect(0, 0, W, H)
        g.fillStyle = scene.background === 'transparent' ? GREEN : '#000'; g.fillRect(0, 0, W, H)
        const scale = Math.min(W / scene.width, H / scene.height)
        g.save(); g.translate((W - scene.width * scale) / 2, (H - scene.height * scale) / 2); g.scale(scale, scale)
        paintBackground(g, scene.background, scene.width, scene.height, pics)
        const drawn = new Set<string>()
        // All anchors must be current before compositing, including props behind their avatar.
        for (const it of scene.items) if (it.kind === 'character' && doubles.get(it.id)?.draw(t, dt, it.w, it.h, it.tuning.pixelated)) drawn.add(it.id)
        for (const it of scene.items) {
          if (it.kind === 'character') {
            if (drawn.has(it.id) && !it.hidden) paintCharacter(g, it, doubles.get(it.id)!.canvas)
            continue
          }
          if (it.hidden) continue
          if (it.kind === 'text') paintText(g, it)
          else if (it.kind === 'image') paintImage(g, it, pics, imageGeometry(it, scene, (id) => drawn.has(id) ? doubles.get(id) : undefined))
          else { const s = subtitleAt(it, scene, conv, sp, t); if (s) paintSubtitle(g, it, s, t) }
        }
        g.restore()
        if (showsAI(scene)) paintAiLabel(g, W, H)
        if (opts.mark) paintMark(g, W, H)
        await video.add(t, dt)
        // the sound alongside, a second at a time
        const upTo = Math.min(n, Math.round(((i + 1) / FPS + 1) * RATE))
        while (sent < upTo) {
          const len = Math.min(RATE, upTo - sent), b = new AudioBuffer({ length: len, numberOfChannels: 1, sampleRate: RATE })
          b.copyToChannel(pcm.slice(sent, sent + len), 0)
          await audio.add(b)
          sent += len
        }
        if (i % 15 === 0) { onProgress(i / frames); await new Promise((r) => setTimeout(r)) }  // let the page paint
      }
      video.close(); audio.close()
      await output.finalize()
      onProgress(1)
      const file = pf ? await pf.file() : new File([mem!.buffer!], `${name}.mp4`, { type: 'video/mp4' })
      return { file: new File([file], `${name}.mp4`, { type: 'video/mp4' }), seconds: frames / FPS, missing: { sounds: soundMissing, pictures: pictureMissing } }
    } catch (e) {
      await output.cancel().catch(() => {})
      throw e
    }
  } finally {
    doubles.forEach((d) => d.dispose())
    await giveBack?.()
  }
}
