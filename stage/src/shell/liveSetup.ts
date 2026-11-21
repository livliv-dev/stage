// 直播间's own settings, beside the start options: what the characters do while no chat comes in, and in the desktop
// app a game (Minecraft through Airicraft, Factorio through Autorio) or a game window the model sees. Kept for this
// window; the start (shell/start.ts) reads them.
import { useSyncExternalStore } from 'react'
import { validGamePort, type AiriGameConfig } from '../../../desktop/src/airiGameProtocol'

export type LiveSetup = {
  /** with no chat coming in: wait quietly (0), or say something every 30, 60 or 120 seconds */
  warmupSeconds: 0 | 30 | 60 | 120
  game: AiriGameConfig['game'] | 'window'
  minecraftVision: boolean
  eventsPort: string
  rconPort: string
  /** a game window whose frame goes to the model with each answer; '' for none */
  windowId: string
}

let state: LiveSetup = { warmupSeconds: 0, game: 'window', minecraftVision: false, eventsPort: '8080', rconPort: '24180', windowId: '' }
const listeners = new Set<() => void>()

export const liveSetup = {
  get: () => state,
  set(change: Partial<LiveSetup>) { state = { ...state, ...change }; listeners.forEach((listener) => listener()) },
}
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
