// LivLiv desktop shell: the website in a window, its live window as a transparent stage on the desktop,
// and what a browser can't do, as modules that can each be switched off (settings.ts, the tray): global hotkeys
// (hotkeys.ts) and the local command endpoint (localApi.ts). The runtime and the pages are the site's own: nothing
// of them is copied here. Built as LivLiv Stage (config.ts APP), it is the Stage editor in a window instead
// (stageApp.ts). Global commands go to the editor; the site shell keeps its separate live windows, endpoint and tray.
import { randomBytes } from 'node:crypto'
import { app, BrowserWindow, globalShortcut, Menu, type MenuItemConstructorOptions } from 'electron'
import { parseDo } from './commands'
import { APP, APP_ORIGIN, DEV, flag, LIVLIV_API, ORIGINS, STAGE_BUILT, STAGE_DIR, VERSION } from './config'
import { applyHotkeys, defaultBindings, hotkeyState, stageBindings } from './hotkeys'
import { registerIpc } from './ipc'
import { startLocalApi, type LocalApi } from './localApi'
import { deliverMain, mainContents, openMain } from './mainWindow'
import { startProbe, startStageProbe } from './probe'
import { hardenSession } from './security'
import { saveDownloads } from './downloads'
import { registerStageScheme, serveStage } from './stageApp'
import { flush, settings, update } from './settings'
import { allStages, deliver, keyOk, onStagesChanged, openStage } from './stages'
import { createTray, refreshTray } from './tray'
import { stageControl } from './stageControl'
import { MotionInput } from './motionInput'
import { stageFromPath } from './urls'

// ---------------------------------------------------------------- global hotkeys

let hotkeysSig = ''
function syncHotkeys() {
  const h = settings().hotkeys, bindings = h.bindings ?? (APP === 'stage' ? stageBindings(h.prefix) : defaultBindings(h.prefix))
  const on = h.enabled && (APP === 'stage' || allStages().length > 0)
  const sig = JSON.stringify([bindings, on])
  if (sig === hotkeysSig) return
  hotkeysSig = sig
  applyHotkeys(bindings, on, (d) => { const c = parseDo(d); if (c) { if (APP === 'stage') deliverMain(c); else deliver(c) } })
}
function enableHotkeys(on: boolean) {
  update((s) => { s.hotkeys.enabled = on })
  syncHotkeys()
  refreshTray()
}

// ---------------------------------------------------------------- local command endpoint

const motionInput = APP === 'stage' ? new MotionInput((event) => { const editor = mainContents(); if (editor && !editor.isDestroyed()) editor.send('livliv:motion', event) }) : null
const control = APP === 'stage' ? stageControl(mainContents) : undefined
let api: LocalApi | null = null
let apiError: string | null = null
let apiQueue = Promise.resolve()
function syncLocalApi() {
  apiQueue = apiQueue.then(async () => {
    const config = APP === 'stage' ? settings().stageApi : settings().localApi
    const want = config.enabled
    if (want && !api) {
      try {
        api = await startLocalApi(config.port, {
          ...(control ? { stage: control } : {}),
          token: () => settings().token, deliver, keyOk, stages: () => APP === 'stage' ? Number(!!mainContents()) : allStages().length, version: VERSION, origins: ORIGINS,
        })
        apiError = null
      } catch (e) {
        apiError = String(e)
        console.error('[local api]', e)
      }
    } else if (!want && api) {
      await api.close()
      api = null
    }
    if (!want) apiError = null
    refreshTray()
  })
  return apiQueue
}
const stageApiState = () => ({ enabled: settings().stageApi.enabled, port: api?.port ?? null, token: settings().token, error: apiError })
const commandUrl = () => (api ? `http://127.0.0.1:${api.port}/api/live/cmd?token=${settings().token}&do=` : null)

// ---------------------------------------------------------------- app

function capabilities() {
  return ['stage-window', 'click-through', 'background-unthrottled',
    ...(settings().hotkeys.enabled ? ['global-hotkeys'] : []), ...(api ? ['local-commands'] : [])]
}

