import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ChatHistory } from '../src/chatHistory'
import { MemoryArchive, emptyArchive, type ArchiveData, type MemoryDatabase } from '../src/memory'

function database(): MemoryDatabase {
  let data: ArchiveData = emptyArchive()
  return { read: async () => structuredClone(data), update: async (change) => { const next = structuredClone(data); const result = change(next); data = next; return result } }
}

test('a deleted public session cannot fall back to private memories', async () => {
  const archive = new MemoryArchive(database()), history = new ChatHistory(archive)
  await archive.remember({ profileId: 'nana', scope: 'private', text: 'private-only secret' })
  const session = await history.open(['nana'], 'public', new AbortController().signal)
  await history.save([])
  await archive.deleteSession(session.id)
  await history.save([])
  await assert.rejects(history.context('nana', [], 'public'), /deleted or changed/)
})

test('a fast return to the current cast supersedes an older asynchronous open', async () => {
  const archive = new MemoryArchive(database()), history = new ChatHistory(archive)
  const signal = new AbortController().signal
  await history.open(['nana'], 'private', signal)
  const original = archive.latest.bind(archive)
  let release!: () => void
  archive.latest = async (ids, scope) => { await new Promise<void>((resolve) => { release = resolve }); return original(ids, scope) }
  const earlier = history.open(['kai'], 'private', signal)
  await history.open(['nana'], 'private', signal)
  release()
  await assert.rejects(earlier, /different conversation/)
  assert.deepEqual(history.current?.profileIds, ['nana'])
})
