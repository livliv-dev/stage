import { tr } from './i18n'
// livliv.ai/stage on a computer: what the desktop app adds to the web version, and where to get it. App.tsx shows it once
// on its own (kept in this browser) when nothing else is in the way: after the welcome is closed and nothing is playing,
// never with the sign-in prompt or a panel open; Settings › General › About opens it again. Not on a phone (its intro
// says to use a computer), nor in OBS. Only what really differs: phone and network face tracking (desktop tracking),
// global hotkeys, a transparent output (the site's is green), the WebGL contexts (contexts.ts: about 30 in the app, 15
// in a browser) and the services a browser can't call (brain.ts PROVIDERS_HERE).
import { useSyncExternalStore } from 'react'
import { Check, Download } from 'lucide-react'

/** the newest desktop app (macOS and Windows) */
export const RELEASES = 'https://github.com/livliv-dev/stage/releases/latest'
const SEEN = 'livliv-stage:desktop-notice'

let open = false
const listeners = new Set<() => void>()
const set = (value: boolean) => { open = value; listeners.forEach((f) => f()) }
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export const useDesktopNotice = () => useSyncExternalStore(subscribe, () => open)

/** not closed yet in this browser (where nothing can be kept, it never opens on its own) */
export const unseen = () => { try { return localStorage.getItem(SEEN) !== '1' } catch { return false } }
export const showDesktopNotice = () => set(true)
/** closed, for good in this browser */
export const closeDesktopNotice = () => { try { localStorage.setItem(SEEN, '1') } catch { /* private mode */ } set(false) }

const ITEMS = (): string[] => [
  tr('手机面捕（iFacialMocap）和 VMC/OSC'),
  tr('全局热键，切到游戏里也能控制角色'),
  tr('透明背景的 OBS 输出'),
  tr('同台约 {0} 个角色（浏览器约 {1} 个）', 30, 15),
  tr('Ollama 等本机模型，以及智谱和其他接口'),
]

export function DesktopNotice() {
  return <div className="desktop-notice card" role="dialog" aria-labelledby="desktop-notice-title" onPointerDown={(e) => e.stopPropagation()}>
    <p className="big" id="desktop-notice-title">{tr('网页版和桌面版')}</p>
    <p className="hint">{tr('大部分功能在网页上就能用。macOS 和 Windows 的桌面版还有：')}</p>
    <ul>{ITEMS().map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
    <div className="row end">
      <button onClick={closeDesktopNotice}>{tr('继续用网页版')}</button>
      <button className="primary" onClick={() => { window.open(RELEASES, '_blank', 'noopener'); closeDesktopNotice() }}><Download size={15} />{tr('下载桌面版')}</button>
    </div>
  </div>
}
