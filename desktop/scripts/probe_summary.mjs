// node scripts/probe_summary.mjs <probe.jsonl>: a --probe-scenario run (src/probe.ts) by phase. For each: the stage's
// animation frames a second (min / median), its 100 ms timer ticks a second, how far the face tracking replay moved
// per second (1.00 = in step; 0 = stopped) and what the page thought of its visibility.
import { readFileSync } from 'node:fs'

const rows = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const phases = new Map()
let prev = null
for (const r of rows) {
  if (!('raf' in r)) continue
  const adv = prev?.at != null && r.at != null ? (((r.at - prev.at) % 24.024) + 24.024) % 24.024 : null
  prev = r
  if (r.t < 5) continue  // loading
  if (!phases.has(r.phase)) phases.set(r.phase, [])
  phases.get(r.phase).push({ raf: r.raf, timer: r.timer, adv, vis: r.vis })
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
console.log('phase         s  rAF/s min/med  timer/s  replay s/s  visibility')
for (const [name, v] of phases) {
  const raf = v.map((x) => x.raf), adv = v.map((x) => x.adv).filter((x) => x != null)
  const replay = adv.length ? `${Math.min(...adv).toFixed(2)}-${Math.max(...adv).toFixed(2)}` : '-'
  console.log(`${name.padEnd(12)} ${String(v.length).padStart(2)}  ${String(Math.min(...raf)).padStart(6)}/${String(med(raf)).padEnd(6)}  ${String(med(v.map((x) => x.timer))).padStart(7)}  ${replay.padStart(10)}  ${[...new Set(v.map((x) => x.vis))].join(',')}`)
}
