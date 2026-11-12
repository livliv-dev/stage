// The build livliv.ai serves at /stage/ (src/host.ts): built from a clean, committed tree, so the site can pin it by
// commit and checksum instead of building Stage on its server.
//   node scripts/build-site.mjs [outDir]       default dist-site
// Leaves out the face tracker's files (the site serves the same ones at /mediapipe/; checked by the site against
// stage-build.json), adds og.jpg (the link preview), and writes stage-build.json (commit, version, sha256 of every file)
// and, beside the folder, livliv-stage-site-<commit>.tar.gz with its sha256.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..'), out = resolve(root, process.argv[2] || 'dist-site')
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()
const commit = git('rev-parse', 'HEAD'), dirty = git('status', '--porcelain', '--', '.', '../desktop/src') !== ''
if (dirty && !process.env.STAGE_ALLOW_DIRTY) { console.error('Uncommitted changes in stage/ or desktop/src: commit first (or STAGE_ALLOW_DIRTY=1 for a local try)'); process.exit(1) }

execFileSync('npx', ['tsc', '-p', 'tsconfig.json', '--noEmit'], { cwd: root, stdio: 'inherit' })
execFileSync('npx', ['vite', 'build', '--base', '/stage/', '--outDir', out, '--emptyOutDir'], { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_STAGE_HOST: 'livliv' } })

const mediapipe = {}
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
for (const f of walk(join(out, 'mediapipe'))) mediapipe['/' + relative(out, f).split('\\').join('/')] = sha(f)
rmSync(join(out, 'mediapipe'), { recursive: true })
copyFileSync(resolve(root, '../media/crowd.jpg'), join(out, 'og.jpg'))

const files = Object.fromEntries(walk(out).map((f) => [relative(out, f).split('\\').join('/'), sha(f)]).sort())
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
writeFileSync(join(out, 'stage-build.json'), JSON.stringify({ commit, dirty, version: pkg.version, player: pkg.dependencies['@livliv-dev/player'], mediapipe, files }, null, 1) + '\n')

const tar = resolve(out, '..', `livliv-stage-site-${commit.slice(0, 12)}${dirty ? '-dirty' : ''}.tar.gz`)
// stable archive: sorted names, no owner, fixed times (the same tree gives the same bytes)
execFileSync('tar', ['--no-xattrs', '--uid', '0', '--gid', '0', '--uname', '', '--gname', '', '-czf', tar, '-C', out, '.'], { cwd: root, env: { ...process.env, COPYFILE_DISABLE: '1' } })
console.log(`${relative(root, out)}: ${Object.keys(files).length} files, commit ${commit.slice(0, 12)}${dirty ? ' (dirty)' : ''}\n${tar}\nsha256 ${sha(tar)}`)
