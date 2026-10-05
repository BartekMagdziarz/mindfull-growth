import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { getTestDatabase } from '@/test/testDatabase'
import { UserDatabase } from '@/services/userDatabase.service'
import { companionConversation, weeklyConversation } from '../weeklyConversation'
import { companionConversationRepository } from '@/repositories/companionConversationRepository'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { journalDraftRepository } from '@/repositories/journalDraftRepository'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { blankProfileContent } from '@/domain/approvedProfile'
import { createHistoryTools } from '../../history/tools'
import { saveHistoryAccessPolicy } from '../../history/access'
import { originAvailable } from '../../profile/context'
import { proposeConversationProfile } from '../../profile/assistant'
import type { ModelResponse, ModelTransport } from '../openai'
const response = (data: unknown): ModelResponse => ({
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: JSON.stringify(data) }],
    },
  ],
  usage: { input: 100, output: 80, cached: 0, reasoning: 0 },
  model: 'gpt-6-luna',
  requestId: null,
})
const model = () =>
  vi
    .fn<ModelTransport>()
    .mockResolvedValue(response({ message: 'Co dało Ci satysfakcję?', topics: [], citations: [] }))
const run = (message = 'Porozmawiajmy', draft = 'Moje własne słowa') => ({
  mode: 'conversation' as const,
  message,
  draft,
  signal: new AbortController().signal,
})
const options = { locale: 'pl' as const, timeZone: 'Europe/Warsaw' }
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('companion surfaces', () => {
  it('keeps independent monthly/weekly conversations and selects only the matching profile scope', async () => {
    const repo = approvedProfileRepository()
    await repo.save({
      ...blankProfileContent(),
      text: 'Miesięczna perspektywa',
      scope: 'monthly-reflection',
    })
    await repo.save({
      ...blankProfileContent(),
      text: 'Preferencja tylko Dziennika',
      scope: 'journal',
    })
    const transport = model(),
      monthly = companionConversation('2026-09', {
        ...options,
        surface: 'monthly-reflection',
        transport,
      })
    await monthly.setEnabled(true)
    const row = await monthly.run(run())
    expect(row.id).toBe('monthly-reflection:2026-09')
    expect(transport.mock.calls[0][0].maxOutputTokens).toBe(8192)
    const payload = JSON.stringify(transport.mock.calls[0][0].input)
    expect(payload).toContain('Miesięczna perspektywa')
    expect(payload).not.toContain('Preferencja tylko Dziennika')
    expect(payload).toContain('never count them twice')
    expect(
      (await weeklyConversation('2026-W38', { ...options, transport }).load()).messages
    ).toEqual([])
    expect(
      (await companionConversation('2026-09', { ...options, surface: 'monthly-reflection' }).load())
        .messages
    ).toHaveLength(2)
  })
  it('supports a draft before first save, atomically binds it to the entry and preserves legacy sessions', async () => {
    const db = getTestDatabase(),
      drafts = journalDraftRepository(),
      transport = model()
    await drafts.save({
      id: 'draft-1',
      content: { body: 'Mój szkic' },
      updatedAt: new Date().toISOString(),
    })
    const client = companionConversation('2026-09-25', {
      ...options,
      surface: 'journal',
      conversationId: 'journal:draft-1',
      transport,
    })
    await client.setEnabled(true)
    await client.run(run('Mój temat', 'Mój szkic'))
    expect(await db.journalEntries.count()).toBe(0)
    const payload = JSON.stringify(transport.mock.calls[0][0].input)
    expect(payload).toContain('not a history restriction')
    expect(payload).toContain('Mój szkic')
    const entry = await journalDexieRepository.create({
      body: 'Mój zapisany tekst',
      companionConversationId: 'journal:draft-1',
      chatSessions: [],
    })
    expect(await drafts.load('draft-1')).toBeUndefined()
    const row = await client.load()
    expect(row.journalEntryId).toBe(entry.id)
    expect(row.messages).toHaveLength(2)
    expect(row.state).toBeUndefined()
    expect(entry.chatSessions).toEqual([])
    const reopened = companionConversation('2026-09-25', {
      ...options,
      surface: 'journal',
      conversationId: entry.companionConversationId,
      journalEntryId: entry.id,
      transport,
    })
    await reopened.run(run('Po zapisie', entry.body))
    expect((await reopened.load()).messages).toHaveLength(4)
    expect((await db.journalEntries.get(entry.id))?.body).toBe(entry.body)
  })
  it('revokes an in-flight draft response on save without losing the saved text', async () => {
    let started!: () => void, resolve!: (response: ModelResponse) => void
    const waiting = new Promise<void>(r => {
      started = r
    })
    const transport: ModelTransport = () => {
      started()
      return new Promise(r => {
        resolve = r
      })
    }
    const client = companionConversation('2026-09-25', {
      ...options,
      surface: 'journal',
      conversationId: 'journal:pending',
      transport,
    })
    await client.setEnabled(true)
    const pending = client.run(run())
    await waiting
    const entry = await journalDexieRepository.create({
      body: 'Tekst bez czekania na AI',
      companionConversationId: 'journal:pending',
    })
    resolve(response({ message: 'Spóźniona odpowiedź', topics: [], citations: [] }))
    await expect(pending).rejects.toThrow('conversation-changed')
    expect((await client.load()).messages).toHaveLength(0)
    expect((await getTestDatabase().journalEntries.get(entry.id))?.body).toBe(
      'Tekst bez czekania na AI'
    )
  })
  it('respects parent entry exclusions through history and profile proposal origins', async () => {
    const transport = model(),
      entry = await journalDexieRepository.create({ body: 'Własny wpis' })
    const client = companionConversation('2026-09-25', {
      ...options,
      surface: 'journal',
      conversationId: 'journal:entry',
      journalEntryId: entry.id,
      transport,
    })
    await client.setEnabled(true)
    const row = await client.run(run())
    const origin = {
      kind: 'conversation' as const,
      label: 'Dziennik',
      conversationId: row.id,
      messageIds: row.messages.map(m => m.id),
      citations: [],
    }
    expect(await originAvailable(origin)).toBe(true)
    await saveHistoryAccessPolicy({ excludedKinds: ['reflection'], excludedSources: [] })
    expect(await originAvailable(origin)).toBe(true)
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'journalEntries', id: entry.id }],
    })
    expect(await originAvailable(origin)).toBe(false)
    const source = (
      await createHistoryTools().readSources({
        requests: [{ ref: { collection: 'companionConversations', id: row.id } }],
      })
    ).items[0]
    expect(source.status).toBe('unavailable')
  })
  it('can propose a journal-specific profile preference from an explicitly spoken user quote', async () => {
    const quote = 'W Dzienniku wolę jedno pytanie naraz.'
    const client = companionConversation('2026-09-25', {
      ...options,
      surface: 'journal',
      conversationId: 'journal:profile',
      transport: model(),
    })
    await client.setEnabled(true)
    const row = await client.run(run(quote))
    await proposeConversationProfile(row.id, {
      transport: async () =>
        response({
          proposals: [
            {
              operation: 'add',
              targetId: null,
              targetVersion: null,
              category: 'preferences',
              scope: 'journal',
              text: quote,
              quote,
              reason: 'Oczekiwany sposób rozmowy',
              reviewAfter: null,
              validUntil: null,
            },
          ],
        }),
    })
    const state = await approvedProfileRepository().snapshot()
    expect(state.proposals).toHaveLength(1)
    expect(state.items).toEqual([])
    expect(state.proposals[0].origin.label).toContain('Dzienniku')
  })
  it('rejects invalid place IDs and keeps entries on the same day separate', async () => {
    expect(() =>
      companionConversationRepository('2026-09', { surface: 'weekly-reflection' })
    ).toThrow('invalid-input')
    expect(() =>
      companionConversationRepository('2026-09-25', {
        surface: 'journal',
        conversationId: 'weekly-reflection:2026-W38',
      })
    ).toThrow('invalid-input')
    const first = companionConversation('2026-09-25', {
      ...options,
      surface: 'journal',
      conversationId: 'journal:first',
      transport: model(),
    })
    await first.setEnabled(true)
    await first.run(run())
    expect(
      (
        await companionConversation('2026-09-25', {
          ...options,
          surface: 'journal',
          conversationId: 'journal:second',
        }).load()
      ).messages
    ).toEqual([])
  })
  it('upgrades v31 without losing weekly conversations or older journal chat sessions', async () => {
    const name = `e6-migration-${crypto.randomUUID()}`,
      template = new UserDatabase(name)
    const schema = Object.fromEntries(
      template.tables
        .filter(t => t.name !== 'journalDrafts')
        .map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(i => i.src)].join(',')])
    )
    template.close()
    const old = new Dexie(name)
    old.version(31).stores(schema)
    await old.open()
    await old.table('journalEntries').put({
      id: 'old',
      body: 'Zachowaj mnie',
      chatSessions: [{ id: 'session-old', messages: [] }],
    })
    await old
      .table('companionConversations')
      .put({ id: 'weekly-reflection:2026-W38', messages: [{ text: 'Wcześniejsza rozmowa' }] })
    old.close()
    const current = new UserDatabase(name)
    try {
      await current.open()
      expect(current.verno).toBe(34)
      expect((await current.journalEntries.get('old'))?.chatSessions?.[0].id).toBe('session-old')
      expect(
        (await current.companionConversations.get('weekly-reflection:2026-W38'))?.messages[0].text
      ).toBe('Wcześniejsza rozmowa')
      expect(await current.journalDrafts.count()).toBe(0)
    } finally {
      await current.delete()
    }
  })
})
