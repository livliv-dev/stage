// window.livlivDesktop, as the desktop shell gives it: one description for both sides, in the shared protocol package
// (protocol/src/bridge.ts), which the shell's preload is checked against. An optional member may be missing: an older
// desktop build, or a page that isn't the Stage editor.
import type { DesktopApi, Shortcut } from '../../protocol/src/bridge'

export type { Shortcut }
export type Desktop = DesktopApi
declare global { interface Window { livlivDesktop?: Desktop } }
export const desktop = window.livlivDesktop
