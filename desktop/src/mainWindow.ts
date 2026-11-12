// The main window: the website itself, as in a browser.
import { BrowserWindow } from 'electron'
import { APP, APP_ORIGIN, DEV, NAME } from './config'
import { guard, webPreferences } from './security'
import { openStage } from './stages'
import { withChannel } from './urls'
import type { CmdBody } from './commands'

let main: BrowserWindow | null = null
export const mainContents = () => main && !main.isDestroyed() ? main.webContents : null
export function deliverMain(cmd: CmdBody) { if (main && !main.isDestroyed()) main.webContents.send('livliv:command', cmd) }

/** when the site can't be reached: a plain page that tries again (navigating back to the site is allowed) */
const offline = (to: string) => `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><meta charset="utf-8">
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#0e0e10;color:#e4e4e7;font:15px system-ui,sans-serif">
<div style="text-align:center"><p>连不上 ${new URL(to).host}</p><p style="color:#a1a1aa">检查网络后重试</p>
<p><a href="${to}" style="color:#fff">重试</a></p></div>`)}`

export function openMain(): BrowserWindow {
  if (main && !main.isDestroyed()) {
    if (main.isMinimized()) main.restore()
    main.show(); main.focus()
    return main
  }
  // LivLiv Stage: a light editor, wider (its tools, the stage and its panel side by side)
  const stage = APP === 'stage'
  const win = new BrowserWindow({
    width: stage ? 1440 : 1280, height: stage ? 900 : 820, minWidth: stage ? 1100 : 900, minHeight: stage ? 700 : 600, show: false,
    title: NAME, backgroundColor: stage ? '#efece6' : '#0e0e10', autoHideMenuBar: true,
    // Stage's editor drives the output window and speaks: it goes on when a game covers it or it is minimized
    webPreferences: webPreferences(stage ? { backgroundThrottling: false } : {}),
  })
  main = win
  if (DEV && process.argv.includes('--mute')) win.webContents.setAudioMuted(true)  // tests with real voices, on someone's computer
  guard(win.webContents, 'main', (r) => openStage(r.url, r.id))
  const home = withChannel(new URL('/', APP_ORIGIN)).toString()
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMain) => {
    if (isMain && code !== -3 && !url.startsWith('data:')) win.loadURL(offline(home))  // -3: aborted by a newer load
  })
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { if (main === win) main = null })
  win.loadURL(home)
  return win
}
