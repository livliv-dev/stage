import { getLocale, tr } from './i18n'
// LivLiv, the site the characters come from: your account there and a character's own voice.
//  - account: connected through the browser with a code (/api/connect: the site's /connect page, signed in there any
//    way, Google and Discord too): the session the site gives back is kept here and sent as a bearer token, and the
//    site also sets it as its cookie for LivLiv's address (the desktop app's jar, the dev server's proxy), so files the
//    player fetches by itself carry it too; points as the site counts them
//  - speech recognition: what you said into the microphone, as text (push to talk, ptt.ts)
//  - voice: a line said in the character's LivLiv voice (/api/chat/<id>/say, what 录制 uses): its tone follows the
//    line's feeling, and the site picks the model's expression for it. Each call costs points (at least 1); a line said
//    before is free. The MP3 is fetched whole and its length read, so the subtitle and a cut-off go by the real voice
import { useSyncExternalStore } from 'react'
import { desktopFetch } from './request'
import type { Emotion } from './brain'
import type { CharacterItem } from './scene'
import { SAMPLES } from './samples'
import type { Live } from './voiceApi'
import { onSite, signInUrl } from './host'

/** connect: a code waiting for its approval on the site (shown here, the same on the page). recordSeconds,
 *  recordMark: on livliv.ai/stage, how long a recording may run and whether it carries the LivLiv mark (the plan's, as
 *  the site's 录制: free 30 s with the mark, paid 5 min); elsewhere unused */
export type Account = { status: 'unknown' | 'out' | 'in'; email: string; points: number; error: string; closed: boolean; connect: { code: string; url: string } | null; recordSeconds: number; recordMark: boolean }
const FREE = { recordSeconds: 30, recordMark: true }
/** what a LivLiv line takes, as the model form says it (about this many points a line): change it with the site's price */
export const LINE_PRICE = { from: 0.1, to: 0.5 }
let account: Account = { status: 'unknown', email: '', points: 0, error: '', closed: false, connect: null, ...FREE }
const subs = new Set<() => void>()
const set = (p: Partial<Account>) => { account = { ...account, ...p }; subs.forEach((f) => f()) }
export const onAccount = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const useAccount = () => useSyncExternalStore(onAccount, () => account)
export const signedIn = () => account.status === 'in'
export const accountNow = () => account

/** the site's answer, or its message as the error */
async function answer(r: Response) {
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(typeof body?.detail === 'string' ? body.detail : tr("LivLiv 返回 {0}", r.status)), { status: r.status })
  return body
}
// the session the site gave this app (connect), on this computer. On livliv.ai/stage the site's own cookie is the
// session: no token is kept or sent there
const TOKEN = 'livliv-stage:session'
const token = () => { if (onSite) return ''; try { return localStorage.getItem(TOKEN) || '' } catch { return '' } }
const keep = (t: string) => { try { if (t) localStorage.setItem(TOKEN, t); else localStorage.removeItem(TOKEN) } catch { /* private mode: the cookie still works */ } }

/** a request to LivLiv's API, as this app's session */
export function api(url: string, init: RequestInit = {}) {
  const t = token(), headers = new Headers(init.headers)
  if (t) headers.set('Authorization', `Bearer ${t}`)
  return desktopFetch(url, { ...init, headers })
}
const post = (url: string, body: unknown, signal?: AbortSignal) =>
  api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })

/** who is signed in (asked once at start, and after a voice was refused) */
export async function refresh() {
  if (inApp() && !token()) { set({ status: 'out', email: '', points: 0 }); return }  // no account here: LivLiv isn't asked
  try {
    const me = await answer(await api('/api/me'))
    // a kept session the site no longer takes: it ends with the sign-in that allowed it
    const lapsed = !me.signed_in && !!token()
    if (lapsed) keep('')
    // the plan's recording: what the site says, else by the plan (any paid plan: 5 min, no mark)
    const paid = !!me.plan && me.plan !== 'free'
    const plan = { recordSeconds: typeof me.record_seconds === 'number' ? me.record_seconds : paid ? 300 : 30, recordMark: typeof me.record_mark === 'boolean' ? me.record_mark : !paid }
    set(me.signed_in ? { status: 'in', email: me.email || me.name || '', points: me.points ?? 0, error: '', ...plan }
      : { status: 'out', email: '', points: 0, ...FREE, ...(lapsed ? { error: tr("登录过期了，重新登录一下") } : {}) })
  } catch {
    set({ status: 'out', email: '', points: 0, ...FREE, error: tr("连不上 LivLiv") })
  }
}

