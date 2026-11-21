// What the desktop app and the Stage editor say to each other about Voicebox (the client is desktop/src/voicebox.ts).

/** a voice in Voicebox: a preset (Kokoro, Qwen CustomVoice), one cloned from a recording, or one designed from words;
 *  `engine` is what makes it (the profile's own engine, else Voicebox's default for its kind) */
export type VoiceboxProfile = { id: string; name: string; language: string; kind: 'preset' | 'cloned' | 'designed' | 'other'; engine: string }
/** why Voicebox couldn't do it */
export type VoiceboxFailure = 'not-running' | 'no-profiles' | 'downloading' | 'failed'
export type VoiceboxResult<T> = { ok: true; value: T } | { ok: false; error: VoiceboxFailure; detail: string }
