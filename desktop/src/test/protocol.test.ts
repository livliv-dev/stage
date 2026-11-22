// The shared protocol package as the app runs it: compiled into the app's own output and reached as #protocol/*, so the
// packaged app carries it like any file of its own; the sandboxed preload still loads nothing but Electron.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { parseDo } from '#protocol/commands'
import { readStageCommand } from '#protocol/stageCommands'

const dist = join(__dirname, '..')

test('#protocol/* is the package compiled into the app\'s own output', () => {
  for (const module of ['bridge', 'commands', 'stageCommands', 'tracking', 'neuro', 'airiGame', 'collab', 'voicebox', 'realtime', 'unreachable'])
    assert.equal(require.resolve(`#protocol/${module}`), join(dist, 'protocol', `${module}.js`))
  assert.deepEqual(parseDo('act:nod'), { do: 'act', id: 'nod' })
  assert.deepEqual(readStageCommand({ do: 'scene', id: 'intro' }), { do: 'scene', id: 'intro' })
})

test('the sandboxed preload loads only Electron', () => {
  const loads = [...readFileSync(join(dist, 'preload.js'), 'utf8').matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1])
  assert.deepEqual(loads, ['electron'])
})
