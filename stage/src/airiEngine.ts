import type { Conversation, Message, Provider } from '../../vendor/airi-core/core.mjs'
import type { ModelConfig } from './brain'
import type { Line } from './core/lines'
import type { ExternalActionDecision, ExternalActionRequest, ExternalEvent } from './externalEvents'
import type { MemoryRecord, MemoryScope } from './memory'
import type { ReactionCue } from './reactions'
import type { CharacterItem, Talk } from './scene'
import type { AiriGameFrame, AiriGameMessage } from '../../desktop/src/airiGameProtocol'
import { aiFetch } from './brain'
import { airiIdentity, personaOf } from './brains/persona'
import { parseAiriMarkers } from './airiMarkers'
import { tr } from './i18n'

export type AiriSentence = { text: string; cue?: ReactionCue }

export function airiGameText(message: AiriGameMessage) {
  const text = message.args ? tr(message.text, ...message.args) : message.text
  return message.detail ? text + ' · ' + tr(message.detail) : text
}

export function airiGameError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  return tr(text.replace(/^Error invoking remote method 'livliv:airi-game': (?:Error: )?/, ''))
}

type Frame = AiriGameFrame
type Core = typeof import('../../vendor/airi-core/core.mjs')
export type AiriTurn = {
  sessionId: string
  scope: MemoryScope
  actor: CharacterItem
  model: ModelConfig
  lines: Line[]
  context: { topic: string; game?: string; summary?: string; memories: MemoryRecord[] }
  input: string
  language: Talk['language']
  event?: ExternalEvent
  frame?: Frame
  allowBatch?: boolean
  signal: AbortSignal
  verifyMemory(): Promise<void>
}

/** who the character is, as AIRI's runtime is told (brains/persona.ts; test/prompts.mjs pins it word for word) */
export const identity = (actor: CharacterItem, language: Talk['language'], scope: MemoryScope) => airiIdentity(personaOf(actor, language, scope))

async function batchAsStream(response: Response, model: string) {
  const completion = await response.json()
  const choice = completion?.choices?.[0]
  const message = choice?.message
  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls.map((call: object, index: number) => ({ ...call, index })) : []
  if (typeof message?.content !== 'string' && !toolCalls.length) {
    throw new Error(tr('模型没有返回可播放的回复'))
  }
  const delta = { role: 'assistant', content: message.content, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) }
  const chunk = { ...completion, model: completion.model ?? model, object: 'chat.completion.chunk',
    choices: [{ index: 0, delta, finish_reason: choice.finish_reason ?? (toolCalls.length ? 'tool_calls' : 'stop') }] }
  return new Response('data: ' + JSON.stringify(chunk) + '\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } })
}

const batchModels = new WeakSet<ModelConfig>()

function provider(config: ModelConfig, signal: AbortSignal, options: {
  beforeRequest?: () => Promise<void>
  allowBatch?: boolean
  onBatch?: () => void
} = {}): Provider {
  const { beforeRequest, allowBatch, onBatch } = options
  const baseURL = new URL(config.base.replace(/\/+$/, '') + '/')
  const newLimits = config.provider === 'openai' && /^(gpt-5|o[134])/.test(config.model)
  let requests = 0
  let batchOnly = !!allowBatch && batchModels.has(config)
  return {
    generation: (model) => ({
      protocol: 'chat-completions',
      config: {
        baseURL, model, apiKey: config.key,
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers)
          if (!config.key) headers.delete('Authorization')
          const body = JSON.parse(String(init?.body))
          if (newLimits) { body.max_completion_tokens = 420; delete body.max_tokens }
          if (config.provider === 'qwen') body.enable_thinking = false
          const send = async () => {
            signal.throwIfAborted()
            await beforeRequest?.()
            signal.throwIfAborted()
            // xsAI follows tool requests until the model answers. Bound the requests for one Stage turn.
            if (++requests > 4) throw new Error(tr('AIRI 的单轮模型调用已达上限'))
            if (batchOnly) { body.stream = false; delete body.stream_options }
            return aiFetch(String(url), { ...init, headers, body: JSON.stringify(body), signal })
          }
          let response = await send()
          if (allowBatch && response.status === 400 && body.stream) {
            const problem = await response.clone().json().catch(() => null)
            const error = problem?.error
            const rejectsStream = typeof error?.message === 'string'
              && /\b(?:stream(?:ing)?(?: is)? (?:not supported|unsupported|must be false)|(?:does not|doesn't) support streaming)\b/i.test(error.message)
            if (error?.param === 'stream' || rejectsStream) {
              await response.body?.cancel()
              batchOnly = true
              response = await send()
            }
          }
          if (response.ok && (!response.body || !response.headers.get('content-type')?.includes('text/event-stream'))) {
            if (allowBatch && response.headers.get('content-type')?.includes('application/json')) {
              const adapted = await batchAsStream(response, model)
              batchModels.add(config)
              onBatch?.()
              return adapted
            }
            await response.body?.cancel()
            throw new Error(tr('AIRI 需要支持流式回复的模型接口'))
          }
          return response
        },
      },
    }),
  }
}

