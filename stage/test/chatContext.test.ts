import assert from 'node:assert/strict'
import { test } from 'node:test'
import { conversationContext, contextLine, speechSegments } from '../src/chatContext'
import type { Line } from '../src/core/lines'

const line = (id: number, human = id % 2 === 0): Line => ({ id: String(id), who: human ? 'me' : 'ai', name: human ? '我' : 'Nana', text: `细节 ${id}`, emotion: 'neutral', action: 'none', to: null, human })

test('continuity includes early details beyond the previous fourteen-message window', () => {
  const lines = Array.from({ length: 24 }, (_, i) => line(i))
  const context = conversationContext(lines)
  assert.match(context.history, /细节 0\n/)
  assert.match(context.history, /细节 23$/)
  assert.equal(context.updateSummary, true)
})

test('summary replaces only its sources and is invalidated when a source is forgotten', () => {
  const lines = Array.from({ length: 24 }, (_, i) => line(i))
  const summary = { text: '我们还没讨论完猫的名字。', sourceIds: lines.slice(0, 18).map((l) => l.id) }
  const context = conversationContext(lines, summary)
  assert.equal(context.earlier, summary.text)
  assert.doesNotMatch(context.history, /细节 0\n/)
  assert.match(context.history, /细节 18/)
  assert.equal(conversationContext(lines.slice(1), summary).earlier, '')
})

test('unplayed text from an interrupted sentence is not presented as spoken history', () => {
  const interrupted = { ...line(1), cut: true, text: '未说出口的秘密' }
  assert.doesNotMatch(contextLine(interrupted), /秘密/)
  assert.match(contextLine(interrupted), /被打断/)
  assert.deepEqual(speechSegments('先接住这一句。再说另一个观点！你怎么看？'), ['先接住这一句。', '再说另一个观点！', '你怎么看？'])
})

test('context trimming preserves a complete latest exchange', () => {
  const context = conversationContext(Array.from({ length: 24 }, (_, i) => line(i)), undefined, 35)
  assert.match(context.history, /细节 22/)
  assert.match(context.history, /细节 23/)
  assert.equal(context.sourceIds.length % 2, 0)
})
