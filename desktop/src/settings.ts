// The shell's own settings, in userData/settings.json (Windows %APPDATA%\LivLiv, macOS ~/Library/Application
// Support/LivLiv). Each native module can be turned off here or from the tray, one by one. Written a moment after the
// last change, through a temporary file.
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { APP } from './config'
import { readStageHotkeys, stagePrefix } from './hotkeys'
import { defaultMotionSettings, readMotionSettings, type MotionSettings } from './trackingProtocol'

export type ClickMode = 'alpha' | 'all' | 'off'
export type Rect = { x: number; y: number; width: number; height: number }
export type Binding = { accelerator: string; do: string }

export type Settings = {
  /** 2: LivLiv Stage's global hotkeys start off */
  format: number
  /** the local endpoint's token (?token=, or Authorization: Bearer) */
  token: string
  localApi: { enabled: boolean; port: number }
  stageApi: { enabled: boolean; port: number }
  trackingInput: MotionSettings
  /** prefix: the modifiers in front of the live window's own keys; bindings: set by the page, replacing those */
  hotkeys: { enabled: boolean; prefix: string; bindings: Binding[] | null }
  /** clickThrough 'alpha': clicks reach the character and pass through everywhere else; 'all': pass through
   *  everywhere (locked, back from the tray); 'off': an ordinary window. bounds: where each character's stage was */
  stage: { clickThrough: ClickMode; alwaysOnTop: boolean; bounds: Record<string, Rect> }
}

const FORMAT = 2
const DEFAULTS = (): Settings => ({
  format: FORMAT,
  token: randomBytes(16).toString('hex'),
  localApi: { enabled: true, port: 21480 },
  stageApi: { enabled: false, port: 21480 },
  trackingInput: defaultMotionSettings(),
  hotkeys: APP === 'stage' ? { enabled: false, prefix: stagePrefix(), bindings: null } : { enabled: true, prefix: 'Control+Alt', bindings: null },
  stage: { clickThrough: 'alpha', alwaysOnTop: true, bounds: {} },
})

const file = () => join(app.getPath('userData'), 'settings.json')
let current: Settings | null = null
let timer: NodeJS.Timeout | undefined

const isRect = (r: unknown): r is Rect => !!r && typeof r === 'object' &&
  ['x', 'y', 'width', 'height'].every((k) => Number.isFinite((r as Record<string, unknown>)[k]))

/** what was saved, kept only where it has the right shape (a hand-edited file can't break the shell) */
function merge(saved: Record<string, unknown>): Settings {
  const d = DEFAULTS()
  const o = <T>(v: unknown) => (v && typeof v === 'object' ? v : {}) as Partial<T>
  const sa = o<Settings['stageApi']>(saved.stageApi), la = o<Settings['localApi']>(saved.localApi), hk = o<Settings['hotkeys']>(saved.hotkeys), st = o<Settings['stage']>(saved.stage)
  const port = Number(la.port)
  const bindings = Array.isArray(hk.bindings) ? hk.bindings.filter((b): b is Binding =>
    !!b && typeof b.accelerator === 'string' && typeof b.do === 'string').slice(0, 64) : null
  return {
    format: FORMAT,
    token: typeof saved.token === 'string' && /^[0-9a-f]{32}$/.test(saved.token) ? saved.token : d.token,
    localApi: { enabled: la.enabled !== false, port: Number.isInteger(port) && port >= 1024 && port < 65535 ? port : d.localApi.port },
    stageApi: { enabled: sa.enabled === true, port: Number.isInteger(sa.port) && Number(sa.port) >= 1024 && Number(sa.port) < 65535 ? Number(sa.port) : d.stageApi.port },
    trackingInput: readMotionSettings(saved.trackingInput) ?? d.trackingInput,
    hotkeys: APP === 'stage' ? readStageHotkeys(hk, bindings, Number(saved.format) >= FORMAT)
      : { enabled: hk.enabled !== false, prefix: typeof hk.prefix === 'string' ? hk.prefix : d.hotkeys.prefix, bindings },
    stage: {
      clickThrough: st.clickThrough === 'all' || st.clickThrough === 'off' ? st.clickThrough : 'alpha',
      alwaysOnTop: st.alwaysOnTop !== false,
      bounds: Object.fromEntries(Object.entries(o<Record<string, unknown>>(st.bounds)).filter((e): e is [string, Rect] => isRect(e[1])).slice(-50)),
    },
  }
}

export function settings(): Settings {
  if (!current) {
    let saved: Record<string, unknown> = {}
    try { const value: unknown = JSON.parse(readFileSync(file(), 'utf8')); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value as Record<string, unknown> } catch { /* first run, or unreadable: the defaults */ }
    current = merge(saved)
    if (saved.token !== current.token) save()
  }
  return current
}

export function update(change: (s: Settings) => void) {
  change(settings())
  save()
}

function save() {
  clearTimeout(timer)
  timer = setTimeout(flush, 500)
}

export function flush() {
  clearTimeout(timer)
  if (!current) return
  const f = file(), tmp = `${f}.tmp`
  try {
    mkdirSync(dirname(f), { recursive: true })
    writeFileSync(tmp, JSON.stringify(current, null, 2))
    renameSync(tmp, f)
  } catch (e) {
    console.error('[settings] not saved:', e)
  }
}
