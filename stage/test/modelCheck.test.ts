// What an import must be before it goes on the stage (src/modelCheck.ts): a LivLiv model package the player can read (a
// real one, zipped from a featured character or as a folder, passes whatever its names hold; text, a zip without
// model.json, a model.json that isn't JSON or isn't LivLiv's, and one for a newer player are each refused in words), a
// VRM (a binary glTF 2.0 with its JSON first), PNGTuber pictures (PNG, WebP or GIF). The player's own English never
// reaches the add card or the canvas, and the canvas words a refusal for the character's format.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { zipSync } from 'fflate'
import { LivLivError } from '@livliv-dev/player'
import { checkModel, checkPackage, checkPicture, checkVrm, modelJsonOf, refused } from '../src/modelCheck'

const DIR = new URL('../public/characters/k01/', import.meta.url).pathname
const walk = (dir: string, at = ''): [string, Uint8Array][] => readdirSync(dir).flatMap((n) => statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${at}${n}/`) : [[`${at}${n}`, new Uint8Array(readFileSync(join(dir, n)))] as [string, Uint8Array]])
const files = walk(DIR)
const zip = (entries: [string, Uint8Array | string][]) => new Blob([zipSync(Object.fromEntries(entries.map(([k, v]) => [k, typeof v === 'string' ? new TextEncoder().encode(v) : v])))])
const fails = async (p: Promise<unknown>, text: string) => { await assert.rejects(p, (e: Error) => { assert.equal(e.message, text); return true }) }

test('a real model package passes, zipped or as a folder, whatever its names hold (#, ?, :)', async () => {
  await checkPackage(zip(files))
  await checkPackage(zip([...files.map(([k, v]) => [`Nana #2/${k}`, v] as [string, Uint8Array]), ['Nana #2/notes #1: why?.txt', 'hi']]))
  // a folder, as an <input webkitdirectory> names its files: the shallowest model.json is the one read (library.ts)
  const folder = new Map<string, Blob>([...files.map(([k, v]) => [`k01/${k}`, new Blob([v])] as [string, Blob]), ['k01/notes #1.txt', new Blob(['hi'])], ['k01/old/model.json', new Blob(['{ broken'])]])
  const json = modelJsonOf(folder.keys())
  assert.equal(json, 'k01/model.json')
  await checkModel(folder.get(json)!)
  const hashed = new Map<string, Blob>(files.map(([k, v]) => [`Nana #2/${k}`, new Blob([v])]))
  await checkModel(hashed.get(modelJsonOf(hashed.keys()))!)
})

test('what is not a readable package is refused in words, never the player\'s English', async () => {
  await fails(checkPackage(new Blob(['just some text, not a zip'])), '这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹')
  await fails(checkPackage(zip([['readme.txt', 'hello']])), '模型包缺少文件：请重新从 LivLiv 导出')
  await fails(checkPackage(zip([['model.json', '{ not json']])), '模型文件已损坏：请重新从 LivLiv 导出')
  await fails(checkPackage(zip([['model.json', '[1, 2]']])), '模型文件已损坏：请重新从 LivLiv 导出')
  await fails(checkPackage(zip([['model.json', '{"format": "some-other-thing", "version": 1}']])), '这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹')
  await fails(checkPackage(zip([['model.json', '{"format": "livliv-model", "version": 99}']])), '这个模型需要更新版本的 Stage')
  assert.equal(modelJsonOf(['notes.txt', 'a/b.png']), undefined, 'a folder without model.json: library.ts says so')
  // the player's rule: the shortest path, even when another one is in fewer folders
  assert.equal(modelJsonOf(['a-very-long-folder-name/model.json', 'a/b/model.json']), 'a/b/model.json')
})

test('a VRM is a binary glTF 2.0 whose first chunk is its JSON', async () => {
  const glb = (version: number, chunk: string) => { const b = new Uint8Array(24), v = new DataView(b.buffer); b.set([0x67, 0x6c, 0x54, 0x46]); v.setUint32(4, version, true); v.setUint32(8, 24, true); v.setUint32(12, 4, true); b.set([...chunk].map((c) => c.charCodeAt(0)), 16); return new Blob([b]) }
  await checkVrm(glb(2, 'JSON'))
  await checkVrm(new Blob([readFileSync(new URL('./fixtures/avatar.vrm', import.meta.url))]))
  await fails(checkVrm(glb(1, 'JSON')), '这不是 VRM 文件')
  await fails(checkVrm(glb(2, 'BIN\0')), '这不是 VRM 文件')
  await fails(checkVrm(new Blob(['not a model'])), '这不是 VRM 文件')
})

test('PNGTuber pictures are PNG, WebP or GIF', async () => {
  await checkPicture(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])]), 'a.png')
  await checkPicture(new Blob(['GIF89a....']), 'a.gif')
  await checkPicture(new Blob(['RIFF\x10\x00\x00\x00WEBPVP8 ']), 'a.webp')
  await fails(checkPicture(new Blob(['%PDF-1.7']), 'notes.pdf'), 'notes.pdf 不是 PNG、WebP 或 GIF 图片')
})

test('the canvas words a refusal for the character\'s format', () => {
  const vrm = (code: 'not-a-model' | 'invalid') => refused(new LivLivError(code, 'x'), 'vrm'), png = (code: 'invalid' | 'missing-file') => refused(new LivLivError(code, 'x'), 'png')
  assert.equal(vrm('not-a-model'), '这不是 VRM 文件')
  assert.equal(vrm('invalid'), 'VRM 文件已损坏，读不出来：请重新导出')
  assert.equal(png('invalid'), '立绘图片读不出来：请换成 PNG、WebP 或 GIF')
  assert.equal(png('missing-file'), '立绘缺少图片：至少要闭嘴和张嘴两张')
  assert.equal(refused(new LivLivError('no-webgl', 'x'), 'vrm'), '这台电脑无法启动 WebGL2', 'what isn\'t about the file reads the same for every format')
})

test('the canvas says the same for a LivLiv package the player refuses', () => {
  assert.equal(refused(new LivLivError('not-a-model', 'LivLiv: this file is not a .livliv package (not a ZIP)')), '这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹')
  assert.equal(refused(new LivLivError('missing-file', 'LivLiv: no model.json among the files')), '模型包缺少文件：请重新从 LivLiv 导出')
  assert.equal(refused(new LivLivError('invalid', 'LivLiv: bad thing')), '模型文件已损坏：请重新从 LivLiv 导出')
  assert.equal(refused(new LivLivError('newer-format', 'x')), '这个模型需要更新版本的 Stage')
  assert.equal(refused(new Error('plain')), 'plain')
})
