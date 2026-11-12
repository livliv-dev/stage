// Imported character packages and project images share one transactional browser store.
const DB = 'livliv-stage', STORE = 'packages', ASSETS = 'assets'
export type Kept = { key: string; name: string; at: number; format?: 'livliv' | 'vrm' | 'png'; livlivId?: string; sampleId?: string }
export type StoredAsset = { key: string; name: string; blob: Blob }
export type StoredModel = Kept & { files: [string, Blob][] }
let db: Promise<IDBDatabase> | null = null
function open(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 2)
    let blocked = false
    r.onupgradeneeded = () => {
      for (const store of [STORE, ASSETS]) if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store, { keyPath: 'key' })
    }
    r.onblocked = () => { blocked = true; reject(new Error('Close other Stage windows to update project storage')) }
    r.onsuccess = () => {
      if (blocked) { r.result.close(); return }
      r.result.onversionchange = () => { r.result.close(); db = null }
      resolve(r.result)
    }
    r.onerror = () => reject(r.error)
  })
  db.catch(() => { db = null })
  return db
}
async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>, name = STORE): Promise<T> {
  const d = await open()
  return new Promise((resolve, reject) => {
    const tx = d.transaction(name, mode), r = f(tx.objectStore(name))
    tx.oncomplete = () => resolve(r.result)
    tx.onabort = () => reject(tx.error ?? r.error ?? new Error('Project storage transaction was aborted'))
  })
}
export async function keep(k: Kept, files: Map<string, Blob>) {
  try { await run('readwrite', (s) => s.put({ ...k, files: [...files] })) } catch { /* The current session retains its model files. */ }
}
export async function kept(): Promise<Kept[]> {
  try {
    const all = await run<Kept[]>('readonly', (s) => s.getAll())
    return all.map(({ key, name, at, format, livlivId, sampleId }) => ({ key, name, at, format, livlivId, sampleId })).sort((a, b) => b.at - a.at)
  } catch { return [] }
}
export async function files(key: string): Promise<Map<string, Blob> | null> {
  try {
    const r = await run<{ files?: [string, Blob][] } | undefined>('readonly', (s) => s.get(key))
    return r?.files ? new Map(r.files) : null
  } catch { return null }
}
export async function forget(key: string) {
  try { await run('readwrite', (s) => s.delete(key)) } catch { /* Already absent from this session's library. */ }
}
export const putAsset = (asset: StoredAsset) => run('readwrite', (s) => s.put(asset), ASSETS)
export const getAsset = (key: string) => run<StoredAsset | undefined>('readonly', (s) => s.get(key), ASSETS)

/** Publish all referenced resources together, only after the complete project has been read. */
export async function importAssets(models: StoredModel[], assets: StoredAsset[], signal?: AbortSignal) {
  signal?.throwIfAborted()
  const d = await open()
  signal?.throwIfAborted()
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction([STORE, ASSETS], 'readwrite')
    for (const model of models) tx.objectStore(STORE).put(model)
    for (const asset of assets) tx.objectStore(ASSETS).put(asset)
    const abort = () => tx.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const clear = () => signal?.removeEventListener('abort', abort)
    tx.oncomplete = () => { clear(); resolve() }
    tx.onabort = () => { clear(); reject(signal?.aborted ? signal.reason : tx.error ?? new Error('Project storage transaction was aborted')) }
  })
}
