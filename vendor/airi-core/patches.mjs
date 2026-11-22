// Fixes Stage applies to the bundled AIRI core. build.mjs runs them on every build; `npm run patch` applies them to the
// committed core.mjs. Each one must find its code exactly once (or find it already fixed), so an upstream change that
// moves the code fails the build instead of shipping unpatched.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PATCHES = [
  {
    name: 'streamed tool-call arguments: a null or empty delta adds nothing',
    // Alibaba Cloud Bailian (and other OpenAI-compatible providers) can end a streamed tool call with a delta whose
    // arguments are null. @xsai/stream-text 0.5.1 appends it as the text "null", so the arguments are no longer JSON:
    // the tool can't read its input and the next request, which repeats the call, is refused.
    from: /tool_calls\[index\]\.function\.arguments \+= toolCall\.function\.arguments;\s*pushEvent\(\{\s*delta: toolCall\.function\.arguments,\s*type: "tool-call\.delta"\s*\}\);/,
    to: [
      'if (toolCall.function.arguments != null && toolCall.function.arguments !== "") {',
      '\ttool_calls[index].function.arguments += toolCall.function.arguments;',
      '\tpushEvent({',
      '\t\tdelta: toolCall.function.arguments,',
      '\t\ttype: "tool-call.delta"',
      '\t});',
      '}',
    ].join('\n'),
  },
  {
    name: 'the memory read tool: at most four ids a call',
    // Stage gives AIRI an index of a character's memories and this tool to read whole entries by id. One call could ask
    // for every entry in the index (Stage gives 48, each up to 2,000 characters), all billed in the next call. The
    // tool's schema now takes one to four ids, which the model is told with the tool.
    from: /\(0, import_dist\.minLength\)\(1\), \(0, import_dist\.description\)\("Every entry that the reply needs, so one call reads them all\."\)\) \}\);/,
    to: '(0, import_dist.minLength)(1), (0, import_dist.maxLength)(4), (0, import_dist.description)("Up to four entries that the reply needs, so one call reads them all.")) });',
  },
  {
    name: 'the memory read tool: a call over the limit is told how many to give',
    from: /if \(!parsed\.success\) return "Give at least one entry id from the memory index\.";/,
    to: 'if (!parsed.success) return "Give one to four entry ids from the memory index.";',
  },
]

/** the bundle with every fix applied (one already in it is left as it is) */
export function patch(code) {
  for (const { name, from, to } of PATCHES) {
    if (code.includes(to)) continue
    const found = code.match(new RegExp(from.source, 'g'))?.length ?? 0
    if (found !== 1) throw new Error(`AIRI core patch "${name}": expected its code once in the bundle, found it ${found} times`)
    code = code.replace(from, to)
  }
  return code
}

// `node patches.mjs`: the fixes applied to the committed core.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = join(dirname(fileURLToPath(import.meta.url)), 'core.mjs')
  const before = await readFile(file, 'utf8'), after = patch(before)
  if (after !== before) await writeFile(file, after)
  console.log(after === before ? 'core.mjs: already patched' : 'core.mjs: patched')
}
