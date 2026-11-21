// What the desktop app and the Stage editor say to each other about Voicebox (the client is desktop/src/voicebox.ts).

/** a voice in Voicebox: a preset (Kokoro, Qwen CustomVoice), one cloned from a recording, or one designed from words;
 *  `engine` is what makes it (the profile's own engine, else Voicebox's default for its kind); `ready`: a model of that
 *  engine is downloaded (`size`: the one to ask for), so it can say a line now; `model`: the model to download if not */
export type VoiceboxProfile = { id: string; name: string; language: string; kind: 'preset' | 'cloned' | 'designed' | 'other'; engine: string; ready: boolean; size?: string; model?: string }
/** why Voicebox couldn't do it: not running, no voice, the voice's model not downloaded, a model downloading, else */
export type VoiceboxFailure = 'not-running' | 'no-profiles' | 'no-model' | 'downloading' | 'failed'
export type VoiceboxResult<T> = { ok: true; value: T } | { ok: false; error: VoiceboxFailure; detail: string }
