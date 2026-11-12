// What every window of the shell is held to: the page is the website, so it gets no Node, runs sandboxed
// and isolated from the preload, and reaches the shell only through window.livlivDesktop (preload.ts). Navigation
// and new windows go by urls.ts route(); permissions only to our origin, and only the ones the site uses.
import { join } from 'node:path'
import { BrowserWindow, powerSaveBlocker, session, shell, type BrowserWindowConstructorOptions, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents, type WebPreferences } from 'electron'
import { APP, ORIGINS, VERSION } from './config'
import { originOf, parse, route, stageOutput, type Route } from './urls'

export function webPreferences(extra: WebPreferences = {}): WebPreferences {
  return {
    preload: join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    spellcheck: false,
    ...extra,
  }
}

export const isAppUrl = (raw: string | undefined) => {
  const u = raw ? parse(raw) : null
  return !!u && ORIGINS.has(originOf(u))
}

/** IPC only from the top frame of one of our pages: never an iframe, never a page that navigated elsewhere */
export function trusted(e: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const f = e.senderFrame
  return !!f && f.parent === null && isAppUrl(f.url)
}

// camera and microphone (face tracking, lip sync), copying a link, a full-screen video
const PERMISSIONS = new Set(['media', 'clipboard-sanitized-write', 'fullscreen'])

export function hardenSession() {
  const s = session.defaultSession
  s.setPermissionRequestHandler((_wc, permission, done, details) => done(PERMISSIONS.has(permission) && isAppUrl(details.requestingUrl)))
  s.setPermissionCheckHandler((_wc, permission, origin) => PERMISSIONS.has(permission) && isAppUrl(origin))
  // the server sees the channel on every request (the first page also has ?channel=desktop); "Electron/45" is
  // dropped, which sign-in pages sometimes refuse
  s.setUserAgent(`${s.getUserAgent().replace(/\s(Electron|livliv-desktop|LivLiv)\/\S+/g, '')} LivLivDesktop/${VERSION}`)
}

/** LivLiv Stage's output window, what OBS captures. See-through when its scene is; a transparent window can't be resized on Windows and has no frame (the page moves it and the editor closes it) */
const outputWindow = (clear: boolean): BrowserWindowConstructorOptions => ({
  useContentSize: true, autoHideMenuBar: true,
  ...(clear
    ? { transparent: true, backgroundColor: '#00000000', frame: false, hasShadow: false, resizable: false, maximizable: false, fullscreenable: false }
    : { backgroundColor: '#000000' }),
  webPreferences: webPreferences(),
})

/** it never slows down, whatever covers it (a window.open child doesn't take backgroundThrottling from its options:
 *  measured, 2 frames a second under the editor); it goes with the editor, and while it is open the system doesn't
 *  suspend the app */
function keepOutput(child: BrowserWindow, editor: WebContents) {
  child.webContents.setBackgroundThrottling(false)
  if (process.platform !== 'darwin') child.removeMenu()  // nothing to show on Alt in the capture
  const blocker = powerSaveBlocker.start('prevent-app-suspension')
  child.once('closed', () => powerSaveBlocker.stop(blocker))
  BrowserWindow.fromWebContents(editor)?.once('closed', () => { if (!child.isDestroyed()) child.close() })
}

/** navigation and window.open for one window. role 'stage': only our origin; 'main': the sign-in providers too, in the
 *  site's shell (LivLiv Stage signs in with a connect code, in the system browser).
 *  window.open of a live window opens a stage (onStage); of another page of ours, an ordinary child window held to
 *  the same rules (a recording's blob: URL needs to stay the opener's child); of anything else, the system browser */
export function guard(wc: WebContents, role: 'main' | 'stage', onStage: (r: Extract<Route, { kind: 'stage' }>) => void) {
  const check = (e: { preventDefault: () => void }, url: string) => {
    const r = route(url, ORIGINS)
    if (r.kind === 'app' || r.kind === 'stage' || (r.kind === 'auth' && role === 'main' && APP !== 'stage')) return
    e.preventDefault()
    if (r.kind === 'external') shell.openExternal(r.url.toString())
  }
  wc.on('will-navigate', (e) => check(e, e.url))
  // Stage's frames go by the same rules as its page. Not the site's: its sign-up page has Cloudflare's check in a frame
  const frames = APP === 'stage'
  if (frames) wc.on('will-frame-navigate', (e) => { if (!e.isMainFrame) check(e, e.url) })
  wc.on('will-redirect', (e) => { if (e.isMainFrame || frames) check(e, e.url) })
  wc.setWindowOpenHandler(({ url }) => {
    const r = route(url, ORIGINS)
    const output = APP === 'stage' && r.kind === 'app' ? stageOutput(r.url) : null
    if (output) return { action: 'allow', overrideBrowserWindowOptions: outputWindow(output.clear) }
    if (r.kind === 'app') return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: webPreferences() } }
    if (r.kind === 'stage') onStage(r)
    else if (r.kind === 'external') shell.openExternal(r.url.toString())
    return { action: 'deny' }
  })
  wc.on('did-create-window', (child, { url }) => {
    guard(child.webContents, 'main', onStage)
    const u = parse(url)
    if (APP === 'stage' && u && stageOutput(u)) keepOutput(child, wc)
  })
  wc.on('will-attach-webview', (e) => e.preventDefault())
}
