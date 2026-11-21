import type { CmdBody } from '../../desktop/src/commands'
import type { StageApiState, StageControlRequest } from '../../desktop/src/stageCommands'
import type { MotionEvent, MotionSettings, MotionState } from '../../desktop/src/trackingProtocol'
import type { NeuroAnswer, NeuroConfig, NeuroMessage, NeuroSpeech, NeuroState } from '../../desktop/src/neuroProtocol'
import type { CollabConfig, CollabState } from '../../desktop/src/collabProtocol'
import type { AiriGameConfig, AiriGameConnection, AiriGameEvent, AiriGameMessage, AiriGameSnapshot } from '../../desktop/src/airiGameProtocol'
import type { ExternalSelection } from '../../desktop/src/neuroProtocol'
import type { VoiceboxProfile, VoiceboxResult } from '../../desktop/src/voicebox'

export type Shortcut = { accelerator: string; do: string; ok: boolean; why?: string }
export type Desktop = {
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
  /** Voicebox on this computer (the Stage editor; desktop/src/voicebox.ts): absent in older desktop builds */
  voicebox?: {
    profiles(): Promise<VoiceboxResult<VoiceboxProfile[]>>
    speak(id: string, line: { profile: string; text: string }, language: string): Promise<VoiceboxResult<ArrayBuffer>>
    transcribe(id: string, wav: ArrayBuffer, language?: string): Promise<VoiceboxResult<string>>
    cancel(id: string): Promise<null>
  }
  onMotion?(cb: (event: MotionEvent) => void): () => void
  version: string
  platform: string
  requests: { begin(): Promise<string>; cancel(id: string): Promise<void> }
  hotkeys: {
    list(): Promise<Shortcut[]>; set(bindings: { accelerator: string; do: string }[]): Promise<Shortcut[]>; reset(): Promise<Shortcut[]>
    /** absent in older desktop builds, where global hotkeys were always on */
    enabled?(): Promise<boolean>; enable?(on: boolean): Promise<Shortcut[]>
  }
  stageApi?: { get(): Promise<StageApiState>; set(enabled: boolean): Promise<StageApiState>; rotate(): Promise<StageApiState> }
  onControl?(cb: (request: StageControlRequest) => unknown): () => void
  onCommand(cb: (cmd: CmdBody) => void): () => void
}
declare global { interface Window { livlivDesktop?: Desktop } }
export const desktop = window.livlivDesktop
