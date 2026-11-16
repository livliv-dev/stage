import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, constants } from 'node:fs'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const repo = 'livliv-dev/stage'
const github = `https://github.com/${repo}`

export function mirrorAssets(release) {
  if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name)) {
    throw new Error('Only published stable Stage releases can be mirrored')
  }
  const version = release.tag_name.slice(1)
  const names = [
    `LivLiv-Stage-${version}-arm64.dmg`,
    `LivLiv-Stage-${version}-x64.dmg`,
    `LivLiv-Stage-Setup-${version}.exe`,
    `LivLiv-Stage-${version}-arm64.zip`,
    `LivLiv-Stage-${version}-x64.zip`,
  ]
  return names.flatMap((name, i) => {
    const asset = release.assets.find(asset => asset.name === name)
    if (!asset && i >= 3) return []
    if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest) || !Number.isSafeInteger(asset.size) || asset.size <= 0) {
      throw new Error(`Missing installer or GitHub SHA256 digest: ${name}`)
    }
    return [{ name, size: asset.size, sha256: asset.digest.slice(7), source: `${github}/releases/download/${release.tag_name}/${name}` }]
  })
}

export async function prepareMirror(release, assetDir, output, baseUrl) {
  const base = new URL(baseUrl)
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash || base.username || base.password) {
    throw new Error('The public download base URL must be an HTTPS origin')
  }
  const assets = mirrorAssets(release)
  // Verify every original file before creating anything that can be uploaded.
  for (const asset of assets) {
    const file = path.join(assetDir, asset.name)
    if ((await stat(file)).size !== asset.size) throw new Error(`Size mismatch: ${asset.name}`)
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(file)) hash.update(chunk)
    if (hash.digest('hex') !== asset.sha256) throw new Error(`SHA256 mismatch: ${asset.name}`)
  }
  const tag = release.tag_name
  const versionDir = path.join(output, 'stage', tag)
  await mkdir(versionDir, { recursive: true })
  for (const asset of assets) {
    await copyFile(path.join(assetDir, asset.name), path.join(versionDir, asset.name), constants.COPYFILE_FICLONE)
  }
  const manifest = {
    tag,
    source: `${github}/releases/tag/${tag}`,
    assets: assets.map(asset => ({ ...asset, url: new URL(`/stage/${tag}/${asset.name}`, base).href })),
  }
  const json = JSON.stringify(manifest, null, 2) + '\n'
  await writeFile(path.join(versionDir, 'release.json'), json)
  await writeFile(path.join(versionDir, 'SHA256SUMS.txt'), assets.map(a => `${a.sha256}  ${a.name}\n`).join(''))
  await writeFile(path.join(output, 'stage', 'latest.json'), json)
  const template = await readFile(new URL('./download-mirror.html', import.meta.url), 'utf8')
  await writeFile(path.join(output, 'stage', 'index.html'), template.replace('__RELEASE_JSON__', JSON.stringify(manifest).replaceAll('<', '\\u003c')))
  return manifest
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: {
    tag: { type: 'string', default: 'latest' },
    output: { type: 'string', default: 'dist-download-mirror' },
    'asset-dir': { type: 'string' },
    'base-url': { type: 'string', default: 'https://downloads.livliv.ai' },
  } })
  const endpoint = values.tag === 'latest' ? 'latest' : `tags/${encodeURIComponent(values.tag)}`
  const release = JSON.parse(execFileSync('gh', ['api', `repos/${repo}/releases/${endpoint}`], { encoding: 'utf8' }))
  const assets = mirrorAssets(release)
  const assetDir = values['asset-dir'] || path.join(values.output, 'originals', release.tag_name)
  if (!values['asset-dir']) {
    await mkdir(assetDir, { recursive: true })
    execFileSync('gh', ['release', 'download', release.tag_name, '--repo', repo, '--dir', assetDir,
      '--skip-existing', ...assets.flatMap(asset => ['--pattern', asset.name])], { stdio: 'inherit' })
  }
  const manifest = await prepareMirror(release, assetDir, values.output, values['base-url'])
  console.log(`Verified ${manifest.assets.length} installers for ${manifest.tag}; prepared ${values.output}/stage`)
}
