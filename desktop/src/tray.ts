// The tray icon (the menu bar on macOS): each stage's menu, the modules' switches, quitting. The only way back from
// 「全部穿透」, where the stage takes no clicks at all.
import { join } from 'node:path'
import { app, clipboard, dialog, Menu, nativeImage, Tray, type MenuItemConstructorOptions } from 'electron'
import { VERSION } from './config'
import type { HotkeyState } from './hotkeys'
import { allStages, stageMenu } from './stages'

export type TrayDeps = {
  openMain: () => void
  hotkeys: () => { enabled: boolean; list: HotkeyState[] }
  setHotkeys: (on: boolean) => void
  local: () => { enabled: boolean; port: number | null; commandUrl: string | null; error: string | null }
  setLocal: (on: boolean) => void
}

let tray: Tray | null = null
let deps: TrayDeps

function template(): MenuItemConstructorOptions[] {
  const stages = allStages(), hk = deps.hotkeys(), local = deps.local()
  const ok = hk.list.filter((h) => h.ok).length
  return [
    { label: `LivLiv 桌面版 ${VERSION}`, enabled: false },
    { label: '打开主窗口', click: deps.openMain },
    { type: 'separator' },
    ...(stages.length
      ? stages.map((s): MenuItemConstructorOptions => ({ label: `开播窗口：${s.id}`, submenu: stageMenu(s) }))
      : [{ label: '没有开播窗口（在角色页点「打开直播窗口」）', enabled: false }]),
    { type: 'separator' },
    { label: hk.enabled && stages.length ? `全局热键（${ok}/${hk.list.length} 个生效）` : '全局热键', type: 'checkbox', checked: hk.enabled, click: (i) => deps.setHotkeys(i.checked) },
    { label: '查看热键…', click: showHotkeys },
    { label: local.port ? `本机指令端点（127.0.0.1:${local.port}）` : local.error ? `本机指令端点（没有开起来）` : '本机指令端点', type: 'checkbox', checked: local.enabled, click: (i) => deps.setLocal(i.checked) },
    { label: '复制指令地址', enabled: !!local.commandUrl, click: () => { if (local.commandUrl) clipboard.writeText(`${local.commandUrl}expr:1`) } },
    { type: 'separator' },
    { label: '退出', role: 'quit' },
  ]
}

function showHotkeys() {
  const hk = deps.hotkeys()
  const lines = hk.list.map((h) => `${h.ok ? '✓' : '✗'}  ${h.accelerator.replace(/\+/g, ' + ')}    ${h.do}${h.why ? `（${h.why}）` : ''}`)
  dialog.showMessageBox({
    type: 'info', title: '全局热键', message: hk.enabled ? '开播窗口打开时，这些热键在任何程序里都能用' : '全局热键已关闭',
    detail: `${lines.join('\n')}\n\n指令和网站的指令地址一样：expr:数字键 表情，act:nod 等动作，clear 恢复，calibrate 校准正面。`,
  })
}

export function refreshTray() {
  if (tray) tray.setContextMenu(Menu.buildFromTemplate(template()))
}

export function createTray(d: TrayDeps) {
  deps = d
  const mac = process.platform === 'darwin'
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'assets', mac ? 'trayTemplate.png' : 'tray.png'))
  if (mac) icon.setTemplateImage(true)
  tray = new Tray(icon)
  tray.setToolTip('LivLiv')
  if (icon.isEmpty() && mac) tray.setTitle('LivLiv')
  if (!mac) tray.on('click', () => tray?.popUpContextMenu())  // Windows opens the menu on a right click only
  refreshTray()
}
