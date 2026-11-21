// A recording is an output (sessions/outputs.ts): while one is on, every session is public. recording.ts registers
// itself here when it loads, so nothing in the session imports it. Whoever listens hears the recording's changes from
// the moment it registers, whether it listened first or the recording registered first.

/** an output that tells when it changes */
export type Output = { on(): boolean; subscribe(changed: () => void): () => void }

let recording: Output | null = null, off = () => {}
const listeners = new Set<() => void>()
const tell = () => listeners.forEach((listener) => listener())

/** the recording, from recording.ts */
export function registerRecording(output: Output) { off(); recording = output; off = output.subscribe(tell) }
/** a take is starting or on */
export const recordingOn = () => recording?.on() ?? false
/** told each time the recording changes */
export const onRecordingOutput = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
