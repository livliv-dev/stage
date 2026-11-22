// Where this copy of Stage runs and what it can do there, decided once as it starts. Every "on the site / in the
// desktop app / a desktop build with X" check reads `features`.
//  - site: livliv.ai/stage, built with VITE_STAGE_HOST=livliv (`npm run build:site`): a page of the site itself, signed in
//    with the site's own cookie; only AI services a web page can call straight; no 联播 (its relay runs on your own
//    computer); recordings follow the visitor's LivLiv plan
//  - desktop: the desktop app (served over its own livliv-stage:// scheme, or any page its bridge was given to, as the
//    desktop checks do): LivLiv by a connect code, and what its bridge offers (window capture, AIRI's games, phone
//    tracking, global hotkeys)
//  - selfhosted: anywhere else (the dev server, a copy you host yourself): all of Stage's web features, no LivLiv account
// The desktop shell also opens livliv.ai itself, whose pages get its bridge too: the site build there is host 'site'
// with `shell` set, and goes by the shell wherever the bridge's presence decides (`shell`).
import type { Desktop } from '../desktopBridge'

export type Host = 'site' | 'desktop' | 'selfhosted'
export type Features = {
  host: Host
  /** inside the desktop shell: its bridge is there (or the page came over its scheme), whichever build this is. What the
   *  shell itself gives goes by this: more WebGL contexts, a transparent background for 开播, output windows that keep
   *  drawing when covered, a sign-in kept by a connect code */
  shell: boolean
  /** the desktop app's console, since AIRI came: 直播 in the top bar instead of 观众弹幕, chat with the one AI
   *  character as the main start, typing starts 持续聊天, the memory panel by the scope chosen. A web page, and a
   *  desktop bridge without window capture, keep the web console (AIRI runs there too, for 持续聊天: `airi`) */
  desktopConsole: boolean
  /** a session can run on AIRI (Project AIRI, built in): the desktop app with window capture, and any web page
   *  (livliv.ai/stage, a copy hosted elsewhere), where it runs 持续聊天 only (no window, no game: brains/select.ts). A
   *  desktop bridge without window capture (an older app) keeps the standard engine */
  airi: boolean
  /** the desktop app can capture a window (AIRI sees a game or app window) */
  vision: boolean
  /** AIRI's game connections (Minecraft by Airicraft, Factorio by Autorio) */
  games: boolean
  /** 联播 (a friend's character on your stage): anywhere but the site */
  collab: boolean
  /** LivLiv's points model and voices: the site (its sign-in) and the desktop app (a connect code); a copy hosted
   *  elsewhere has no LivLiv account */
  points: boolean
  /** hotkeys that work while another window has the keyboard (the desktop app) */
  globalHotkeys: boolean
  /** phone and network face tracking, which the desktop app receives */
  tracking: boolean
  /** served by the desktop app over its own scheme: requests go through the app (model APIs by its /__ai pass-through,
   *  which has no CORS; each cancellable by a ticket) */
  appScheme: boolean
}

/** what Stage can do, from where it was built and what the page was given: a site build, the app's scheme, the
 *  desktop bridge (present, and what it offers) */
export function detectFeatures(from: { siteBuild: boolean; appScheme: boolean; bridge: Partial<Desktop> | undefined; hasBridge: boolean }): Features {
  const { siteBuild, appScheme, bridge } = from
  const host: Host = siteBuild ? 'site' : appScheme || from.hasBridge ? 'desktop' : 'selfhosted'
  return {
    host,
    shell: appScheme || from.hasBridge,
    desktopConsole: !!bridge?.vision,
    airi: !!bridge?.vision || host !== 'desktop',
    vision: !!bridge?.vision,
    games: !!bridge?.airiGame,
    collab: host !== 'site',
    points: host !== 'selfhosted',
    globalHotkeys: !!bridge,
    tracking: !!bridge?.tracking && !!bridge.onMotion,
    appScheme,
  }
}

const page = globalThis as { window?: { livlivDesktop?: Desktop }; location?: { protocol: string } }
export const features: Features = detectFeatures({
  siteBuild: import.meta.env?.VITE_STAGE_HOST === 'livliv',
  appScheme: page.location?.protocol === 'livliv-stage:',
  bridge: page.window?.livlivDesktop,
  hasBridge: !!page.window && 'livlivDesktop' in page.window,
})
