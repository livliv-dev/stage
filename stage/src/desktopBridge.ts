import type { CmdBody } from '../../desktop/src/commands'
import type { StageApiState, StageControlRequest } from '../../desktop/src/stageCommands'
import type { MotionEvent, MotionSettings, MotionState } from '../../desktop/src/trackingProtocol'

export type Shortcut = { accelerator: string; do: string; ok: boolean; why?: string }
type Desktop = {
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
