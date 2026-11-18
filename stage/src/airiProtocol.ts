// The slice of AIRI's websocket envelope Stage needs. Verified against moeru-ai/airi
// commit 473112a3051fd599dba744b5257b890f5ea05b14 (@proj-airi/server-sdk 0.15.4):
// plain JSON and SuperJSON both parse, completed chat text is output:gen-ai:chat:complete,
// and input:text is sent for AIRI's own chat-ingestion consumer to receive.

export type AiriEvent = {
  type: string
  data: Record<string, unknown>
  metadata?: { event?: { id?: string }; source?: Record<string, unknown> }
}

export type AiriReply = { text: string; eventId?: string; binding?: string; turn?: number; raw?: string }

const MODULE_NAME = 'livliv-stage'
/** Events Stage sends. Completed replies and spark commands are received, not announced as ours. */
export const AIRI_SENT_EVENTS = ['input:text', 'context:update', 'spark:emit'] as const

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
  const turn = readTurn(event.data)
  const raw = readRaw(event.data, text)
  const eventId = typeof event.metadata?.event?.id === 'string' ? event.metadata.event.id : undefined
  return { text: [...text].slice(0, 4000).join(''), ...(eventId ? { eventId } : {}), ...(binding ? { binding } : {}), ...(turn === undefined ? {} : { turn }), ...(raw ? { raw } : {}) }
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

function inputData(data: Record<string, unknown>) {
  const direct = data
  const chat = data['gen-ai:chat']
  if (!chat || typeof chat !== 'object') return direct
  const input = (chat as { input?: unknown }).input
  if (!input || typeof input !== 'object') return direct
  const body = (input as { data?: unknown }).data
  return body && typeof body === 'object' ? body as Record<string, unknown> : direct
}

function readBinding(data: Record<string, unknown>) {
  const source = inputData(data)
  const binding = (source.overrides as { binding?: unknown } | undefined)?.binding ?? (data.overrides as { binding?: unknown } | undefined)?.binding
  return typeof binding === 'string' && binding.length <= 200 ? binding : undefined
}

function readTurn(data: Record<string, unknown>) {
  const value = inputData(data).livlivTurn ?? data.livlivTurn
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 1_000_000 ? value : undefined
}

function readRaw(data: Record<string, unknown>, spoken: string) {
  for (const key of ['outputText', 'rawText', 'raw']) {
    const value = data[key]
    if (typeof value === 'string' && value.includes('<|ACT')) return value.slice(0, 8000)
  }
  if (spoken.includes('<|ACT')) return spoken.slice(0, 8000)
  return undefined
}
