import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyArchive, MemoryArchive, type ArchiveData, type MemoryDatabase, type StoredSession } from '../src/memory'
import type { Line } from '../src/brain'

class TestDatabase implements MemoryDatabase {
  data = emptyArchive()
  failRead = false
  failWrite = false
  delay = 0
  async read() {
    if (this.failRead) throw new Error('Storage was denied')
    return structuredClone(this.data)
  }
  async update<T>(change: (data: ArchiveData) => T): Promise<T> {
    if (this.delay) await new Promise((resolve) => setTimeout(resolve, this.delay))
    if (this.failWrite) throw new Error('Quota exceeded')
    const draft = structuredClone(this.data), result = change(draft)
    this.data = draft
    return result
  }
}
const line = (id: string, text = 'I prefer quiet games'): Line => ({ id, who: 'me', name: 'You', text, emotion: 'neutral', action: 'none', to: null, human: true })
const session = (id = 'chat', revision = 1): StoredSession => ({ id, profileIds: ['nana'], scope: 'private', title: 'Games', updatedAt: 10, revision, lines: [line('user-1')] })

test('legacy archives with missing source positions do not keep an earlier indirect paraphrase', async () => {
  const database = new TestDatabase(), archive = new MemoryArchive(database)
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'My secret is orange', sourceSessionId: 'chat', sourceLineIds: ['deleted-source'] })
  database.data.sessions.chat = { ...session(), lines: [
    { ...line('indirect', 'You have an orange secret'), human: false },
    { ...line('direct', 'Your secret is orange'), human: false, memoryIds: [entry.id], memoryRevision: 0 },
  ] }
  await archive.forgetMemory(entry.id)
  assert.deepEqual((await archive.session('chat'))?.excludedLineIds, ['deleted-source', 'indirect', 'direct'])
})

for (const operation of ['edit', 'forget'] as const) test(`${operation} still excludes old paraphrases after the source line was deleted`, async () => {
  const archive = new MemoryArchive(new TestDatabase())
  const before = { ...line('before', 'What shall we talk about?'), human: false }
  const paraphrase = { ...line('paraphrase', 'Your secret is orange'), human: false, memoryIds: [], memoryRevision: 0 }
  await archive.saveSession({ ...session(), lines: [before, line('user-1', 'My secret is orange'), paraphrase] })
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'My secret is orange', sourceSessionId: 'chat', sourceLineIds: ['user-1'] })
  await archive.saveSession({ ...session('chat', 2), lines: [before, paraphrase] })
  if (operation === 'edit') await archive.editMemory(entry.id, { text: 'My secret is apple' })
  else await archive.forgetMemory(entry.id)
  const stored = (await archive.session('chat'))!
  assert.ok(stored.excludedLineIds?.includes('paraphrase'))
  assert.ok(!stored.excludedLineIds?.includes('before'))
  const late = { ...paraphrase, id: 'late-paraphrase' }
  const corrected = { ...paraphrase, id: 'corrected', text: 'We can discuss something new', memoryRevision: 1 }
  await archive.saveSession({ ...session('chat', 3), lines: [before, paraphrase, late, corrected] })
  const restored = (await archive.session('chat'))!
  assert.ok(restored.excludedLineIds?.includes('late-paraphrase'))
  assert.ok(!restored.excludedLineIds?.includes('corrected'))
})

test('saved sessions restore with the exact profile set and visibility, without sharing returned objects', async () => {
  const database = new TestDatabase(), first = new MemoryArchive(database)
  const shared = { ...session('shared'), profileIds: ['nana', 'kai'], updatedAt: 20 }
  await first.saveSession(shared)
  await first.saveSession(session())
  await first.saveSession({ ...session('live'), scope: 'public' })
  const reopened = new MemoryArchive(database)
  assert.equal((await reopened.latest(['kai', 'nana'], 'private'))?.id, 'shared')
  assert.equal((await reopened.latest(['nana'], 'private'))?.id, 'chat')
  assert.equal((await reopened.latest(['nana'], 'public'))?.id, 'live')
  assert.equal(await reopened.latest(['kai'], 'private'), null)
  const restored = (await reopened.latest(['nana'], 'private'))!
  restored.lines[0].text = 'Changed outside the archive'
  assert.equal((await reopened.session('chat'))?.lines[0].text, 'I prefer quiet games')
})

