import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectLocale, getLocale, setLocale, tr, LANGUAGES } from '../src/i18n'
import { messages } from '../src/locales/messages'
import { readTuning, defaultTuning } from '../src/tuning'

test('locale detection and live switching keep message placeholders and unknown content', () => {
  assert.equal(detectLocale('zh-CN'), 'zh-Hans'); assert.equal(detectLocale('zh-HK'), 'zh-Hant'); assert.equal(detectLocale('zh-Hant-TW'), 'zh-Hant'); assert.equal(detectLocale('ja-JP'), 'ja'); assert.equal(detectLocale('fr-FR'), 'en')
  const previous = getLocale()
  try {
    setLocale('en'); assert.equal(tr('由 {0} 控制', 'Mika'), 'Controlled by Mika'); assert.equal(tr('用户自定义角色名字'), '用户自定义角色名字')
    setLocale('ja'); assert.equal(tr('由 {0} 控制', 'Mika'), 'Mikaが操作')
    setLocale('zh-Hant'); assert.equal(tr('默认'), '預設'); assert.equal(tr('界面语言'), '界面語言')
  } finally { setLocale(previous) }
})

test('all UI messages cover four locales and preserve placeholder indices', () => {
  const slots = (text: string) => [...text.matchAll(/\{(\d+)\}/g)].map((match) => match[1]).sort()
  for (const [key, message] of Object.entries(messages)) for (const { id } of LANGUAGES) { assert.ok(message[id].length, `${key}: ${id}`); assert.deepEqual(slots(message[id]), slots(message['zh-Hans']), `${key}: ${id}`) }
})

test('imported player settings use public defaults and bounded values', () => {
  assert.deepEqual(readTuning(), defaultTuning())
  assert.deepEqual(readTuning({ volume: 4, faceFollow: -3, idle: false, bounce: true, faceFps: 15 }), { ...defaultTuning(), volume: 1, faceFollow: 0, idle: false, bounce: true, faceFps: 15 })
  assert.deepEqual(readTuning({ volume: NaN, faceFollow: Infinity }), defaultTuning())
})
