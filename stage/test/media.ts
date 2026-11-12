import { BlobSource, CanvasSink, Input, MP4 } from 'mediabunny'

export async function videoFrames(file: Blob) {
  const input = new Input({ source: new BlobSource(file), formats: [MP4] })
  const track = await input.getPrimaryVideoTrack()
  if (!track) { input.dispose(); throw new Error('Export has no video track') }
  const sink = new CanvasSink(track, { poolSize: 1 }), duration = await input.computeDuration()
  return {
    duration,
    async frame(at: number) {
      const frame = await sink.getCanvas(at)
      if (!frame) throw new Error('Export has no frame at ' + at)
      return frame.canvas
    },
    close: () => input.dispose(),
  }
}

export async function audioRms(file: Blob, times: number[]) {
  const context = new AudioContext()
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer()), pcm = buffer.getChannelData(0), rate = buffer.sampleRate
    return times.map((at) => {
      const first = Math.round(at * rate), end = Math.min(pcm.length, first + Math.round(rate * .1))
      if (end <= first) throw new Error('Export has no audio at ' + at)
      let squares = 0
      for (let n = first; n < end; n++) squares += pcm[n] * pcm[n]
      return Math.sqrt(squares / (end - first))
    })
  } finally { await context.close() }
}
