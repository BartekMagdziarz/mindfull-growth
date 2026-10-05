import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { blankProfileContent } from '@/domain/approvedProfile'
import { getPeriodRefsForDate } from '@/utils/periods'
import { normalizeWeeklyReflectionPayload } from '@/domain/reflection'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/test/testDatabase'
import { createHistoryTools } from '../tools'
import { saveHistoryAccessPolicy } from '../access'
import { introductionService } from '../../introduction/service'
const asOf = '2026-09-28T12:00:00Z'
const api = () => createHistoryTools({ asOf, locale: 'pl', timeZone: 'Europe/Warsaw' })
const ref = { collection: 'journalEntries' as const, id: 'journal' }
const entry = {
  id: ref.id,
  body: 'Nie zamierzam ćwiczyć codziennie. Spacer z bliską osobą dobrze mi zrobił.',
  createdAt: '2026-09-22T12:00:00Z',
  updatedAt: '2026-09-22T12:00:00Z',
}
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('source-linked history guides', () => {
  it('preserves whole negations, links original versions, reuses cache and invalidates edits/deletions', async () => {
    const db = getTestDatabase()
    await db.journalEntries.put(entry)
    const first = (await api().getHistoryGuide({ weeks: ['2026-W38'] })).items[0]
    if (first.status !== 'ok') throw new Error('Expected digest')
    expect(first.digest.fragments.some(f => f.text === entry.body)).toBe(true)
    expect(first.digest.fragments.every(f => f.version && f.ref.id === ref.id)).toBe(true)
    expect((await api().getHistoryGuide({ weeks: ['2026-W38'] })).items[0]).toEqual(first)
    expect(await db.profileTasks.count()).toBe(0)
    await db.journalEntries.update(ref.id, { body: 'Teraz wolę odpoczywać w samotności.' })
    const changed = (await api().getHistoryGuide({ weeks: ['2026-W38'] })).items[0]
    expect(JSON.stringify(changed)).not.toContain(entry.body)
    expect(changed.status === 'ok' && changed.digest.signature).not.toBe(first.digest.signature)
    await db.journalEntries.delete(ref.id)
    expect((await api().getHistoryGuide({ weeks: ['2026-W38'] })).items[0].status).toBe(
      'unavailable'
    )
  })
  it('never serves excluded material from a populated cache', async () => {
    await getTestDatabase().journalEntries.put(entry)
    await api().getHistoryGuide({ weeks: ['2026-W38'] })
    await saveHistoryAccessPolicy({ excludedKinds: [], excludedSources: [ref] })
    const result = await api().getHistoryGuide({ weeks: ['2026-W38'] })
    expect(result.items[0].status).toBe('unavailable')
    expect(JSON.stringify(result)).not.toContain(entry.body)
  })
  it('distinguishes assistant suggestions from user commitments and invalidates cited source changes', async () => {
    const db = getTestDatabase()
    await db.journalEntries.put(entry)
    const original = (await api().readSources({ requests: [{ ref }] })).items[0]
    if (original.status !== 'ok') throw new Error('Expected source')
    const conversation = { collection: 'companionConversations' as const, id: 'chat' }
    await db.companionConversations.put({
      id: 'chat',
      periodRef: '2026-W38',
      surface: 'weekly-reflection',
      revision: 0,
      enabled: true,
      topics: [],
      topicsInitialized: false,
      topicNotice: '',
      spentUsd: 0,
      updatedAt: '2026-09-27T10:00:00Z',
      messages: [
        {
          id: 'a',
          role: 'assistant',
          text: 'Możesz rozważyć codzienne ćwiczenia.',
          citations: [{ ref, version: original.version }],
          createdAt: '2026-09-27T10:00:00Z',
        },
        {
          id: 'u',
          role: 'user',
          text: 'Nie chcę codziennych ćwiczeń, wolę spacery.',
          citations: [],
          createdAt: '2026-09-27T10:00:00Z',
        },
      ],
    })
    const result = (await api().getHistoryGuide({ conversations: [conversation] })).items[0]
    if (result.status !== 'ok') throw new Error('Expected conversation guide')
    expect(result.digest.fragments[0].author).toBe('user')
    expect(result.digest.fragments.find(f => f.text.startsWith('Możesz'))?.author).toBe('assistant')
    await db.journalEntries.update(ref.id, { body: 'Źródło zmienione.' })
    expect((await api().getHistoryGuide({ conversations: [conversation] })).items[0].status).toBe(
      'unavailable'
    )
  })
  it('invalidates uncited dialogue context through the evidence of an approved profile item', async () => {
    const db = getTestDatabase(),
      repo = approvedProfileRepository()
    await db.journalEntries.put(entry)
    const source = (await api().readSources({ requests: [{ ref }] })).items[0]
    if (source.status !== 'ok') throw new Error('Missing source')
    const proposal = await repo.propose({
      operation: 'add',
      targetId: null,
      targetVersion: null,
      dedupeKey: 'premise',
      reason: 'Do sprawdzenia',
      content: { ...blankProfileContent(), text: entry.body },
      origin: {
        kind: 'user',
        label: 'Wybrany fragment',
        citations: [{ ref, version: source.version }],
      },
    })
    await repo.decide(proposal.id, proposal.version, true)
    const item = (await repo.snapshot()).items[0]
    await db.companionConversations.put({
      id: 'derived',
      periodRef: '2026-W38',
      surface: 'weekly-reflection',
      revision: 0,
      enabled: true,
      topics: [],
      topicsInitialized: false,
      topicNotice: '',
      spentUsd: 0,
      historyAccessRevision: 'initial',
      profileEvidence: [{ id: item.id, version: item.version }],
      updatedAt: '2026-09-27T10:00:00Z',
      messages: [
        {
          id: 'answer',
          role: 'assistant',
          text: 'Wspominasz, że spacer z bliską osobą Ci pomógł.',
          citations: [],
          createdAt: '2026-09-27T10:00:00Z',
        },
      ],
    })
    const conversations = [{ collection: 'companionConversations' as const, id: 'derived' }]
    expect((await api().getHistoryGuide({ conversations })).items[0].status).toBe('ok')
    await db.journalEntries.update(ref.id, { body: 'Poprzedni wpis wymagał korekty.' })
    expect((await api().getHistoryGuide({ conversations })).items[0].status).toBe('unavailable')
  })
  it('does not reintroduce messages retained before a context refresh', async () => {
    const db = getTestDatabase()
    await db.companionConversations.put({
      id: 'refreshed',
      periodRef: '2026-W38',
      surface: 'weekly-reflection',
      revision: 1,
      enabled: true,
      topics: [],
      topicsInitialized: false,
      topicNotice: '',
      spentUsd: 0,
      historyStartIndex: 1,
      historyAccessRevision: 'initial',
      profileEvidence: [],
      updatedAt: '2026-09-27T10:00:00Z',
      messages: [
        {
          id: 'old',
          role: 'assistant',
          text: 'Nieaktualne dane ze starego kontekstu.',
          citations: [],
          createdAt: '2026-09-26T10:00:00Z',
        },
        {
          id: 'new',
          role: 'user',
          text: 'Po odświeżeniu chcę porozmawiać o odpoczynku.',
          citations: [],
          createdAt: '2026-09-27T10:00:00Z',
        },
      ],
    })
    const result = await api().getHistoryGuide({
      conversations: [{ collection: 'companionConversations', id: 'refreshed' }],
    })
    expect(result.items[0].status).toBe('ok')
    expect(JSON.stringify(result)).not.toContain('Nieaktualne dane')
    expect(JSON.stringify(result)).toContain('Po odświeżeniu')
    expect((await db.companionConversations.get('refreshed'))?.messages).toHaveLength(2)
  })
  it('omits unfinished introductions and the active conversation from its own frozen history', async () => {
    const intro = await introductionService().start()
    expect(
      (
        await createHistoryTools().readSources({
          requests: [{ ref: { collection: 'companionIntroductions', id: intro.id } }],
        })
      ).items[0].status
    ).toBe('unavailable')
    await getTestDatabase().journalEntries.put(entry)
    const excluded = createHistoryTools({ asOf, omitRefs: [ref] })
    expect((await excluded.getHistoryGuide({ weeks: ['2026-W38'] })).items[0].status).toBe(
      'unavailable'
    )
  })
  it('reports incomplete coverage, bounds requests, skips open periods and never writes user summaries', async () => {
    const db = getTestDatabase()
    await db.journalEntries.put({
      ...entry,
      body: 'Nie '.repeat(300),
    })
    await db.weeklyReflections.put({
      id: 'reflection',
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      ...normalizeWeeklyReflectionPayload({
        weekRef: getPeriodRefsForDate('2026-09-22').week,
        aiSummary: 'Podsumowanie użytkownika',
      }),
    })
    const result = (await api().getHistoryGuide({ weeks: ['2026-W38'] })).items[0]
    if (result.status !== 'ok') throw new Error('Expected digest')
    expect(result.digest.coverage.partial).toBe(true)
    expect(result.digest.fragments.some(f => f.text === 'Nie '.repeat(300))).toBe(false)
    expect((await db.weeklyReflections.get('reflection'))?.aiSummary).toBe(
      'Podsumowanie użytkownika'
    )
    expect((await api().getHistoryGuide({ weeks: ['2026-W39'] })).items[0].status).toBe(
      'period-open'
    )
    await expect(
      api().getHistoryGuide({ weeks: ['2026-W37', '2026-W38', '2026-W38'] })
    ).rejects.toThrow()
    await expect(api().getHistoryGuide({ weeks: ['2026-09'] })).rejects.toThrow()
    await expect(api().getHistoryGuide({ weeks: ['garbage'] })).rejects.toThrow()
  })
})