test('queued and late old snapshots never overwrite a later session revision', async () => {
  const database = new TestDatabase(), archive = new MemoryArchive(database)
  database.delay = 5
  const old = session('chat', 1), newer = { ...session('chat', 3), lines: [line('user-2', 'New preference')] }
  const first = archive.saveSession(old), second = archive.saveSession(newer)
  old.lines[0].text = 'Mutated after saving began'
  await Promise.all([first, second])
  await archive.saveSession({ ...session('chat', 2), lines: [] })
  assert.equal((await archive.session('chat'))?.revision, 3)
  assert.equal((await archive.session('chat'))?.lines[0].text, 'New preference')
})

test('deleting a session prevents a late autosave from resurrecting it', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  await archive.saveSession(session())
  await archive.deleteSession('chat')
  assert.equal(await archive.saveSession(session('chat', 100)), null)
  assert.equal(await archive.session('chat'), null)
})

test('public model context cannot retrieve private memories or another profile', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  await archive.remember({ profileId: 'nana', scope: 'private', text: 'Private birthday plans' })
  const publicMemory = await archive.remember({ profileId: 'nana', scope: 'public', text: 'Enjoys farming games' })
  await archive.remember({ profileId: 'kai', scope: 'public', text: 'Secretly switched profiles' })
  assert.equal((await archive.context(['nana'], 'private')).memories.length, 2)
  assert.deepEqual((await archive.context(['nana'], 'public')).memories.map((entry) => entry.id), [publicMemory.id])
})

test('a correction excludes its original source and invalidates recaps, including a late recap from an in-flight response', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'Prefers quiet games', sourceSessionId: 'chat', sourceLineIds: ['user-1'] })
  await archive.saveSession({ ...session(), summary: { text: 'Prefers quiet games', sourceIds: ['user-1'], memoryIds: [entry.id], memoryRevision: 0 } })
  const correction = await archive.editMemory(entry.id, { text: 'Now prefers action games' })
  assert.equal(correction.text, 'Now prefers action games')
  const changed = (await archive.session('chat'))!
  assert.equal(changed.summary, undefined)
  assert.deepEqual(changed.excludedLineIds, ['user-1'])
  const current = await archive.context(['nana'], 'private')
  assert.equal(current.revision, 1)
  assert.equal(current.memories[0].text, 'Now prefers action games')
  // This differently worded recap began before the correction; checking its text alone cannot detect it.
  await archive.saveSession({ ...changed, revision: 2, summary: { text: 'The user likes calm gameplay', sourceIds: [], memoryIds: [entry.id], memoryRevision: 0 } })
  assert.equal((await archive.session('chat'))?.summary, undefined)
  await archive.saveSession({ ...changed, revision: 3, summary: { text: 'A new discussion', sourceIds: [], memoryRevision: current.revision } })
  assert.equal((await archive.session('chat'))?.summary?.text, 'A new discussion')
})

test('forgetting a memory keeps the transcript available but excludes its old source from model context', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  await archive.saveSession(session())
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'Quiet games', sourceSessionId: 'chat', sourceLineIds: ['user-1'] })
  await archive.forgetMemory(entry.id)
  assert.deepEqual((await archive.context(['nana'], 'private')).memories, [])
  assert.deepEqual((await archive.context(['nana'], 'private')).exclusions, [{ sessionId: 'chat', lineIds: ['user-1'] }])
  assert.equal((await archive.session('chat'))?.lines.length, 1)
  await archive.saveSession({ ...session('chat', 2), excludedLineIds: [], summary: { text: 'Quiet games again', sourceIds: ['user-1'], memoryRevision: 1 } })
  assert.equal((await archive.session('chat'))?.summary, undefined)
  assert.deepEqual((await archive.session('chat'))?.excludedLineIds, ['user-1'])
})