function appMenu() {
  const view: MenuItemConstructorOptions[] = [{ role: 'reload' }, { role: 'forceReload' }, ...(DEV ? [{ role: 'toggleDevTools' } as const] : []),
    { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }]
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' } as const] : []),
    { role: 'editMenu' }, { role: 'viewMenu', submenu: view }, { role: 'windowMenu' },
  ]))
}

/** --stage=/live/<id>?… opens that stage at start (or in the running shell, from a second launch) */
function stageArg(argv: string[]) {
  const a = argv.find((x) => x.startsWith('--stage='))
  const r = a ? stageFromPath(a.slice('--stage='.length), APP_ORIGIN) : null
  if (r) openStage(r.url, r.id)
  return !!r
}

function startStage() {
  if (STAGE_BUILT) serveStage(STAGE_DIR, LIVLIV_API, () => api?.port ?? null)
  openMain()
  syncHotkeys()
  void syncLocalApi()
  void motionInput?.configure(settings().trackingInput)
  console.log(`[livliv] LivLiv Stage ${VERSION} on ${APP_ORIGIN}${STAGE_BUILT ? ` (${STAGE_DIR}, LivLiv at ${LIVLIV_API})` : ''}${DEV ? ' (development)' : ''}`)
}

if (APP === 'stage') registerStageScheme()
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', (_e, argv) => { if (APP === 'stage' || !stageArg(argv)) openMain() })
  app.whenReady().then(() => {
    hardenSession()
    saveDownloads()
    appMenu()
    registerIpc({
      ...(motionInput ? { tracking: { get: () => motionInput.state(), set: async (value) => { update((s) => { s.trackingInput = value }); return motionInput.configure(value) } } } : {}),
      capabilities: () => (APP === 'stage' ? ['global-hotkeys', ...(api ? ['local-commands'] : [])] : capabilities()),
      ...(APP === 'stage' ? { stageApi: { get: stageApiState, set: async (enabled: boolean) => { update((s) => { s.stageApi.enabled = enabled }); await syncLocalApi(); return stageApiState() }, rotate: () => { update((s) => { s.token = randomBytes(16).toString('hex') }); return stageApiState() } } } : {}),
      local: () => (api ? { port: api.port, commandUrl: commandUrl()! } : null),
      hotkeys: {
        list: hotkeyState,
        set: (b) => { update((s) => { s.hotkeys.bindings = b }); syncHotkeys(); refreshTray(); return hotkeyState() },
        enabled: () => settings().hotkeys.enabled,
        enable: (on) => { enableHotkeys(on); return hotkeyState() },
      },
    })
    if (APP === 'stage') {
      startStage()
      const probe = DEV ? flag('probe') : undefined
      if (probe) startStageProbe(probe, process.argv.includes('--probe-scenario'))
      return
    }
    createTray({
      openMain,
      hotkeys: () => ({ enabled: settings().hotkeys.enabled, list: hotkeyState() }),
      setHotkeys: enableHotkeys,
      local: () => ({ enabled: settings().localApi.enabled, port: api?.port ?? null, commandUrl: commandUrl(), error: apiError }),
      setLocal: (on) => { update((s) => { s.localApi.enabled = on }); syncLocalApi() },
    })
    onStagesChanged(() => { syncHotkeys(); refreshTray() })
    syncHotkeys()
    syncLocalApi()
    const probe = DEV ? flag('probe') : undefined
    if (probe) startProbe(probe, process.argv.includes('--probe-scenario'))
    if (!stageArg(process.argv) || process.argv.includes('--main')) openMain()
    console.log(`[livliv] ${VERSION} on ${APP_ORIGIN}${DEV ? ' (development)' : ''}`)
  })
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openMain() })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('will-quit', () => { globalShortcut.unregisterAll(); void motionInput?.close().catch((error) => console.error('[tracking close]', error)); flush() })
}
