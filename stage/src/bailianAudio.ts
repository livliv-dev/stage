// Bailian's speech answer, asked for as a stream (X-DashScope-SSE: enable): server-sent events whose output.audio.data
// carries the line in base64 pieces, the first of them a WAV header of unknown length. Its last event also links the
// whole file on Bailian's storage, at an http address that a page served over https may not fetch (livliv.ai/stage's
// Content-Security-Policy lets it call the API's own host only), so the audio is taken from the events and that link is
// never read, in the desktop app too.

/** the audio pieces in Bailian's events, in order; an event that carries an error code throws what it says */
export function bailianAudio(events: string): Uint8Array[] {
  const parts: Uint8Array[] = []
  for (const event of events.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).join('\n').trim()
    if (!data) continue
    let j: { code?: string; message?: string; output?: { audio?: { data?: unknown } } }
    try { j = JSON.parse(data) } catch { continue }
    if (j?.code) throw new Error(j.message || j.code)
    const b64 = j?.output?.audio?.data
    if (typeof b64 === 'string' && b64) parts.push(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
  }
  return parts
}
