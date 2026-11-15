/** External integrations supply data and available actions; they do not own a conversation or its memory. */
export type ExternalEvent = { id: string; source: string; message: string; reply: 'never' | 'maybe' | 'always'; character?: string }
export type ExternalAction = { name: string; description: string; schema?: Record<string, unknown> }
export type ExternalActionRequest = {
  character: string; source: string; state?: string; query: string; actions: ExternalAction[]
  priority: 'low' | 'medium' | 'high' | 'critical'; silent: boolean
}
export type ExternalActionDecision = { name: string; data?: Record<string, unknown> }
