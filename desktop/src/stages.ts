// Stage windows: the website's live window (/live/<id>?k=…) on the desktop. Transparent, frameless and on top;
// clicks reach the character and pass through everywhere else (the alpha under the pointer decides); dragging the
// character moves the window (the page asks for it); never throttled in the background, and while one is
// open the system doesn't suspend the app. The hotkeys and the local endpoint deliver their commands here.
import { BrowserWindow, Menu, powerSaveBlocker, screen, type MenuItemConstructorOptions } from 'electron'
import type { CmdBody } from './commands'
import { DEV } from './config'
import { same } from './localApi'
import { guard, webPreferences } from './security'
import { settings, update, type ClickMode, type Rect } from './settings'
import { stageUrl } from './urls'

export type Stage = {
  win: BrowserWindow
  id: string
  /** the character's key from the page's address (k): the local endpoint takes it like the server does */
  key: string | null
  /** its page takes commands (an older version of the site doesn't) */
  listening: boolean
  ignoring: boolean
  drag?: NodeJS.Timeout
  checking: boolean
  last: { x: number; y: number; at: number }
  poll: NodeJS.Timeout
}

const stages = new Map<number, Stage>()  // by the window's id
const changed = new Set<() => void>()
let blocker = -1

export const allStages = () => [...stages.values()]
export const stageOf = (win: BrowserWindow | null) => (win ? stages.get(win.id) : undefined)
/** the tray and the hotkeys follow the open stages */
export const onStagesChanged = (f: () => void) => { changed.add(f) }
const notify = () => {
  if (stages.size && blocker < 0) blocker = powerSaveBlocker.start('prevent-app-suspension')
  if (!stages.size && blocker >= 0) { powerSaveBlocker.stop(blocker); blocker = -1 }
  changed.forEach((f) => f())
}

const SIZES = [
  { label: '小（360 × 540）', width: 360, height: 540 },
  { label: '中（480 × 720）', width: 480, height: 720 },
  { label: '大（640 × 960）', width: 640, height: 960 },
  { label: '横（960 × 540）', width: 960, height: 540 },
]

/** where a character's stage goes: where it was, if that is still on a screen; else the bottom right corner of the
 *  screen under the pointer, at the middle size (smaller on a short screen) */
function boundsFor(id: string): Rect {
  const saved = settings().stage.bounds[id]
  if (saved) {
    const area = screen.getDisplayMatching(saved).workArea
    const w = Math.min(saved.x + saved.width, area.x + area.width) - Math.max(saved.x, area.x)
    const h = Math.min(saved.y + saved.height, area.y + area.height) - Math.max(saved.y, area.y)
    if (w >= 80 && h >= 80) return saved
  }
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
  const k = Math.min(1, (area.height - 48) / 720), width = Math.round(480 * k), height = Math.round(720 * k)
  return { x: area.x + area.width - width - 24, y: area.y + area.height - height - 24, width, height }
}

function remember(s: Stage) {
  if (s.win.isDestroyed() || s.win.isMinimized()) return
  const b = s.win.getBounds()
  update((x) => { delete x.stage.bounds[s.id]; x.stage.bounds[s.id] = b })  // the most recent last: 50 are kept
}

export function openStage(url: URL, id: string): Stage {
  const to = stageUrl(url).toString()
  // one stage per character: opening it again brings it forward with the new options
  const open = allStages().find((s) => s.id === id)
  if (open) {
    open.key = url.searchParams.get('k')
    if (open.win.webContents.getURL() !== to) open.win.loadURL(to)
    open.win.show()
    return open
  }
  const win = new BrowserWindow({
    ...boundsFor(id),
    transparent: true, backgroundColor: '#00000000', frame: false, hasShadow: false,
    // transparent windows can't be resized by dragging their edges on Windows (Electron's documented limit): the
    // menu has sizes instead
    resizable: false, maximizable: false, fullscreenable: false,
    alwaysOnTop: settings().stage.alwaysOnTop, title: 'LivLiv 开播', show: false,
    // drawing and face tracking go on minimized or covered (--probe-throttle: Chromium's default, for probe.ts)
    webPreferences: webPreferences({ backgroundThrottling: DEV && process.argv.includes('--probe-throttle') }),
  })
  if (settings().stage.alwaysOnTop) win.setAlwaysOnTop(true, 'floating')
  if (process.platform !== 'darwin') win.removeMenu()  // no menu bar to show on Alt (Alt-drag)
  const s: Stage = {
    win, id, key: url.searchParams.get('k'), listening: false, ignoring: false, checking: false, last: { x: NaN, y: NaN, at: 0 },
    poll: setInterval(() => void hitTest(s), 33),
  }
  stages.set(win.id, s)
  guard(win.webContents, 'stage', (r) => openStage(r.url, r.id))
  applyClickMode(s)
  // the pointer moved over the window (forwarded while clicks go through): look at once, not at the next poll
  win.webContents.on('input-event', (_e, i) => { if (i.type === 'mouseMove') void hitTest(s) })
  win.webContents.on('did-start-navigation', (e) => { if (e.isMainFrame && !e.isSameDocument) s.listening = false })  // the next page says again
  win.once('ready-to-show', () => win.show())
  win.on('moved', () => remember(s))
  win.on('closed', () => { clearInterval(s.poll); dragEnd(s); stages.delete(win.id); notify() })
  win.loadURL(to)
  notify()
  return s
}

// ---------------------------------------------------------------- clicks through the transparent parts

/** an alpha this high (of 255) under the pointer is the character (anti-aliased edges included) */
const SOLID = 32

function setIgnore(s: Stage, on: boolean) {
  if (s.ignoring === on || s.win.isDestroyed()) return
  s.ignoring = on
  // forward: the page still sees the pointer move (Live.tsx shows its settings on mousemove), but clicks go through
  s.win.setIgnoreMouseEvents(on, { forward: true })
}

