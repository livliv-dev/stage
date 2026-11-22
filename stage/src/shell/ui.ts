// The editor's pop-up state in one place: which card or menu is open (one at a time), where a card opened from another
// goes back to when closed, the settings card's tab and section, the transcript card, the phone's cast sheet, and the
// note shown for a moment. Components read it with useUi() and change it through ui.*.
import { useSyncExternalStore } from 'react'

export type Pop = null | 'add' | 'settings' | 'templates' | 'help' | 'record' | 'output' | 'live' | 'realtime' | 'collab' | 'scenes' | 'mixer' | 'checklist' | 'start-options' | 'start' | 'more'
export type SettingsTab = 'general' | 'ai' | 'hotkeys' | 'account'
export type ModelTab = 'chat' | 'speech' | 'realtime'

export type UiState = {
  pop: Pop
  /** the settings card opened from a panel or card: saving or closing it goes back there. AI 直播, 联播, the mixer and
   *  录制 wait behind it as they were (kept, hidden); 实时语音 and the model card open afresh */
  back: Pop
  /** a card opened from the checklist (the 直播间 card for its 游戏 or 直播间弹幕, the start options for Twitch) goes
   *  back there when closed */
  detourBack: Pop
  settingsTab: SettingsTab
  settingsModel: ModelTab
  /** the settings card opened to set up a model for a start that asked for one */
  forStart: boolean
  /** the settings card opened for a character's voice (its id) */
  voiceSetup?: string
  /** the transcript card: open, and on the record or the memory */
  log: boolean
  logView: 'history' | 'memory'
  /** a phone: the cast as a sheet, opened from the top bar's menu */
  castOpen: boolean
  /** said for a moment at the bottom of the window */
  note: string
}

let state: UiState = { pop: null, back: null, detourBack: null, settingsTab: 'general', settingsModel: 'chat', forStart: false, voiceSetup: undefined, log: false, logView: 'history', castOpen: false, note: '' }
const listeners = new Set<() => void>()

/** one change, told once. A card other than settings takes the settings' way back and voice with it; a card other than
 *  the 直播间 card or the start options, the checklist's */
function set(change: Partial<UiState> | ((now: UiState) => Partial<UiState>)) {
  const patch = typeof change === 'function' ? change(state) : change, next = { ...state, ...patch }
  if ('pop' in patch) {
    if (next.pop !== 'settings') { next.back = null; next.voiceSetup = undefined }
    if (next.pop !== 'live' && next.pop !== 'start-options') next.detourBack = null
  }
  state = next
  listeners.forEach((listener) => listener())
}

export const useUi = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => state)

export const ui = {
  get: () => state,
  set,
  setPop(pop: Pop) { set({ pop }) },
  /** opens a card, or closes it when it is open; settings opens on 通用 */
  toggle(pop: Pop) { set((now) => ({ ...(pop === 'settings' ? { forStart: false, settingsTab: 'general' as const } : {}), pop: now.pop === pop ? null : pop })) },
  /** a card counts as open while settings opened from it is in front */
  kept: (pop: Pop) => state.pop === pop || (state.pop === 'settings' && state.back === pop),
  /** Settings → 连接 at one of its sections; from a card it goes back there, for a start it goes on with the start */
  openModels(model: ModelTab, start = false, from: Pop = null, voiceSetup?: string) { set({ voiceSetup, forStart: start, back: start ? null : from, settingsModel: model, settingsTab: 'ai', pop: 'settings' }) },
  openAccount() { set({ voiceSetup: undefined, settingsTab: 'account', pop: 'settings' }) },
  closeSettings() { set((now) => ({ forStart: false, settingsTab: 'general', pop: now.back })) },
  /** a card opened from the checklist: closing it goes back there */
  detour(pop: Pop) { set({ detourBack: 'checklist', pop }) },
  say(note: string) { set({ note }); window.setTimeout(() => set((now) => ({ note: now.note === note ? '' : now.note })), 3200) },
}