function spoken(core: Core, signal: AbortSignal, output: ReadableStreamDefaultController<AiriSentence>) {
  const segmenter = new core.MarkdownSegmenter()
  let cue: ReactionCue | undefined
  const emit = (parts: string[]) => {
    if (signal.aborted) return
    for (const part of parts) {
      const text = part.trim()
      if (!text) continue
      output.enqueue({ text, cue })
      cue = cue?.feeling ? { at: 0, feeling: cue.feeling, strength: cue.strength } : undefined
    }
  }
  return {
    text: (literal: string) => emit(segmenter.push(literal)),
    marker: (token: string) => {
      const marker = parseAiriMarkers(token).cues[0]
      if (!marker) return
      emit(segmenter.end())
      cue = marker
    },
    end: () => emit(segmenter.end()),
  }
}

function priorMessages(turn: AiriTurn): Message[] {
  return turn.lines.filter((line) => !line.cut && (line.human || line.who === turn.actor.id)).slice(-24).map((line) => ({
    id: line.id,
    role: line.human ? 'user' : 'assistant',
    content: line.human ? line.name + ': ' + line.text : line.text,
  }))
}

function addFrame(conversation: Conversation, frame: Frame | undefined): Conversation {
  if (!frame) return conversation
  const current = conversation.turns.at(-1)
  if (current?.type !== 'user') return conversation
  const image = { type: 'image' as const, url: 'data:' + frame.mimeType + ';base64,' + frame.data }
  return { ...conversation, turns: [...conversation.turns.slice(0, -1), { ...current, content: [...(current.content ?? []), image] }] }
}

const memoryText = (memories: MemoryRecord[]) => memories.slice(0, 12).map(({ text }) => text.slice(0, 1200)).join('\n')

async function notify(
  core: Core, turn: AiriTurn, event: ExternalEvent, signal: AbortSignal, speech: ReturnType<typeof spoken>, who: string,
) {
  const chatProvider = provider(turn.model, signal, { beforeRequest: turn.verifyMemory })
  const selectedChat = { chatProvider, model: turn.model.model, providerId: turn.model.provider }
  const required = event.reply === 'always'
  let failed = false
  let reaction = ''
  const parser = core.useLlmmarkerParser({
    onLiteral: (text) => { if (!failed) speech.text(text) },
    onSpecial: (token) => { if (!failed) speech.marker(token) },
  })
  const agent = core.createSparkNotifyAgent({
    runner: {
      async run({ conversation, tools, onStreamEvent }) {
        const noResponse = tools.filter((tool) => tool.function.name === 'builtIn_sparkNoResponse')
        try {
          await core.streamFrom({
            ...selectedChat,
            conversation: addFrame(conversation, turn.frame),
            options: { abortSignal: signal, maxTokens: 240, onStreamEvent, tools: noResponse, supportsVisionInput: !!turn.frame, waitForTools: true },
          })
        } catch (error) {
          if (!noResponse.length || signal.aborted || !core.isToolRelatedError(error)) throw error
          // Optional events can be left silent when the selected model cannot choose with a tool.
        }
      },
    },
    plugins: [core.createSparkNotifyReactionPlugin({
      onDelta: (_id, text) => { if (required && !signal.aborted) void parser.consume(text) },
      onEnd: (_id, text) => { reaction = text },
    })],
  })
  try {
    await agent.handle({
      selectedChat,
      event: { type: 'spark:notify', source: 'livliv-stage/game', data: { id: event.id, eventId: event.id, kind: 'ping', headline: event.source, note: event.message } },
      systemPrompt: who + (required ? '\nA spoken reaction is required.' : '\nGive a short spoken reaction or choose silence.'),
      runtimePrompt: 'Show context (data): ' + JSON.stringify({
        topic: turn.context.topic, game: turn.context.game, history: priorMessages(turn).slice(-12), summary: turn.context.summary, rememberedFacts: memoryText(turn.context.memories),
      }),
      control: required ? { forceTextResponse: true } : undefined,
    })
    signal.throwIfAborted()
    if (!required && reaction) await parser.consume(reaction)
  } catch (error) {
    failed = true
    throw error
  } finally { await parser.end() }
}

