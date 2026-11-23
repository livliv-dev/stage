import { PRODUCT } from './core/product'
import { tr } from './i18n'
// LivLiv, the site the characters come from: your account there and a character's own voice.
//  - account: connected through the browser with a code (/api/connect: the site's /connect page, signed in there any
//    way, Google and Discord too): the session the site gives back is kept here and sent as a bearer token, and the
//    site also sets it as its cookie for LivLiv's address (the desktop app's jar, the dev server's proxy), so files the
//    player fetches by itself carry it too; points as the site counts them
//  - speech recognition: what you said into the microphone, as text (push to talk, ptt.ts)
//  - voice: a line said in the character's LivLiv voice (/api/chat/<id>/say, what 录制 uses): its tone follows the
//    line's feeling, and the site picks the model's expression for it. A character that isn't on the site (a VRM, a
//    PNGTuber) speaks in one of the site's system voices (/api/chat/say). Each call costs points (at least 1); a line
//    said before is free. The MP3 is fetched whole and its length read, so the subtitle and a cut-off go by the real voice
//  - a character's card: an account's own character carries only its tagline here; its chat card is on the site
//    (/api/chat/<id>/card), read once when it comes on the stage (watchSiteCards)
import { useSyncExternalStore } from 'react'
import { desktopFetch, unreachable } from './request'
import type { Emotion, StreamingVoice } from './core/lines'
import { store, uid, type CharacterItem } from './scene'
import { SAMPLES } from './samples'
import { signInUrl } from './host'
import { features } from './core/platform'
import { lostKey, readSecret, writeSecret } from './core/secrets'
import { systemVoiceFor, type Voiced } from './core/systemVoice'

/** connect: a code waiting for its approval on the site (shown here, the same on the page). recordSeconds,
 *  recordMark: on livliv.ai/stage, how long a recording may run and whether it carries the LivLiv mark (the plan's, as
 *  the site's 录制: free 30 s with the mark, paid 5 min); elsewhere unused. prices: what livliv.ai's text call and voiced
 *  line take, as the site says them (/api/me), so a new price needs no Stage release; null when it doesn't say */
export type Prices = { text: number | null; voice: number | null }
export type Account = { status: 'unknown' | 'out' | 'in'; email: string; points: number; error: string; closed: boolean; connect: { code: string; url: string } | null; recordSeconds: number; recordMark: boolean; prices: Prices }
const FREE = { recordSeconds: 30, recordMark: true }
let account: Account = { status: 'unknown', email: '', points: 0, error: '', closed: false, connect: null, ...FREE, prices: { text: null, voice: null } }
const subs = new Set<() => void>()
const lists = new Map<string, Promise<Voices>>()
const set = (p: Partial<Account>) => {
  if ((p.status !== undefined && p.status !== account.status) || (p.email !== undefined && p.email !== account.email)) lists.clear()
  account = { ...account, ...p }; subs.forEach((f) => f())
}
export const onAccount = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
/** once the site has said whether anyone is signed in (at once when it has) */
export const accountKnown = () => account.status !== 'unknown' ? Promise.resolve()
  : new Promise<void>((resolve) => { const off = onAccount(() => { if (account.status !== 'unknown') { off(); resolve() } }) })
export const useAccount = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => account)
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
// (in the desktop app, kept encrypted by the system with the API keys: core/secrets.ts)
const TOKEN = 'livliv-stage:session'
const token = () => { if (features.host === 'site') return ''; try { return readSecret(TOKEN) } catch { return '' } }
const keep = (t: string) => { try { void writeSecret(TOKEN, t) } catch { /* private mode: the cookie still works */ } }

/** a request to LivLiv's API, as this app's session */
export async function api(url: string, init: RequestInit = {}) {
  const t = token(), headers = new Headers(init.headers)
  if (t) headers.set('Authorization', `Bearer ${t}`)
  try { return await desktopFetch(url, { ...init, headers }) } catch (error) { throw unreachable(error, 'livliv.ai', init.signal) }
}
const post = (url: string, body: unknown, signal?: AbortSignal) =>
  api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })

