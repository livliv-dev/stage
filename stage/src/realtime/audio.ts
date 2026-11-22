// The page's audio for a realtime call over a WebSocket (socket.ts): the microphone as 16 kHz PCM16 chunks, and a
// player for the 24 kHz PCM16 the service sends back, playing into a stream the stage takes like a WebRTC call's track.

/** the microphone as 16 kHz mono PCM16, about every 128 ms */
export function captureMicrophone(stream: MediaStream, chunk: (pcm: Int16Array) => void) {
  const context = new AudioContext({ sampleRate: 16000 }), source = context.createMediaStreamSource(stream)
  // A script processor keeps this in the page (no worklet module to load); its output stays silent.
  const node = context.createScriptProcessor(2048, 1, 1)
  node.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0), pcm = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff
    chunk(pcm)
  }
  source.connect(node); node.connect(context.destination)
  void context.resume().catch(() => {})
  return { close() { node.onaudioprocess = null; node.disconnect(); source.disconnect(); void context.close().catch(() => {}) } }
}

/** a player for 24 kHz mono PCM16, gapless, into a stream; flush drops what is still to play */
export function pcmPlayer() {
  const context = new AudioContext({ sampleRate: 24000 }), output = context.createMediaStreamDestination()
  const playing = new Set<AudioBufferSourceNode>()
  let at = 0
  void context.resume().catch(() => {})
  const flush = () => {
    for (const source of playing) { source.onended = null; try { source.stop() } catch { /* not started */ } }
    playing.clear(); at = 0
  }
  return {
    stream: output.stream,
    play(pcm: Int16Array) {
      if (!pcm.length) return
      const buffer = context.createBuffer(1, pcm.length, 24000), samples = buffer.getChannelData(0)
      for (let i = 0; i < pcm.length; i++) samples[i] = pcm[i] / 0x8000
      const source = context.createBufferSource()
      source.buffer = buffer; source.connect(output)
      at = Math.max(at, context.currentTime + 0.04)
      source.start(at); at += buffer.duration
      playing.add(source); source.onended = () => { playing.delete(source) }
    },
    flush,
    close() { flush(); output.stream.getTracks().forEach((track) => track.stop()); void context.close().catch(() => {}) },
  }
}
