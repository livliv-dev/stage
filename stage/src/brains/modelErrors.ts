// A model service's failure in words people can act on. AIRI's requests fail as `Remote sent <status> response: <body>`
// (its streaming adapter); that is never shown as it is. The service refusing a tool call's arguments as not JSON ends
// the turn with a line saying so: the next one starts afresh, so saying it again works. Any other refusal (a model that
// can't call tools, say) shows the service's own message. Pure: test/modelErrors.test.ts.
import { tr } from '../i18n'

/** status and the service's own message, from `Remote sent 400 response: {"error":{"message":"…"}}` */
export function remoteFailure(error: unknown): { status: number; message: string } | null {
  const text = error instanceof Error ? error.message : String(error)
  const match = /Remote sent (\d{3}) response:?\s*([\s\S]*)$/.exec(text)
  if (!match) return null
  let message = match[2].trim()
  try {
    const body = JSON.parse(message)
    message = String(body?.error?.message ?? body?.message ?? body?.detail ?? message)
  } catch { /* not JSON: as sent */ }
  return { status: +match[1], message: message.replace(/\s+/g, ' ').slice(0, 300) }
}

/** a tool call's arguments, as services name them: `function.arguments`, tool input, tool or function call arguments */
const ARGUMENTS = /function\.arguments|tool[ _]?input|(?:tool|function)[ _]?(?:call[ _]?)?arguments/i
/** refused as not JSON (or not readable) */
const NOT_JSON = /JSON|pars(?:e|ing)|deserializ/i

/** the error to show: a readable one for a model service's failure, any other as it was */
export function readableModelError(error: unknown): unknown {
  const failure = remoteFailure(error)
  if (!failure) return error
  const { status, message } = failure
  if ((status === 400 || status === 422) && ARGUMENTS.test(message) && NOT_JSON.test(message)) return new Error(tr('工具调用出错（{0}），请再说一次', status))
  if (status === 401 || status === 403) return new Error(tr('密钥无效（{0}）', status))
  if (status === 404) return new Error(tr('找不到这个模型（404）'))
  if (status === 429) return new Error(tr('模型服务太忙或额度用完了（429），稍后再试'))
  if (status >= 500) return new Error(tr('模型服务暂时出错（{0}），稍后再试', status))
  return new Error(tr('模型服务拒绝了这次请求（{0}）：{1}', status, message.slice(0, 120)))
}
