// How smoothly .mavatar characters play beside PNGTuber ones: three of a kind on one stage, in the desktop app (Electron,
// on Stage's dev server for its hooks) and in the site build (built as livliv.ai serves it, at /stage/, in Chromium on
// this machine's GPU). Each stage comes in as a project file (made here with Stage's own save), so the site build needs
// no hooks. Measured over 6 s after 3 s to settle: the page's frame rate, and in the desktop app each character's and
// what its drawing costs the main thread a frame.
// A measurement for a person to read, not a pass or fail: the numbers depend on the machine and on what else it runs.
//   npm --prefix ../desktop run build && node test/fps-bodies.mjs        (macOS)
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { loadavg, tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { chromium, _electron as electron } from 'playwright-core'
import { freePort, stageRoot, startVite } from './vite.mjs'

const KINDS = ['mavatar', 'png'], SETTLE = 3000, MEASURE = 6000
const desktop = join(stageRoot, '../desktop'), work = await mkdtemp(join(tmpdir(), 'livliv-stage-fps-'))
const mesh = [...readFileSync(join(stageRoot, 'test/fixtures/nana.mavatar'))]
const report = { work, load: loadavg().map((n) => Math.round(n)), projects: {}, desktop: {}, site: {} }
// LivLiv's /api, signed out
const api = createServer((req, res) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false })))
await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve))
const init = () => { localStorage.setItem('livliv-stage:locale', 'zh-Hans'); localStorage.setItem('livliv-stage:coached', '1') }

/** the page's frame rate, and (with Stage's hooks) each character's, over MEASURE ms */
async function measure(page, hooks) {
  await page.waitForTimeout(SETTLE)
  return page.evaluate(async ([ms, hooks]) => {
    const gaps = [], drawn = new Map()
    let on = true, last = performance.now()
    const tick = (now) => { gaps.push(now - last); last = now; if (on) requestAnimationFrame(tick) }
    requestAnimationFrame((now) => { last = now; requestAnimationFrame(tick) })
    const off = hooks ? (await import('/src/actors.ts')).onFrame((a) => drawn.set(a.item.id, (drawn.get(a.item.id) ?? 0) + 1)) : () => {}
    // with the hooks, what each character's drawing costs a frame (its body's render: the GPU's part is not counted)
    const spent = [], undo = []
    if (hooks) for (const a of window.__stage.actors.values()) {
      const body = a.player.body, render = body.render, i = spent.push([]) - 1
      body.render = function (...args) { const t = performance.now(); try { return render.apply(this, args) } finally { spent[i].push(performance.now() - t) } }
      undo.push(() => { body.render = render })
    }
    const t0 = performance.now()
    await new Promise((resolve) => setTimeout(resolve, ms)); off(); on = false; undo.forEach((f) => f())
    const seconds = (performance.now() - t0) / 1000, sorted = [...gaps].sort((a, b) => a - b), each = [...drawn.values()].map((n) => n / seconds)
    return {
      fps: Math.round(gaps.length / seconds * 10) / 10, p95ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10, over33ms: gaps.filter((g) => g > 33.4).length,
      ...(hooks ? { characters: each.map((n) => Math.round(n * 10) / 10), renderMs: spent.map((t) => Math.round(t.reduce((x, y) => x + y, 0) / Math.max(1, t.length) * 100) / 100) } : {}),
    }
  }, [MEASURE, hooks])
}
/** what draws: the GPU, as WebGL names it */
const gpu = (page) => page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'), x = gl?.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl ? 'unknown' : 'none' })
/** a project file opened from the top bar, until its three characters are on the stage: with Stage's hooks, each
 *  ready; without, three canvases and no loading or error badge on them */