function applyClickMode(s: Stage) {
  const m = settings().stage.clickThrough
  s.ignoring = !(m === 'all' || m === 'alpha')  // forces the call below
  setIgnore(s, m === 'all' || m === 'alpha')
}

/** 'alpha': is the pointer over the character? The few pixels under it, read back from the compositor. On every
 *  pointer move over the window, on a 33 ms poll (a pointer coming from outside), and every 150 ms while it rests
 *  (the character moves under it) */
async function hitTest(s: Stage) {
  const mode = settings().stage.clickThrough
  if (mode !== 'alpha' || s.drag || s.checking || s.win.isDestroyed() || !s.win.isVisible() || s.win.isMinimized()) return
  const p = screen.getCursorScreenPoint(), b = s.win.getContentBounds()
  const x = p.x - b.x, y = p.y - b.y
  if (x < 0 || y < 0 || x >= b.width || y >= b.height) { setIgnore(s, true); return }
  const now = Date.now()
  if (p.x === s.last.x && p.y === s.last.y && now - s.last.at < 150) return
  s.last = { x: p.x, y: p.y, at: now }
  s.checking = true
  try {
    const img = await s.win.webContents.capturePage({ x: Math.max(0, x - 1), y: Math.max(0, y - 1), width: 3, height: 3 })
    const px = img.toBitmap()  // 4 bytes a pixel, alpha last on every platform (BGRA / RGBA)
    if (!px.length) return
    let a = 0
    for (let i = 3; i < px.length; i += 4) a = Math.max(a, px[i])
    setIgnore(s, a < SOLID)
  } catch { /* the window went away mid-capture */ } finally {
    s.checking = false
  }
}

export function setClickMode(m: ClickMode) {
  update((x) => { x.stage.clickThrough = m })
  allStages().forEach(applyClickMode)
  notify()
}

export function setAlwaysOnTop(on: boolean) {
  update((x) => { x.stage.alwaysOnTop = on })
  for (const s of allStages()) s.win.setAlwaysOnTop(on, 'floating')
  notify()
}

// ---------------------------------------------------------------- moving the window

/** follows the pointer from where it took hold until dragEnd (the page's pointerup); a minute at most, should the
 *  page never say */
export function dragStart(s: Stage) {
  dragEnd(s)
  const c = screen.getCursorScreenPoint(), b = s.win.getBounds(), until = Date.now() + 60_000
  setIgnore(s, false)
  s.drag = setInterval(() => {
    if (s.win.isDestroyed() || Date.now() > until) { dragEnd(s); return }
    const p = screen.getCursorScreenPoint()
    // the size again with every move: Windows otherwise grows a transparent window crossing screens of different scale
    s.win.setBounds({ x: b.x + p.x - c.x, y: b.y + p.y - c.y, width: b.width, height: b.height })
  }, 8)
}

export function dragEnd(s: Stage) {
  if (!s.drag) return
  clearInterval(s.drag); s.drag = undefined
  remember(s)
}

function resize(s: Stage, width: number, height: number) {
  const b = s.win.getBounds(), area = screen.getDisplayMatching(b).workArea
  const w = Math.min(width, area.width), h = Math.min(height, area.height)
  // the bottom middle stays where it was (a half-body character stands on it), inside the screen
  const x = Math.min(Math.max(area.x, Math.round(b.x + (b.width - w) / 2)), area.x + area.width - w)
  const y = Math.min(Math.max(area.y, b.y + b.height - h), area.y + area.height - h)
  s.win.setBounds({ x, y, width: w, height: h })
  remember(s)
}

// ---------------------------------------------------------------- commands and the menu

/** to every stage, or to this character's; how many took it */
export function deliver(cmd: CmdBody, character?: string): number {
  let n = 0
  for (const s of allStages()) {
    if ((character && s.id !== character) || !s.listening) continue
    s.win.webContents.send('livliv:command', cmd)
    n++
  }
  return n
}

export const keyOk = (character: string, key: string) => allStages().some((s) => s.id === character && !!s.key && same(s.key, key))

const ALT = process.platform === 'darwin' ? 'Option' : 'Alt'

/** the stage's menu: on a right click on the character (the page asks for it) and under the tray icon */
export function stageMenu(s: Stage): MenuItemConstructorOptions[] {
  const mode = settings().stage.clickThrough
  return [
    { label: `开播：${s.id}`, enabled: false },
    { label: '鼠标穿透', submenu: [
      { label: '只有角色接收鼠标', type: 'radio', checked: mode === 'alpha', click: () => setClickMode('alpha') },
      { label: '全部穿透（锁定，从托盘菜单解锁）', type: 'radio', checked: mode === 'all', click: () => setClickMode('all') },
      { label: '不穿透', type: 'radio', checked: mode === 'off', click: () => setClickMode('off') },
    ] },
    { label: '总在最前', type: 'checkbox', checked: settings().stage.alwaysOnTop, click: (i) => setAlwaysOnTop(i.checked) },
    { label: '窗口大小', submenu: SIZES.map((z) => ({ label: z.label, click: () => resize(s, z.width, z.height) })) },
    { type: 'separator' },
    { label: `拖动角色移动窗口，按住 ${ALT} 拖动只移动画面里的角色`, enabled: false },
    { label: '重新载入', click: () => s.win.webContents.reload() },
    { label: '最小化', click: () => s.win.minimize() },
    { label: '关闭开播窗口', click: () => s.win.close() },
  ]
}

export function popupMenu(s: Stage) {
  Menu.buildFromTemplate(stageMenu(s)).popup({ window: s.win })
}
