// electron-builder afterPack for LivLiv Stage: what goes to people holds exactly the characters in stage/public/characters
// and nothing private. Fails the build otherwise, for example on duplicate copies ("char06 2"), stale builds or a key.
// On macOS the app's extended attributes are cleared too: codesign refuses a file that has them.
const { execFileSync } = require('node:child_process')
const { readdirSync, readFileSync, statSync } = require('node:fs')
const { join, relative } = require('node:path')

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : [p]
})
const SECRET = /\bsk-[A-Za-z0-9_-]{20,}/
const TEXT = /\.(js|mjs|cjs|json|html|css|md|txt|map|yml|yaml)$/i

exports.default = async (ctx) => {
  const res = ctx.electronPlatformName === 'darwin'
    ? join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : join(ctx.appOutDir, 'resources')
  if (ctx.electronPlatformName === 'darwin') execFileSync('xattr', ['-cr', join(res, '..', '..')])
  const stage = join(res, 'stage'), repo = join(__dirname, '..', '..', 'stage')
  const want = readdirSync(join(repo, 'public', 'characters')).sort().join()
  const got = readdirSync(join(stage, 'characters')).sort().join()
  if (want !== got) throw new Error(`characters in the app differ from stage/public/characters:\n${got}`)
  const bad = walk(stage).filter((p) => {
    const name = relative(stage, p)
    return / \d+(\.|\/|$)/.test(name) || /(^|\/)\.env|\.pem$|\.key$/.test(name) || (TEXT.test(p) && SECRET.test(readFileSync(p, 'latin1')))
  })
  if (bad.length) throw new Error(`should not be in the app:\n${bad.join('\n')}`)
  console.log(`  • checked ${relative(process.cwd(), stage)}: ${got.split(',').filter((f) => !f.endsWith('.md')).length} characters + licence and credits, nothing private`)
}