async function open(page, kind, hooks) {
  // the desktop app: as the top bar opens one (its file picker is the shell's); the site build: through the top bar
  if (hooks) await page.evaluate(async (bytes) => {
    const { openProject } = await import('/src/project.ts'), { project } = await openProject(new File([new Uint8Array(bytes)], 'stage.livstage'))
    window.__stage.store.replaceProject(project)
  }, report.projects[kind])
  else {
    await page.locator('.topbar input[type=file]').setInputFiles({ name: `${kind}.livstage`, mimeType: 'application/zip', buffer: Buffer.from(report.projects[kind]) })
    await page.locator('.project-progress').waitFor({ state: 'hidden' })
  }
  await page.waitForTimeout(500)
  const ready = hooks
    ? () => window.__stage.actors.size === 3 && [...window.__stage.actors.values()].every((a) => a.status === 'ready')
    : () => document.querySelectorAll('canvas.character').length === 3 && ![...document.querySelectorAll('canvas.character ~ .badge')].length
  await page.waitForFunction(ready, null, { timeout: 90000 }).catch(async (e) => {
    await page.screenshot({ path: join(work, `${kind}-stuck.png`) })
    const seen = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas.character').length, badges: [...document.querySelectorAll('.badge')].map((b) => b.textContent),
      actors: window.__stage ? [...window.__stage.actors.values()].map((a) => [a.format, a.status, a.error]) : null }))
    throw new Error(`${kind}: not ready: ${JSON.stringify(seen)} (${work})`, { cause: e })
  })
}

const port = await freePort(), origin = `http://127.0.0.1:${port}`
let vite, browser, app, site
try {
  vite = await startVite({ port, env: { LM_API_PORT: String(api.address().port) } })
  browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
  // the two stages, saved by Stage itself: three .mavatar (Nana), three PNGTubers of the same size
  {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await page.addInitScript(init); await page.goto(origin, { waitUntil: 'networkidle' })
    for (const kind of KINDS) {
      report.projects[kind] = await page.evaluate(async ([kind, mesh]) => {
        const { fromFiles, fromPngs } = await import('/src/library.ts'), { emptyScene, newCharacter } = await import('/src/scene.ts'), { projectFile } = await import('/src/project.ts')
        const s = window.__stage.store
        s.replace({ ...emptyScene(), name: `three ${kind}` })
        const picture = async (color) => { const c = new OffscreenCanvas(1024, 1536), g = c.getContext('2d'); g.fillStyle = color; g.beginPath(); g.ellipse(512, 420, 300, 330, 0, 0, 7); g.fill(); g.fillRect(212, 760, 600, 776); return c.convertToBlob({ type: 'image/png' }) }
        for (let i = 0; i < 3; i++) {
          const pick = kind === 'mavatar' ? await fromFiles([new File([new Uint8Array(mesh)], 'nana.mavatar')])
            : await fromPngs({ closed: new File([await picture('#f0a0c0')], 'closed.png'), open: new File([await picture('#e07090')], 'open.png') }, 'PNG')
          const c = newCharacter(s.get(), pick.name, pick.model, '', .2 + i * .3); c.lines = 'none'; s.add(c)
        }
        return [...new Uint8Array(await (await projectFile(s.project())).arrayBuffer())]
      }, [kind, mesh])
    }
    await page.close()
  }

  // the desktop app on the dev server
  app = await electron.launch({ executablePath: join(desktop, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), args: [desktop, '--app=stage', `--url=${origin}`, `--user-data=${join(work, 'profile')}`, `--api=http://127.0.0.1:${api.address().port}`], timeout: 30000 })
  const win = await app.firstWindow()
  await win.addInitScript(init); await win.reload(); await win.waitForSelector('.topbar')
  report.desktop.gpu = await gpu(win)
  for (const kind of KINDS) { await open(win, kind, true); report.desktop[kind] = await measure(win, true) }
  await app.close(); app = null

  // the site build, served at /stage/ as livliv.ai serves it
  const out = join(work, 'site')
  execFileSync(process.execPath, [join(stageRoot, 'scripts/build-site.mjs'), out], { cwd: stageRoot, stdio: 'ignore', env: { ...process.env, STAGE_ALLOW_DIRTY: '1' } })
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2' }
  site = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname
    if (path.startsWith('/api/')) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signed_in: false, available: false })); return }
    let f = join(out, normalize(decodeURIComponent(path.replace(/^\/stage\/?/, ''))).replace(/^([/\\])+/, ''))
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html')
    if (!f.startsWith(out) || !existsSync(f)) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }).end(readFileSync(f))
  })
  await new Promise((resolve) => site.listen(0, '127.0.0.1', resolve))
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await page.addInitScript(init); await page.goto(`http://127.0.0.1:${site.address().port}/stage/`, { waitUntil: 'networkidle' })
  report.site.gpu = await gpu(page)
  for (const kind of KINDS) { await open(page, kind, false); report.site[kind] = await measure(page, false) }
} finally {
  await app?.close(); await browser?.close(); vite?.kill(); site?.close(); api.close()
}
delete report.projects
console.log(JSON.stringify(report, null, 1))
process.exit(0)
