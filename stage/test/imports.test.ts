import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Imports in stage/src go one way, with no cycle at all: the session runner's outputs (a recording, the output window)
// listen to the session's state; nothing in the session imports them.

const src = fileURLToPath(new URL('../src', import.meta.url))
const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name)
  if (entry.isDirectory()) return sources(path)
  return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
})

/** a module's static imports and re-exports within src (types too: a type cycle is a tangle all the same) */
function importsOf(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const found: string[] = []
  for (const statement of source.statements) {
    const from = (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : null
    if (!from?.startsWith('.')) continue
    const base = resolve(dirname(file), from)
    const target = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((path) => path.startsWith(src) && /\.tsx?$/.test(path) && existsSync(path))
    if (target) found.push(target)
  }
  return found
}

/** the groups of modules that import each other, round and round (Tarjan's strongly connected components) */
function cycles(graph: Map<string, string[]>): string[][] {
  let next = 0
  const index = new Map<string, number>(), low = new Map<string, number>(), stack: string[] = [], on = new Set<string>(), found: string[][] = []
  const visit = (node: string) => {
    index.set(node, next); low.set(node, next); next++; stack.push(node); on.add(node)
    for (const to of graph.get(node) ?? []) {
      if (!index.has(to)) { visit(to); low.set(node, Math.min(low.get(node)!, low.get(to)!)) }
      else if (on.has(to)) low.set(node, Math.min(low.get(node)!, index.get(to)!))
    }
    if (low.get(node) === index.get(node)) {
      const group: string[] = []
      for (let member = stack.pop()!; ; member = stack.pop()!) { on.delete(member); group.push(member); if (member === node) break }
      if (group.length > 1 || graph.get(node)?.includes(node)) found.push(group)
    }
  }
  for (const node of graph.keys()) if (!index.has(node)) visit(node)
  return found
}

test('stage/src has no import cycle', () => {
  const files = sources(src), graph = new Map(files.map((file) => [file, importsOf(file)]))
  assert.ok(files.length > 80, `the scan found the sources (${files.length})`)
  const name = (file: string) => relative(src, file).replace(/\.tsx?$/, '')
  const found = cycles(graph).map((group) => group.map(name).sort())
  assert.deepEqual(found, [], 'modules that import each other: ' + JSON.stringify(found))
})
