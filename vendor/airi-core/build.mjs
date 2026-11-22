import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'
import { patch } from './patches.mjs'

const here = dirname(fileURLToPath(import.meta.url))
if (!process.argv[2]) throw new Error('Pass the path to the upstream Project AIRI source checkout')
const upstream = resolve(process.argv[2])
const core = join(upstream, 'packages/core-agent/src')
const require = createRequire(import.meta.url)
const exports = [
  ['createChatOrchestratorRuntime', 'runtime/chat-orchestrator-runtime.ts'],
  ['createContextRegistry', 'runtime/context-registry.ts'],
  ['streamFrom', 'runtime/llm-service.ts'],
  ['createSparkNotifyAgent', 'agents/spark-notify/agent.ts'],
  ['createSparkNotifyReactionPlugin', 'agents/spark-notify/plugins/reaction.ts'],
  ['useLlmmarkerParser', 'runtime/llm-marker-parser.ts'],
  ['isToolRelatedError', 'runtime/llm-service.ts'],
  ['MarkdownSegmenter', 'voice/output/speech-transformation/segmenter.ts'],
]
const aliases = {
  '@proj-airi/stream-kit': join(upstream, 'packages/stream-kit/src/index.ts'),
}
const pkg = JSON.parse(await readFile(join(here, 'package.json'), 'utf8'))
for (const name of Object.keys(pkg.devDependencies)) {
  if (name !== 'rolldown') aliases[name] = require.resolve(name)
}
const unusedSchemaPeers = new Set(['effect', 'sury', 'zod-to-json-schema'])
const bundle = await rolldown({
  input: 'airi-core',
  platform: 'browser',
  resolve: { alias: aliases },
  plugins: [{
    name: 'airi-exports',
    resolveId(id, importer) {
      if (id === 'airi-core') return '\0airi-core'
      // AIRI uses Zod 4 and Valibot. Keep xsschema's lazy optional peers out of the desktop asset.
      if (importer?.includes('/node_modules/xsschema/') && unusedSchemaPeers.has(id)) return '\0unused-schema-peer'
    },
    load(id) {
      if (id === '\0unused-schema-peer') return 'throw new Error("Schema peer not bundled by Stage")'
      if (id === '\0airi-core') return [
          "export { rawTool } from '@xsai/tool'",
          'export { createMemoryTools } from ' + JSON.stringify(join(upstream, 'packages/stage-ui/src/tools/memory.ts')),
          ...exports.map(([name, source]) => 'export { ' + name + ' } from ' + JSON.stringify(join(core, source))),
        ].join('\n')
    },
  }],
})
try {
  const { output } = await bundle.generate({ format: 'es', comments: false, sourcemap: false, codeSplitting: false })
  const chunk = output[0]
  if (output.length !== 1 || chunk.type !== 'chunk' || chunk.imports.length || chunk.dynamicImports.some((file) => file !== chunk.fileName)) {
    throw new Error('Expected one self-contained AIRI module. Outputs: ' + JSON.stringify(output.map((file) => (
      file.type === 'chunk' ? { name: file.fileName, imports: file.imports, dynamicImports: file.dynamicImports } : file.fileName
    ))))
  }
  const modules = new Set()
  for (const file of Object.keys(chunk.modules)) {
    if (!file.includes('/node_modules/')) continue
    let folder = dirname(file)
    for (;;) {
      if ((await readdir(folder)).includes('package.json')) {
        const manifest = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
        if (manifest.name && manifest.version) { modules.add(folder); break }
      }
      folder = dirname(folder)
    }
  }
  const notices = []
  for (const folder of [...modules].sort()) {
    const pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8'))
    const names = (await readdir(folder)).filter((name) => /^(licen[cs]e|copying|notice)(\.[^.]+)?$/i.test(name))
    if (!names.length) throw new Error('Missing license notice for ' + pkg.name)
    notices.push('# ' + pkg.name + '@' + pkg.version + '\n\n' + (await Promise.all(names.map((name) => readFile(join(folder, name), 'utf8')))).join('\n'))
  }
  await copyFile(join(upstream, 'LICENSE'), join(here, 'LICENSE'))
  await writeFile(join(here, 'DEPENDENCY-NOTICES.txt'), notices.join('\n\n'))
  // Stage's fixes to the bundled code (patches.mjs), applied on every build
  await writeFile(join(here, 'core.mjs'), '// Project AIRI and dependencies. See LICENSE and DEPENDENCY-NOTICES.txt.\n' + patch(chunk.code))
} finally {
  await bundle.close()
}
