// Which way a realtime call goes, and what a failure to connect says. Alibaba Cloud Bailian with a standard key (its
// standard API address) offers the realtime models over a WebSocket only: the desktop app opens it with the key in its
// header (desktop/src/realtimeSocket.ts); a web page can't, so on the web Bailian needs a workspace's own address
// (….maas.aliyuncs.com), which takes WebRTC. Any other address (a workspace, a proxy, a test server) and OpenAI take
// WebRTC as before. A combination that can't work has no route, so the checklist doesn't call it ready. Pure:
// test/realtimeRoute.test.ts.
import { tr } from '../i18n'
import { REALTIME_SOCKET_HOSTS, realtimeSocketUrl } from '../../../protocol/src/realtime'
import type { RealtimeProvider } from './connection'

export type RealtimeRoute = { transport: 'webrtc'; base: string } | { transport: 'websocket'; base: string; socket: string }

const host = (base: string) => /^https?:\/\/([^/:?#]+)/i.exec(base)?.[1]?.toLowerCase() ?? ''
/** Bailian's standard API address (a standard key): realtime over a WebSocket only */
export const standardBailian = (base: string) => REALTIME_SOCKET_HOSTS.includes(host(base))

/** the route a call takes, or null when this combination can't connect here (`socketHere`: the desktop app) */
export function realtimeRoute(provider: RealtimeProvider, base: string, model: string, socketHere: boolean): RealtimeRoute | null {
  if (!base || !model) return null
  if (provider === 'qwen' && standardBailian(base)) return socketHere ? { transport: 'websocket', base, socket: realtimeSocketUrl(host(base), model) } : null
  return { transport: 'webrtc', base }
}

/** what to change when a call couldn't connect (`status`: the service's answer; 0: none) */
export function realtimeFailure(provider: RealtimeProvider, status: number, detail = ''): string {
  if (status === 401 || status === 403) return tr('实时通话密钥无效（{0}）', status)
  if (status === 404 || /model not exist|model.*not found/i.test(detail)) return provider === 'qwen'
    ? tr('百炼找不到这个实时模型或地址')
    : tr('找不到这个实时模型（404）')
  if (status === 429) return tr('实时通话太忙或额度用完了（429），稍后再试')
  return status ? tr('实时通话连接失败（{0}）', status) : tr('实时通话连接失败，请检查网络后重新开始')
}
