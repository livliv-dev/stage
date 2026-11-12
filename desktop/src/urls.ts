// Where a page may go. Pages of the site's own origin stay in the shell, and a live window
// (/live/<id>) becomes a stage window; the sign-in providers' pages may load in the main window; any other web
// address opens in the system browser; anything else (file:, data:, custom schemes) is refused. Pure: no Electron.

export const PROD_ORIGIN = 'https://livliv.ai'
/** OAuth pages the site's sign-in goes through, which return to our origin */
export const AUTH_HOSTS = new Set(['accounts.google.com', 'discord.com'])
const LIVE_PATH = /^\/live\/([A-Za-z0-9_-]{1,64})\/?$/

export type Route =
  | { kind: 'app'; url: URL }
  | { kind: 'stage'; url: URL; id: string }
  | { kind: 'auth'; url: URL }
  | { kind: 'external'; url: URL }
  | { kind: 'blocked' }

export function parse(raw: string): URL | null {
  try { return new URL(raw) } catch { return null }
}

/** blob: URLs carry their page's origin (a recording to download); about:blank has none. A custom standard scheme
 *  (LivLiv Stage's livliv-stage://app) has an origin in the browser, not in URL here: scheme and host */
export function originOf(u: URL): string {
  if (u.protocol === 'blob:') { const inner = parse(u.pathname); return inner ? originOf(inner) : 'null' }
  return u.origin !== 'null' ? u.origin : u.host ? `${u.protocol}//${u.host}` : 'null'
}

export function route(raw: string, origins: ReadonlySet<string>): Route {
  const u = parse(raw)
  if (!u) return { kind: 'blocked' }
  if (origins.has(originOf(u))) {
    const m = u.protocol !== 'blob:' && LIVE_PATH.exec(u.pathname)
    return m ? { kind: 'stage', url: u, id: m[1] } : { kind: 'app', url: u }
  }
  if (u.protocol === 'https:' && AUTH_HOSTS.has(u.hostname)) return { kind: 'auth', url: u }
  if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') return { kind: 'external', url: u }
  return { kind: 'blocked' }
}

/** LivLiv Stage's output window (stage/src/link.ts openOutput), and whether it should be see-through */
export const stageOutput = (u: URL) => (u.searchParams.has('output') ? { clear: u.searchParams.has('clear') } : null)

/** every page the shell loads itself says where it runs (the server can count desktop use) */
export function withChannel(u: URL): URL {
  const n = new URL(u)
  n.searchParams.set('channel', 'desktop')
  return n
}

/** the live window as a stage: transparent (the site's 打开直播窗口 asks for green, for a browser and a chroma key),
 *  everything else as the site set it (k, track, mic, mirror, ai...) */
export function stageUrl(u: URL): URL {
  const n = withChannel(u)
  if (!n.searchParams.get('bg') || n.searchParams.get('bg') === 'green') n.searchParams.set('bg', 'transparent')
  return n
}

/** a path the page asks to open as a stage (window.livlivDesktop.window.openStage): /live/<id>?... on our origin */
export function stageFromPath(path: string, origin: string): { url: URL; id: string } | null {
  if (typeof path !== 'string' || !path.startsWith('/live/') || path.length > 2048) return null
  const r = route(new URL(path, origin).toString(), new Set([origin]))
  return r.kind === 'stage' ? { url: r.url, id: r.id } : null
}
