import assert from 'node:assert/strict'
import { test } from 'node:test'
import { oldApps, oldAppText } from '../oldApp'

const EXE = '/Applications/VTuber Stage.app/Contents/MacOS/VTuber Stage'

test('the old LivLiv Stage.app is found in either Applications folder, never the app that runs', () => {
  const there = (...paths: string[]) => (path: string) => paths.includes(path)
  assert.deepEqual(oldApps('/Users/a', EXE, there()), [])
  assert.deepEqual(oldApps('/Users/a', EXE, there('/Applications/LivLiv Stage.app')), ['/Applications/LivLiv Stage.app'])
  assert.deepEqual(oldApps('/Users/a', EXE, there('/Users/a/Applications/LivLiv Stage.app')), ['/Users/a/Applications/LivLiv Stage.app'])
  // the running app still called LivLiv Stage (installed under its old name) is not offered to the Trash
  assert.deepEqual(oldApps('/Users/a', '/Applications/LivLiv Stage.app/Contents/MacOS/VTuber Stage', there('/Applications/LivLiv Stage.app')), [])
})

test('the question in the system\'s language', () => {
  assert.equal(oldAppText('zh-CN').trash, '移到废纸篓')
  assert.equal(oldAppText('zh-TW').trash, '移到垃圾桶')
  assert.equal(oldAppText('zh-Hant-HK').trash, '移到垃圾桶')
  assert.equal(oldAppText('ja').trash, 'ゴミ箱に入れる')
  assert.equal(oldAppText('fr-FR').trash, 'Move to Trash')
  for (const locale of ['zh-CN', 'zh-TW', 'ja', 'en']) assert.match(oldAppText(locale).detail, /VTuber Stage/)
})