test('forgetting a source excludes its existing AI paraphrases without removing later human messages or the visible transcript', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  const before = { ...line('assistant-before', 'What games do you enjoy?'), human: false }
  const paraphrase = { ...line('assistant-after', 'You prefer quiet farming games.'), human: false }
  const nextHuman = line('user-2', 'Let us discuss the soundtrack.')
  await archive.saveSession({ ...session(), lines: [before, line('user-1'), paraphrase, nextHuman] })
  const remembered = await archive.remember({ profileId: 'nana', scope: 'private', text: 'Quiet games', sourceSessionId: 'chat', sourceLineIds: ['user-1'] })
  await archive.forgetMemory(remembered.id)
  const stored = (await archive.session('chat'))!
  assert.deepEqual(stored.excludedLineIds, ['user-1', 'assistant-after'])
  assert.deepEqual(stored.lines.map((entry) => entry.id), ['assistant-before', 'user-1', 'assistant-after', 'user-2'])
  const excluded = (await archive.context(['nana'], 'private')).exclusions.flatMap((entry) => entry.lineIds)
  assert.deepEqual(stored.lines.filter((entry) => !excluded.includes(entry.id)).map((entry) => entry.id), ['assistant-before', 'user-2'])
})

test('a correction excludes remembered AI facts across sessions and rejects late old derivations while preserving new corrected replies', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'Prefers quiet games', sourceSessionId: 'chat', sourceLineIds: ['user-1'] })
  await archive.saveSession(session())
  const derived = { ...line('assistant-memory', 'You like quiet games'), human: false, memoryIds: [entry.id], memoryRevision: 0 }
  await archive.saveSession({ ...session('next-chat'), lines: [line('other-user', 'Any recommendations?'), derived] })
  await archive.editMemory(entry.id, { text: 'Now prefers action games' })
  assert.deepEqual((await archive.session('next-chat'))?.excludedLineIds, ['assistant-memory'])
  const late = { ...line('assistant-late', 'Quiet games are your favorite'), human: false, memoryIds: [entry.id], memoryRevision: 0 }
  const corrected = { ...line('assistant-corrected', 'You now prefer action games'), human: false, memoryIds: [entry.id], memoryRevision: 1 }
  // This old autosave did not know about the exclusions and contains a response received after the edit.
  await archive.saveSession({ ...session('next-chat', 2), excludedLineIds: [], lines: [derived, late, corrected] })
  const saved = (await archive.session('next-chat'))!
  assert.deepEqual(saved.excludedLineIds, ['assistant-memory', 'assistant-late'])
  assert.ok(!saved.excludedLineIds?.includes('assistant-corrected'))
  assert.equal((await archive.context(['nana'], 'private')).memories[0].text, 'Now prefers action games')
})

test('a deleted memory also excludes late derived lines saved by another archive instance', async () => {
  const database = new TestDatabase(), archive = new MemoryArchive(database)
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'An outdated fact' })
  const other = new MemoryArchive(database)
  await archive.forgetMemory(entry.id)
  await other.saveSession({ ...session('late-session'), lines: [
    { ...line('late-answer', 'An outdated fact'), human: false, memoryIds: [entry.id], memoryRevision: 0 },
    { ...line('late-repeat', 'Another character repeats the outdated fact'), human: false, memoryIds: [], memoryRevision: 0 },
  ] })
  assert.deepEqual((await other.session('late-session'))?.excludedLineIds, ['late-answer', 'late-repeat'])
})