// ---------------------------------------------------------------- connecting through the browser
let waiting: AbortController | null = null
/** whether the site gives codes yet: an empty request, which it refuses (422) without making one, or doesn't know (404,
 *  405). Asked each time a card with the sign-in opens, so the button comes alive by itself; unreachable changes nothing */
export async function checkConnect() {
  if (account.status === 'in' || onSite) return  // the site signs in with its own page
  try {
    const r = await fetch('/api/connect/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '' })
    set({ closed: r.status === 404 || r.status === 405 })
  } catch { /* offline: pressing the button says so */ }
}
const inApp = () => location.protocol === 'livliv-stage:' || 'livlivDesktop' in window
const device = () => (!inApp() ? tr("浏览器") : /Mac/i.test(navigator.platform) ? 'Mac' : /Win/i.test(navigator.platform) ? 'Windows' : /Linux/i.test(navigator.platform) ? 'Linux' : tr("浏览器"))
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((ok, no) => {
  const t = setTimeout(ok, ms)
  signal.addEventListener('abort', () => { clearTimeout(t); no(signal.reason) }, { once: true })
})
/** the site's page for the code, in the browser (the desktop app opens LivLiv's address there, never inside) */
export const openConnect = () => { if (account.connect) window.open(account.connect.url, '_blank', 'noopener') }

/** asks LivLiv for a code, opens its page, and waits (up to the code's 10 minutes) for it to be allowed there */
export async function connect() {
  if (onSite) { location.assign(signInUrl()); return }  // the site's own sign-in, back here afterwards
  cancelConnect()
  const ctl = new AbortController()
  waiting = ctl
  set({ error: '' })
  try {
    const r = await answer(await post('/api/connect/start', { app: 'LivLiv Stage', device: device() }))
    set({ connect: { code: r.code, url: r.url } })
    openConnect()
    const until = Date.now() + (r.expires_in ?? 600) * 1000
    while (Date.now() < until) {
      await sleep((r.interval ?? 2) * 1000, ctl.signal)
      const p = await answer(await post('/api/connect/poll', { poll: r.poll }))
      if (p.status === 'ok') { keep(p.token); set({ connect: null }); await refresh(); return }
      if (p.status === 'denied') { set({ connect: null, error: tr("网页上选了不允许") }); return }
      if (p.status !== 'pending') break
    }
    set({ connect: null, error: tr("连接码过期了") })
  } catch (e) {
    if (ctl.signal.aborted) return
    const gone = [404, 405].includes((e as { status?: number }).status ?? 0)
    set(gone ? { connect: null, closed: true } : { connect: null, error: tr("现在登录不了，稍后再试") })
  } finally {
    if (waiting === ctl) waiting = null
  }
}
export function cancelConnect() { waiting?.abort(); waiting = null; if (account.connect) set({ connect: null }) }

/** signs out on the site. If that fails the session is still alive there, so it stays here too, and says so */
export async function logout() {
  try {
    const r = await api('/api/auth/logout', { method: 'POST' })
    if (!r.ok && r.status !== 401) throw new Error(String(r.status))
  } catch {
    set({ error: tr("还没退出：连不上 LivLiv，稍后再试") })
    return
  }
  keep('')
  set({ status: 'out', email: '', points: 0, error: '' })
}

// ---------------------------------------------------------------- AI lines paid with points (livliv.ai/stage)

/** asks the visitor whether they are 18 or over (App's AgeDialog); true: they are. Unset: nobody can answer */
export const ageGate: { ask: null | (() => Promise<boolean>) } = { ask: null }
/** answers the site's age question (chat's), for this account */
export async function setAge(adult: boolean) {
  await answer(await post('/api/chat/profile/age', { age_group: adult ? 'adult' : 'minor' }))
}

export type StageLineBody = {
  cast: string[]; topic: string; lines: { name: string; text: string; me: boolean }[]; viewer: { user: string; text: string } | null
  language: string; length: string; role: 'host' | 'guest' | null; voice: boolean; voice_id: string | null
}
export type StageLine = { text: string; emotion: string; action: string; to: string | null; look: string | null; audio: string | null; points?: number }

/** the character's next line on the stage, from the site (written, checked, voiced, paid with points). The age
 *  question first, when the site asks it; the site's refusals as plain messages */
export async function stageLine(mid: string, body: StageLineBody, signal?: AbortSignal): Promise<StageLine> {
  const url = `/api/chat/${encodeURIComponent(mid)}/stage-line`
  let r = await post(url, body, signal)
  if (r.status === 428 && ageGate.ask) {
    // the question stays open for the next line; this one stops waiting when its turn is called off
    signal?.throwIfAborted()
    const stopped = new Promise<never>((_, no) => signal?.addEventListener('abort', () => no(signal.reason), { once: true }))
    if (!(await Promise.race([ageGate.ask(), stopped]))) throw new Error(tr("未满 18 岁不能用 AI 让角色说话"))
    r = await post(url, body, signal)
  }
  if (!r.ok) {
    const said = (await r.json().catch(() => ({})))?.detail, detail = typeof said === 'string' ? said : ''
    if (r.status === 401 || r.status === 402) void refresh()
    const zh = getLocale().startsWith('zh') && detail
    throw new Error(zh ? detail : r.status === 402 ? tr("积分用完了，或者今天、这个月的次数到了上限") : r.status === 403 ? tr("只有作者能在 Stage 里用这个角色")
      : r.status === 429 ? tr("说得太快了，歇一下再继续") : tr("角色暂时没有回应，稍后再试"))
  }
  const j = await r.json() as StageLine
  if (typeof j.points === 'number') set({ points: j.points })
  return j
}

/** a LivLiv character's id (a sample that comes with Stage, or one of LivLiv's by id); null for a model package
 *  imported from files */
export function modelId(c: CharacterItem): string | null {
  if (c.model.type === 'files') return c.model.livlivId ?? null
  const m = c.model.type === 'url' ? c.model.url.match(/\/(models|characters)\/([^/]+)\/$/) : null
  if (!m) return null
  // a sample LivLiv doesn't show (the mascots) has no voice there
  return m[1] === 'characters' && SAMPLES.find((s) => s.id === m[2])?.onSite === false ? null : m[2]
}

export type VoiceOption = { id: string; name: string; desc: string }
export type Voices = { voices: VoiceOption[]; voice: string; own: { id: string; name: string } | null }
const lists = new Map<string, Promise<Voices>>()

/** the voices a character can speak in, and the one it speaks in by default (its own, or its author's pick) */
export function voicesOf(mid: string): Promise<Voices> {
  let p = lists.get(mid)
  if (!p) {
    p = api(`/api/chat/${encodeURIComponent(mid)}/voices`).then(answer)
    p.catch(() => lists.delete(mid))
    lists.set(mid, p)
  }
  return p
}

/** live: the sound is still coming in (voiceApi speakLive): blob comes with it, seconds is a guess until then */
export type Clip = { blob: Blob; seconds: number; expression: string | null; live?: Live }

/** a line in the character's voice (`voice`: one of its voices by id, '' its default) */
export async function voiceLine(mid: string, text: string, emotion: Emotion, voice: string, signal?: AbortSignal): Promise<Clip> {
  let r
  try {
    r = await answer(await post(`/api/chat/${encodeURIComponent(mid)}/say`, { lines: [{ text, emotion }], voice: voice || null }, signal))
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401 || status === 402) void refresh()  // signed out elsewhere, or out of points
    throw e
  }
  if (typeof r.points === 'number') set({ points: r.points })
  const line = r.lines?.[0]
  if (!line?.audio) throw new Error(tr("这句没有配出声音"))
  const a = await desktopFetch(line.audio, { signal })
  if (!a.ok) throw new Error(tr("这句没有配出声音"))
  const blob = await a.blob()
  return { blob, seconds: await length(blob), expression: line.expression ?? null }
}

/** what was said in a recording (a 16 kHz mono WAV, up to 30 s), by the site's speech recognition (the chat's push to
 *  talk); points as it counts them (at least 1) */
export async function recognize(wav: Blob, signal?: AbortSignal): Promise<string> {
  const fd = new FormData()
  fd.append('file', wav, 'say.wav')
  try {
    const r = await answer(await api('/api/chat/asr/upload', { method: 'POST', body: fd, signal }))
    return String(r.text ?? '').trim()
  } finally { void refresh() }  // the points it took
}

let decoder: OfflineAudioContext | null = null
/** a clip's length in seconds (0: it doesn't decode) */
export async function length(b: Blob) {
  try {
    decoder ??= new OfflineAudioContext(1, 1, 24000)
    return (await decoder.decodeAudioData(await b.arrayBuffer())).duration
  } catch {
    return 0
  }
}
