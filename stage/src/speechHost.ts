import type { Emotion } from './brain'
import { actors } from './actors'
import { beginExternalLine, endExternalLine } from './conversation'
import { speechTarget } from './control'
import { length } from './livliv'
import { SpeechBridge, type SpeechControl, type SpeechResult } from '../../desktop/src/speechBridge'

let bridge: SpeechBridge | null = null

/** The one playback owner shared by the local speech route and the AIRI host. */
export function stageSpeech() {
  bridge ??= new SpeechBridge({
    available: speechTarget,
    start(job, report) {
      const actor = actors.get(job.character)
      if (!actor || actor.status !== 'ready') {
        report('failed', 'This avatar is not loaded')
        return { cancel() {} }
      }
      const emotion = job.emotion as Emotion
      let caption: string | null = null
      let stopped = false
      const abort = new AbortController()
      const stopCaption = () => { if (caption) { endExternalLine(caption); caption = null } }
      void (async () => {
        try {
          if (job.audio?.byteLength) {
            const copy = new Uint8Array(job.audio)
            const blob = new Blob([copy], { type: job.mime || 'application/octet-stream' })
            const seconds = await length(blob)
            if (stopped || abort.signal.aborted) return
            if (seconds <= 0) throw new Error('Audio could not be decoded')
            caption = beginExternalLine(job.character, job.text, emotion)
            await actor.perform({ text: job.text, seconds, clip: { blob, seconds, expression: null }, aloud: true }, emotion, 'none', abort.signal, [], () => report('audible-start'))
          } else {
            const take = await actor.prepare(job.text, emotion, true, abort.signal)
            if (stopped || abort.signal.aborted) return
            caption = beginExternalLine(job.character, job.text, emotion)
            await actor.perform(take, emotion, 'none', abort.signal, [], () => report('audible-start'))
          }
          if (!stopped && !abort.signal.aborted) report('ended')
        } catch (error) {
          if (stopped || abort.signal.aborted) return
          report('failed', error instanceof Error ? error.message : 'Playback failed')
        } finally { stopCaption() }
      })()
      return { cancel() { stopped = true; abort.abort(); actor.silence(); stopCaption() } }
    },
  })
  return bridge
}

export function handleSpeech(call: SpeechControl): SpeechResult {
  const speech = stageSpeech()
  if (call.op === 'submit') return speech.submit(call.input)
  if (call.op === 'status') return speech.status(call.utteranceId)
  return speech.cancel(call.utteranceId)
}
