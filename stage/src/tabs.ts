// One editor per browser. Every tab of Stage saves the same project (scene.ts, localStorage) and talks to the same
// output window (link.ts), so a second editor would save over the first one's work and fight it for the output. Links
// from livliv.ai open Stage in new tabs, so this happens. The first tab holds a lock (Web Locks); a later one shows
// that Stage is open elsewhere and offers to move here: the old tab saves, reloads and steps aside, and this one loads
// the project as just saved. The desktop app has one window and no gate.
import { useSyncExternalStore } from 'react'
import { desktop } from './desktopBridge'

const LOCK = 'livliv-stage:editor'
/** wait: deciding (a moment at start); here: this tab edits; elsewhere: another tab does; moving: asked for the lock,
 *  waiting for the other tab to give it up */
export type TabState = 'wait' | 'here' | 'elsewhere' | 'moving'
/** busy: what the other tab is doing that moving here stops ('rec': recording, 'talk': a conversation, 'out': an output
 *  window is open), as it last said */
type State = { tab: TabState; busy: ('rec' | 'talk' | 'out')[] }
type Msg = { t: 'who' } | { t: 'here'; busy: State['busy'] } | { t: 'take' }

let state: State = { tab: 'wait', busy: [] }
const subs = new Set<() => void>()
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach((f) => f()) }
export const useTab = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)

const ch = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('livliv-stage:tabs') : null
const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined

type Hooks = { busy: () => State['busy']; save: () => void; load: () => void }
let hooks: Hooks | null = null

/** holds the lock until the page goes away */
const hold = () => new Promise<void>(() => {})

/** decides whether this tab edits; `load` reads the project as saved, `save` writes it now */
export function startTabs(h: Hooks) {
  hooks = h
  if (desktop || !locks || !ch) { set({ tab: 'here' }); return }
  ch.onmessage = (e: MessageEvent<Msg>) => {
    const m = e.data
    if (state.tab === 'here' && m.t === 'who') ch.postMessage({ t: 'here', busy: hooks?.busy() ?? [] } satisfies Msg)
    else if (state.tab === 'here' && m.t === 'take') {
      // another tab takes over: everything is saved, then this page reloads (and finds the lock taken)
      try { hooks?.save() } finally { location.reload() }
    } else if (state.tab !== 'here' && m.t === 'here') set({ busy: m.busy })
  }
  void locks.request(LOCK, { ifAvailable: true }, (lock) => {
    if (!lock) { set({ tab: 'elsewhere' }); ch.postMessage({ t: 'who' } satisfies Msg); return }
    set({ tab: 'here' })
    return hold()
  })
}

/** moves editing to this tab: asks for the lock (granted when the other tab has saved and let go), then loads */
export function moveHere() {
  if (!locks || !ch || state.tab !== 'elsewhere') return
  set({ tab: 'moving' })
  void locks.request(LOCK, () => {
    hooks?.load()
    set({ tab: 'here', busy: [] })
    return hold()
  })
  ch.postMessage({ t: 'take' } satisfies Msg)
}
