import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { mirrorAssets, prepareMirror } from './prepare-download-mirror.mjs'

function fixture() {
  return { tag_name: 'v0.4.1', draft: false, prerelease: false, assets: [
    'LivLiv-Stage-0.4.1-arm64.dmg', 'LivLiv-Stage-0.4.1-x64.dmg', 'LivLiv-Stage-Setup-0.4.1.exe',
  ].map(name => ({ name, size: 4, digest: 'sha256:' + createHash('sha256').update('test').digest('hex') })) }
}

test('rejects unpublished releases, missing installers and absent GitHub hashes', () => {
  for (const release of [
    { ...fixture(), draft: true }, { ...fixture(), prerelease: true }, { ...fixture(), tag_name: '../bad' },
    { ...fixture(), assets: [] }, { ...fixture(), assets: fixture().assets.map(a => ({ ...a, digest: null })) },
  ]) assert.throws(() => mirrorAssets(release))
})

test('prepares verified originals, and refuses corrupt bytes before generating links', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'stage-mirror-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const input = path.join(root, 'originals'), output = path.join(root, 'output')
  await mkdir(input)
  const release = fixture()
  for (const asset of release.assets) await writeFile(path.join(input, asset.name), 'test')
  const manifest = await prepareMirror(release, input, output, 'https://downloads.livliv.ai')
  assert.equal(manifest.assets.length, 3)
  assert.equal(manifest.assets[2].url, 'https://downloads.livliv.ai/stage/v0.4.1/LivLiv-Stage-Setup-0.4.1.exe')
  assert.equal(await readFile(path.join(output, 'stage/v0.4.1', release.assets[0].name), 'utf8'), 'test')
  assert.match(await readFile(path.join(output, 'stage/index.html'), 'utf8'), /"tag":"v0.4.1"/)
  assert.match(await readFile(path.join(output, 'stage/v0.4.1/SHA256SUMS.txt'), 'utf8'), /LivLiv-Stage-Setup-0.4.1.exe/)
  await writeFile(path.join(input, release.assets[2].name), 'oops')
  const brokenOutput = path.join(root, 'broken')
  await assert.rejects(prepareMirror(release, input, brokenOutput, 'https://downloads.livliv.ai'), /SHA256 mismatch/)
  await assert.rejects(readFile(path.join(brokenOutput, 'stage/index.html')), { code: 'ENOENT' })
})
