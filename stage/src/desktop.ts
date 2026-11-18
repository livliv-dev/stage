import { tr } from './i18n'
import { desktop } from './desktopBridge'
export { desktop, type Shortcut } from './desktopBridge'
import type { CmdBody } from '../../desktop/src/commands'
import { performStageCommand, stageState } from './control'

export const command = (cmd: CmdBody) => performStageCommand(cmd)
export const connectDesktop = () => {
  if (!desktop) return () => {}
  const offCommand = desktop.onCommand(command)
  const offControl = desktop.onControl?.((request) => request.command ? performStageCommand(request.command) : stageState()) ?? (() => {})
  return () => { offCommand(); offControl() }
}
const names: Record<string, string> = { clear: '恢复表情', calibrate: '校准正面', mute: '静音所有角色声音', 'ai-pause': '暂停 / 继续 AI', 'ai-stop': '停止 AI', ptt: '开始 / 结束语音输入', 'act:nod': '点头', 'act:shake': '摇头' }
export const shortcutName = (cmd: string) => (names[cmd] ? tr(names[cmd]) : null) ?? (cmd.startsWith('expr:') ? tr("表情 ") + cmd.slice(5) : cmd)
