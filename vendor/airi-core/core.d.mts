// Narrow host types for the upstream TypeScript assembled by build.mjs.
type Text = { type: 'text'; text: string }
type Image = { type: 'image'; url: string }
type Attachment = { type: 'image'; mimeType: string; data: string }
export type Message = { id?: string; role: 'system' | 'user' | 'assistant'; content: string }
type Context = { id: string; source: string; strategy: 'replace-self'; text: string }
interface Registry {
  ingest(context: Context): void
  snapshot(): Record<string, Context[]>
}
type StreamEvent = { type: 'text-delta' | 'reasoning-delta'; text: string } | { type: string; text?: never }
type Choice = { type: 'function'; function: { name: string } }
type Tool = { type: 'function'; function: { name: string } }
type ToolSpec = {
  name: string
  description: string
  parameters: object
  execute(input: unknown): Promise<string>
}
export type Provider = {
  generation(model: string): {
    protocol: 'chat-completions'
    config: { baseURL: URL; apiKey: string; model: string; fetch: typeof fetch }
  }
}
interface StreamOptions {
  abortSignal?: AbortSignal
  maxTokens?: number
  providerId?: string
  supportsTools?: boolean
  supportsVisionInput?: boolean
  waitForTools?: boolean
  tools?: Tool[] | (() => Promise<Tool[] | undefined>)
  toolChoice?: Choice
  onStreamEvent?: (event: StreamEvent) => void | Promise<void>
}
export interface Conversation {
  readonly turns: readonly {
    id: string
    type: string
    authority?: string
    content?: readonly (Text | Image)[]
  }[]
}
interface LlmOptions extends StreamOptions {
  abortSignal: AbortSignal
}
interface TurnContext {
  sessionId: string
}
type TokenListener = (text: string, context: TurnContext) => Promise<void>
interface RuntimeOptions {
  session: {
    getSessionMessages(sessionId: string): Message[]
    getSessionGeneration(sessionId: string): number
    commitUserMessage(sessionId: string, message: Message & { id: string }): Promise<{ status: 'inserted'; messageId: string }>
    commitAssistantMessage(sessionId: string, message: Message): Promise<void>
  }
  context: Registry
  foregroundStream: { patch(): void; reset(): void }
  llm: { stream(model: string, provider: Provider, conversation: Conversation, options: LlmOptions): Promise<void> }
  getActiveSessionId(): string
  getActiveProvider(): string
  getSystemPrompt(sessionId: string): string
}
export function createChatOrchestratorRuntime(options: RuntimeOptions): {
  ingest(text: string, options: {
    model: string
    providerId: string
    chatProvider: Provider
    signal: AbortSignal
    supportsVisionInput?: boolean
    attachments?: Attachment[]
    tools?: Tool[]
  }, sessionId: string): Promise<void>
  hooks: { onTokenLiteral(callback: TokenListener): () => void; onTokenSpecial(callback: TokenListener): () => void }
}
export function createContextRegistry(): Registry
export function streamFrom(request: { model: string; chatProvider: Provider; conversation: Conversation; options: StreamOptions }): Promise<void>
export function isToolRelatedError(error: unknown): boolean
export function rawTool(spec: ToolSpec): Tool
export function createMemoryTools(options: {
  read(id: string): { id: string; body: string; persona: string } | undefined
  write(entry: { id?: string; body: string; description: string }): Promise<{ id: string; body: string; persona: string } | undefined>
  forget(id: string): Promise<boolean>
}): Promise<Tool[]>
type SelectedChat = { model: string; providerId: string; chatProvider: Provider }
interface SparkPlugin {
  name: string
}
export function createSparkNotifyReactionPlugin(sink: { onEnd(id: string, text: string): void; onDelta(id: string, text: string): void }): SparkPlugin
export function createSparkNotifyAgent(options: {
  plugins: SparkPlugin[]
  runner: { run(args: { selectedChat: SelectedChat; conversation: Conversation; tools: Tool[]; onStreamEvent: NonNullable<StreamOptions['onStreamEvent']> }): Promise<void> }
}): {
  handle(request: {
    selectedChat: SelectedChat
    event: { type: 'spark:notify'; source: string; data: { id: string; eventId: string; kind: 'ping'; headline: string; note: string } }
    systemPrompt: string
    runtimePrompt: string
    control?: { forceTextResponse: boolean }
  }): Promise<unknown>
}
export function useLlmmarkerParser(options: { onLiteral(text: string): void; onSpecial(token: string): void }): {
  consume(text: string): Promise<void>
  end(): Promise<void>
}
export class MarkdownSegmenter {
  push(text: string): string[]
  end(): string[]
}
