// window.livlivDesktop: everything a page can ask of the desktop shell, as one type for both sides. The shell's preload
// (desktop/src/preload.ts) is checked against it, and LivLiv Stage's editor reads it (stage/src/desktopBridge.ts).
// An optional member is one a page may not find: in an older desktop build, or outside the Stage editor.
import type { CmdBody } from './commands'
import type { StageApiState, StageControlRequest } from './stageCommands'
import type { MotionEvent, MotionSettings, MotionState } from './tracking'
import type { ExternalSelection, NeuroAnswer, NeuroConfig, NeuroMessage, NeuroSpeech, NeuroState } from './neuro'
import type { CollabConfig, CollabState } from './collab'
import type { AiriGameConfig, AiriGameConnection, AiriGameEvent, AiriGameMessage, AiriGameSnapshot } from './airiGame'
import type { VoiceboxProfile, VoiceboxResult } from './voicebox'

/** a global hotkey: the keys and the command they send */
export type Binding = { accelerator: string; do: string }
/** a global hotkey and whether the system took it (`why` when it didn't) */
export type Shortcut = Binding & { ok: boolean; why?: string }
/** who is asking: the shell's version, the system, a stage window or the main one, and whether it is the Stage editor */
export type DesktopInfo = { api: 1; version: string; platform: string; role: 'main' | 'stage'; stageEditor: boolean }

export type DesktopApi = DesktopInfo & {
  // ------------------------------------------------ the Stage editor only
  vision?: {
    list(): Promise<{ id: string; name: string }[]>
    frame(sourceId: string): Promise<{ mimeType: 'image/jpeg'; data: string } | null>
  }
  airiGame?: {
    selectBridge(): Promise<string | null>
    connect(id: string, config: AiriGameConfig): Promise<AiriGameConnection>
    stop(id: string): Promise<void>
    cancel(id: string): Promise<void>
    snapshot(id: string, image: boolean): Promise<AiriGameSnapshot>
    execute(id: string, action: ExternalSelection): Promise<AiriGameMessage>
    onEvent(callback: (event: AiriGameEvent) => void): () => void
  }
  collab?: { get(): Promise<CollabState>; start(config: CollabConfig): Promise<CollabState>; stop(): Promise<CollabState>; onState(callback: (state: CollabState) => void): () => void }
  neuro?: {
    get(): Promise<NeuroState>
    set(config: NeuroConfig): Promise<NeuroState>
    answer(id: string, value: NeuroAnswer): void
    speech(status: NeuroSpeech): Promise<void>
    onMessage(callback: (message: NeuroMessage) => void): () => void
    onState(callback: (state: NeuroState) => void): () => void
  }
  tracking?: { get(): Promise<MotionState>; set(settings: MotionSettings): Promise<MotionState> }
  /** the API keys, encrypted by the system: all of them (null without system encryption), and one saved */
  secrets?: { all(): Record<string, string> | null; set(name: string, value: string): boolean }
  /** Voicebox on this computer: results, never thrown */
  voicebox?: {
    profiles(): Promise<VoiceboxResult<VoiceboxProfile[]>>
    speak(id: string, line: { profile: string; text: string; size?: string }, language: string): Promise<VoiceboxResult<ArrayBuffer>>
    transcribe(id: string, wav: ArrayBuffer, language?: string): Promise<VoiceboxResult<string>>
    cancel(id: string): Promise<null>
  }
  onMotion?(callback: (event: MotionEvent) => void): () => void
  // ------------------------------------------------ every page
  /** the modules that are on: 'stage-window', 'global-hotkeys', 'local-commands'... */
  capabilities(): Promise<string[]>
  requests: { begin(): Promise<string>; cancel(id: string): Promise<void> }
  /** the local command endpoint, or null when it is off */
  localPort(): Promise<{ port: number; commandUrl: string } | null>
  stageApi?: { get(): Promise<StageApiState>; set(enabled: boolean): Promise<StageApiState>; rotate(): Promise<StageApiState> }
  onControl?(callback: (request: StageControlRequest) => unknown): () => void
  hotkeys: {
    list(): Promise<Shortcut[]>; set(bindings: Binding[]): Promise<Shortcut[]>; reset(): Promise<Shortcut[]>
    /** absent in older desktop builds, where global hotkeys were always on */
    enabled?(): Promise<boolean>; enable?(on: boolean): Promise<Shortcut[]>
  }
  /** the website's live window: checked again in the shell, so anything may be passed */
  window: {
    clickThrough(mode: unknown): Promise<unknown>; alwaysOnTop(on: unknown): Promise<unknown>
    minimize(): Promise<unknown>; close(): Promise<unknown>; menu(): Promise<unknown>
    dragStart(): Promise<unknown>; dragEnd(): Promise<unknown>
    /** opens a stage window at '/live/<id>?…' */
    openStage(path: unknown): Promise<unknown>
  }
  /** a stage's commands (hotkeys, the local endpoint) -> unsubscribe */
  onCommand(callback: (cmd: CmdBody) => void): () => void
}
