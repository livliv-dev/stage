// 直播间's own settings, beside the start options: its limits (30 minutes and 100 lines unless changed, as its panel
// had), what the characters do while no chat comes in, and in the desktop app a game (Minecraft through Airicraft,
// Factorio through Autorio) or a game window the model sees. Kept for this window; the start (shell/start.ts) reads
// them.
import { useSyncExternalStore } from 'react'
import { validGamePort, type AiriGameConfig } from '../../../protocol/src/airiGame'

export type LiveSetup = {
  minutes: number
  maxGenerations: number
  /** with no chat coming in: wait quietly (0), or say something every 30, 60 or 120 seconds */
  warmupSeconds: 0 | 30 | 60 | 120
  game: AiriGameConfig['game'] | 'window'
  minecraftVision: boolean
  eventsPort: string
  rconPort: string
  /** a game window whose frame goes to the model with each answer; '' for none */
  windowId: string
}

let state: LiveSetup = { minutes: 30, maxGenerations: 100, warmupSeconds: 0, game: 'window', minecraftVision: false, eventsPort: '8080', rconPort: '24180', windowId: '' }
const listeners = new Set<() => void>()

export const liveSetup = {
  get: () => state,
  set(change: Partial<LiveSetup>) { state = { ...state, ...change }; listeners.forEach((listener) => listener()) },
}
/** a live session's game and window are chosen for it: once it ends, the next one starts without them (the window may
 *  be gone, and the list is asked again) */
export function endLive() { if (state.game !== 'window' || state.windowId) liveSetup.set({ game: 'window', windowId: '' }) }
export function useLiveSetup() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, liveSetup.get)
}

/** what the setup asks of a start: AIRI when a game or a window is chosen; the game's connection; whether its ports
 *  are usable */
export function liveGame(s: LiveSetup) {
  const game: AiriGameConfig | undefined = s.game === 'window' ? undefined
    : s.game === 'minecraft' ? { game: s.game, vision: s.minecraftVision } : { game: s.game, eventsPort: Number(s.eventsPort), rconPort: Number(s.rconPort) }
  return {
    needsAiri: s.game !== 'window' || !!s.windowId, game, windowId: s.windowId,
    portsReady: s.game !== 'factorio' || (validGamePort(Number(s.eventsPort)) && validGamePort(Number(s.rconPort))),
  }
}