/** who is signed in (asked once at start, and after a voice was refused) */
let refreshVersion = 0
export async function refresh() {
  const version = ++refreshVersion, session = token()
  // the desktop app with no sign-in of its own: LivLiv isn't asked (a sign-in the app could no longer decrypt: sign in
  // again). The app showing livliv.ai/stage is the site: its cookie is the sign-in, so the site is asked as in a browser
  if (features.shell && features.host !== 'site' && !token()) { set({ status: 'out', email: '', points: 0, ...(lostKey(TOKEN) ? { error: tr('这台电脑上保存的登录读不出来了，请重新登录') } : {}) }); return }
  try {
    const me = await answer(await api('/api/me'))
    if (version !== refreshVersion || token() !== session) return
    // a kept session the site no longer takes: it ends with the sign-in that allowed it
    const lapsed = !me.signed_in && !!token()
    if (lapsed) keep('')
    // the plan's recording: what the site says, else by the plan (any paid plan: 5 min, no mark)
    const paid = !!me.plan && me.plan !== 'free'
    const plan = { recordSeconds: typeof me.record_seconds === 'number' ? me.record_seconds : paid ? 300 : 30, recordMark: typeof me.record_mark === 'boolean' ? me.record_mark : !paid }
    const price = (n: unknown) => (typeof n === 'number' && n >= 0 ? n : null)
    const prices = { text: price(me.stage_text_points), voice: price(me.stage_voice_points) }
    set(me.signed_in ? { status: 'in', email: me.email || me.name || '', points: me.points ?? 0, error: '', ...plan, prices }
      : { status: 'out', email: '', points: 0, ...FREE, prices, ...(lapsed ? { error: tr("登录过期了，重新登录一下") } : {}) })
  } catch {
    if (version !== refreshVersion || token() !== session) return
    set({ status: 'out', email: '', points: 0, ...FREE, error: tr("连不上 LivLiv") })
  }
}

// ---------------------------------------------------------------- connecting through the browser
let waiting: AbortController | null = null
/** whether the site gives codes yet: an empty request, which it refuses (422) without making one, or doesn't know (404,
 *  405). Asked each time a card with the sign-in opens, so the button comes alive by itself; unreachable changes nothing */
