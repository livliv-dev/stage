// A model service's failure in words people can act on. AIRI's requests fail as `Remote sent <status> response: <body>`
// (its streaming adapter); that is never shown as it is. A failure tied to a tool call (the service refusing a call's
// arguments, a tool that couldn't run) ends the turn with a line saying so, and the next one starts afresh. Pure:
// test/modelErrors.test.ts.
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

const TOOL = /function\.arguments|tool_call|tool[ _]?(?:input|use|call)|function[ _]?call|Failed to parse tool input/i

/** the error to show: a readable one for a model service's failure, any other as it was */
export function readableModelError(error: unknown, toolRelated = false): unknown {
  const failure = remoteFailure(error)
  if (!failure) return error
  const { status, message } = failure
  if (toolRelated || TOOL.test(message)) return new Error(tr('这一句的工具调用出错（模型服务返回 {0}），这一轮先停下；再说一次就好', status))
  if (status === 401 || status === 403) return new Error(tr('模型服务不接受这个密钥（{0}）：在「设置 → 连接」检查密钥', status))
  if (status === 404) return new Error(tr('模型服务找不到这个模型或地址（404）：在「设置 → 连接」检查模型名'))
  if (status === 429) return new Error(tr('模型服务太忙或额度用完了（429），稍后再试'))
  if (status >= 500) return new Error(tr('模型服务暂时出错（{0}），稍后再试', status))
  return new Error(tr('模型服务拒绝了这次请求（{0}）：{1}', status, message.slice(0, 120)))
}
