import { tr } from '../i18n'
import { startLipSync, type LipSync } from '@livliv-dev/player/voice'
import { routeMicrophone } from '../microphone'
import { microphoneConstraints } from '../devices'
import type { Actor } from '../actors'

/** One local mix for every peer: the shared character's voice plus an optional microphone, never remote audio. */
export class PublishAudio {
  readonly context = new AudioContext()
  readonly output = this.context.createMediaStreamDestination()
  readonly stream = this.output.stream
  private microphone: MediaStream | null = null
  private micNode: ReturnType<typeof routeMicrophone> | null = null
  private voiceNode: MediaStreamAudioSourceNode | null = null
  private actor: Actor | null = null
  private lip: LipSync | null = null
  private generation = 0
  private lipGeneration = 0
  private closed = false
  onError: (error: string) => void = () => {}
  connectActor(actor: Actor | null) {
    if (this.actor === actor) return
    this.actor = actor; this.voiceNode?.disconnect(); this.voiceNode = null
    if (actor) { actor.unlock(); const stream = actor.audio; if (stream) { this.voiceNode = this.context.createMediaStreamSource(stream); this.voiceNode.connect(this.output) } }
    void this.connectLip()
  }
  private async connectLip() {
    const run = ++this.lipGeneration
    this.lip?.stop(); this.lip = null
    const actor = this.actor, stream = this.microphone
    if (!actor || !stream || this.closed) return
    try { const lip = await startLipSync(actor.player, stream, { motion: 0 }); if (run !== this.lipGeneration || this.closed) lip.stop(); else this.lip = lip }
    catch (error) { if (run === this.lipGeneration && !this.closed) this.onError((error as Error).message) }
  }
  async microphoneOn(on: boolean) {
    const run = ++this.generation
    if (!on) { this.stopMic(); return }
    this.stopMic()
    try {
      if (this.context.state === 'suspended') await this.context.resume()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneConstraints() })
      if (run !== this.generation || this.closed) { stream.getTracks().forEach((track) => track.stop()); return }
      this.stopMic(); this.microphone = stream
      this.micNode = routeMicrophone(this.context, stream); this.micNode.node.connect(this.output)
      await this.connectLip(); this.onError('')
    } catch (error) { if (run === this.generation && !this.closed) this.onError(tr("麦克风未连接：") + (error as Error).message) }
  }
  private stopMic() { this.lipGeneration++; this.lip?.stop(); this.lip = null; this.micNode?.close(); this.micNode = null; this.microphone?.getTracks().forEach((track) => track.stop()); this.microphone = null }
  close() { this.closed = true; this.generation++; this.stopMic(); this.voiceNode?.disconnect(); this.stream.getTracks().forEach((track) => track.stop()); void this.context.close() }
}
