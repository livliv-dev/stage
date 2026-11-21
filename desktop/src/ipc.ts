// The main process's side of window.livlivDesktop (preload.ts). Every call is checked again here: it must come from
// the top frame of a page of our origin (security.ts trusted), and window calls act on the caller's own window.
import { BrowserWindow, desktopCapturer, dialog, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'
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
import { readNeuroAnswer, readNeuroConfig, type NeuroConfig, type NeuroSpeech, type NeuroState } from './neuroProtocol'
import { readCollabConfig, type CollabConfig, type CollabState } from './collabProtocol'
import type { AiriGameHost } from './airiGameHost'
import { readAiriGameConfig } from './airiGameProtocol'
import type { VoiceboxClient } from './voicebox'

export type IpcDeps = {
  collab?: { state(): CollabState; start(config: CollabConfig): Promise<CollabState>; close(): Promise<CollabState> }
  neuro?: { state(): NeuroState; configure(config: NeuroConfig): Promise<NeuroState>; answer(owner: number, id: unknown, value: unknown): boolean; speech(status: NeuroSpeech): void }
  tracking?: { get(): MotionState; set(settings: MotionSettings): Promise<MotionState> }
  stageApi?: { get(): StageApiState; set(enabled: boolean): Promise<StageApiState>; rotate(): StageApiState }
  airiGames?: AiriGameHost
  voicebox?: VoiceboxClient
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
  const watchedGameEditors = new WeakSet<WebContents>()
  handle('livliv:airi-game', async (event, op, value, input) => {
    const games = deps.airiGames, editor = event.sender
    if (!games || APP !== 'stage' || editor !== mainContents()) throw new Error('Stage editor only')
    if (op === 'select-bridge') {
      const window = BrowserWindow.fromWebContents(editor)
      if (!window) return null
      const { filePaths } = await dialog.showOpenDialog(window, {
        properties: ['openFile'], filters: [{ name: 'Airicraft bridge state', extensions: ['json'] }],
      })
      return filePaths[0] ? games.selectBridge(filePaths[0]) : null
    }
    if (op === 'connect') {
      const config = readAiriGameConfig(input)
      if (!config || typeof value !== 'string' || !/^[0-9a-f-]{36}$/.test(value)) throw new Error('Invalid AIRI game settings')
      if (!watchedGameEditors.has(editor)) {
        watchedGameEditors.add(editor)
        const close = () => { void games.stop().catch((error: unknown) => console.error('[AIRI game close]', error)) }
        editor.on('destroyed', close)
        editor.on('did-start-loading', close)
      }
      return games.connect(config, (message) => {
        if (!editor.isDestroyed() && editor === mainContents()) editor.send('livliv:airi-game-event', message)
      }, value)
    }
    if (typeof value !== 'string' || value.length > 100) throw new Error('Invalid AIRI game session')
    if (op === 'stop') return games.stop(value)
    if (op === 'cancel') return games.cancel(value)
    if (op === 'snapshot') return games.snapshot(value, input === true)
    if (op === 'execute') {
      const answer = readNeuroAnswer({ ok: true, action: input })
      if (answer?.ok && answer.action) return games.execute(value, answer.action)
    }
    throw new Error('Invalid AIRI game operation')
  })
  // Voicebox on this computer (voicebox.ts): its profiles, a line said, what you said heard. A line can be given up
  // (cancel, by the id the page chose); the editor's lines only
  const voiceboxCalls = new Map<string, AbortController>()
  handle('livliv:voicebox', async (event, op, id, value, language) => {
    const voicebox = deps.voicebox
    if (!voicebox || APP !== 'stage' || event.sender !== mainContents()) throw new Error('Stage editor only')
    if (op === 'profiles') return voicebox.profiles()
    if (typeof id !== 'string' || !/^[\w-]{1,64}$/.test(id)) throw new Error('Invalid Voicebox call')
    if (op === 'cancel') { voiceboxCalls.get(id)?.abort(); voiceboxCalls.delete(id); return null }
    const lang = typeof language === 'string' && /^[a-z]{2}$/.test(language) ? language : undefined
    const controller = new AbortController()
    voiceboxCalls.set(id, controller)
    try {
      if (op === 'speak') {
        const line = value as { profile?: unknown; text?: unknown }
        if (!line || typeof line.profile !== 'string' || line.profile.length > 200 || typeof line.text !== 'string' || !line.text || line.text.length > 5000) throw new Error('Invalid Voicebox line')
        return await voicebox.speak(line.profile, line.text, lang ?? 'en', controller.signal)
      }
      if (op === 'transcribe') {
        if (!(value instanceof ArrayBuffer) || value.byteLength > 25_000_000) throw new Error('Invalid recording')
        return await voicebox.transcribe(value, lang, controller.signal)
      }
      throw new Error('Invalid Voicebox operation')
    } catch (error) {
      if (controller.signal.aborted) return { ok: false, error: 'failed', detail: 'cancelled' }
      throw error
    } finally { voiceboxCalls.delete(id) }
  })
  handle('livliv:vision', async (event, op, sourceId) => {
    if (APP !== 'stage' || event.sender !== mainContents()) throw new Error('Stage editor only')
    const ownWindows = new Set(BrowserWindow.getAllWindows().map((win) => win.getMediaSourceId()))
    if (op === 'list') {
      const windows = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } })
      return windows.filter((source) => !ownWindows.has(source.id)).map(({ id, name }) => ({ id, name }))
    }
    if (op !== 'frame' || typeof sourceId !== 'string' || !/^window:[-\d]+:[-\d]+$/.test(sourceId) || sourceId.length > 100 || ownWindows.has(sourceId)) throw new Error('Invalid capture window')
    const windows = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 960, height: 540 } })
    const image = windows.find((source) => source.id === sourceId)?.thumbnail
    return image?.isEmpty() === false ? { mimeType: 'image/jpeg', data: image.toJPEG(78).toString('base64') } : null
  })
  handle('livliv:collab', (event, op, value) => {
    if (APP !== 'stage' || !deps.collab || event.sender !== mainContents()) throw new Error('Stage editor only')
    if (op === 'get') return deps.collab.state()
    if (op === 'stop') return deps.collab.close()
    if (op === 'start') {
      const config = readCollabConfig(value)
      if (!config) throw new Error('Invalid co-stream service settings')
      return deps.collab.start(config)
    }
    throw new Error('Unknown co-stream service operation')
  })
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
  handle('livliv:neuro', (event, op, value) => {
    if (APP !== 'stage' || !deps.neuro || event.sender !== mainContents()) throw new Error('Stage editor only')
    if (op === 'get') return deps.neuro.state()
    if (op === 'set') {
      const config = readNeuroConfig(value)
      if (!config) throw new Error('Invalid game integration settings')
      return deps.neuro.configure(config)
    }
    if (op === 'speech' && value && typeof value === 'object' && !Array.isArray(value)) {
      const status = value as Record<string, unknown>
      if (typeof status.character !== 'string' || status.character.length > 200 || typeof status.isFinal !== 'boolean' || (status.cancelled !== undefined && typeof status.cancelled !== 'boolean')) throw new Error('Invalid speech state')
      deps.neuro.speech({ character: status.character, isFinal: status.isFinal, ...(status.cancelled === true ? { cancelled: true } : {}) })
      return undefined
    }
    throw new Error('Unknown game integration operation')
  })
  ipcMain.on('livliv:neuro-result', (event, id: unknown, value: unknown) => {
    if (APP === 'stage' && deps.neuro && trusted(event) && event.sender === mainContents()) deps.neuro.answer(event.sender.id, id, value)
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
