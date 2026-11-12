/** Speech recognition accepts 16 kHz mono PCM, independent of the microphone's native sample rate. */
export async function wav16k(pcm: Float32Array, rate: number): Promise<Blob> {
  const source = new AudioBuffer({ numberOfChannels: 1, length: Math.max(1, pcm.length), sampleRate: rate })
  source.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0)
  const context = new OfflineAudioContext(1, Math.max(1, Math.ceil(source.duration * 16000)), 16000)
  const node = context.createBufferSource()
  node.buffer = source; node.connect(context.destination); node.start()
  const samples = (await context.startRendering()).getChannelData(0)
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer)
  const tag = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  tag(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); tag(8, 'WAVEfmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  tag(36, 'data'); view.setUint32(40, samples.length * 2, true)
  samples.forEach((x, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 32767, true))
  return new Blob([buffer], { type: 'audio/wav' })
}
