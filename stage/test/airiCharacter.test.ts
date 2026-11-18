import assert from 'node:assert/strict'
import { test } from 'node:test'
import { characterContextText, characterContextUpdate } from '../src/airiCharacter.ts'

test('a character card replaces the same AIRI lane with name, personality, expressions and motions', () => {
  const card = { id: 'sena', name: 'Sena', persona: 'A quiet painter.', style: 'Short sentences.', expressions: ['smile', 'shy'], motions: ['nod', 'shake', 'tilt', 'hop', 'shy', 'away'] }
  const text = characterContextText(card)
  assert.match(text, /name: Sena/)
  assert.match(text, /personality: A quiet painter/)
  assert.match(text, /speaking style: Short sentences/)
  assert.match(text, /expressions: smile, shy/)
  assert.match(text, /motions: nod, shake, tilt, hop, shy, away/)
  const update = characterContextUpdate(card)
  assert.equal(update.strategy, 'replace-self')
  assert.equal(update.lane, 'livliv-stage:character')
  assert.equal(update.text, text)
  assert.equal(characterContextUpdate({ ...card, persona: 'Someone else.' }).contextId, update.contextId)
})
