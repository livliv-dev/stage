// Every `livliv-stage:` name Stage keeps in the browser is in the registry (src/core/prefs.ts), in a group, and the
// registry holds none that the source doesn't use; 恢复默认偏好 clears only the groups chosen.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { clearGroups, keysOf, PREFS, RESET_GROUPS, type PrefKey } from '../src/core/prefs'

const src = fileURLToPath(new URL('../src', import.meta.url))
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map((e) => e.isDirectory() ? files(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []))).flat()
}
/** every `livliv-stage:<name>` written in the source (the app's own livliv-stage:// scheme isn't a name) */
async function used() {
  const found = new Map<string, string[]>()
  for (const file of await files(src)) {
    if (file.includes('/locales/')) continue
    for (const [name] of (await readFile(file, 'utf8')).matchAll(/livliv-stage:(?!\/\/)[a-z0-9-]+/g)) found.set(name, [...(found.get(name) ?? []), relative(src, file)])
  }
  return found
}

test('every livliv-stage: name in the source is registered, and every registered name is used', async () => {
  const names = await used(), registered = new Set(Object.keys(PREFS))
  const unregistered = [...names].filter(([name]) => !registered.has(name)).map(([name, where]) => `${name} (${where.join(', ')})`)
  assert.deepEqual(unregistered, [], 'add these to src/core/prefs.ts, each in a group')
  const unused = [...registered].filter((name) => ![...names].some(([n, where]) => n === name && where.some((w) => w !== 'core/prefs.ts')))
  assert.deepEqual(unused, [], 'registered but used nowhere: remove them from src/core/prefs.ts')
})

test('恢复默认偏好 clears only the groups chosen; models, keys, the sign-in and scenes are never in one', () => {
  const removed: string[] = []
  clearGroups(['mixer', 'layout'], { removeItem: (key) => { removed.push(key) } })
  assert.deepEqual(removed.sort(), ['livliv-stage:cast-folded', 'livliv-stage:left-folded', 'livliv-stage:mixer', 'livliv-stage:panel-folded', 'livliv-stage:tools-folded'])
  const resettable = keysOf(RESET_GROUPS.map((g) => g.id))
  for (const kept of ['livliv-stage:brain', 'livliv-stage:speech', 'livliv-stage:realtime', 'livliv-stage:session', 'livliv-stage:scene', 'livliv-stage:shots'] as PrefKey[]) {
    assert.ok(!resettable.includes(kept), kept + ' is never reset')
  }
})
