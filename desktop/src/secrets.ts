// LivLiv Stage's API keys (the text model's, the speech API's, the realtime call's) and its livliv.ai sign-in, kept
// encrypted by the system (Electron safeStorage: the Keychain on macOS, DPAPI on Windows, a keyring on Linux) in one
// file of the app's own folder, not in the page's storage. The app opens the store before the editor loads; the page
// reads the keys once as it starts and saves them through ipc.ts, and a save is confirmed only once the file is
// written (the page removes its own copy only then). They leave this computer only in the requests to their own
// provider, and are never logged. Without system encryption (Linux with no keyring, where Electron would only obscure
// them with a fixed password), or if it fails as the app starts, there is no store: the page keeps its keys as before.
// A missing or unreadable file is an empty store; a key that can't be decrypted any more is reported, so the page asks
// for it again. Plain Node: main.ts gives it safeStorage and the file system.

/** the settings whose key is kept here, and the sign-in kept whole, by their names in the page's storage
 *  (stage/src/core/prefs.ts) */
export const KEYED = new Set(['livliv-stage:brain', 'livliv-stage:brain-api', 'livliv-stage:speech', 'livliv-stage:realtime', 'livliv-stage:session'])
const MAX = 4096

/** Electron's safeStorage, the asynchronous calls (and, on Linux, which password store it found) */
export type Encryption = {
  isAsyncEncryptionAvailable(): Promise<boolean>
  encryptStringAsync(text: string): Promise<Buffer>
  decryptStringAsync(data: Buffer): Promise<{ shouldReEncrypt: boolean; result: string }>
  getSelectedStorageBackend?(): string
}
export type SecretsDeps = {
  encryption: Encryption
  platform: string
  /** the file's text, or null when there is none */
  read(): string | null
  /** the file written whole (atomically, readable by this user only) */
  write(text: string): void
}

export function secretsStore({ encryption, platform, read, write }: SecretsDeps) {
  /** the keys, by setting; null until the store is open, and when it can't be */
  let values: Record<string, string> | null = null
  /** as the file last written holds them; the keys that couldn't be decrypted as it opened */
  let written: Record<string, string> = {}, lost: string[] = []
  let saving: Promise<void> = Promise.resolve(), pending = 0
  /** written in the order saved, each time the whole store as it is then: true once it is on disk */
  const save = (): Promise<boolean> => {
    const now = { ...values }
    pending++
    const done = saving.then(async () => {
      const out: Record<string, string> = {}
      for (const [name, value] of Object.entries(now)) out[name] = (await encryption.encryptStringAsync(value)).toString('base64')
      write(JSON.stringify({ version: 1, values: out }))
      written = now
      return true
    }).catch((error: unknown) => { console.error('[keys] not saved:', error instanceof Error ? error.name : 'error'); return false }).finally(() => { pending-- })
    saving = done.then(() => undefined)
    return done
  }
  return {
    /** as the app starts, before the editor loads: whether the store is in use (system encryption works) */
    async open(): Promise<boolean> {
      try {
        // Linux without a keyring: Electron would only obscure the keys with a password every copy of it knows
        if (platform === 'linux' && encryption.getSelectedStorageBackend?.() === 'basic_text') return false
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
          } catch { lost.push(name) }  // the system's keychain changed: the page asks for it again
        }
      }
      values = opened; written = { ...opened }
      if (renew) void save()  // the system's key changed: written again with the new one
      return true
    },
    /** every key kept, by setting, and those that couldn't be decrypted; null when there is no store */
    all(): { keys: Record<string, string>; lost: string[] } | null {
      return values ? { keys: { ...values }, lost: [...lost] } : null
    },
    /** a setting's key kept (an empty one removed): true once it is written to the file, false when it can't be */
    async set(name: unknown, value: unknown): Promise<boolean> {
      if (!values || typeof name !== 'string' || !KEYED.has(name) || typeof value !== 'string' || value.length > MAX) return false
      lost = lost.filter((n) => n !== name)
      if ((values[name] ?? '') === value && (written[name] ?? '') === value) return true
      if (value) values[name] = value
      else delete values[name]
      return save()
    },
    /** keys still being written (the app waits for them before it quits) */
    pending: () => pending > 0,
    /** done when every key saved so far is written */
    flush: () => saving,
  }
}
export type SecretsStore = ReturnType<typeof secretsStore>
