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
import type { WeekRef } from '@/domain/period'

describe('queryScopePreview', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase(`test-user-profile-scope-${Date.now()}-${Math.random()}`)
    const db = getUserDatabase()
    await db.journalEntries.clear()
    await db.emotionLogs.clear()
    await db.weeklyReflections.clear()
    await db.monthlyReflections.clear()
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
    expect(result.approxTokens).toBe(0)
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

  it('counts questionnaires and planning as zero (stubbed until later stories)', async () => {
    const result = await queryScopePreview({
      dataTypes: ['questionnaires', 'planning'],
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-12-31T23:59:59.999Z',
    })
    expect(result.countsByType.questionnaires).toBe(0)
    expect(result.countsByType.planning).toBe(0)
  })

  it('counts weekly reflections in range when the store is populated', async () => {
    const reflections = useStructuredReflectionStore()
    await reflections.upsertWeekly({
      weekRef: '2026-W15' as WeekRef,
      physicalIntensityRating: null,
      taskLoadRating: null,
      emotionalIntensityRating: null,
      socialIntensityRating: null,
      moodRating: null,
      energyRating: null,
      calmRating: null,
      connectionRating: null,
      productivityRating: null,
      engagementRating: null,
      emotionalRegulationRating: null,
      selfCareRating: null,
      promptResponses: {},
      freeformReflection: 'Hello week',
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
