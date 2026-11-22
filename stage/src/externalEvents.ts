/** External integrations supply data and available actions; they do not own a conversation or its memory. */
export type ExternalEvent = { id: string; source: string; message: string; reply: 'never' | 'maybe' | 'always'; character?: string }
/** an event's message as a model is given it (Stage's own brain's input; AIRI's note and its history): at most
 *  EVENT_CHARS. The conversation keeps up to 4,000 of it (conversation.ts) */
export const EVENT_CHARS = 500
export const eventText = (text: string) => text.length > EVENT_CHARS ? text.slice(0, EVENT_CHARS - 1) + '…' : text
export type ExternalAction = { name: string; description: string; schema?: Record<string, unknown> }
export type ExternalActionRequest = {
  character: string; source: string; state?: string; query: string; actions: ExternalAction[]
  priority: 'low' | 'medium' | 'high' | 'critical'; silent: boolean
}
export type ExternalActionDecision = { name: string; data?: Record<string, unknown> }
