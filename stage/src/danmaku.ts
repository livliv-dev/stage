import { tr } from './i18n'
import { useSyncExternalStore } from 'react'
import { AudienceInbox } from './audience'
export type Chat = { id: string; user: string; text: string; from: 'twitch' | 'test'; at: number }
export type ChatStatus = 'off' | 'connecting' | 'on' | 'error'
type State = { status: ChatStatus; channel: string; error: string; recent: Chat[]; blocked: string[] }
const KEY = 'livliv-stage:twitch', BLOCKED = 'livliv-stage:blocked-viewers'
const kept = (key: string) => { try { return localStorage.getItem(key) || '' } catch { return '' } }
function blockedNames(): string[] { try { const names: unknown = JSON.parse(kept(BLOCKED) || '[]'); return Array.isArray(names) ? names.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }
let state: State = { status: 'off', channel: kept(KEY), error: '', recent: [], blocked: blockedNames() }
const subs = new Set<() => void>()
const set = (change: Partial<State>) => { state = { ...state, ...change }; subs.forEach((f) => f()) }
export const useChat = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => state)
export const chatState = () => state
const audienceListeners = new Set<(c: Chat) => void>()
export const onAudienceMessage = (f: (c: Chat) => void) => { audienceListeners.add(f); return () => { audienceListeners.delete(f) } }
const seenMessages = new Map<string, number>()
const listeners = new Set<(c: Chat) => void>()
export const onChat = (f: (c: Chat) => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export const isBlocked = (user: string) => state.blocked.includes(user.toLowerCase())
export function blockUser(user: string) {
  const key = user.toLowerCase(), blocked = state.blocked.includes(key) ? state.blocked.filter((x) => x !== key) : [...state.blocked, key]
  try { localStorage.setItem(BLOCKED, JSON.stringify(blocked)) } catch { /* the current session still applies it */ }
  set({ blocked, recent: state.recent.filter((c) => !blocked.includes(c.user.toLowerCase())) })
}
export function clean(text: string): string | null {
  const value = text.replace(/\s+/g, ' ').trim()
  if (!value || value.normalize('NFKC').startsWith('!') || /https?:\/\/|www\.|\.(com|cn|tv|gg)\b/i.test(value)) return null
  return [...value].slice(0, 80).join('')
}
const incoming = new AudienceInbox<Chat>()
function arrive(user: string, text: string, from: Chat['from'], id = Math.random().toString(36).slice(2, 10)) {
  const name = user.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24) || tr("观众")
  const raw = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500), now = Date.now()
  if (!raw || isBlocked(name) || /https?:\/\/|www\.|\.(com|cn|tv|gg)\b/i.test(raw)) return
  for (const [key, at] of seenMessages) if (now - at >= 60_000) seenMessages.delete(key)
  if (seenMessages.has(id)) return
  seenMessages.set(id, now)
  if (seenMessages.size > 1000) seenMessages.delete(seenMessages.keys().next().value!)
  const message: Chat = { id, user: name, text: raw, from, at: now }
  audienceListeners.forEach((f) => f(message))
  set({ recent: [...state.recent, { ...message, text: [...raw].slice(0, 80).join('') }].slice(-40) })
  const value = clean(raw)
  if (!value) return
  const aiMessage = { ...message, text: value }
  if (incoming.push(aiMessage)) listeners.forEach((f) => f(aiMessage))
}
export const simulate = (user: string, text: string) => arrive(user || tr("测试观众"), text, 'test')
let ws: WebSocket | null = null, epoch = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined
function openTwitch(channel: string, generation: number, attempt: number) {
  if (generation !== epoch) return
  const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443')
  ws = socket
  socket.onopen = () => {
    if (ws !== socket) return
    socket.send('CAP REQ :twitch.tv/tags'); socket.send('PASS SCHMOOPIIE')
    socket.send('NICK justinfan' + (10000 + Math.floor(Math.random() * 80000)))
    socket.send('JOIN #' + channel)
  }
  socket.onmessage = (event) => {
    if (ws !== socket || generation !== epoch) return
    for (const line of String(event.data).split('\r\n')) {
      if (line.startsWith('PING')) { socket.send(line.replace('PING', 'PONG')); continue }
      if (line.startsWith('RECONNECT')) { socket.close(); continue }
      if (/ 366 /.test(line) || / JOIN #/.test(line)) { attempt = 0; set({ status: 'on', error: '' }) }
      const match = line.match(/^(?:@(\S+) )?:([^!\s]+)!\S+ PRIVMSG #\S+ :(.*)$/)
      if (match) {
        const name = match[1]?.match(/(?:^|;)display-name=([^;]*)/)?.[1] || match[2]
        const id = match[1]?.match(/(?:^|;)id=([^;]*)/)?.[1]
        arrive(name, match[3], 'twitch', id)
      }
    }
  }
  socket.onerror = () => { if (ws === socket) set({ error: tr("连接中断，正在重试") }) }
  socket.onclose = () => {
    if (ws !== socket || generation !== epoch) return
    ws = null
    if (attempt < 3) {
      const delay = 2000 * 2 ** attempt
      set({ status: 'connecting', error: tr("连接中断，") + delay / 1000 + tr(" 秒后重试") })
      retryTimer = setTimeout(() => openTwitch(channel, generation, attempt + 1), delay)
    } else set({ status: 'error', error: tr("无法连接 Twitch，请检查网络后重新连接") })
  }
}
export function connectTwitch(channel: string) {
  disconnect()
  const name = channel.trim().toLowerCase().replace(/^#|^https?:\/\/(www\.)?twitch\.tv\//, '').replace(/\/.*$/, '')
  if (!/^[a-z0-9_]{3,25}$/.test(name)) { set({ status: 'error', error: tr("频道名不对：请输入 twitch.tv/ 后面的频道名") }); return }
  try { localStorage.setItem(KEY, name) } catch { /* this connection still works */ }
  set({ status: 'connecting', channel: name, error: '' })
  openTwitch(name, epoch, 0)
}
export function disconnect() {
  epoch++; clearTimeout(retryTimer)
  const socket = ws; ws = null; socket?.close()
  incoming.clear(); seenMessages.clear()
  set({ status: 'off', error: '' })
}
