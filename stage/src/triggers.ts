import { ACTION_IDS, type ActionId } from '../../desktop/src/commands'

export type AudienceEffect = { do: 'act'; id: Exclude<ActionId, 'away'> } | { do: 'expr'; id: string; seconds: number }
export type AudienceRule = { id: string; enabled: boolean; keyword: string; match: 'exact' | 'contains'; character: string; effect: AudienceEffect; cooldown: number }
export const AUDIENCE_ACTIONS = ACTION_IDS.filter((id): id is Exclude<ActionId, 'away'> => id !== 'away')
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max
const number = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

export function readAudienceEffect(value: unknown): AudienceEffect | null {
  if (!record(value)) return null
  if (value.do === 'act') {
    const id = AUDIENCE_ACTIONS.find((id) => id === value.id)
    return id ? { do: 'act', id } : null
  }
  return value.do === 'expr' && typeof value.id === 'string' && value.id.length > 0 && number(value.seconds, .5, 30) ? { do: 'expr', id: value.id, seconds: value.seconds } : null
}

/** Project files and browser storage are the boundary for saved audience commands. */
export function readAudienceRules(value: unknown): AudienceRule[] | null {
  if (!Array.isArray(value) || value.length > 32) return null
  const ids = new Set<string>(), rules: AudienceRule[] = []
  for (const r of value) {
    if (!record(r) || !text(r.id, 160) || ids.has(r.id) || typeof r.enabled !== 'boolean' || typeof r.keyword !== 'string' || r.keyword.length > 80 || !text(r.character, 160) || (r.match !== 'exact' && r.match !== 'contains') || !number(r.cooldown, 1, 300) || !record(r.effect)) return null
    ids.add(r.id)
    const effect = readAudienceEffect(r.effect)
    if (!effect) return null
    rules.push({ id: r.id, enabled: r.enabled, keyword: r.keyword.trim(), match: r.match, character: r.character, cooldown: r.cooldown, effect })
  }
  return rules
}

const normalized = (text: string) => text.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim()
export function matchesRule(rule: AudienceRule, message: string) {
  const text = normalized(message), keyword = normalized(rule.keyword)
  return !!keyword && (rule.match === 'exact' ? text === keyword : text.includes(keyword))
}
