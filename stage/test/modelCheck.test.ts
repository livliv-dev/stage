// What an import must be before it goes on the stage (src/modelCheck.ts): a LivLiv model package the player can read
// (a real one, zipped from a featured character, passes; text, a zip without model.json, a model.json that isn't JSON
// or isn't LivLiv's, and one for a newer player are each refused in words), a VRM (a binary glTF), PNGTuber pictures (PNG, WebP or GIF).
// The player's own English never reaches the add card or the canvas for a file that isn't right.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { zipSync } from 'fflate'
import { LivLivError } from '@livliv-dev/player'
import { checkPackage, checkPicture, checkVrm, refused } from '../src/modelCheck'

const DIR = new URL('../public/characters/k01/', import.meta.url).pathname
const walk = (dir: string, at = ''): [string, Uint8Array][] => readdirSync(dir).flatMap((n) => statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${at}${n}/`) : [[`${at}${n}`, new Uint8Array(readFileSync(join(dir, n)))] as [string, Uint8Array]])
const files = walk(DIR)
const zip = (entries: [string, Uint8Array | string][]) => new Blob([zipSync(Object.fromEntries(entries.map(([k, v]) => [k, typeof v === 'string' ? new TextEncoder().encode(v) : v])))])
const fails = async (p: Promise<unknown>, text: string) => { await assert.rejects(p, (e: Error) => { assert.equal(e.message, text); return true }) }

test('a real model package passes, zipped or as a folder', async () => {
  await checkPackage(zip(files))
  await checkPackage(new Map(files.map(([k, v]) => [k, new Blob([v])])))
})

test('what is not a readable package is refused in words, never the player\'s English', async () => {
  await fails(checkPackage(new Blob(['just some text, not a zip'])), '这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹')
  await fails(checkPackage(zip([['readme.txt', 'hello']])), '模型包缺少文件：请重新从 LivLiv 导出')
  await fails(checkPackage(zip([['model.json', '{ not json']])), '模型文件已损坏：请重新从 LivLiv 导出')
  await fails(checkPackage(zip([['model.json', '[1, 2]']])), '模型文件已损坏：请重新从 LivLiv 导出')
  await fails(checkPackage(zip([['model.json', '{"format": "some-other-thing", "version": 1}']])), '这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹')
  await fails(checkPackage(zip([['model.json', '{"format": "livliv-model", "version": 99}']])), '这个模型需要更新版本的 Stage')
  await fails(checkPackage(new Map([['notes.txt', new Blob(['hi'])]])), '模型包缺少文件：请重新从 LivLiv 导出')
})

test('a VRM is a binary glTF', async () => {
  await checkVrm(new Blob([new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0])]))
  await fails(checkVrm(new Blob(['not a model'])), '这不是 VRM 文件')
})

test('PNGTuber pictures are PNG, WebP or GIF', async () => {
  await checkPicture(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])]), 'a.png')
  await checkPicture(new Blob(['GIF89a....']), 'a.gif')
  await checkPicture(new Blob(['RIFF\x10\x00\x00\x00WEBPVP8 ']), 'a.webp')
  await fails(checkPicture(new Blob(['%PDF-1.7']), 'notes.pdf'), 'notes.pdf 不是 PNG、WebP 或 GIF 图片')
})

test('the canvas says the same for a character the player refuses', () => {
  assert.equal(refused(new LivLivError('not-a-model', 'LivLiv: this file is not a .livliv package (not a ZIP)')), '这不是 LivLiv 模型包：请选 LivLiv 导出的 .livliv、zip 或文件夹')
  assert.equal(refused(new LivLivError('missing-file', 'LivLiv: no model.json among the files')), '模型包缺少文件：请重新从 LivLiv 导出')
  assert.equal(refused(new LivLivError('invalid', 'LivLiv: bad thing')), '模型文件已损坏：请重新从 LivLiv 导出')
  assert.equal(refused(new LivLivError('newer-format', 'x')), '这个模型需要更新版本的 Stage')
  assert.equal(refused(new Error('plain')), 'plain')
})
