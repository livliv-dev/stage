// The editor and its output window (?output=1: only the stage, for OBS to capture), linked by a BroadcastChannel
// (same origin, same browser). The editor is the one truth: it sends the scene, the conversation and, every frame,
// each character's pose as it drew it; the output only draws what it is sent (so both move alike, and only the
// editor makes a sound). The editor sends poses only while an output says it is open.
import type { PlaybackPose } from '@livliv-dev/player'
const query = new URLSearchParams(location.search)
export const isOutput = query.has('output')
/** the output window is see-through (&clear=1: the scene's background is transparent, and the shell made it so) */
export const isClear = query.has('clear')

export type Msg =
  | { t: 'hello' } | { t: 'alive' } | { t: 'bye' }                              // output -> editor
  | { t: 'scene'; scene: unknown } | { t: 'conv'; conv: unknown } | { t: 'close' }  // editor -> output
  | { t: 'pose'; id: string; pose: PlaybackPose }
  | { t: 'assets'; key: string; files: [string, Blob][] }

const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('livliv-stage') : null
const handlers = new Set<(m: Msg) => void>()
if (ch) ch.onmessage = (e) => handlers.forEach((f) => f(e.data as Msg))

export const post = (m: Msg) => ch?.postMessage(m)
export const onMsg = (f: (m: Msg) => void) => { handlers.add(f); return () => { handlers.delete(f) } }

// editor: is an output window open (it says so every 2 s)?
let seen = 0
if (!isOutput) onMsg((m) => {
  if (m.t === 'hello' || m.t === 'alive') seen = performance.now()
  else if (m.t === 'bye') seen = 0
})
export const outputOpen = () => !isOutput && seen > 0 && performance.now() - seen < 5000

/** opens the output window at the scene's own pixels, for OBS to capture it sharp, or as big as fits the screen (the
 *  40 leaves room for a title bar). A transparent scene gets a see-through window: the shell makes it (security.ts) */
export function openOutput(w: number, h: number, clear: boolean) {
  const k = Math.min(1 / (window.devicePixelRatio || 1), screen.availWidth / w, (screen.availHeight - 40) / h)
  window.open(`${location.pathname}?output=1${clear ? '&clear=1' : ''}`, 'livliv-stage-output', `width=${Math.round(w * k)},height=${Math.round(h * k)}`)
}

export function closeOutput() { post({ t: 'close' }); seen = 0 }

/** the scene's size or its see-through changed: only a new window can take that */
export function reopenOutput(w: number, h: number, clear: boolean) {
  closeOutput()
  setTimeout(() => openOutput(w, h, clear), 300)
}