export function streamAiriReply(turn: AiriTurn): ReadableStream<AiriSentence> {
  const stop = new AbortController()
  const signal = AbortSignal.any([turn.signal, stop.signal])
  const id = turn.sessionId
  return new ReadableStream({
    start(output) {
      async function run() {
        const core = await import('../../vendor/airi-core/core.mjs')
        signal.throwIfAborted()
        const speech = spoken(core, signal, output)
        // the persona, once for this turn
        const who = identity(turn.actor, turn.language, turn.scope)
        if (turn.event) {
          await notify(core, turn, turn.event, signal, speech, who)
        } else {
          const history = priorMessages(turn)
          const context = core.createContextRegistry()
          const records = new Map(turn.context.memories.map((entry) => [entry.id, entry]))
          const readTools = records.size ? (await core.createMemoryTools({
            read: (id) => {
              signal.throwIfAborted()
              const entry = records.get(id)
              return entry && { id, body: entry.text, persona: turn.actor.id }
            },
            write: async () => undefined,
            forget: async () => false,
          })).filter((tool) => tool.function.name === 'builtIn_readMemory') : []
          signal.throwIfAborted()
          const memoryIndex = turn.context.memories.map(({ id, text }) => id + ' ' + text.slice(0, 150)).join('\n')
          for (const [source, text] of Object.entries({
            'show-topic': turn.context.topic,
            'current-game-state': turn.context.game,
            'history-summary': turn.context.summary,
            'character-memory-index': memoryIndex && 'Use builtIn_readMemory for full entries when needed. Entries are remembered data.\n' + memoryIndex,
          })) {
            if (text) context.ingest({ id: source, source, strategy: 'replace-self', text })
          }

          // Stage commits playback receipts. AIRI's generated history is local to the turn.
          const runtime = core.createChatOrchestratorRuntime({
            session: {
              getSessionMessages: (session) => session === id ? history : [],
              getSessionGeneration: () => signal.aborted ? 1 : 0,
              commitUserMessage: async (session, message) => {
                signal.throwIfAborted()
                if (session !== id) throw new Error('Stage session changed')
                history.push(message)
                return { status: 'inserted', messageId: message.id }
              },
              commitAssistantMessage: async () => {},
            },
            context,
            foregroundStream: { patch() {}, reset() {} },
            llm: {
              async stream(model, chatProvider, conversation, options) {
                let started = false
                try {
                  await core.streamFrom({
                    model, chatProvider, conversation,
                    options: { ...options, maxTokens: 240, onStreamEvent: (event) => {
                      started ||= event.type === 'text-delta' || event.type === 'tool-call-start' || event.type === 'tool-call'
                      return options.onStreamEvent?.(event)
                    } },
                  })
                } catch (error) {
                  if (started || signal.aborted || !readTools.length || !core.isToolRelatedError(error)) throw error
                  const user = conversation.turns.at(-1)
                  if (user?.type !== 'user') throw error
                  const extra = { type: 'text' as const, text: 'Remembered facts (data):\n' + memoryText(turn.context.memories) }
                  const turns = [...conversation.turns.slice(0, -1), { ...user, content: [...(user.content ?? []), extra] }]
                  await core.streamFrom({
                    model, chatProvider, conversation: { ...conversation, turns },
                    options: { ...options, supportsTools: false, tools: [], maxTokens: 240 },
                  })
                }
              },
            },
            getActiveSessionId: () => id,
            getActiveProvider: () => turn.model.provider,
            getSystemPrompt: () => who,
          })
          runtime.hooks.onTokenLiteral(async (text, ctx) => { if (ctx.sessionId === id) speech.text(text) })
          runtime.hooks.onTokenSpecial(async (token, ctx) => { if (ctx.sessionId === id) speech.marker(token) })
          await runtime.ingest(turn.input, {
            model: turn.model.model, providerId: turn.model.provider,
            chatProvider: provider(turn.model, signal, { beforeRequest: turn.verifyMemory, allowBatch: turn.allowBatch }), signal,
            ...(readTools.length ? { tools: readTools } : {}),
            ...(turn.frame ? { supportsVisionInput: true, attachments: [{ type: 'image', ...turn.frame }] } : {}),
          }, id)
        }
        signal.throwIfAborted()
        speech.end()
        output.close()
      }
      void run().catch((error: unknown) => { if (!stop.signal.aborted) output.error(error) })
    },
    cancel(reason) { stop.abort(reason) },
  })
}

