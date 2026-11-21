// LivLiv Stage's API keys (the text model's, the speech API's, the realtime call's), kept encrypted by the system
// (Electron safeStorage: the Keychain on macOS, DPAPI on Windows) in one file of the app's own folder, never in the
// page's storage. The app opens the store before the editor loads; the page reads the keys once as it starts and
// saves them through ipc.ts. They leave this computer only in the requests to their own provider, and are never
// logged. Without system encryption (Linux with no keyring), or if it fails as the app starts, there is no store: the
// page keeps its keys as before. A missing or unreadable file is an empty store. Plain Node: main.ts gives it
// safeStorage and the file system.

/** the settings whose key is kept here, by their name in the page's storage (stage/src/core/prefs.ts) */
export const KEYED = new Set(['livliv-stage:brain', 'livliv-stage:brain-api', 'livliv-stage:speech', 'livliv-stage:realtime'])
const MAX = 4096

/** Electron's safeStorage, the asynchronous calls */
export type Encryption = {
  isAsyncEncryptionAvailable(): Promise<boolean>
  encryptStringAsync(text: string): Promise<Buffer>
  decryptStringAsync(data: Buffer): Promise<{ shouldReEncrypt: boolean; result: string }>
}
export type SecretsDeps = {
  encryption: Encryption
  /** the file's text, or null when there is none */
  read(): string | null
  /** the file written whole (atomically, readable by this user only) */
  write(text: string): void
}

export function secretsStore({ encryption, read, write }: SecretsDeps) {
  /** the keys, by setting; null until the store is open, and when it can't be */
  let values: Record<string, string> | null = null
  let saving: Promise<void> = Promise.resolve(), pending = 0
  /** written in the order saved, each time the whole store as it is then */
  const save = () => {
    const now = { ...values }
    pending++
    saving = saving.then(async () => {
      const out: Record<string, string> = {}
      for (const [name, value] of Object.entries(now)) out[name] = (await encryption.encryptStringAsync(value)).toString('base64')
      write(JSON.stringify({ version: 1, values: out }))
    }).catch((error: unknown) => console.error('[keys] not saved:', error instanceof Error ? error.name : 'error')).finally(() => { pending-- })
  }
  return {
    /** as the app starts, before the editor loads: whether the store is in use (system encryption works) */
    async open(): Promise<boolean> {
      try {
        if (!(await encryption.isAsyncEncryptionAvailable())) return false
        await encryption.encryptStringAsync('livliv')  // it can encrypt, so a key saved later is kept
      } catch { return false }
      const opened: Record<string, string> = {}
      let saved: unknown = null, renew = false
      try { saved = JSON.parse(read() ?? 'null') } catch { /* unreadable: an empty store, written anew on the next change */ }
      const stored = saved && typeof saved === 'object' && (saved as { values?: unknown }).values
      if (stored && typeof stored === 'object') {
        for (const [name, data] of Object.entries(stored as Record<string, unknown>)) {
          if (!KEYED.has(name) || typeof data !== 'string') continue
          try {
            const { result, shouldReEncrypt } = await encryption.decryptStringAsync(Buffer.from(data, 'base64'))
            opened[name] = result
            renew ||= shouldReEncrypt
          } catch { /* one that can't be read is dropped */ }
        }
      }
      values = opened
      if (renew) save()  // the system's key changed: written again with the new one
      return true
    },
    /** every key kept, by setting; null when there is no store */
    all(): Record<string, string> | null {
      return values ? { ...values } : null
    },
    /** a setting's key kept (an empty one removed); false when it can't be */
    set(name: unknown, value: unknown): boolean {
      if (!values || typeof name !== 'string' || !KEYED.has(name) || typeof value !== 'string' || value.length > MAX) return false
      if ((values[name] ?? '') === value) return true
      if (value) values[name] = value
      else delete values[name]
      save()
      return true
    },
    /** keys still being written (the app waits for them before it quits) */
    pending: () => pending > 0,
    /** done when every key saved so far is written */
    flush: () => saving,
  }
}
export type SecretsStore = ReturnType<typeof secretsStore>
