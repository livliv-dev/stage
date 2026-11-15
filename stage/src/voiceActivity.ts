type Boundary = 'candidate' | 'speech' | 'noise' | 'end'

/** A local energy gate: start recording on onset, but only yield the AI after sustained input. */
export class VoiceActivity {
  private previous: number | null = null
  private noise = .002
  private candidate = false
  private confirmed = false
  private voiced = 0
  private lastVoice = 0
  private firstVoice = 0
  get seconds() { return (this.lastVoice - this.firstVoice) / 1000 }
  reset() { this.previous = null; this.candidate = false; this.confirmed = false; this.voiced = 0 }

  sample(rms: number, now: number): { type: Boundary; seconds: number } | null {
    const elapsed = this.previous === null ? 0 : Math.min(100, Math.max(0, now - this.previous))
    this.previous = now
    const voice = rms >= Math.max(.012, this.noise * 3)
    if (!this.candidate) {
      if (!voice) { this.noise += (Math.min(rms, .02) - this.noise) * (1 - Math.exp(-elapsed / 2000)); return null }
      this.candidate = true; this.voiced = elapsed; this.lastVoice = now; this.firstVoice = now
      return { type: 'candidate', seconds: 0 }
    }
    if (voice) {
      this.voiced += elapsed; this.lastVoice = now
      if (!this.confirmed && this.voiced >= 160) { this.confirmed = true; return { type: 'speech', seconds: this.voiced / 1000 } }
    }
    const seconds = this.voiced / 1000
    if (!this.confirmed && now - this.lastVoice >= 180) {
      this.candidate = false; return { type: 'noise', seconds }
    }
    if (this.confirmed && now - this.lastVoice >= 800) {
      this.candidate = false; this.confirmed = false; return { type: 'end', seconds }
    }
    return null
  }
}

/** Brief acknowledgements during the character's reply remain in history without requesting another reply. */
export function isBackchannel(text: string, seconds: number, duringReply: boolean) {
  return duringReply && seconds <= .6 && /^(嗯+|哦+|啊+|好的?|对的?|是的?|ok|okay|uh[- ]?huh|m+h+m*|yeah|yep|はい|うん)[。！!.,，\s]*$/i.test(text.trim())
}
