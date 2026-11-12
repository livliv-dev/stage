// Global hotkeys: registered with the system, so they work while a game has the keyboard. Only while
// a stage is open (they take those keys from every other program), and each needs a modifier (Ctrl, Alt...) unless
// it is F13-F24, which no keyboard types with. By default the live window's own keys (commands.ts LIVE_KEYS) behind
// the prefix in the settings, Ctrl+Alt: Ctrl+Alt+1 the first expression, Ctrl+Alt+Q a nod, Ctrl+Alt+Space front.
// LivLiv Stage's set starts off and leaves Space alone (Ctrl+Option+Space switches input sources on macOS); on Windows
// its prefix is Ctrl+Shift+Alt, because Ctrl+Alt is AltGr there and types @ { } and more on many keyboards. A binding
// that would take a shortcut from the system or from every program (Cmd+Q, Ctrl+C...) is refused.
// The system tells a program only that its hotkey was pressed, never released: an expression set to show while held
// shows for 3 s, as from the command URL.
import { globalShortcut } from 'electron'
import { LIVE_KEYS, parseDo } from './commands'
import type { Binding } from './settings'

export type HotkeyState = Binding & { ok: boolean; why?: string }

const MODS = new Set(['command', 'cmd', 'control', 'ctrl', 'commandorcontrol', 'cmdorctrl', 'alt', 'option', 'altgr', 'shift', 'super', 'meta'])
const KEY = /^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Up|Down|Left|Right|Home|End|PageUp|PageDown|Insert|Delete|num[0-9]|numadd|numsub|nummult|numdiv|numdec)$/

// what the system or every program already does with these
const SYSTEM = {
  darwin: ['Command+Q', 'Command+W', 'Command+H', 'Command+M', 'Command+Tab', 'Command+Space', 'Command+A', 'Command+C', 'Command+V',
    'Command+X', 'Command+Z', 'Command+S', 'Command+Shift+Z', 'Command+Shift+3', 'Command+Shift+4', 'Command+Shift+5', 'Control+Space',
    'Control+Alt+Space', 'Control+Command+Space', 'Control+Command+Q', 'Control+Up', 'Control+Down', 'Control+Left', 'Control+Right'],
  other: ['Alt+F4', 'Alt+Tab', 'Alt+Space', 'Control+A', 'Control+C', 'Control+V', 'Control+X', 'Control+Y', 'Control+Z', 'Control+S',
    'Control+Space', 'Control+Alt+Delete', 'Super+D', 'Super+E', 'Super+L', 'Super+R', 'Super+Tab', 'Super+Space', 'Super+Up', 'Super+Down',
    'Super+Left', 'Super+Right'],
}
/** one spelling per key combination: Cmd, Command, Super and Meta are one key, CommandOrControl is Cmd or Ctrl */
function combo(a: string, mac: boolean): string {
  const parts = a.split('+'), key = (parts.pop() || '').toUpperCase()
  const mod = (m: string) => /^(command|cmd|super|meta)$/.test(m) ? (mac ? 'cmd' : 'super')
    : /^(commandorcontrol|cmdorctrl)$/.test(m) ? (mac ? 'cmd' : 'ctrl') : m === 'control' ? 'ctrl' : m === 'option' ? 'alt' : m
  return [...parts.map((m) => mod(m.toLowerCase())).sort(), key].join('+')
}
const TAKEN = { darwin: new Set(SYSTEM.darwin.map((a) => combo(a, true))), other: new Set(SYSTEM.other.map((a) => combo(a, false))) }

/** null when usable; else why not */
export function checkAccelerator(a: string, platform: string = process.platform): string | null {
  if (typeof a !== 'string' || a.length > 64) return '写法不对'
  const parts = a.split('+'), key = parts.pop() || '', mods = parts.map((m) => m.toLowerCase())
  if (!KEY.test(key.length === 1 ? key.toUpperCase() : key)) return `不支持的按键：${key}`
  if (mods.some((m) => !MODS.has(m)) || new Set(mods).size !== mods.length) return '修饰键写法不对'
  if (!mods.some((m) => m !== 'shift') && !/^F(1[3-9]|2[0-4])$/.test(key)) return '要带 Ctrl、Alt 之类的修饰键'
  const mac = platform === 'darwin'
  if ((mac ? TAKEN.darwin : TAKEN.other).has(combo(a, mac))) return '被别的程序占用了'
  return null
}

export const defaultBindings = (prefix: string): Binding[] =>
  LIVE_KEYS.map((k) => ({ accelerator: prefix ? `${prefix}+${k.key}` : k.key, do: k.do }))
/** Stage's prefix */
export const stagePrefix = (platform: string = process.platform) => (platform === 'win32' ? 'Control+Shift+Alt' : 'Control+Alt')
export const stageBindings = (prefix: string): Binding[] => [
  ...'12345'.split('').map((key) => ({ key, do: 'expr:' + key })),
  { key: '0', do: 'clear' }, { key: 'Q', do: 'act:nod' }, { key: 'W', do: 'act:shake' },
  { key: 'C', do: 'calibrate' }, { key: 'M', do: 'mute' }, { key: 'P', do: 'ai-pause' },
  { key: 'S', do: 'ai-stop' }, { key: 'V', do: 'ptt' },
].map((b) => ({ accelerator: prefix + '+' + b.key, do: b.do }))

/** Stage's saved hotkey settings. Settings saved before they started off (`current` false) had them on with
 *  Control+Alt whether or not anyone chose so: there, only bindings the user saved keep them on */
export function readStageHotkeys(saved: { enabled?: unknown; prefix?: unknown }, bindings: Binding[] | null, current: boolean, platform: string = process.platform) {
  const prefix = typeof saved.prefix === 'string' && (current || saved.prefix !== 'Control+Alt') ? saved.prefix : stagePrefix(platform)
  return { enabled: current ? saved.enabled === true : bindings !== null, prefix, bindings }
}

let state: HotkeyState[] = []
export const hotkeyState = () => state

/** register `bindings` (on), or none (off); fire gets the binding's `do` */
export function applyHotkeys(bindings: Binding[], on: boolean, fire: (d: string) => void) {
  globalShortcut.unregisterAll()
  state = bindings.map((b) => {
    const why = checkAccelerator(b.accelerator) ?? (parseDo(b.do) ? null : '不认识这个指令')
    if (why) return { ...b, ok: false, why }
    if (!on) return { ...b, ok: false, why: '没有开播窗口，或者热键已关闭' }
    let ok = false
    try { ok = globalShortcut.register(b.accelerator, () => fire(b.do)) } catch { /* Electron refused the accelerator */ }
    return ok ? { ...b, ok } : { ...b, ok, why: '被别的程序占用了' }
  })
}

/** bindings handed over by the page: the usable ones, at most 64, no accelerator twice */
export function cleanBindings(raw: unknown): Binding[] | null {
  if (!Array.isArray(raw) || raw.length > 64) return null
  const seen = new Set<string>(), out: Binding[] = []
  for (const b of raw) {
    if (!b || typeof b !== 'object') return null
    const { accelerator, do: d } = b as Record<string, unknown>
    if (typeof accelerator !== 'string' || typeof d !== 'string' || checkAccelerator(accelerator) || !parseDo(d)) return null
    if (seen.has(accelerator.toLowerCase())) return null
    seen.add(accelerator.toLowerCase()); out.push({ accelerator, do: d })
  }
  return out
}