for (const operation of ['edit', 'forget'] as const) test(`${operation} excludes a shared conversation's indirect AI paraphrases and late old continuations`, async () => {
  const archive = new MemoryArchive(new TestDatabase())
  await archive.saveSession(session('source-chat'))
  const entry = await archive.remember({ profileId: 'nana', scope: 'private', text: 'Prefers quiet games', sourceSessionId: 'source-chat', sourceLineIds: ['user-1'] })
  const direct: Line = { ...line('nana-direct', 'You enjoy quiet farming games'), who: 'nana', name: 'Nana', human: false, memoryIds: [entry.id], memoryRevision: 0 }
  const indirect: Line = { ...line('kai-paraphrase', 'Let us pick something calm for you'), who: 'kai', name: 'Kai', human: false, memoryIds: [], memoryRevision: 0 }
  const human = line('new-human', 'Let us discuss music instead')
  const group: StoredSession = { ...session('group-chat'), profileIds: ['nana', 'kai'], lines: [direct, indirect, human] }
  await archive.saveSession(group)
  if (operation === 'edit') await archive.editMemory(entry.id, { text: 'Now prefers action games' })
  else await archive.forgetMemory(entry.id)
  const changed = (await archive.session('group-chat'))!
  assert.deepEqual(changed.excludedLineIds, ['nana-direct', 'kai-paraphrase'])
  const exclusions = (await archive.context(['kai'], 'private')).exclusions.find((item) => item.sessionId === 'group-chat')!.lineIds
  assert.deepEqual(changed.lines.filter((item) => !exclusions.includes(item.id)).map((item) => item.id), ['new-human'])
  // This stale renderer never saw either the exclusion list or its continuation cutoff.
  const late: Line = { ...line('kai-late', 'The calm game suits your preference'), who: 'kai', name: 'Kai', human: false, memoryIds: [], memoryRevision: 0 }
  const fresh: Line = { ...line('kai-fresh', 'Let us talk about the music'), who: 'kai', name: 'Kai', human: false, memoryIds: [], memoryRevision: 1 }
  await archive.saveSession({ ...group, revision: 2, excludedLineIds: [], lines: [direct, indirect, human, fresh, late], summary: { text: 'Calm games suit you', sourceIds: ['kai-paraphrase'], memoryRevision: 1 } })
  const saved = (await archive.session('group-chat'))!
  assert.deepEqual(saved.excludedLineIds, ['nana-direct', 'kai-paraphrase', 'kai-late'])
  assert.equal(saved.summary, undefined)
  assert.ok(!saved.excludedLineIds?.includes('new-human'))
  assert.ok(!saved.excludedLineIds?.includes('kai-fresh'))
})

test('disabling memory empties model context without deleting manageable entries and invalidates derived summaries', async () => {
  const archive = new MemoryArchive(new TestDatabase())
  await archive.remember({ profileId: 'nana', scope: 'public', text: 'Enjoys games' })
  await archive.saveSession({ ...session(), summary: { text: 'Enjoys games', sourceIds: [] } })
  await archive.setEnabled(false)
  assert.equal((await archive.context(['nana'], 'private')).enabled, false)
  assert.deepEqual((await archive.context(['nana'], 'private')).memories, [])
  assert.equal((await archive.listMemories(['nana'], 'private')).length, 1)
  assert.equal((await archive.session('chat'))?.summary, undefined)
  await archive.setEnabled(true)
  assert.equal((await archive.context(['nana'], 'public')).memories.length, 1)
})

test('storage failures remain failures and do not poison a later retry', async () => {
  const database = new TestDatabase(), archive = new MemoryArchive(database)
  database.failWrite = true
  await assert.rejects(archive.saveSession(session()), /Quota exceeded/)
  database.failWrite = false
  await archive.saveSession(session())
  database.failRead = true
  await assert.rejects(archive.latest(['nana'], 'private'), /Storage was denied/)
  database.failRead = false
  assert.equal((await archive.latest(['nana'], 'private'))?.id, 'chat')
})

test('invalid stored data is reported rather than silently returned as an empty archive', async () => {
  const database = new TestDatabase(), archive = new MemoryArchive(database)
  database.data.sessions.chat = { ...session(), scope: 'unknown' } as unknown as StoredSession
  await assert.rejects(archive.latest(['nana'], 'private'), /invalid/)
})


test('model context orders memories by update time before a provider applies its limit', async () => {
  const database = new TestDatabase(), archive = new MemoryArchive(database), ids: string[] = []
  for (let i = 1; i <= 4; i++) {
    const entry = await archive.remember({ profileId: 'nana', scope: 'public', text: 'Fact ' + i })
    ids.push(entry.id); database.data.memories[entry.id].updatedAt = i
  }
  assert.deepEqual((await archive.context(['nana'], 'public')).memories.slice(0, 3).map((entry) => entry.text), ['Fact 4', 'Fact 3', 'Fact 2'])
  database.data.memories[ids[0]].updatedAt = 5
  assert.equal((await archive.context(['nana'], 'public')).memories[0].text, 'Fact 1', 'a corrected older memory is current context')
})
