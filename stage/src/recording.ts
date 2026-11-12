import { tr } from './i18n'
// Recording the whole stage: 录制 takes it down while it plays (tape.ts; the microphone too when asked, the conversation
// started with it when asked), 停止 makes the video (render.ts), kept here until it is saved or a new take starts.
// A take stops by itself at MAX_SECONDS. Stopping a take that started the conversation stops that conversation too
// (not one started after it). A take whose video fails is kept, to make it again.
import { useSyncExternalStore } from 'react'
import { conversation, talk } from './conversation'
import { renderTake, type Made } from './render'
import { store } from './scene'
import { MAX_SECONDS, record, type Recorder, type Take } from './tape'

export type RecPhase = 'idle' | 'starting' | 'recording' | 'making' | 'done' | 'error'
/** retry: the video failed and its take is kept, to make it again */
export type RecState = { phase: RecPhase; started: number; progress: number; made: Made | null; error: string; retry: boolean }

let state: RecState = { phase: 'idle', started: 0, progress: 0, made: null, error: '', retry: false }
const subs = new Set<() => void>()
const set = (p: Partial<RecState>) => { state = { ...state, ...p }; subs.forEach((f) => f()) }
export const useRecording = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
export const recording = () => state

let recorder: Recorder | null = null
let stopTalk: (() => void) | null = null
let limit = 0
let making: AbortController | null = null
let kept: Take | null = null

/** a file name from the stage's name and the time: 未命名舞台-20261103-1142 */
function fileName() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, '0')
  const base = store.get().name.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || 'LivLiv-Stage'
  return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

async function make(take: Take) {
  kept = null
  set({ phase: 'making', progress: 0, retry: false })
  const ctl = making = new AbortController()
  try {
    const made = await renderTake(take, fileName(), (progress) => set({ progress }), ctl.signal)
    set({ phase: 'done', made })
  } catch (e) {
    if (ctl.signal.aborted) set({ phase: 'idle' })
    else { kept = take; set({ phase: 'error', retry: true, error: tr("视频没有做出来：{0}", (e as Error).message) }) }
  } finally { making = null }
}

export const rec = {
  async start(o: { mic: boolean; talk: boolean }) {
    if (state.phase === 'recording' || state.phase === 'starting' || state.phase === 'making') return
    kept = null
    set({ phase: 'starting', made: null, error: '', progress: 0, retry: false })
    try {
      recorder = await record(o.mic, (error) => set({ error: error?.message ?? '' }))
    } catch (e) {
      set({ phase: 'error', error: o.mic ? tr("麦克风没有打开：{0}", (e as Error).message) : (e as Error).message })
      return
    }
    set({ phase: 'recording', started: performance.now() })
    limit = window.setTimeout(() => void rec.stop(), MAX_SECONDS * 1000)
    stopTalk = o.talk && !conversation().running ? talk.start() : null
  },

  async stop() {
    const r = recorder
    if (!r || state.phase !== 'recording') return
    recorder = null
    clearTimeout(limit)
    stopTalk?.(); stopTalk = null
    let take
    try { take = await r.stop() } catch (error) { set({ phase: 'error', error: (error as Error).message }); return }
    if (take.seconds < 0.5) { set({ phase: 'idle' }); return }
    await make(take)
  },

  /** stops making the video (the take is dropped) */
  cancel() { making?.abort() },

  /** makes the video again from the take kept when it failed */
  async retry() { if (state.phase === 'error' && kept) { set({ error: '' }); await make(kept) } },

  /** the video into the downloads (or where the browser asks) */
  save() {
    const f = state.made?.file
    if (!f) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f); a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000)
  },

  reset() { if (state.phase === 'done' || state.phase === 'error') { kept = null; set({ phase: 'idle', made: null, error: '', retry: false }) } },
}
