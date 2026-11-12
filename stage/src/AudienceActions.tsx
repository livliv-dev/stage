import { useEffect, useState } from 'react'
import { Plus, Trash, WandSparkles } from 'lucide-react'
import { actors, onActors } from './actors'
import { participants, store, uid, useScene } from './scene'
import { AUDIENCE_ACTIONS, type AudienceRule } from './triggers'
import { testAudienceRule, useTriggerResults } from './audienceControl'
import { getLocale, tr } from './i18n'

const labels = { nod: '点头', shake: '摇头', tilt: '歪头', hop: '跳一下', shy: '害羞' }

export function AudienceActions() {
  const { scene } = useScene(), rules = scene.talk.triggers, results = useTriggerResults()
  const [, redraw] = useState(0)
  useEffect(() => onActors(() => redraw((n) => n + 1)), [])
  const cast = participants(scene).filter((c) => !c.remote)
  const save = (next: AudienceRule[]) => store.setTalk({ triggers: next })
  const add = () => {
    if (!cast.length || rules.length >= 32) return
    save([...rules, { id: uid(), enabled: true, keyword: '!hi', match: 'exact', character: cast[0].id, effect: { do: 'act', id: 'nod' }, cooldown: 5 }])
  }
  return <details className="audience-actions">
    <summary><WandSparkles size={14} />{tr('弹幕动作')}<span className="num">{rules.length || ''}</span></summary>
    <label className="switch spaced"><span>{tr('启用弹幕动作')}</span><input type="checkbox" checked={scene.talk.triggersOn} onChange={(e) => store.setTalk({ triggersOn: e.target.checked })} /><i /></label>
    {!cast.length && <p className="hint">{tr('添加角色后设置弹幕动作')}</p>}
    {rules.map((rule, index) => {
      const patch = (value: Partial<AudienceRule>) => save(rules.map((r) => r.id === rule.id ? { ...r, ...value } : r))
      const actor = actors.get(rule.character), result = results.find((r) => r.rule === rule.id && r.signature === JSON.stringify(rule))
      const expressions = actor?.format !== 'png' ? actor?.player.expressions ?? [] : []
      const effectValue = rule.effect.do + ':' + rule.effect.id
      const changeEffect = (value: string) => {
        const at = value.indexOf(':'), kind = value.slice(0, at), id = value.slice(at + 1)
        if (kind === 'act') {
          const action = AUDIENCE_ACTIONS.find((value) => value === id)
          if (action) patch({ effect: { do: 'act', id: action } })
        } else if (expressions.some((e) => e.id === id)) patch({ effect: { do: 'expr', id, seconds: 2 } })
      }
      return <div className="audience-rule" key={rule.id}>
        <div className="audience-rule-head"><label className="switch"><span>{tr('规则 {0}', index + 1)}</span><input aria-label={tr('启用规则 {0}', index + 1)} type="checkbox" checked={rule.enabled} onChange={(e) => patch({ enabled: e.target.checked })} /><i /></label><button className="icon danger" aria-label={tr('删除规则 {0}', index + 1)} onClick={() => save(rules.filter((r) => r.id !== rule.id))}><Trash size={14} /></button></div>
        <label className="field"><span>{tr('收到弹幕')}</span><input aria-label={tr('规则 {0} 关键词', index + 1)} maxLength={80} value={rule.keyword} placeholder="!hi" onChange={(e) => patch({ keyword: e.target.value })} /></label>
        <label className="field"><span>{tr('匹配方式')}</span><select aria-label={tr('规则 {0} 匹配方式', index + 1)} value={rule.match} onChange={(e) => patch({ match: e.target.value as AudienceRule['match'] })}><option value="exact">{tr('完全相同')}</option><option value="contains">{tr('包含关键词')}</option></select></label>
        <label className="field"><span>{tr('让角色')}</span><select aria-label={tr('规则 {0} 角色', index + 1)} value={rule.character} onChange={(e) => patch({ character: e.target.value, effect: { do: 'act', id: 'nod' } })}>{!cast.some((c) => c.id === rule.character) && <option value={rule.character}>{tr('选择角色')}</option>}{cast.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field"><span>{tr('做出反应')}</span><select aria-label={tr('规则 {0} 反应', index + 1)} value={effectValue} onChange={(e) => changeEffect(e.target.value)}><optgroup label={tr('动作')}>{AUDIENCE_ACTIONS.map((id) => <option key={id} value={'act:' + id}>{tr(labels[id])}</option>)}</optgroup>{expressions.length > 0 && <optgroup label={tr('表情')}>{expressions.map((e) => <option key={e.id} value={'expr:' + e.id}>{e.labels?.[getLocale()] ?? e.labels?.en ?? e.label}</option>)}</optgroup>}{rule.effect.do === 'expr' && !expressions.some((e) => e.id === rule.effect.id) && <option value={effectValue}>{tr('重新选择表情')}</option>}</select></label>
        {rule.effect.do === 'expr' && <label className="field"><span>{tr('表情保持（秒）')}</span><input aria-label={tr('规则 {0} 保持时间', index + 1)} type="number" min={.5} max={30} step={.5} value={rule.effect.seconds} onChange={(e) => { const n = +e.target.value; if (Number.isFinite(n) && n >= .5 && n <= 30 && rule.effect.do === 'expr') patch({ effect: { ...rule.effect, seconds: n } }) }} /></label>}
        <div className="audience-rule-bottom"><label className="field"><span>{tr('冷却（秒）')}</span><input aria-label={tr('规则 {0} 冷却', index + 1)} type="number" min={1} max={300} value={rule.cooldown} onChange={(e) => { const n = +e.target.value; if (Number.isFinite(n) && n >= 1 && n <= 300) patch({ cooldown: n }) }} /></label><button disabled={!rule.keyword.trim() || actor?.status !== 'ready'} onClick={() => testAudienceRule(rule)}>{tr('测试动作')}</button></div>
        {result && <p className={'hint ' + (result.ok ? 'ok' : 'error')} role="status">{tr(result.message)}</p>}
      </div>
    })}
    <button className="wide spaced" disabled={!cast.length || rules.length >= 32} onClick={add}><Plus size={14} />{tr('添加弹幕动作')}</button>
  </details>
}
