export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type Action = { name: string; description: string; schema?: Record<string, Json> }
export type ActionResult = { id: string; name: string; success: boolean; message?: string }
export type DialogueLine = { id: string; speaker: string; text?: string; reply: 'never' | 'maybe' | 'always'; responder?: string }
export type ForceRequest = {
  id: string
  query: string
  state: string
  actionNames: string[]
  availableActions: Action[]
  ephemeralContext: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  silent: boolean
  attempt: number
}
/** Events contain only JSON-serializable values; the session argument supplies the callable game connection. */
export type NeuroEvent =
  | { type: 'startup'; game: string }
  | { type: 'context'; message: string; silent: boolean }
  | { type: 'actions'; actions: Action[] }
  | { type: 'dialogue'; speaking: boolean; line: DialogueLine; reason?: 'ended' | 'timeout' | 'disconnected' }
  | { type: 'reply'; reply: 'maybe' | 'always'; line: DialogueLine }
  | ({ type: 'action-result'; requestId: string; attempt: number } & ActionResult)
  | { type: 'force-complete'; requestId: string; status: 'declined' | 'succeeded' | 'failed' | 'cancelled' | 'error'; error?: string }
  | { type: 'disconnect' }
export type NeuroSession = {
  readonly id: string
  readonly game: string
  readonly actions: Action[]
  readonly speaking: boolean
  perform(name: string, data?: Record<string, Json>, options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<ActionResult>
  speechFinished(status?: { isFinal: boolean; cancelled?: boolean; reason?: string }): void
}
export type NeuroServerOptions = {
  character: { id: string; name: string }
  onEvent?: (event: NeuroEvent, session: NeuroSession) => void | Promise<void>
  decideAction?: (request: ForceRequest, session: NeuroSession, signal: AbortSignal) => Promise<{ name: string; data?: Record<string, Json> } | null> | { name: string; data?: Record<string, Json> } | null
  onError?: (error: Error, sessionId?: string) => void
  /** Origin-less native game clients are accepted. Browser clients require an exact allowlisted Origin. */
  allowedOrigins?: string[]
  maxConnections?: number
  actionTimeoutMs?: number
  /** Total attempts, 1–3. The default 1 makes failure visible without retrying a paid decision. */
  maxForceAttempts?: number
  dialogueGraceMs?: number
}
export type NeuroServer = {
  sessions(): NeuroSession[]
  listen(port?: number): Promise<{ host: '127.0.0.1'; port: number; url: string }>
  close(): Promise<void>
}
export function createNeuroServer(options: NeuroServerOptions): NeuroServer
