import { useSyncExternalStore } from 'react'
import { tr } from './i18n'
import { setAiriForward } from './airiForward'
import { AiriClient } from './airiClient'
import { airiServerUrl, currentAiriTurn } from './airiProtocol'
import { loadAiri, subscribeAiri, type AiriSettings } from './airiSettings'
import { stageSpeech } from './speechHost'

export type AiriLink = { phase: 'off' | 'connecting' | 'ready' | 'closed' | 'failed'; error?: string }

let link: AiriLink = { phase: 'off' }
const listeners = new Set<() => void>()
const publish = (next: AiriLink) => { link = next; listeners.forEach((listener) => listener()) }
export const airiLink = () => link
export const useAiriLink = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener) } }, airiLink)

function speechError(error: string | undefined) {
  if (error === 'Avatar not found') return tr('没有找到要说话的角色')
  if (error === 'This avatar is not loaded') return tr('角色还没载入，这句话没说出来')
  if (error === 'This avatar is controlled by a friend') return tr('这个角色由朋友控制')
  return error || tr('这句话没说出来')
}

function utteranceId(eventId: string | undefined) {
  const cleaned = (eventId ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80)
  return cleaned || `airi-${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
}

/** Connects only while the setting is on. Stage does not register as AIRI's chat consumer. */
export function connectAiri() {
  let client: AiriClient | null = null
  let spoken: string | undefined
  let attempts = 0
  let generation = 0
  let timer = 0
  let applied = ''
  const stopForward = setAiriForward((text) => {
    const settings = loadAiri()
    if (!settings.enabled || !settings.forwardInput) return 'ignore'
    if (spoken) stageSpeech().cancel(spoken)
    spoken = undefined
    if (!client?.ready || !client.sendText(text)) return 'unavailable'
    return 'sent'
  })
  const start = (force = false) => {
    const settings = loadAiri()
    const key = JSON.stringify({ enabled: settings.enabled, url: settings.url, token: settings.token })
    if (!force && key === applied) return
    applied = key
    const run = ++generation
    window.clearTimeout(timer)
    client?.close()
    client = null
    if (!settings.enabled) { publish({ phase: 'off' }); return }
    const url = airiServerUrl(settings.url)
    if (!url) { publish({ phase: 'failed', error: tr('AIRI 地址需要是 ws:// 或 wss://') }); return }
    const next = new AiriClient({
      url,
      token: settings.token,
      onReply: (reply) => {
        if (run !== generation || !currentAiriTurn(reply.binding, next.currentBinding)) return
        const result = stageSpeech().submit({ utteranceId: utteranceId(reply.eventId), text: reply.text, interrupt: true, ...(loadAiri().characterId ? { character: loadAiri().characterId } : {}) })
        if (!result.ok) { publish({ phase: 'ready', error: speechError(result.error) }); return }
        spoken = result.utteranceId
        publish({ phase: 'ready' })
      },
      onStatus: (status) => {
        if (run !== generation) return
        if (status.phase === 'ready') attempts = 0
        publish(status)
        const rejected = status.error === 'AIRI did not accept the token'
        if (!rejected && loadAiri().enabled && (status.phase === 'closed' || status.phase === 'failed') && attempts < 8) {
          attempts += 1
          timer = window.setTimeout(() => { if (run === generation) start(true) }, Math.min(8_000, 500 * 2 ** attempts))
        }
      },
    })
    client = next
    void next.connect().catch(() => {})
  }
  const off = subscribeAiri(start)
  start()
  return () => {
    generation += 1
    window.clearTimeout(timer)
    off()
    stopForward()
    client?.close()
    publish({ phase: 'off' })
  }
}

export type { AiriSettings }
