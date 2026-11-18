// The slice of AIRI's websocket envelope Stage needs. Verified against moeru-ai/airi
// commit 473112a3051fd599dba744b5257b890f5ea05b14 (@proj-airi/server-sdk 0.15.4):
// plain JSON and SuperJSON both parse, completed chat text is output:gen-ai:chat:complete,
// and input:text is sent for AIRI's own chat-ingestion consumer to receive.

export type AiriEvent = {
  type: string
  data: Record<string, unknown>
  metadata?: { event?: { id?: string }; source?: Record<string, unknown> }
}

export type AiriReply = { text: string; eventId?: string; binding?: string }

const MODULE_NAME = 'livliv-stage'

export function airiServerUrl(value: string): string | null {
  if (!value || value.length > 300) return null
  let url: URL
  try { url = new URL(value) } catch { return null }
  if ((url.protocol !== 'ws:' && url.protocol !== 'wss:') || url.username || url.password || !url.hostname) return null
  return url.toString()
}

/** SuperJSON wraps the event in `{ json }`. AIRI's parser also accepts a plain event. */
export function parseAiriEvent(text: string): AiriEvent | null {
  let value: unknown
  try { value = JSON.parse(text) } catch { return null }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const event = record.json && typeof record.json === 'object' && !Array.isArray(record.json) && 'type' in record.json ? record.json : record
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null
  const body = event as Record<string, unknown>
  if (typeof body.type !== 'string' || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return null
  const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata as AiriEvent['metadata'] : undefined
  return { type: body.type, data: body.data as Record<string, unknown>, ...(metadata ? { metadata } : {}) }
}

export function stringifyAiriEvent(event: AiriEvent): string {
  return JSON.stringify(event)
}

export function airiModuleName() {
  return MODULE_NAME
}

export function airiReply(event: AiriEvent): AiriReply | null {
  if (event.type !== 'output:gen-ai:chat:complete') return null
  const text = messageText(event.data.message).trim()
  if (!text) return null
  const binding = readBinding(event.data)
  const eventId = typeof event.metadata?.event?.id === 'string' ? event.metadata.event.id : undefined
  return { text: [...text].slice(0, 4000).join(''), ...(eventId ? { eventId } : {}), ...(binding ? { binding } : {}) }
}

/** A livliv-stage binding belongs to the turn that sent it. Other bindings are AIRI's own chats. */
export function currentAiriTurn(binding: string | undefined, current: string) {
  return !(binding?.startsWith('livliv-stage:') && binding !== current)
}

export function announcedSelf(event: AiriEvent, identity: string) {
  if (event.type === 'extension:module:announced') {
    const id = event.data.identity
    return event.data.name === MODULE_NAME && !!id && typeof id === 'object' && (id as { id?: unknown }).id === identity
  }
  if (event.type === 'registry:modules:sync' && Array.isArray(event.data.modules)) {
    return event.data.modules.some((entry) => {
      if (!entry || typeof entry !== 'object') return false
      const module = entry as { name?: unknown; identity?: { id?: unknown } }
      return module.name === MODULE_NAME && module.identity?.id === identity
    })
  }
  return false
}

function messageText(message: unknown) {
  if (!message || typeof message !== 'object') return ''
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((part) => part && typeof part === 'object' && (part as { type?: unknown }).type === 'text' && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : '').join('')
}

function readBinding(data: Record<string, unknown>) {
  const chat = data['gen-ai:chat']
  if (!chat || typeof chat !== 'object') return undefined
  const input = (chat as { input?: unknown }).input
  if (!input || typeof input !== 'object') return undefined
  const body = (input as { data?: unknown }).data
  if (!body || typeof body !== 'object') return undefined
  const binding = (body as { overrides?: { binding?: unknown } }).overrides?.binding
  return typeof binding === 'string' && binding.length <= 200 ? binding : undefined
}
