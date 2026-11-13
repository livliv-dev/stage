import { tr } from './i18n'
// livliv.ai/stage on a computer: what the web version can't do, each something the desktop app can, and where to get
// it. App.tsx shows it once on its own (kept in this browser) when nothing else is in the way: after the welcome is
// closed and nothing is playing, never with the sign-in prompt or a panel open; Settings › General › About opens it
// again. Not on a phone (its intro says to use a computer), nor in OBS. Only the browser's limits, not the plan's
// (recording length and the mark): the WebGL contexts (contexts.ts: 15 in a browser, 30 in the app), a green output
// that stops when covered (outputFeed.ts; the app's can be transparent), no 联播 (its relay runs on your computer),
// no phone or network face tracking (desktop tracking), no global hotkeys, and the services a browser can't call
// (brain.ts PROVIDERS_HERE).
import { useSyncExternalStore } from 'react'
import { Download, Minus } from 'lucide-react'
import { REPO } from './GitHubLink'

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
  tr('同台角色上限为 15 个角色且数量多更容易卡顿（桌面版为 30 个）'),
  tr('OBS 只能用绿幕，输出窗口被完全挡住时画面会停'),
  tr('没有好友联播'),
  tr('不能用手机面捕（iFacialMocap）和 VMC/OSC'),
  tr('没有全局热键，切到游戏里就控制不了角色'),
  tr('接不了 Ollama 等本机模型，以及其他接口'),
]

export function DesktopNotice() {
  // the closing line names the project, a link to it on GitHub (where the name sits differs by language)
  const [before, after = ''] = tr('欢迎使用桌面端，以及关注我们的开源项目 {0}').split('{0}')
  return <div className="desktop-notice card" role="dialog" aria-labelledby="desktop-notice-title" onPointerDown={(e) => e.stopPropagation()}>
    <p className="big" id="desktop-notice-title">{tr('网页版的限制')}</p>
    <p className="hint">{tr('网页版能用大部分功能，但受浏览器限制：')}</p>
    <ul>{ITEMS().map((item) => <li key={item}><Minus size={14} />{item}</li>)}</ul>
    <p className="hint after">{before}<a href={REPO} target="_blank" rel="noopener noreferrer">LivLiv Stage</a>{after}</p>
    <div className="row end">
      <button onClick={closeDesktopNotice}>{tr('继续用网页版')}</button>
      <button className="primary" onClick={() => { window.open(RELEASES, '_blank', 'noopener'); closeDesktopNotice() }}><Download size={15} />{tr('下载桌面版')}</button>
    </div>
  </div>
}