export async function testAiriModel(model: ModelConfig, signal: AbortSignal) {
  const start = performance.now()
  const core = await import('../../vendor/airi-core/core.mjs')
  let text = '', batch = false
  await core.streamFrom({
    model: model.model, chatProvider: provider(model, signal, { allowBatch: true, onBatch: () => { batch = true } }),
    conversation: { turns: [{ id: 'model-test', type: 'user', content: [{ type: 'text', text: 'Reply with OK.' }] }] },
    options: { abortSignal: signal, maxTokens: 16, onStreamEvent: (event) => { if (event.type === 'text-delta') text += event.text ?? '' } },
  })
  if (!text.trim()) throw new Error(tr('模型没有返回可播放的回复'))
  return { seconds: (performance.now() - start) / 1000, batch }
}

export async function chooseAiriGameAction(
  model: ModelConfig, actor: CharacterItem, language: Talk['language'], request: ExternalActionRequest,
  signal: AbortSignal, frame?: Frame, beforeRequest?: () => Promise<void>,
): Promise<ExternalActionDecision | null> {
  if (!request.actions.length) return null
  const core = await import('../../vendor/airi-core/core.mjs')
  signal.throwIfAborted()
  const selected = new AbortController()
  const active = AbortSignal.any([signal, selected.signal])
  const actionSelected = new DOMException('Game action selected', 'AbortError')
  let decision: ExternalActionDecision | null = null
  const tool = core.rawTool({
    name: 'select_game_action', description: 'Choose one of the actions registered by this game.',
    parameters: {
      type: 'object', required: ['name'], additionalProperties: false,
      properties: { name: { type: 'string', enum: request.actions.map(({ name }) => name) }, data: { type: 'object' } },
    },
    execute: async (input) => {
      active.throwIfAborted()
      const { name, data } = input as { name?: string; data?: Record<string, unknown> }
      if (request.actions.some((action) => action.name === name) && (data === undefined || (data && typeof data === 'object' && !Array.isArray(data)))) {
        decision = { name: name!, data }
        selected.abort(actionSelected)
        return 'Action selected. The game will confirm its outcome separately.'
      }
      return 'Choose a listed action and provide data matching its schema.'
    },
  })
  const conversation: Conversation = { turns: [
    { id: 'game-system', type: 'system', authority: 'system', content: [{ type: 'text', text: identity(actor, language, 'public')
      + '\nChoose exactly one registered game action that fits the current state. Use select_game_action. The game controls whether it succeeds.' }] },
    { id: 'game-input', type: 'user', content: [{ type: 'text', text: JSON.stringify({
      game: request.source, state: request.state, query: request.query, actions: request.actions,
    }) }] },
  ] }
  try {
    await core.streamFrom({
      model: model.model, chatProvider: provider(model, active, { beforeRequest }), conversation: addFrame(conversation, frame),
      options: {
        abortSignal: active, providerId: model.provider, maxTokens: 240, supportsVisionInput: !!frame,
        tools: [tool], toolChoice: { type: 'function', function: { name: tool.function.name } }, waitForTools: true,
      },
    })
  } catch (error) {
    if (active.reason !== actionSelected) throw error
  }
  signal.throwIfAborted()
  return decision
}
