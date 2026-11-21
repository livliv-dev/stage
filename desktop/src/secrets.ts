// LivLiv Stage's API keys (the text model's, the speech API's, the realtime call's), kept encrypted by the system
// (Electron safeStorage: the Keychain on macOS, DPAPI on Windows) in one file of the app's own folder, never in the
// page's storage. The page reads them once as it starts and writes through ipc.ts; they leave this computer only in
// the requests to their own provider, and are never logged. Without system encryption (Linux with no keyring) there is
// no store: the page keeps its keys as before. A missing or unreadable file is an empty store. Plain Node: main.ts gives
// it safeStorage and the file system.

/** the settings whose key is kept here, by their name in the page's storage (stage/src/core/prefs.ts) */
export const KEYED = new Set(['livliv-stage:brain', 'livliv-stage:brain-api', 'livliv-stage:speech', 'livliv-stage:realtime'])
const MAX = 4096

export type Encryption = { isEncryptionAvailable(): boolean; encryptString(text: string): Buffer; decryptString(data: Buffer): string }
export type SecretsDeps = {
  encryption: Encryption
  /** the file's text, or null when there is none */
  read(): string | null
  /** the file written whole (atomically, readable by this user only) */
  write(text: string): void
}

export function secretsStore({ encryption, read, write }: SecretsDeps) {
  let values: Record<string, string> | null = null
  function load(): Record<string, string> {
    if (values) return values
    values = {}
    let saved: unknown = null
    try { saved = JSON.parse(read() ?? 'null') } catch { /* unreadable: an empty store, written anew on the next change */ }
    const stored = saved && typeof saved === 'object' && (saved as { values?: unknown }).values
    if (stored && typeof stored === 'object') {
      for (const [name, data] of Object.entries(stored as Record<string, unknown>)) {
        if (!KEYED.has(name) || typeof data !== 'string') continue
        try { values[name] = encryption.decryptString(Buffer.from(data, 'base64')) } catch { /* one that can't be read is dropped */ }
      }
    }
    return values
  }
  const save = () => {
    const out: Record<string, string> = {}
    for (const [name, value] of Object.entries(load())) out[name] = encryption.encryptString(value).toString('base64')
    write(JSON.stringify({ version: 1, values: out }))
  }
  return {
    /** the system can encrypt: the store is in use */
    available: () => encryption.isEncryptionAvailable(),
    /** every key kept, by setting; null without system encryption */
    all(): Record<string, string> | null {
      if (!encryption.isEncryptionAvailable()) return null
      return { ...load() }
    },
    /** a setting's key kept (an empty one removed); false when it can't be */
    set(name: unknown, value: unknown): boolean {
      if (!encryption.isEncryptionAvailable() || typeof name !== 'string' || !KEYED.has(name) || typeof value !== 'string' || value.length > MAX) return false
      const now = load()
      if ((now[name] ?? '') === value) return true
      if (value) now[name] = value
      else delete now[name]
      save()
      return true
    },
  }
}
export type SecretsStore = ReturnType<typeof secretsStore>
