// The local command endpoint: Stream Deck, Streamer.bot or Touch Portal call a URL on this computer instead of going
// through the livliv.ai server. Same path and `do` grammar as the server's /api/live/cmd, so a button set up for the
// site needs only its host changed:
//   http://127.0.0.1:21480/api/live/cmd?m=<character>&k=<its key>&do=expr:1
// or, for whatever stage is open, the shell's own token instead of a character's key:
//   http://127.0.0.1:21480/api/live/cmd?token=<token>&do=act:nod
// Only on 127.0.0.1; the Host header must name it (a web page can't reach it by DNS rebinding) and a request from a
// web page (an Origin header) must come from the site itself. No CORS headers: a page elsewhere can't read answers.
// Plain Node, no Electron: main.ts hands it what it needs.
import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { serveStageApi, type StageApiDeps } from './stageApi'
import { parseDo, type CmdBody } from './commands'

export type LocalApiDeps = {
  stage?: StageApiDeps
  token: () => string
  /** to the open stages (all, or this character's); how many got it */
  deliver: (cmd: CmdBody, character?: string) => number
  /** this character has a stage open with this key */
  keyOk: (character: string, key: string) => boolean
  stages: () => number
  version: string
  /** origins whose pages may call it (the site) */
  origins: ReadonlySet<string>
}

export type LocalApi = { port: number; close: () => Promise<void> }

const RATE = 60  // requests a second, for all callers together (and again for refused ones): more is a stuck button or a loop

export const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y)
}

export function handler(deps: LocalApiDeps, port: () => number) {
  // requests without a valid token or key count on their own, so they can't make the real ones wait
  const authorized: number[] = [], refused: number[] = []
  const busy = (recent: number[]) => {
    const now = Date.now()
    while (recent.length && recent[0] <= now - 1000) recent.shift()
    if (recent.length >= RATE) return true
    recent.push(now)
    return false
  }
  const send = (res: ServerResponse, status: number, body: object) => {
    if (res.destroyed || res.writableEnded) return
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify(body))
  }
  return (req: IncomingMessage, res: ServerResponse) => {
    const p = port()
    if (req.headers.host !== `127.0.0.1:${p}` && req.headers.host !== `localhost:${p}`) return send(res, 421, { detail: 'wrong host' })
    const origin = req.headers.origin
    if (origin !== undefined && !deps.origins.has(origin)) return send(res, 403, { detail: 'not from a page' })
    if ((req.url || '').length > 4096) return send(res, 414, { detail: 'too long' })
    let u: URL
    try { u = new URL(req.url || '/', `http://127.0.0.1:${p}`) } catch { send(res, 400, { detail: 'Invalid request URL' }); return }
    const stageRoute = u.pathname === '/api/stage/state' || u.pathname === '/api/stage/command'
    const q = u.searchParams, m = q.get('m') || '', k = q.get('k') || ''
    const auth = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] || (req.headers['x-livliv-token'] as string | undefined) || q.get('token') || ''
    const ok = same(auth, deps.token()) || (!stageRoute && !!m && !!k && deps.keyOk(m, k))
    if (busy(ok ? authorized : refused)) return send(res, 429, { detail: '太快了' })
    if (u.pathname === '/api/health') return send(res, 200, { ok: true, app: deps.stage ? 'livliv-stage' : 'livliv-desktop', version: deps.version, stages: deps.stages() })
    if (u.pathname !== '/api/live/cmd' && !(stageRoute && deps.stage)) return send(res, 404, { detail: 'Not Found' })
    if (!stageRoute && req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { detail: 'Method Not Allowed' })
    if (!ok) return send(res, 403, { detail: '令牌不对，或者这个角色的开播窗口没开' })
    if (stageRoute && deps.stage) { void serveStageApi(req, res, u.pathname, deps.stage, send); return }
    const cmd = parseDo(q.get('do') || '')
    if (!cmd) return send(res, 400, { detail: '不认识这个指令' })
    if (deps.stage) {
      void deps.stage.command({ ...cmd, ...(m ? { character: m } : {}) })
        .then((result) => send(res, result.ok ? result.pending ? 202 : 200 : result.status, { ...result, delivered: result.ok ? 1 : 0 }))
        .catch((error) => { console.error('[stage-api] legacy command unavailable:', error); send(res, 503, { error: 'Stage is not responding', delivered: 0 }) })
    } else send(res, 200, { delivered: deps.deliver(cmd, m || undefined) })
  }
}

/** listens on the first free port from `port` up (ten tries) */
export async function startLocalApi(port: number, deps: LocalApiDeps): Promise<LocalApi> {
  let bound = port
  const server: Server = createServer(handler(deps, () => bound))
  server.headersTimeout = 5000; server.requestTimeout = 5000
  const listen = (p: number) => new Promise<boolean>((resolve, reject) => {
    const fail = (e: NodeJS.ErrnoException) => { server.off('listening', done); if (e.code === 'EADDRINUSE') resolve(false); else reject(e) }
    const done = () => { server.off('error', fail); resolve(true) }
    server.once('error', fail); server.once('listening', done)
    server.listen(p, '127.0.0.1')
  })
  for (let p = port; p < port + 10; p++) {
    if (await listen(p)) {
      bound = p
      return { port: p, close: () => new Promise<void>((resolve, reject) => { server.close((error) => error ? reject(error) : resolve()); server.closeAllConnections() }) }
    }
  }
  throw new Error(`ports ${port}-${port + 9} are all taken`)
}