export async function checkConnect() {
  if (account.status === 'in' || features.host === 'site') return  // the site signs in with its own page
  try {
    const r = await fetch('/api/connect/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '' })
    set({ closed: r.status === 404 || r.status === 405 })
  } catch { /* offline: pressing the button says so */ }
}
/** a session kept from an earlier sign-in (the desktop app), before the site has said whether it still holds */
export const hasSession = () => !!token()
/** the session the desktop app keeps, as a model key for livliv.ai's text ('' on the site: its cookie) */
export const sessionToken = () => token()
const device = () => (!features.shell ? tr("浏览器") : /Mac/i.test(navigator.platform) ? 'Mac' : /Win/i.test(navigator.platform) ? 'Windows' : /Linux/i.test(navigator.platform) ? 'Linux' : tr("浏览器"))
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((ok, no) => {
  const t = setTimeout(ok, ms)
  signal.addEventListener('abort', () => { clearTimeout(t); no(signal.reason) }, { once: true })
})
/** the site's page for the code, in the browser (the desktop app opens LivLiv's address there, never inside) */
export const openConnect = () => { if (account.connect) window.open(account.connect.url, '_blank', 'noopener') }

/** asks LivLiv for a code, opens its page, and waits (up to the code's 10 minutes) for it to be allowed there */
export async function connect() {
  if (features.host === 'site') { location.assign(signInUrl()); return }  // the site's own sign-in, back here afterwards
  cancelConnect()
  const ctl = new AbortController()
  waiting = ctl
  set({ error: '' })
  try {
    const r = await answer(await post('/api/connect/start', { app: PRODUCT.name, device: device() }))
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
  const session = token(), email = account.email
  try {
    const r = await api('/api/auth/logout', { method: 'POST' })
    if (!r.ok && r.status !== 401) throw new Error(String(r.status))
  } catch {
    if (token() !== session || account.email !== email) return
    set({ error: tr("还没退出：连不上 LivLiv，稍后再试") })
    return
  }
  if (token() !== session || account.email !== email) return
  keep('')
  refreshVersion++
  set({ status: 'out', email: '', points: 0, error: '' })
}

// ---------------------------------------------------------------- the age question (livliv.ai's text, brain.ts)

/** asks the visitor whether they are 18 or over (App's AgeDialog); true: they are. Unset: nobody can answer */
export const ageGate: { ask: null | (() => Promise<boolean>) } = { ask: null }
/** answers the site's age question (chat's), for this account */
export async function setAge(adult: boolean) {
  await answer(await post('/api/chat/profile/age', { age_group: adult ? 'adult' : 'minor' }))
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

export type VoiceOption = { id: string; name: string; desc: string; group?: string; core?: boolean }
export type Voices = { voices: VoiceOption[]; voice: string; own: { id: string; name: string } | null }

/** the voices a character can speak in, and the one it speaks in by default (its own, or its author's pick); with no
 *  id, the site's system voices (a character that isn't on the site) */
export function voicesOf(mid: string | null): Promise<Voices> {
  if (!mid) return systemVoices()
  let p = lists.get(mid)
  if (!p) {
    p = api(`/api/chat/${encodeURIComponent(mid)}/voices`).then(answer)
    p.catch(() => { if (lists.get(mid) === p) lists.delete(mid) })
    lists.set(mid, p)
  }
  return p
}

/** live: the sound is still coming in (voiceApi speakLive): blob comes with it, seconds is a guess until then */
export type Clip = { blob: Blob; seconds: number; expression: string | null; live?: StreamingVoice }

const SYSTEM = '/api/chat/voices'
/** the site's system voices, for a character that isn't on the site */
function systemVoices(): Promise<Voices> {
  let p = lists.get(SYSTEM)
  if (!p) {
    p = api(SYSTEM).then(answer)
    p.catch(() => { if (lists.get(SYSTEM) === p) lists.delete(SYSTEM) })
    lists.set(SYSTEM, p)
  }
  return p
}

const voiced = (c: CharacterItem): Voiced => ({ id: c.id, gender: c.gender, voice: { livliv: c.voice.livliv }, onSite: !!modelId(c) })
/** the system voice of a character that isn't on the site: its own choice, else one of the site's listing (`voices`) by
 *  its id (core/systemVoice.ts); '' when there is none to pick: the site speaks by its gender */
export function systemVoiceOf(c: CharacterItem, cast: readonly CharacterItem[], voices: readonly VoiceOption[] | undefined): string {
  return systemVoiceFor(voiced(c), cast.map(voiced), voices ?? [])
}

/** a line in livliv.ai's voice for this character: its own on the site, else its system voice. `line`: the line this is
 *  a sentence of (its sentences share the line's price); none, a line of its own */
export async function livlivLine(c: CharacterItem, text: string, emotion: Emotion, cast: readonly CharacterItem[], signal?: AbortSignal, line?: string): Promise<Clip> {
  const mid = modelId(c)
  if (mid) return voiceLine(mid, text, emotion, c.voice.livliv, signal, line)
  const listing = c.voice.livliv ? null : await systemVoices().catch(() => null)
  return voiceLine(null, text, emotion, systemVoiceOf(c, cast, listing?.voices), signal, line, c.gender)
}

/** a line in the character's voice (`voice`: one of its voices by id, '' its default); with no id, in a system voice.
 *  Stage's price: livliv.ai's by the line (`line`: the one this is a sentence of; none, a line of its own) */
export async function voiceLine(mid: string | null, text: string, emotion: Emotion, voice: string, signal?: AbortSignal, line?: string, gender?: 'f' | 'm' | null): Promise<Clip> {
  let r
  try {
    r = await answer(await post(mid ? `/api/chat/${encodeURIComponent(mid)}/say` : '/api/chat/say', { lines: [{ text, emotion }], voice: voice || null, line: line || uid(), stage: true, ...(!mid && !voice && gender ? { gender } : {}) }, signal))
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 401 || status === 402) void refresh()  // signed out elsewhere, or out of points
    throw e
  }
  if (typeof r.points === 'number') set({ points: r.points })
  const said = r.lines?.[0]
  if (!said?.audio) throw new Error(tr("这句没有配出声音"))
  const a = await desktopFetch(said.audio, { signal }).catch((error: unknown) => { throw unreachable(error, 'livliv.ai', signal) })
  if (!a.ok) throw new Error(tr("这句没有配出声音"))
  const blob = await a.blob()
  return { blob, seconds: await length(blob), expression: said.expression ?? null }
}

/** what was said in a recording (a 16 kHz mono WAV, up to 30 s), by the site's speech recognition (the chat's push to
 *  talk); points as it counts them (at least 1) */
export async function recognize(wav: Blob, signal?: AbortSignal): Promise<string> {
  const fd = new FormData()
  fd.append('file', wav, 'say.wav')
  fd.append('stage', '1')  // Stage's price: what it cost, no minimum
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

// ---------------------------------------------------------------- a character's chat card, from the site

type SiteCard = { name: string; persona: string; style: string; examples: string[]; greeting: string; gender: 'f' | 'm' | null }
const asked = new Set<string>()
let askedAs = ''  // the account the cards were read as
/** an account's own character (one of LivLiv's that came without its card) gets its chat card from the site once, so
 *  its lines come from the same card as on the site: what it came with is kept if it was changed here meanwhile.
 *  Signed in only (its own characters are read as the account), and looked for again once signed in */
export function watchSiteCards() {
  if (!features.points) return () => {}  // a copy hosted elsewhere has no livliv.ai account
  const look = () => {
    // another account: its own characters are another's, read again
    if (account.email !== askedAs) { asked.clear(); askedAs = account.email }
    if (!signedIn()) return
    for (const c of store.get().items) {
      if (c.kind !== 'character' || c.remote || c.cardName) continue
      const mid = modelId(c)
      if (!mid || asked.has(c.id)) continue
      asked.add(c.id)
      const before = c.persona
      void api(`/api/chat/${encodeURIComponent(mid)}/card`).then(answer).then((card: SiteCard) => {
        const now = store.get().items.find((i) => i.id === c.id)
        if (now?.kind !== 'character' || now.cardName || now.persona !== before || !card.persona) return
        store.patch(c.id, { persona: card.persona, cardName: card.name || now.name, ...(card.style ? { style: card.style } : {}),
          ...(card.examples?.length ? { examples: card.examples } : {}), ...(card.greeting ? { greeting: card.greeting } : {}),
          ...(card.gender && !now.gender ? { gender: card.gender } : {}) })
      }, () => { /* not readable (signed out, someone else's): it keeps what it came with */ })
    }
  }
  look()
  const off = [store.subscribe(look), onAccount(look)]
  return () => off.forEach((f) => f())
}
