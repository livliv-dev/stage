import { useSyncExternalStore } from 'react'
import { onAudienceMessage, type Chat } from './danmaku'
import { performStageCommand } from './control'
import { actors } from './actors'
import { store } from './scene'
import { matchesRule, type AudienceRule } from './triggers'

export type TriggerResult = { rule: string; at: number; ok: boolean; message: string; signature: string }
let results: TriggerResult[] = []
const listeners = new Set<() => void>()
export const useTriggerResults = () => useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f) } }, () => results)

function run(rule: AudienceRule): TriggerResult {
  const effect = rule.effect
  // The shortcut protocol uses numbers as positions; saved rules keep the model's real IDs.
  const index = effect.do === 'expr' ? actors.get(rule.character)?.player.expressions.findIndex((e) => e.id === effect.id) ?? -1 : -1
  const command = effect.do === 'expr' ? { do: 'expr' as const, id: String(index + 1), duration: effect.seconds, character: rule.character } : { ...effect, character: rule.character }
  const result = effect.do === 'expr' && index < 0 ? { ok: false as const, status: 404 } : performStageCommand(command)
  const value = { rule: rule.id, signature: JSON.stringify(rule), at: Date.now(), ok: result.ok, message: result.ok ? '已触发' : result.status === 404 ? '角色或表情已不存在，请重新选择' : '角色尚未就绪，请稍后再试' }
  results = [...results.filter((r) => r.rule !== rule.id), value].slice(-32)
  listeners.forEach((f) => f())
  return value
}
export const testAudienceRule = (rule: AudienceRule) => run(rule)

/** Mounted by the editor once; the AI inbox keeps its own command and spam policy. */
export function connectAudienceActions() {
  const last = new Map<string, { signature: string; at: number }>()
  return onAudienceMessage((message: Chat) => {
    const talk = store.get().talk
    if (!talk.triggersOn) return
    const ids = new Set(talk.triggers.map((r) => r.id))
    for (const id of last.keys()) if (!ids.has(id)) last.delete(id)
    for (const rule of talk.triggers) {
      if (!rule.enabled || !matchesRule(rule, message.text)) continue
      const signature = JSON.stringify(rule), previous = last.get(rule.id), now = performance.now()
      if (previous?.signature === signature && now - previous.at < rule.cooldown * 1000) continue
      last.set(rule.id, { signature, at: now })
      run(rule)
    }
  })
}
