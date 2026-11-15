import type { CmdBody } from '../../desktop/src/commands'
import type { StageApiState, StageControlRequest } from '../../desktop/src/stageCommands'
import type { MotionEvent, MotionSettings, MotionState } from '../../desktop/src/trackingProtocol'
import type { NeuroAnswer, NeuroConfig, NeuroMessage, NeuroSpeech, NeuroState } from '../../desktop/src/neuroProtocol'

export type Shortcut = { accelerator: string; do: string; ok: boolean; why?: string }
type Desktop = {
  neuro?: {
    get(): Promise<NeuroState>
    set(config: NeuroConfig): Promise<NeuroState>
    answer(id: string, value: NeuroAnswer): void
    speech(status: NeuroSpeech): Promise<void>
    onMessage(callback: (message: NeuroMessage) => void): () => void
    onState(callback: (state: NeuroState) => void): () => void
  }
  tracking?: { get(): Promise<MotionState>; set(settings: MotionSettings): Promise<MotionState> }
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
