import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesRule, readAudienceRules, type AudienceRule } from '../src/triggers'

const rule: AudienceRule = { id: 'r1', enabled: true, keyword: '!Hi', match: 'exact', character: 'avatar', effect: { do: 'act', id: 'nod' }, cooldown: 5 }
test('audience keywords normalize width, case and whitespace, while exact commands do not match substrings', () => {
  assert.equal(matchesRule(rule, '  ！ＨＩ  '), true)
  assert.equal(matchesRule(rule, '!hi there'), false)
  assert.equal(matchesRule({ ...rule, keyword: '欢迎', match: 'contains' }, '欢迎新朋友'), true)
  assert.equal(matchesRule({ ...rule, keyword: '' }, 'anything'), false)
})
test('saved rules reject unsupported effects, invalid timers and repeated IDs', () => {
  assert.deepEqual(readAudienceRules([rule]), [rule])
  for (const value of [null, [{ ...rule, effect: { do: 'act', id: 'away' } }], [rule, rule], [{ ...rule, cooldown: NaN }], [{ ...rule, cooldown: 0 }], [{ ...rule, effect: { do: 'expr', id: 'happy', seconds: 31 } }]]) assert.equal(readAudienceRules(value), null)
  assert.deepEqual(readAudienceRules([{ ...rule, keyword: ' ' }])?.[0].keyword, '')
})
