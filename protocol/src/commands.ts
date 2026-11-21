// Shared native commands. The live-window commands match livliv.ai's command relay; Stage also accepts session and
// voice-input controls.

export const ACTION_IDS = ['nod', 'shake', 'tilt', 'hop', 'shy', 'away'] as const
export type ActionId = (typeof ACTION_IDS)[number]
export type CmdBody = { do: 'expr'; id: string; on?: boolean } | { do: 'act'; id: ActionId } | { do: 'clear' | 'calibrate' | 'mic' | 'mute' | 'ai-pause' | 'ai-stop' | 'ptt' }

// the same grammar as livliv.ai's /api/live/cmd (a full match after trimming); `u`: 40 characters, not 40 UTF-16 units
const DO = /^(?:(expr):([^:]{1,40})(?::(on|off))?|(act):([a-z]{3,5})|(clear|calibrate|mic|mute|ai-pause|ai-stop|ptt))$/u

/** expr:<number key, id or name>[:on|:off], act:<nod|shake|tilt|hop|shy|away>, clear, calibrate, mic */
export function parseDo(raw: string): CmdBody | null {
  const g = DO.exec(raw.trim())
  if (!g) return null
  if (g[1]) return { do: 'expr', id: g[2], ...(g[3] ? { on: g[3] === 'on' } : {}) }
  if (g[4]) return (ACTION_IDS as readonly string[]).includes(g[5]) ? { do: 'act', id: g[5] as ActionId } : null
  return { do: g[6] as 'clear' | 'calibrate' | 'mic' | 'mute' | 'ai-pause' | 'ai-stop' | 'ptt' }
}

/** a CmdBody from anywhere else (tests, a page), held to the same rules as a parsed one */
export function isCmdBody(c: unknown): c is CmdBody {
  if (!c || typeof c !== 'object') return false
  const o = c as Record<string, unknown>
  if (o.do === 'expr') return typeof o.id === 'string' && parseDo(`expr:${o.id}`) !== null && (o.on === undefined || typeof o.on === 'boolean')
  if (o.do === 'act') return typeof o.id === 'string' && (ACTION_IDS as readonly string[]).includes(o.id)
  return ['clear', 'calibrate', 'mic', 'mute', 'ai-pause', 'ai-stop', 'ptt'].includes(String(o.do))
}

/** the live window's own keys (Live.tsx, web runtime/actions.ts ACTIONS), which the default global hotkeys mirror:
 *  number keys the expressions (0: none), Q W E R T the moves, B away, Space sets the current pose as front */
export const LIVE_KEYS: { key: string; do: string }[] = [
  ...'123456789'.split('').map((k) => ({ key: k, do: `expr:${k}` })),
  { key: '0', do: 'clear' },
  { key: 'Q', do: 'act:nod' }, { key: 'W', do: 'act:shake' }, { key: 'E', do: 'act:tilt' },
  { key: 'R', do: 'act:hop' }, { key: 'T', do: 'act:shy' }, { key: 'B', do: 'act:away' },
  { key: 'Space', do: 'calibrate' },
]
