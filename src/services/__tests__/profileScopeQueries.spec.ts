import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { queryScopePreview } from '@/services/profileScopeQueries'
import { assembleProfilePayload } from '@/services/profilePayloadAssembler'
import {
  computeFoundationStatuses,
  loadFoundationSourceData,
} from '@/services/foundationCompleteness'
import type { WeekRef } from '@/domain/period'

vi.mock('@/services/foundationCompleteness', () => ({
  computeFoundationStatuses: vi.fn(() => []),
  foundationCompletionCount: vi.fn((statuses: Array<{ state: string }>) =>
    statuses.filter((s) => s.state === 'completed' || s.state === 'outdated').length,
  ),
  loadFoundationSourceData: vi.fn(async () => {}),
}))

describe('queryScopePreview', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase(`test-user-profile-scope-${Date.now()}-${Math.random()}`)
    const db = getUserDatabase()
    await db.journalEntries.clear()
    await db.emotionLogs.clear()
    await db.weeklyReflections.clear()
    await db.monthlyReflections.clear()
    vi.mocked(computeFoundationStatuses).mockReturnValue([])
  })

  afterEach(async () => {
    await disconnectUserDatabase()
    vi.useRealTimers()
  })

  it('returns zero counts for an empty scope', async () => {
    const result = await queryScopePreview({
      dataTypes: ['journal', 'emotionLogs'],
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
    })
    expect(result.countsByType.journal).toBe(0)
    expect(result.countsByType.emotionLogs).toBe(0)
    expect(result.headers).toEqual([])
    // The estimate now reflects the REAL assembled payload, which always carries
    // the [SCOPE]…[END OF DATA] scaffolding even when no records match — so it's
    // a small non-zero number, and no data type contributes any tokens.
    expect(result.approxTokens).toBeGreaterThan(0)
    expect(Object.values(result.tokensByType).some((n) => (n ?? 0) > 0)).toBe(false)
  })

  it('counts journal and emotion logs inside the range only', async () => {
    const journal = useJournalStore()
    const emotions = useEmotionLogStore()

    await journal.createEntry({
      title: 'In range',
      body: 'Hello world',
      createdAt: '2026-04-10T00:00:00.000Z',
    })
    await journal.createEntry({
      title: 'Out of range',
      body: 'Older',
      createdAt: '2024-01-01T00:00:00.000Z',
    })
    await emotions.createLog({
      emotionIds: ['e1'],
      note: 'Felt calm',
      createdAt: '2026-04-11T12:00:00.000Z',
    })

    const result = await queryScopePreview({
      dataTypes: ['journal', 'emotionLogs'],
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    })

    expect(result.countsByType.journal).toBe(1)
    expect(result.countsByType.emotionLogs).toBe(1)
    expect(result.objectIdsByType.journal).toHaveLength(1)
    expect(result.approxTokens).toBeGreaterThan(0)
  })

  it('self-hydrates the journal store so a cold-start preview still counts entries', async () => {
    // Write straight to Dexie WITHOUT touching the Pinia store — mimics opening the
    // wizard in a fresh session where no view has hydrated the journal store.
    const db = getUserDatabase()
    await db.journalEntries.add({
      id: 'jrnl-cold-1',
      createdAt: '2026-04-12T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z',
      title: 'Cold start',
      body: 'COLD_START_BODY entry that exists only in Dexie',
      emotionIds: [],
      peopleTagIds: [],
      contextTagIds: [],
    })

    const preview = await queryScopePreview({
      dataTypes: ['journal'],
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    })

    // Before the fix the cold store yielded 0 even though the entry exists.
    expect(preview.countsByType.journal).toBe(1)
    expect(preview.objectIdsByType.journal).toEqual(['jrnl-cold-1'])
  })

  it('hydrates foundation source data before counting it (cold-start)', async () => {
    vi.mocked(loadFoundationSourceData).mockClear()
    await queryScopePreview({
      dataTypes: ['foundation'],
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
    })
    // The ~10 self-discovery/assessment stores must be loaded, or the preview
    // reports an empty Foundation even when those exercises were completed.
    expect(loadFoundationSourceData).toHaveBeenCalled()
  })

  it('exposes real exercise-session ids so the build includes them (Fix #4)', async () => {
    const db = getUserDatabase()
    const createdAt = '2026-04-12T09:00:00.000Z'
    // Seed a real exercise row (with its own `id`) directly into an exercise table.
    await db.table('thoughtRecords').add({
      id: 'tr-real-1',
      createdAt,
      updatedAt: createdAt,
      situation: 'Presentation nerves',
      automaticThoughts: 'I will freeze',
    })

    const scope = {
      dataTypes: ['exerciseSessions'] as const,
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    }
    const preview = await queryScopePreview({ ...scope, dataTypes: [...scope.dataTypes] })

    // Preview reports the REAL row id, not a synthetic `type-createdAt`.
    expect(preview.countsByType.exerciseSessions).toBe(1)
    expect(preview.objectIdsByType.exerciseSessions).toEqual(['tr-real-1'])

    // Feeding those ids to the assembler actually includes the exercise — before
    // Fix #4 the synthetic preview id never matched the assembler's `b.id` filter.
    const assembled = await assembleProfilePayload({
      dataTypes: [...scope.dataTypes],
      start: scope.start,
      end: scope.end,
      dateRange: { kind: 'custom', start: '2026-04-01', end: '2026-04-30' },
      includedObjectIds: preview.objectIdsByType,
      locale: 'en',
      maxPromptTokens: null,
    })
    expect(assembled.text).toContain('[EXERCISE SESSIONS]')
    expect(assembled.tokensByType.exerciseSessions ?? 0).toBeGreaterThan(0)
  })

  it('sorts headers by date descending', async () => {
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'Earlier',
      body: 'x',
      createdAt: '2026-04-02T00:00:00.000Z',
    })
    await journal.createEntry({
      title: 'Later',
      body: 'x',
      createdAt: '2026-04-20T00:00:00.000Z',
    })

    const result = await queryScopePreview({
      dataTypes: ['journal'],
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    })

    expect(result.headers[0].title).toBe('Later')
    expect(result.headers[1].title).toBe('Earlier')
  })

  it('omits unchecked data types from the result maps', async () => {
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'A',
      body: 'x',
      createdAt: '2026-04-10T00:00:00.000Z',
    })

    const result = await queryScopePreview({
      dataTypes: ['emotionLogs'],
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
    })
    expect(result.countsByType.journal).toBeUndefined()
    expect(result.countsByType.emotionLogs).toBe(0)
  })

  it('filters journal by peopleTagIds when the filter is set', async () => {
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'With Mom',
      body: 'x',
      peopleTagIds: ['mom'],
      createdAt: '2026-04-10T00:00:00.000Z',
    })
    await journal.createEntry({
      title: 'Solo',
      body: 'x',
      peopleTagIds: [],
      createdAt: '2026-04-11T00:00:00.000Z',
    })

    const result = await queryScopePreview({
      dataTypes: ['journal'],
      start: '2026-04-01T00:00:00.000Z',
      end: '2026-04-30T23:59:59.999Z',
      filters: { peopleTagIds: ['mom'] },
    })
    expect(result.countsByType.journal).toBe(1)
    expect(result.headers[0].title).toBe('With Mom')
  })

  it('counts planning as zero while it remains stubbed in preview', async () => {
    const result = await queryScopePreview({
      dataTypes: ['planning'],
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
    })
    expect(result.countsByType.planning).toBe(0)
  })

  it('counts completed and outdated foundation tiles', async () => {
    vi.mocked(computeFoundationStatuses).mockReturnValue([
      {
        id: 'valuesDiscovery',
        group: 'values',
        state: 'completed',
        lastCompletedAt: '2026-04-01T00:00:00.000Z',
        routeName: 'exercise-values',
      },
      {
        id: 'valueMap',
        group: 'values',
        state: 'outdated',
        lastCompletedAt: '2025-01-01T00:00:00.000Z',
        routeName: 'exercise-value-map',
      },
      {
        id: 'vlq',
        group: 'values',
        state: 'completed',
        lastCompletedAt: '2026-03-01T00:00:00.000Z',
        routeName: 'exercise-assessment',
        routeParams: { assessmentId: 'vlq' },
      },
      {
        id: 'shadowBeliefs',
        group: 'personality',
        state: 'completed',
        lastCompletedAt: '2026-02-01T00:00:00.000Z',
        routeName: 'exercise-shadow-beliefs',
      },
      {
        id: 'wheelOfLife',
        group: 'lifeBalance',
        state: 'not-started',
        routeName: 'exercise-wheel-of-life',
      },
    ])

    const result = await queryScopePreview({
      dataTypes: ['foundation'],
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
    })

    expect(result.countsByType.foundation).toBe(4)
    expect(result.objectIdsByType.foundation).toHaveLength(4)
    expect(result.headers).toHaveLength(4)
    expect(result.headers.every((h) => h.type === 'foundation')).toBe(true)
  })

  it('counts weekly reflections in range when the store is populated', async () => {
    const reflections = useStructuredReflectionStore()
    await reflections.upsertWeekly({
      weekRef: '2026-W15' as WeekRef,
      physicalIntensityRating: null,
      emotionalIntensityRating: null,
      taskLoadRating: null,
      closeOnesNeedsRating: null,
      physicalCareRating: null,
      emotionalProcessingRating: null,
      productivityRating: null,
      closeOnesSupportRating: null,
      moodRating: null,
      energyRating: null,
      calmRating: null,
      connectionRating: null,
      promptResponses: {},
      freeformReflection: 'Hello week',
      aiSummary: '',
    })

    const result = await queryScopePreview({
      dataTypes: ['weeklyReflections'],
      start: '2020-01-01T00:00:00.000Z',
      end: '2030-12-31T23:59:59.999Z',
    })
    expect(result.countsByType.weeklyReflections).toBe(1)
    expect(result.headers[0].title).toMatch(/Week /)
  })
})
