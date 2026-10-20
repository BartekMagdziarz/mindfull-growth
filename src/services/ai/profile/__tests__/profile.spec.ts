import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { getTestDatabase, connectTestDatabase } from '@/test/testDatabase'
import {
  UserDatabase,
  connectUserDatabase,
  disconnectUserDatabase,
} from '@/services/userDatabase.service'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { blankProfileContent } from '@/domain/approvedProfile'
import { createEmptySections, type UserProfile } from '@/domain/userProfile'
import { approvedProfileContext } from '../context'
import { proposeLegacyProfile } from '../legacy'
import { discussProfileProposal, proposeConversationProfile } from '../assistant'
import { weeklyConversation } from '../../companion/weeklyConversation'
import type { ModelResponse, ModelTransport } from '../../companion/openai'
import { saveHistoryAccessPolicy } from '../../history/access'
import { createHistoryTools } from '../../history/tools'

const content = (text = 'Cenię czas z bliskimi.') => ({ ...blankProfileContent(), text })
const origin = { kind: 'user' as const, label: 'Użytkownik', citations: [] }
const proposal = (key = 'test') => ({
  dedupeKey: key,
  operation: 'add' as const,
  targetId: null,
  targetVersion: null,
  content: content(),
  origin,
  reason: 'Do sprawdzenia',
})
const response = (data: unknown): ModelResponse => ({
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: JSON.stringify(data) }],
    },
  ],
  usage: { input: 100, output: 100, cached: 0, reasoning: 0 },
  model: 'gpt-6-luna',
  requestId: null,
})
const oldProfile = (): UserProfile => ({
  id: 'old',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  sections: { ...createEmptySections(), strengths: 'Łatwo nawiązuję relacje.' },
  scope: {
    dataTypes: [],
    dateRange: { kind: 'preset', preset: 'last90' },
    includedObjectIds: {},
    approxTokenCount: 0,
    locale: 'pl',
    grammaticalGender: 'feminine',
  },
  rawResponse: 'legacy raw',
  model: 'legacy',
})
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('approved profile', () => {
  it('never reuses a repository or context across accounts', async () => {
    const repo = approvedProfileRepository()
    await repo.save(content('Tylko na pierwszym koncie'))
    const context = await approvedProfileContext()
    const other = await connectUserDatabase(`e4-account-${crypto.randomUUID()}`)
    try {
      await expect(repo.save(content())).rejects.toThrow('session-changed')
      await expect(context.assertCurrent()).rejects.toThrow('session-changed')
      expect((await approvedProfileContext()).items).toEqual([])
      expect(await other.approvedProfileItems.count()).toBe(0)
    } finally {
      await disconnectUserDatabase()
      await other.delete()
      await connectTestDatabase()
    }
  })
  it('does not reintroduce a changed, deleted or excluded source through an accepted item', async () => {
    const db = getTestDatabase(),
      repo = approvedProfileRepository()
    const entry = {
      id: 'journal-evidence',
      body: 'Spacer z przyjaciółką pomógł mi odpocząć.',
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
    }
    await db.journalEntries.put(entry)
    const ref = { collection: 'journalEntries' as const, id: entry.id }
    const source = (await createHistoryTools().readSources({ requests: [{ ref }] })).items[0]
    if (source.status !== 'ok') throw new Error('Missing test source')
    const p = await repo.propose({
      ...proposal(),
      origin: { ...origin, citations: [{ ref, version: source.version }] },
    })
    await repo.decide(p.id, p.version, true)
    expect((await approvedProfileContext()).items).toHaveLength(1)
    await saveHistoryAccessPolicy({ excludedKinds: [], excludedSources: [ref] })
    expect((await approvedProfileContext()).items).toEqual([])
    await saveHistoryAccessPolicy({ excludedKinds: [], excludedSources: [] })
    expect((await approvedProfileContext()).items).toHaveLength(1)
    await db.journalEntries.update(entry.id, { body: 'Zmieniony zapis' })
    expect((await approvedProfileContext()).items).toEqual([])
    await db.journalEntries.delete(entry.id)
    expect((await approvedProfileContext()).items).toEqual([])
    expect((await repo.snapshot()).items).toHaveLength(1)
  })
  it('keeps proposals out of context, accepts atomically and records history', async () => {
    const repo = approvedProfileRepository(),
      p = await repo.propose(proposal())
    expect((await approvedProfileContext()).items).toEqual([])
    await repo.decide(p.id, p.version, true)
    const snapshot = await repo.snapshot()
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.proposals[0].status).toBe('accepted')
    expect(snapshot.changes[0].after).toEqual(snapshot.items[0])
    expect((await approvedProfileContext()).items[0].text).toBe(content().text)
    await expect(repo.decide(p.id, p.version, true)).rejects.toThrow('proposal-conflict')
    expect((await repo.snapshot()).items).toHaveLength(1)
  })
  it('deduplicates technical retries and rejection never changes the profile', async () => {
    const repo = approvedProfileRepository()
    const [a, b] = await Promise.all([repo.propose(proposal()), repo.propose(proposal())])
    expect(a.id).toBe(b.id)
    await repo.decide(a.id, a.version, false)
    expect((await repo.snapshot()).items).toEqual([])
    expect((await repo.snapshot()).changes).toEqual([])
    expect((await repo.propose(proposal())).status).toBe('rejected')
  })
  it('requires explicit comparison after another tab edits the target', async () => {
    const repo = approvedProfileRepository(),
      item = await repo.save(content())
    const p = await repo.propose({
      ...proposal(),
      operation: 'update',
      targetId: item.id,
      targetVersion: item.version,
      content: content('Inna propozycja'),
    })
    const edited = await repo.save(content('Moja własna poprawka'), item.id, item.version)
    await expect(repo.decide(p.id, p.version, true)).rejects.toThrow('profile-conflict')
    expect((await repo.snapshot()).proposals[0].status).toBe('pending')
    expect((await repo.snapshot()).items[0].text).toBe('Moja własna poprawka')
    const revised = await repo.revise(p.id, p.version, content('Po porównaniu'), edited.version)
    await repo.decide(revised.id, revised.version, true)
    expect((await repo.snapshot()).items[0].text).toBe('Po porównaniu')
  })
  it('separates review dates, expiry, scope and ended status without declaring facts false', async () => {
    const repo = approvedProfileRepository()
    const due = await repo.save({ ...content('Do sprawdzenia'), reviewAfter: '2000-01-01' })
    await repo.save({ ...content('Dawny kontekst'), validUntil: '2000-01-01' })
    await repo.save({
      ...content('Proszę o konkretne pytania'),
      category: 'preferences',
      scope: 'weekly-reflection',
    })
    expect((await approvedProfileContext()).items.map(i => i.text)).toEqual(['Do sprawdzenia'])
    expect((await approvedProfileContext('weekly-reflection')).items).toHaveLength(2)
    await repo.save(content('Do sprawdzenia'), due.id, due.version, 'ended')
    expect((await approvedProfileContext()).items).toEqual([])
    expect((await repo.snapshot()).items).toHaveLength(3)
  })
  it('invalidates captured context after an approved edit, but not after a pending proposal', async () => {
    const repo = approvedProfileRepository(),
      initial = await approvedProfileContext()
    await repo.propose(proposal())
    await initial.assertCurrent()
    await repo.save(content())
    await expect(initial.assertCurrent()).rejects.toThrow('profile-changed')
  })
  it('preserves legacy profiles and imports only reviewable candidates', async () => {
    const old = oldProfile()
    await getTestDatabase().userProfiles.put(old)
    await proposeLegacyProfile(old.id)
    await proposeLegacyProfile(old.id)
    expect(await getTestDatabase().userProfiles.get(old.id)).toEqual(old)
    expect((await approvedProfileContext()).items).toEqual([])
    const repo = approvedProfileRepository(),
      p = (await repo.snapshot()).proposals[0]
    expect(p.origin.kind).toBe('legacy')
    expect((await repo.snapshot()).proposals).toHaveLength(1)
    await repo.decide(p.id, p.version, true)
    expect((await approvedProfileContext()).items).toHaveLength(1)
    await saveHistoryAccessPolicy({ excludedKinds: ['journal'], excludedSources: [] })
    expect((await approvedProfileContext()).items).toEqual([])
  })
  it('migrates a version 29 database with legacy profiles and conversations without approving them', async () => {
    const name = `e4-migration-${crypto.randomUUID()}`,
      candidate = new UserDatabase(name)
    const added = [
      'approvedProfileItems',
      'profileProposals',
      'profileChanges',
      'profileTasks',
      'companionIntroductions',
      'historyDigests',
      'journalDrafts',
    ]
    const schema = Object.fromEntries(
      candidate.tables
        .filter(t => !added.includes(t.name))
        .map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(i => i.src)].join(', ')])
    )
    candidate.close()
    const old = new Dexie(name)
    old.version(29).stores(schema)
    await old.table('userProfiles').put(oldProfile())
    await old
      .table('companionConversations')
      .put({ id: 'retained', messages: [{ role: 'user', text: 'Nie zmieniaj mnie' }] })
    old.close()
    const upgraded = new UserDatabase(name)
    try {
      await upgraded.open()
      expect(upgraded.verno).toBe(34)
      expect(await upgraded.userProfiles.get('old')).toEqual(oldProfile())
      expect((await upgraded.companionConversations.get('retained'))?.messages[0].text).toBe(
        'Nie zmieniaj mnie'
      )
      expect(await upgraded.approvedProfileItems.count()).toBe(0)
      expect(await upgraded.profileProposals.count()).toBe(0)
    } finally {
      await upgraded.delete()
    }
  })
})
describe('proposal AI workflow', () => {
  it('enforces the shared daily budget before a paid call', async () => {
    const repo = approvedProfileRepository(),
      p = await repo.propose(proposal())
    await repo.db.profileTasks.put({
      id: `${new Date().toISOString().slice(0, 10)}:earlier`,
      status: 'failed',
      token: 'old',
      expiresAt: 0,
      spentUsd: 0.5,
    })
    const transport = vi.fn<ModelTransport>()
    await expect(discussProfileProposal(p, 'Omówmy to', { transport })).rejects.toThrow(
      'cost-limit'
    )
    expect(transport).not.toHaveBeenCalled()
  })
  const quote = 'Wolę małe kroki niż ambitne plany.'
  const candidate = {
    operation: 'add',
    targetId: null,
    targetVersion: null,
    category: 'preferences',
    scope: 'general',
    text: quote,
    quote,
    reason: 'Użytkownik wskazał preferowany sposób wsparcia.',
    reviewAfter: null,
    validUntil: null,
  }
  async function conversation() {
    const client = weeklyConversation('2026-W38', {
      locale: 'pl',
      timeZone: 'Europe/Warsaw',
      transport: async () =>
        response({ message: 'Jaki mały krok wybierasz?', topics: [], citations: [] }),
    })
    await client.setEnabled(true)
    return client.run({
      mode: 'conversation',
      message: quote,
      draft: '',
      signal: new AbortController().signal,
    })
  }
  it('extracts bounded proposals from user words without accepting, and skips a repeated task', async () => {
    const row = await conversation(),
      transport = vi.fn<ModelTransport>().mockResolvedValue(response({ proposals: [candidate] }))
    await proposeConversationProfile(row.id, { transport })
    await proposeConversationProfile(row.id, { transport })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0][0].toolsEnabled).toBe(false)
    const repo = approvedProfileRepository(),
      state = await repo.snapshot()
    expect(state.items).toEqual([])
    expect(state.proposals).toHaveLength(1)
    expect(state.proposals[0].origin.quote).toBe(quote)
    await repo.decide(state.proposals[0].id, 1, true)
    expect((await approvedProfileContext()).items).toHaveLength(1)
    await saveHistoryAccessPolicy({ excludedKinds: ['conversation'], excludedSources: [] })
    expect((await approvedProfileContext()).items).toEqual([])
  })
  it('rejects fabricated user quotes and commits no part of an invalid batch', async () => {
    const row = await conversation()
    await expect(
      proposeConversationProfile(row.id, {
        transport: async () =>
          response({
            proposals: [candidate, { ...candidate, quote: 'Nigdy tak nie powiedziałem' }],
          }),
      })
    ).rejects.toThrow()
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
  })
  it('allows optional discussion without changing or accepting the proposed text', async () => {
    const repo = approvedProfileRepository(),
      p = await repo.propose(proposal())
    await discussProfileProposal(p, 'Czy możemy to ująć ostrożniej?', {
      transport: async () =>
        response({ message: 'Możesz opisać to jako obecną preferencję. Czy to pasuje?' }),
    })
    const result = (await repo.snapshot()).proposals[0]
    expect(result.status).toBe('pending')
    expect(result.content).toEqual(p.content)
    expect(result.discussion.map(m => m.role)).toEqual(['user', 'assistant'])
    expect((await repo.snapshot()).items).toEqual([])
  })
  it('discards discussion responses after concurrent rejection', async () => {
    const repo = approvedProfileRepository(),
      p = await repo.propose(proposal())
    await expect(
      discussProfileProposal(p, 'Czy to pasuje?', {
        transport: async () => {
          await repo.decide(p.id, p.version, false)
          return response({ message: 'Sprawdźmy.' })
        },
      })
    ).rejects.toThrow('proposal-conflict')
    expect((await repo.snapshot()).proposals[0].discussion).toEqual([])
  })
  it('does not commit cancelled results and retains a bounded spending record', async () => {
    const row = await conversation(),
      abort = new AbortController()
    await expect(
      proposeConversationProfile(row.id, {
        signal: abort.signal,
        transport: async () => {
          abort.abort()
          return response({ proposals: [candidate] })
        },
      })
    ).rejects.toThrow('cancelled')
    expect((await approvedProfileRepository().snapshot()).proposals).toEqual([])
    expect((await getTestDatabase().profileTasks.toArray())[0].spentUsd).toBeGreaterThan(0)
  })
  it('stops a second concurrent request before a second paid call', async () => {
    const repo = approvedProfileRepository(),
      p = await repo.propose(proposal())
    let release!: (data: ModelResponse) => void
    const transport = vi.fn<ModelTransport>(
      () =>
        new Promise(resolve => {
          release = resolve
        })
    )
    const first = discussProfileProposal(p, 'Pierwsze pytanie', { transport })
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    await expect(discussProfileProposal(p, 'Drugie pytanie', { transport })).rejects.toThrow(
      'task-busy'
    )
    release(response({ message: 'Sprawdźmy to.' }))
    await first
    expect(transport).toHaveBeenCalledTimes(1)
  })
})
