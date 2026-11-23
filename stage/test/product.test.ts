import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { detectFeatures, type Host } from '../src/core/platform'
import { productOf } from '../src/core/product'
import { pageHead } from '../src/core/head'

// every Host platform.ts knows (a Record: a host added there and not here fails the type)
const NAMES: Record<Host, string> = { site: 'LivLiv Stage', desktop: 'VTuber Stage', selfhosted: 'VTuber Stage' }
const HOSTS = Object.keys(NAMES) as Host[]

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))

// livliv.ai/stage keeps the name it opened with; the open-source app is VTuber Stage everywhere else
test('each host has its name', () => {
  for (const host of HOSTS) assert.equal(productOf(host).name, NAMES[host], host)
  assert.equal(productOf('site').mark, 'wordmark.svg')
})

test('the host of each build and page picks that name', () => {
  const host = (from: Partial<Parameters<typeof detectFeatures>[0]>) => detectFeatures({ siteBuild: false, appScheme: false, bridge: undefined, hasBridge: false, ...from }).host
  assert.equal(productOf(host({ siteBuild: true })).name, 'LivLiv Stage')
  assert.equal(productOf(host({ siteBuild: true, hasBridge: true, bridge: {} })).name, 'LivLiv Stage')  // livliv.ai opened in the desktop shell
  assert.equal(productOf(host({ appScheme: true })).name, 'VTuber Stage')
  assert.equal(productOf(host({})).name, 'VTuber Stage')
})

test('every host\'s logos are in public/', () => {
  for (const host of HOSTS) {
    const { mark, full } = productOf(host)
    for (const file of [mark, full]) assert.ok(existsSync(publicDir + file), `${host}: public/${file}`)
  }
})

// the page itself: livliv.ai/stage's title, description and link preview stay LivLiv Stage's; other builds get the new
// name as their title and no link preview of livliv.ai's
test('each build\'s page title and link preview', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const site = pageHead(index, productOf('site').name, true)
  assert.match(site, /<title>LivLiv Stage<\/title>/)
  assert.match(site, /<meta property="og:title" content="LivLiv Stage" \/>/)
  assert.match(site, /<meta name="description" content="LivLiv Stage, your AI VTuber studio\./)
  assert.match(site, /<meta property="og:image" content="https:\/\/livliv\.ai\/stage\/og\.jpg" \/>/)
  assert.doesNotMatch(site, /VTuber Stage/)
  for (const host of ['desktop', 'selfhosted']) {
    const app = pageHead(index, productOf(host).name, false)
    assert.match(app, /<title>VTuber Stage<\/title>/, host)
    assert.doesNotMatch(app, /og:|LivLiv Stage/, host)
  }
})
