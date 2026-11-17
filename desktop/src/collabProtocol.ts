export type CollabConfig = { port: number; network: boolean }
export type CollabError = 'port-in-use' | 'permission-denied' | 'start-failed'
export type CollabState = { enabled: boolean; port: number | null; network: boolean; localUrl: string | null; urls: string[]; error: CollabError | null }

export function readCollabConfig(raw: unknown): CollabConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  return typeof value.port === 'number' && Number.isInteger(value.port) && value.port >= 0 && value.port <= 65535 && typeof value.network === 'boolean'
    ? { port: value.port, network: value.network } : null
}
