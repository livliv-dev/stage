// window.livlivDesktop: everything the page can ask of the shell, and nothing more. Sandboxed
// preloads can't load other files, so this one stands alone; the main process checks every call again (ipc.ts:
// only the top frame of our own origin). Stage's side is stage/src/desktopBridge.ts; the website has its own. Version 1:
//   api, version, platform, role ('main' | 'stage')
//   capabilities()                       the modules that are on: 'stage-window', 'global-hotkeys', 'local-commands'...
//   localPort()                          { port, commandUrl } of the local endpoint, or null when it is off
//   hotkeys.list() / set(bindings) / reset()   [{ accelerator, do }] with whether each registered
//   hotkeys.enabled() / enable(on)        whether global hotkeys are on (LivLiv Stage: off until turned on)
//   window.clickThrough(mode) / alwaysOnTop(on) / minimize() / close() / menu() / dragStart() / dragEnd()
//   window.openStage('/live/<id>?…')     opens a stage window
//   onCommand(cb) -> unsubscribe        a stage's commands (hotkeys, local endpoint), as CmdBody
import type { MotionEvent, MotionSettings, MotionState } from './trackingProtocol'
import type { StageApiState, StageControlRequest } from './stageCommands'
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

type Info = { api: 1; version: string; platform: string; role: 'main' | 'stage'; stageEditor: boolean }

const info = ipcRenderer.sendSync('livliv:info') as Info | null
if (info) {
  const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
  const win = (op: string, arg?: unknown) => invoke('livliv:window', op, arg)
  contextBridge.exposeInMainWorld('livlivDesktop', {
    ...info,
    ...(info.stageEditor ? {
      tracking: { get: (): Promise<MotionState> => invoke('livliv:tracking', 'get'), set: (settings: MotionSettings): Promise<MotionState> => invoke('livliv:tracking', 'set', settings) },
      onMotion: (callback: (event: MotionEvent) => void) => {
        const listener = (_event: IpcRendererEvent, value: MotionEvent) => callback(value)
        ipcRenderer.on('livliv:motion', listener)
        return () => { ipcRenderer.removeListener('livliv:motion', listener) }
      },
    } : {}),
    capabilities: () => invoke('livliv:capabilities'),
    requests: { begin: () => invoke('livliv:request', 'begin'), cancel: (id: string) => invoke('livliv:request', 'cancel', id) },
    localPort: () => invoke('livliv:local'),
    stageApi: { get: (): Promise<StageApiState> => invoke('livliv:stage-api', 'get'), set: (enabled: boolean): Promise<StageApiState> => invoke('livliv:stage-api', 'set', enabled), rotate: (): Promise<StageApiState> => invoke('livliv:stage-api', 'rotate') },
    onControl: (callback: (request: StageControlRequest) => unknown) => {
      const listener = (_event: IpcRendererEvent, request: StageControlRequest) => {
        Promise.resolve().then(() => Date.now() > request.expires ? { ok: false, status: 503, error: 'Command expired' } : callback(request)).then((result) => ipcRenderer.send('livliv:control-result', request.id, result), (error: unknown) => ipcRenderer.send('livliv:control-result', request.id, { ok: false, status: 503, error: error instanceof Error ? error.message : 'Stage command failed' }))
      }
      ipcRenderer.on('livliv:control', listener)
      return () => { ipcRenderer.removeListener('livliv:control', listener) }
    },
    hotkeys: {
      list: () => invoke('livliv:hotkeys', 'list'),
      set: (bindings: unknown) => invoke('livliv:hotkeys', 'set', bindings),
      reset: () => invoke('livliv:hotkeys', 'reset'),
      enabled: () => invoke('livliv:hotkeys', 'enabled'),
      enable: (on: boolean) => invoke('livliv:hotkeys', 'enable', on),
    },
    window: {
      clickThrough: (mode: unknown) => win('clickThrough', mode),
      alwaysOnTop: (on: unknown) => win('alwaysOnTop', on),
      minimize: () => win('minimize'),
      close: () => win('close'),
      menu: () => win('menu'),
      dragStart: () => win('dragStart'),
      dragEnd: () => win('dragEnd'),
      openStage: (path: unknown) => win('openStage', path),
    },
    onCommand: (cb: (cmd: unknown) => void) => {
      if (typeof cb !== 'function') return () => {}
      const f = (_e: IpcRendererEvent, cmd: unknown) => cb(cmd)
      ipcRenderer.on('livliv:command', f)
      ipcRenderer.send('livliv:listening', ipcRenderer.listenerCount('livliv:command'))
      return () => {
        ipcRenderer.removeListener('livliv:command', f)
        ipcRenderer.send('livliv:listening', ipcRenderer.listenerCount('livliv:command'))
      }
    },
  })
}
