// One shared protocol package (protocol/): what the desktop shell and the editor say to each other is written once.
// The editor reaches the shell's types only through it, the shell keeps no copy of them, the preload is checked against
// the one description of window.livlivDesktop, and the package itself loads nothing either side lacks.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../..', import.meta.url))
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : []
})
const specifiers = (file: string) => [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*'([^']+)'/g)].map((m) => m[1])
const name = (file: string) => relative(repo, file)

test('the editor reads the shell only through the protocol package', () => {
  const bad = [...walk(join(repo, 'stage/src')), ...walk(join(repo, 'stage/test'))]
    .flatMap((file) => specifiers(file).filter((s) => s.includes('desktop/src')).map((s) => `${name(file)}: ${s}`))
  assert.deepEqual(bad, [])
})

test('the shell keeps no copy: the moved modules are gone and it imports them as #protocol/*', () => {
  const desktop = walk(join(repo, 'desktop/src'))
  const copies = desktop.map(name).filter((f) => /Protocol\.ts$|\/(commands|stageCommands)\.ts$/.test(f))
  assert.deepEqual(copies, [])
  const moved = /^\.\.?\/(trackingProtocol|neuroProtocol|collabProtocol|airiGameProtocol|stageCommands|commands)$/
  const old = desktop.flatMap((file) => specifiers(file).filter((s) => moved.test(s)).map((s) => `${name(file)}: ${s}`))
  assert.deepEqual(old, [])
  const pkg = JSON.parse(readFileSync(join(repo, 'desktop/package.json'), 'utf8'))
  assert.deepEqual(pkg.imports, { '#protocol/*': './dist/protocol/*.js' })
  const tsconfig = readFileSync(join(repo, 'desktop/tsconfig.json'), 'utf8')
  assert.match(tsconfig, /"references":\s*\[\{\s*"path":\s*"\.\.\/protocol"\s*\}\]/)
})

test('window.livlivDesktop is described once: the preload is checked against it, the editor uses it', () => {
  const preload = readFileSync(join(repo, 'desktop/src/preload.ts'), 'utf8')
  assert.match(preload, /\} satisfies DesktopApi\n\s*contextBridge\.exposeInMainWorld\('livlivDesktop', api\)/)
  assert.ok(specifiers(join(repo, 'desktop/src/preload.ts')).every((s) => s === 'electron' || s.startsWith('#protocol/')), 'the sandboxed preload loads only Electron, and types')
  assert.match(preload, /^import type \{ DesktopApi, DesktopInfo \} from '#protocol\/bridge'$/m)
  const bridge = readFileSync(join(repo, 'stage/src/desktopBridge.ts'), 'utf8')
  assert.match(bridge, /export type Desktop = DesktopApi/)
})

test('the package loads nothing either side lacks: no Node, no DOM, no Electron, nothing outside it', () => {
  const files = walk(join(repo, 'protocol/src'))
  assert.ok(files.length >= 8)
  // its own modules and its own data (product.json, the names)
  const outside = files.flatMap((file) => specifiers(file).filter((s) => !/^\.\/[A-Za-z]+(\.json)?$/.test(s)).map((s) => `${name(file)}: ${s}`))
  assert.deepEqual(outside, [])
  const code = (file: string) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const globals = files.filter((file) => /\b(window|document|process|require|Buffer|localStorage)\b\s*[.(]/.test(code(file))).map(name)
  assert.deepEqual(globals, [])
})
