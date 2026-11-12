// The main process's side of window.livlivDesktop (preload.ts). Every call is checked again here: it must come from
// the top frame of a page of our origin (security.ts trusted), and window calls act on the caller's own window.
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { APP, APP_ORIGIN, VERSION } from './config'
import { cleanBindings, type HotkeyState } from './hotkeys'
import { trusted } from './security'
import { beginRequest, cancelRequest } from './requests'
import type { Binding } from './settings'
import { dragEnd, dragStart, openStage, popupMenu, setAlwaysOnTop, setClickMode, stageOf } from './stages'
import { mainContents } from './mainWindow'
import type { StageApiState } from './stageCommands'
import { readMotionSettings, type MotionSettings, type MotionState } from './trackingProtocol'
import { stageFromPath } from './urls'

export type IpcDeps = {
  tracking?: { get(): MotionState; set(settings: MotionSettings): Promise<MotionState> }
  stageApi?: { get(): StageApiState; set(enabled: boolean): Promise<StageApiState>; rotate(): StageApiState }
  capabilities: () => string[]
  local: () => { port: number; commandUrl: string } | null
  hotkeys: { list: () => HotkeyState[]; set: (b: Binding[] | null) => HotkeyState[]; enabled: () => boolean; enable: (on: boolean) => HotkeyState[] }
}

export function registerIpc(deps: IpcDeps) {
  ipcMain.on('livliv:info', (e) => {
    const role = stageOf(BrowserWindow.fromWebContents(e.sender)) ? 'stage' : 'main'
    e.returnValue = trusted(e) ? { api: 1, version: VERSION, platform: process.platform, role, stageEditor: APP === 'stage' && e.sender === mainContents() } : null
  })
  // a stage page that takes commands (it says so on load): only those count as delivered, as the server counts stages
  ipcMain.on('livliv:listening', (e, n) => {
    const s = stageOf(BrowserWindow.fromWebContents(e.sender))
    if (s && trusted(e)) s.listening = typeof n === 'number' && n > 0
  })
  const handle = (channel: string, f: (e: IpcMainInvokeEvent, ...args: unknown[]) => unknown) =>
    ipcMain.handle(channel, (e, ...args) => {
      if (!trusted(e)) throw new Error('not allowed')
      return f(e, ...args)
    })
  handle('livliv:request', (event, op, id) => {
    if (op === 'begin') return beginRequest(event.sender)
    if (op === 'cancel') return cancelRequest(event.sender.id, id)
    throw new Error('unknown request operation')
  })
  handle('livliv:capabilities', () => deps.capabilities())
  handle('livliv:local', (event) => APP === 'stage' && event.sender !== mainContents() ? null : deps.local())
  handle('livliv:tracking', (event, op, value) => {
    if (!deps.tracking || event.sender !== mainContents()) throw new Error('Stage editor only')
    if (op === 'get') return deps.tracking.get()
    if (op === 'set') {
      const config = readMotionSettings(value)
      if (!config) throw new Error('Invalid tracking settings')
      return deps.tracking.set(config)
    }
    throw new Error('Unknown tracking operation')
  })
  handle('livliv:stage-api', (event, op, value) => {
    if (!deps.stageApi || event.sender !== mainContents()) throw new Error('Stage editor only')
    if (op === 'get') return deps.stageApi.get()
    if (op === 'rotate') return deps.stageApi.rotate()
    if (op === 'set' && typeof value === 'boolean') return deps.stageApi.set(value)
    throw new Error('Unknown Stage API operation')
  })
  handle('livliv:hotkeys', (event, op, arg) => {
    if (APP === 'stage' && op !== 'list' && event.sender !== mainContents()) throw new Error('Stage editor only')
    if (op === 'list') return deps.hotkeys.list()
    if (op === 'reset') return deps.hotkeys.set(null)
    if (op === 'enabled') return deps.hotkeys.enabled()
    if (op === 'enable' && typeof arg === 'boolean') return deps.hotkeys.enable(arg)
    if (op !== 'set') throw new Error('unknown')
    const b = cleanBindings(arg)
    if (!b) throw new Error('bindings: [{ accelerator, do }], each with a modifier and a command as /api/live/cmd takes')
    return deps.hotkeys.set(b)
  })
  handle('livliv:window', (e, op, arg) => {
    const win = BrowserWindow.fromWebContents(e.sender), s = stageOf(win)
    if (op === 'minimize') win?.minimize()
    else if (op === 'close') win?.close()
    else if (op === 'openStage') {
      const r = stageFromPath(arg as string, APP_ORIGIN)
      if (!r) return false
      openStage(r.url, r.id)
      return true
    } else if (op === 'clickThrough') { if (arg === 'alpha' || arg === 'all' || arg === 'off') setClickMode(arg) }
    else if (op === 'alwaysOnTop') { if (typeof arg === 'boolean') setAlwaysOnTop(arg) }
    else if (s && op === 'menu') popupMenu(s)  // these: the stage's own window only
    else if (s && op === 'dragStart') dragStart(s)
    else if (s && op === 'dragEnd') dragEnd(s)
    return undefined
  })
}
