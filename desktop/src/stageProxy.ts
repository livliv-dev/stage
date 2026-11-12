// What Stage's pass-throughs (stageApp.ts) send on, and the rules for /__ai: the user's own model and voice APIs, on
// the internet, the LAN or this computer (Ollama), reached without CORS. Only the page's own fetch() uses it (it sends
// a header that an <img> or a link can't); it never reaches a link-local or cloud metadata address or this app's own
// control API, and each redirect is checked again before it is followed. Plain Node: stageApp.ts hands it the network.
import { BlockList, isIP } from 'node:net'
import { REQUEST_HEADER } from './requests'

export const AI_HEADER = 'x-livliv-ai'
const REDIRECTS = 3

/** the page's headers and body, without what belongs to the page or to this app */
export async function forward(req: Request) {
  const headers = new Headers(req.headers)
  for (const h of ['origin', 'referer', 'cookie', 'host', REQUEST_HEADER, AI_HEADER]) headers.delete(h)
  return { headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer() }
}

export type HopInit = { method: string; headers: Headers; body?: ArrayBuffer; signal: AbortSignal }
export type Redirect = { location: string; method: string }
export type ModelDeps = {
  /** one request that doesn't follow a redirect: the response, or where the redirect points */
  hop: (url: URL, init: HopInit) => Promise<Response | Redirect>
  /** the addresses a host name resolves to */
  resolve: (host: string) => Promise<string[]>
  /** the control API's port on 127.0.0.1, while it is on */
  controlPort: () => number | null
}

// 169.254.169.254 is the metadata service of most clouds; 100.100.100.200 is Alibaba Cloud's, fd00:ec2::254 AWS's on IPv6
const NEVER = new BlockList()
NEVER.addSubnet('169.254.0.0', 16, 'ipv4')
NEVER.addAddress('100.100.100.200', 'ipv4')
NEVER.addSubnet('fe80::', 10, 'ipv6')
NEVER.addAddress('fd00:ec2::254', 'ipv6')
const METADATA_NAMES = new Set(['metadata', 'metadata.google.internal', 'metadata.goog', 'instance-data', 'instance-data.ec2.internal'])
const LOOPBACK = new BlockList()
LOOPBACK.addSubnet('127.0.0.0', 8, 'ipv4')
LOOPBACK.addSubnet('0.0.0.0', 8, 'ipv4')
LOOPBACK.addAddress('::1', 'ipv6')
LOOPBACK.addAddress('::', 'ipv6')

/** an address /__ai never connects to (IPv4-mapped IPv6 addresses count as their IPv4 address) */
export function blockedAddress(ip: string, port: number, controlPort: number | null): boolean {
  const family = isIP(ip) === 6 ? 'ipv6' : isIP(ip) === 4 ? 'ipv4' : null
  return !family || NEVER.check(ip, family) || (port === controlPort && LOOPBACK.check(ip, family))
}

const fail = (status: number, message: string) => Response.json({ error: { message } }, { status })

/** why a request may not go to `url`, or null when it may */
async function refuse(url: URL, deps: ModelDeps): Promise<'blocked' | Response | null> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'blocked'
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
  if (METADATA_NAMES.has(host)) return 'blocked'
  let ips: string[]
  try { ips = isIP(host) ? [host] : await deps.resolve(host) } catch (e) { return fail(502, `连不上 ${url.host}（${(e as Error).message}）`) }
  if (!ips.length) return fail(502, `连不上 ${url.host}`)
  const port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80)
  return ips.some((ip) => blockedAddress(ip, port, deps.controlPort())) ? 'blocked' : null
}

/** the page's request passed on to `to`, the user's model API: no cookies either way */
export async function passToModel(req: Request, to: string, signal: AbortSignal, deps: ModelDeps): Promise<Response> {
  if (req.headers.get(AI_HEADER) !== '1') return fail(403, 'not a request of the Stage page')
  if (req.method !== 'GET' && req.method !== 'POST') return fail(405, 'Method Not Allowed')
  let url: URL
  try { url = new URL(to) } catch { return fail(400, '接口地址不对') }
  const page = await forward(req), headers = page.headers
  let body = page.body, method = req.method
  for (let redirects = 0; ; redirects++) {
    const refused = await refuse(url, deps)
    // a redirect somewhere it may not go is the service's doing, not the page's
    if (refused) return refused === 'blocked' ? fail(redirects ? 502 : 400, '接口地址不对') : refused
    let r: Response | Redirect
    try { r = await deps.hop(url, { method, headers, body, signal }) } catch (e) { return fail(502, `连不上 ${url.host}（${(e as Error).message}）`) }
    if (r instanceof Response) {
      const out = new Headers(r.headers)
      out.delete('set-cookie')
      return new Response(r.body, { status: r.status, statusText: r.statusText, headers: out })
    }
    if (redirects === REDIRECTS) return fail(502, `${url.host}: too many redirects`)
    const next = new URL(r.location, url)
    // as fetch() does: the user's key stays with the origin it was sent to, and a redirect to GET drops the body
    if (next.origin !== url.origin) headers.delete('authorization')
    if (r.method !== method) {
      method = r.method; body = undefined
      for (const h of ['content-type', 'content-length', 'content-encoding', 'content-language', 'content-location']) headers.delete(h)
    }
    url = next
  }
}
