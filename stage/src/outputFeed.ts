// What the editor does for its output window besides sending it the scene (scene.ts) and the poses (actors.ts):
//  - keeps the characters drawing while the editor is out of sight. A browser gives a page it doesn't show no
//    animation frames (another tab in front, the window minimised), so the output got no poses at all and stood
//    still. While an output is open, a worker's clock (which a hidden page keeps) draws a frame for each character
//    whose own loop has stopped (Actor.keepUp); the camera keeps running in a hidden page, so the face tracking goes on
//  - tells it whether to show the LivLiv mark: on livliv.ai/stage on the free plan, as its recordings carry it. Not
//    before the account is known (a member's output would flash it); desktop and self-hosted copies never
import { actors } from './actors'
import { isOutput, onMsg, outputOpen, post } from './link'
import { onSite } from './host'
import { accountNow, onAccount } from './livliv'

let worker: Worker | null = null
function tick() {
  if (!outputOpen()) { stop(); return }
  const now = performance.now()
  actors.forEach((a) => a.keepUp(now))
}
function start() {
  if (worker || typeof Worker === 'undefined') return
  try {
    const url = URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 33)'], { type: 'text/javascript' }))
    const w = new Worker(url)
    let loaded = false
    w.onmessage = () => { if (!loaded) { loaded = true; URL.revokeObjectURL(url) } tick() }
    w.onerror = () => { URL.revokeObjectURL(url); stop() }  // a page that refuses blob: workers: the output follows the editor while it is shown
    worker = w
  } catch { worker = null }  // no workers here: the output follows the editor while it is shown
}
function stop() { worker?.terminate(); worker = null }

export const markShown = () => onSite && accountNow().status !== 'unknown' && accountNow().recordMark

/** the editor's side (App mounts it once) */
export function connectOutputFeed() {
  if (isOutput) return () => {}
  let sent: boolean | null = null
  const mark = (again = false) => { const on = markShown(); if (again || on !== sent) { sent = on; post({ t: 'mark', on }) } }
  const off = onMsg((m) => {
    if (m.t === 'hello' || m.t === 'alive') start()
    if (m.t === 'hello') mark(true)
  })
  const offAccount = onAccount(() => mark())
  return () => { off(); offAccount(); stop() }
}
