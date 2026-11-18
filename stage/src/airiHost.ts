import { useSyncExternalStore } from 'react'
import { tr } from './i18n'
import { actors } from './actors'
import { setAiriForward } from './airiForward'
import { interpretSparkCommand, sparkEmit, type AiriSparkAction } from './airiActions'
import { AiriClient } from './airiClient'
import { airiCharacterBrief } from './airiCast'
import { characterContextUpdate } from './airiCharacter'
import { airiServerUrl } from './airiProtocol'
import { acceptAiriReply } from './airiSession'
import { loadAiri, subscribeAiri, type AiriSettings } from './airiSettings'
import { conversation, talk } from './conversation'
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
  let sentCard = ''
  const stopForward = setAiriForward((text) => {
    const settings = loadAiri()
    if (!settings.enabled || !settings.forwardInput) return 'ignore'
    if (spoken) stageSpeech().cancel(spoken)
    spoken = undefined
    const brief = airiCharacterBrief(settings.characterId)
    if (!client?.ready || !client.sendText(text, brief?.id ?? settings.characterId, brief ? characterContextUpdate(brief) : undefined)) return 'unavailable'
    return 'sent'
  })
  const pushCard = () => {
    if (!client?.ready) return
    const brief = airiCharacterBrief(loadAiri().characterId)
    const text = brief ? characterContextUpdate(brief).text : ''
    if (!brief || text === sentCard) return
    sentCard = text
    client.sendContext(characterContextUpdate(brief))
  }
  const start = (force = false) => {
    const settings = loadAiri()
    const key = JSON.stringify({ enabled: settings.enabled, url: settings.url, token: settings.token })
    if (!force && key === applied) return
    applied = key
    sentCard = ''
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
        if (run !== generation || !acceptAiriReply(reply, { binding: next.currentBinding, turn: next.turn })) return
        const brief = airiCharacterBrief(loadAiri().characterId)
        const result = stageSpeech().submit({ utteranceId: utteranceId(reply.eventId), text: reply.text, raw: reply.raw, interrupt: true, ...(brief ? { character: brief.id } : {}) })
        if (!result.ok) { publish({ phase: 'ready', error: speechError(result.error) }); return }
        spoken = result.utteranceId
        publish({ phase: 'ready' })
      },
      onCommand: (data) => {
        if (run !== generation) return
        const action = interpretSparkCommand(data)
        if (action?.interrupt && spoken) { stageSpeech().cancel(spoken); spoken = undefined }
        const appliedAction = action ? applySpark(action) : false
        next.sendEmit(sparkEmit(action?.id || 'command', appliedAction ? 'done' : 'dropped', appliedAction ? 'Played on the LivLiv character' : 'Nothing on stage matched this command'))
      },
      onStatus: (status) => {
        if (run !== generation) return
        if (status.phase === 'ready') { attempts = 0; pushCard() }
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
  const off = subscribeAiri(() => { start(false); pushCard() })
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

function applySpark(action: AiriSparkAction) {
  if (!action.perform) return false
  const brief = airiCharacterBrief(loadAiri().characterId)
  const actor = brief ? actors.get(brief.id) : undefined
  let applied = false
  if (action.pause && conversation().running) { talk.pause(); applied = true }
  if (action.resume && conversation().running) { talk.resume(); applied = true }
  if (actor && action.motion) { actor.act(action.motion); applied = true }
  if (actor && action.feeling) { actor.react({ at: 0, feeling: action.feeling, ...(action.look ? { look: action.look } : {}), ...(action.motion && action.motion !== 'away' ? { action: action.motion } : {}) }); applied = true }
  return applied
}

export type { AiriSettings }
