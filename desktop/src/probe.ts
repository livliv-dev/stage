// Development only: npm run dev -- --stage=/live/<id>?track=1&trace=synth --probe=<file>. Once a second, for each
// stage window: the animation frames its page got, its 100 ms timer ticks and where its face tracking replay is
// (trace.ts __traceAt), appended to <file> as JSON lines. --probe-scenario then shows, minimizes, restores, covers
// with an opaque window, uncovers, hides and shows the stage, 8 s each; --probe-throttle opens stages with
// Chromium's background throttling on, for comparison.
// LivLiv Stage (--app=stage --probe=<file>): the same for the editor and its output window, plus the poses the output
// was sent and how see-through its corner is; --probe-scenario does the same to the editor once the output is open.
import { appendFileSync, writeFileSync } from 'node:fs'
import { app, BrowserWindow } from 'electron'
import { APP_ORIGIN } from './config'
import { allStages } from './stages'

const PAGE = `(() => {
  const w = window
  if (!w.__desk) {
    w.__desk = { raf: 0, timer: 0 }
    const f = () => { w.__desk.raf++; requestAnimationFrame(f) }
    requestAnimationFrame(f); setInterval(() => { w.__desk.timer++ }, 100)
  }
  const o = { raf: w.__desk.raf, timer: w.__desk.timer, at: w.__traceAt ?? null, loops: w.__trackStats?.loops ?? 0,
    vis: document.visibilityState, focus: document.hasFocus() }
  w.__desk.raf = 0; w.__desk.timer = 0
  return o
})()`

const STAGE_PAGE = `(() => {
  const w = window
  if (!w.__desk) {
    w.__desk = { raf: 0, timer: 0, poses: 0 }
    const f = () => { w.__desk.raf++; requestAnimationFrame(f) }
    requestAnimationFrame(f); setInterval(() => { w.__desk.timer++ }, 100)
    new BroadcastChannel('livliv-stage').onmessage = (e) => { if (e.data.t === 'pose') w.__desk.poses++ }
  }
  const o = { raf: w.__desk.raf, timer: w.__desk.timer, poses: w.__desk.poses, vis: document.visibilityState, w: innerWidth, h: innerHeight, dpr: devicePixelRatio }
  w.__desk.raf = 0; w.__desk.timer = 0; w.__desk.poses = 0
  return o
})()`

export function startStageProbe(file: string, scenario: boolean) {
  writeFileSync(file, '')
  const t0 = Date.now()
  let phase = 'shown'
  const windows = () => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().startsWith(APP_ORIGIN))
  const isOutput = (w: BrowserWindow) => w.webContents.getURL().includes('output=')
  setInterval(async () => {
    for (const w of windows()) {
      try {
        const o = await w.webContents.executeJavaScript(STAGE_PAGE, false)
        // the alpha the compositor has for the corner: 0 is see-through
        const corner = isOutput(w) ? (await w.webContents.capturePage({ x: 1, y: 1, width: 3, height: 3 })).toBitmap()[3] : undefined
        appendFileSync(file, JSON.stringify({ t: Math.round((Date.now() - t0) / 100) / 10, phase, win: isOutput(w) ? 'output' : 'editor', corner, ...o }) + '\n')
      } catch (e) {
        appendFileSync(file, JSON.stringify({ t: (Date.now() - t0) / 1000, phase, error: String(e) }) + '\n')
      }
    }
  }, 1000)
  if (!scenario) return
  const wait = setInterval(() => {
    const ed = windows().find((w) => !isOutput(w))
    if (!ed || !windows().some(isOutput)) return
    clearInterval(wait)
    let cover: BrowserWindow | null = null
    const steps: [string, () => void][] = [
      ['minimized', () => ed.minimize()],
      ['restored', () => ed.restore()],
      ['covered', () => {
        const b = ed.getBounds()
        cover = new BrowserWindow({ x: b.x - 40, y: b.y - 40, width: b.width + 80, height: b.height + 80, frame: false,
          backgroundColor: '#3a3a40', focusable: false, show: false, alwaysOnTop: true })
        cover.setAlwaysOnTop(true, 'screen-saver')
        cover.showInactive()
      }],
      ['uncovered', () => { cover?.close(); cover = null }],
      ['hidden', () => ed.hide()],
      ['shown-again', () => ed.showInactive()],
      ['editor-closed', () => ed.close()],  // the output goes with it: no more lines
      ['done', () => app.quit()],
    ]
    steps.forEach(([name, f], i) => setTimeout(() => { phase = name; f() }, 6_000 + i * 8_000))
  }, 500)
}

export function startProbe(file: string, scenario: boolean) {
  writeFileSync(file, '')
  const t0 = Date.now()
  let phase = 'shown'
  setInterval(async () => {
    for (const s of allStages()) {
      try {
        const o = await s.win.webContents.executeJavaScript(PAGE, false)
        appendFileSync(file, JSON.stringify({ t: Math.round((Date.now() - t0) / 100) / 10, phase, id: s.id, ...o }) + '\n')
      } catch (e) {
        appendFileSync(file, JSON.stringify({ t: (Date.now() - t0) / 1000, phase, id: s.id, error: String(e) }) + '\n')
      }
    }
  }, 1000)
  if (!scenario) return
  let cover: BrowserWindow | null = null
  const steps: [string, () => void][] = [
    ['minimized', () => allStages().forEach((s) => s.win.minimize())],
    ['restored', () => allStages().forEach((s) => s.win.restore())],
    ['covered', () => {
      const s = allStages()[0]
      if (!s) return
      const b = s.win.getBounds()
      cover = new BrowserWindow({ x: b.x - 40, y: b.y - 40, width: b.width + 80, height: b.height + 80, frame: false,
        backgroundColor: '#3a3a40', focusable: false, show: false, alwaysOnTop: true })
      cover.setAlwaysOnTop(true, 'screen-saver')
      cover.showInactive()
    }],
    ['uncovered', () => { cover?.close(); cover = null }],
    ['hidden', () => allStages().forEach((s) => s.win.hide())],
    ['shown-again', () => allStages().forEach((s) => s.win.showInactive())],
    ['done', () => app.quit()],
  ]
  // the stage needs a while to load the character and the face tracking; then 8 s a phase
  steps.forEach(([name, f], i) => setTimeout(() => { phase = name; f() }, 12_000 + i * 8_000))
}
