// A Mesh Avatar Studio avatar (.mavatar, test/fixtures/nana.mavatar: Nana, made into one by LivLiv) on the way in, without
// a browser: the add card's check (a ZIP holding avatar.json and rig.json, named as avatar.json says), the canvas's
// words for a refusal, a friend's copy of it checked from its headers before anything decodes it, and the co-stream
// manifest that names its format. Drawing it is the Player's (its own tests); the stage's paths are test/browser.mjs,
// test/projects.mjs and test/collab.mjs.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { unzipSync, zipSync } from 'fflate'
import { LivLivError } from '@livliv-dev/player'
import { checkMavatar, refused } from '../src/modelCheck'
import { checkPackage } from '../src/collab/headers'
import { readManifest } from '../src/collab/protocol'

const bytes = new Uint8Array(readFileSync(new URL('./fixtures/nana.mavatar', import.meta.url)))
const fails = async (p: Promise<unknown>, text: string) => { await assert.rejects(p, (e: Error) => { assert.equal(e.message, text); return true }) }
const without = (name: string) => { const all = unzipSync(bytes); delete all[name]; return new Blob([zipSync(all, { level: 0 })]) }

test('a .mavatar passes, named as its avatar.json says; what is not one is refused in words', async () => {
  assert.equal(await checkMavatar(new Blob([bytes])), 'Nana')
  await fails(checkMavatar(new Blob(['this is not a model'])), '这不是 .mavatar 文件')
  await fails(checkMavatar(without('rig.json')), '这不是 .mavatar 文件')
  await fails(checkMavatar(without('avatar.json')), '这不是 .mavatar 文件')
  const all = unzipSync(bytes)
  all['avatar.json'] = new TextEncoder().encode('{ broken')
  await fails(checkMavatar(new Blob([zipSync(all, { level: 0 })])), '.mavatar 文件已损坏或不完整：请在 Mesh Avatar Studio 里重新导出')
  all['avatar.json'] = new TextEncoder().encode('{"format": "mesh-avatar", "version": 1}')
  assert.equal(await checkMavatar(new Blob([zipSync(all, { level: 0 })])), null, 'no name: the file name stands in (library.ts)')
})

test('the canvas words a refusal for a .mavatar', () => {
  const said = (code: 'not-a-model' | 'invalid' | 'missing-file') => refused(new LivLivError(code, 'x'), 'mavatar')
  assert.equal(said('not-a-model'), '这不是 .mavatar 文件')
  assert.equal(said('invalid'), '.mavatar 文件已损坏或不完整：请在 Mesh Avatar Studio 里重新导出')
  assert.equal(said('missing-file'), '.mavatar 文件已损坏或不完整：请在 Mesh Avatar Studio 里重新导出')
  assert.equal(refused(new LivLivError('no-webgl', 'x'), 'mavatar'), '这台电脑无法启动 WebGL2')
})

test("a friend's .mavatar passes the received-file check; one hiding an oversized picture does not", async () => {
  await checkPackage(new Map([['model.mavatar', new Blob([bytes])]]))
  const all = unzipSync(bytes), ihdr = all['built/base.png'].slice()
  new DataView(ihdr.buffer).setUint32(16, 9000)  // the header says 9000 px wide
  all['built/base.png'] = ihdr
  await assert.rejects(checkPackage(new Map([['model.mavatar', new Blob([zipSync(all, { level: 0 })])]])), /图片太大/)
})

test('the co-stream manifest takes the mavatar format, and still nothing it does not know', () => {
  const manifest = { id: 'm1', name: 'Nana', format: 'mavatar', mirror: false, color: '#ff88aa', files: [{ path: 'model.mavatar', size: bytes.length, type: '' }] }
  assert.equal(readManifest(manifest)?.format, 'mavatar')
  assert.equal(readManifest({ ...manifest, format: 'live2d' }), null)
})
