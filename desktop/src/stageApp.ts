// LivLiv Stage built into the app. Its web build (stage/dist) is served at livliv-stage://app, a
// privileged scheme: a secure page of its own origin, so storage (the scene, imported packages, the video being
// made), workers, the camera and microphone work as on a website. /api and /models are passed on to LivLiv: the
// account's cookie stays in this app's session for LivLiv's site, so signing in from Stage needs no cross-origin
// rules, and the page never sees it. /__ai?u=<url> passes a request on to the user's own model API (their key in its
// Authorization header, no cookies): no CORS in the way, so a local server (Ollama) or an API that doesn't answer
// browsers works as it does for any desktop app; stageProxy.ts holds what it may reach. Only this page reaches the scheme.
import { existsSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { net, protocol, session } from 'electron'
import { STAGE_SCHEME } from './config'
import { proxyRequest } from './requests'
import { forward, passToModel, type HopInit, type ModelDeps, type Redirect } from './stageProxy'

/** before the app is ready */
export function registerStageScheme() {
  protocol.registerSchemesAsPrivileged([{
    scheme: STAGE_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
  }])
}

// what a file is served as (net.fetch of a file: URL guesses some, not all)
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
}

/** serves `dir` at livliv-stage://app (a path that is no file is the page: one page app), /api and /models from `api`;
 *  /__ai never reaches the control API on `controlPort` */
export function serveStage(dir: string, api: string, controlPort: () => number | null) {
  const root = resolve(dir) + sep
  const models: ModelDeps = { hop, controlPort, resolve: async (host) => (await net.resolveHost(host)).endpoints.map((e) => e.address) }
  protocol.handle(STAGE_SCHEME, async (req) => {
    const u = new URL(req.url)
    if (u.host !== 'app') return new Response('not found', { status: 404 })
    if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/models/')) return proxyRequest(req, (signal) => pass(req, u, api, signal))
    if (u.pathname === '/__ai') return proxyRequest(req, (signal) => passToModel(req, u.searchParams.get('u') ?? '', signal, models))
    let path: string
    try { path = decodeURIComponent(u.pathname) } catch { return new Response('bad path', { status: 400 }) }
    const want = resolve(root, '.' + path)
    const file = want.startsWith(root) && existsSync(want) && statSync(want).isFile() ? want : join(root, 'index.html')
    const r = await net.fetch(pathToFileURL(file).toString())
    const headers = new Headers(r.headers)
    headers.set('content-type', TYPES[extname(file).toLowerCase()] ?? headers.get('content-type') ?? 'application/octet-stream')
    return new Response(r.body, { status: r.status, headers })
  })
}

// a header value as bytes, as net.fetch passes them on (Headers takes nothing above U+00FF)
const byteString = (v: string) => (/[^\u0000-\u00ff]/.test(v) ? Buffer.from(v, 'utf8').toString('latin1') : v)

/** one request to the user's model API without this app's cookies, a redirect not followed but returned. net.request,
 *  not net.fetch: net.fetch with redirect 'manual' fails without saying where the redirect points */
function hop(url: URL, { method, headers, body, signal }: HopInit): Promise<Response | Redirect> {
  return new Promise((done, failed) => {
    if (signal.aborted) { failed(signal.reason); return }
    const r = net.request({ url: url.toString(), method, redirect: 'manual', credentials: 'omit', bypassCustomProtocolHandlers: true })
    let redirect: Redirect | undefined
    const abort = () => { failed(signal.reason); r.abort() }
    signal.addEventListener('abort', abort, { once: true })
    // not followed: the request then ends with an error, and the redirect is the answer
    r.on('redirect', (_status, newMethod, location) => { redirect = { location, method: newMethod } })
    r.on('response', (res) => {
      try {
        const out = new Headers()
        for (const [k, v] of Object.entries(res.headers)) for (const x of [v].flat()) out.append(k, byteString(x))
        const empty = [204, 205, 304].includes(res.statusCode)
        done(new Response(empty ? null : Readable.toWeb(res as unknown as Readable) as ReadableStream, { status: res.statusCode, statusText: res.statusMessage, headers: out }))
      } catch (e) { r.abort(); failed(e) }
    })
    r.on('error', (e) => { signal.removeEventListener('abort', abort); if (redirect) done(redirect); else failed(e) })
    try {
      for (const [k, v] of headers) r.setHeader(k, v)
      r.end(body ? Buffer.from(body) : undefined)
    } catch (e) { r.abort(); failed(e) }
  })
}

/** a request of the page to LivLiv, with this app's cookie for LivLiv's site; what LivLiv sets stays here */
async function pass(req: Request, u: URL, api: string, signal: AbortSignal): Promise<Response> {
  try {
    const r = await session.defaultSession.fetch(new URL(u.pathname + u.search, api).toString(), {
      method: req.method, signal, ...(await forward(req)), credentials: 'include', bypassCustomProtocolHandlers: true,
    })
    const out = new Headers(r.headers)
    out.delete('set-cookie')
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: out })
  } catch {
    return Response.json({ detail: `连不上 LivLiv（${new URL(api).host}）` }, { status: 502 })
  }
}
