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
import { estimateTokens } from '@/services/profileLLMAssists'
import { profilePeriodSummaryDexieRepository } from '@/repositories/profilePeriodSummaryDexieRepository'
import type { ProfileDateRange } from '@/domain/userProfile'
import type { WeekRef } from '@/domain/period'

vi.mock('@/services/foundationCompleteness', () => ({
  computeFoundationStatuses: vi.fn(() => []),
  foundationCompletionCount: vi.fn(() => 0),
}))

const START = '2026-01-01T00:00:00.000Z'
const END = '2026-12-31T23:59:59.999Z'
const RANGE: ProfileDateRange = { kind: 'custom', start: START, end: END }

describe('assembleProfilePayload', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase(`test-user-assembler-${Date.now()}-${Math.random()}`)
    const db = getUserDatabase()
    await db.journalEntries.clear()
    await db.emotionLogs.clear()
    await db.weeklyReflections.clear()
    await db.monthlyReflections.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  it('is the single source of truth: preview estimate == assembled payload estimate', async () => {
    const journal = useJournalStore()
    const emotions = useEmotionLogStore()
    await journal.createEntry({
      title: 'Morning walk',
      body: 'I noticed I feel calmer and more focused after walking before work.',
      createdAt: '2026-04-10T08:00:00.000Z',
    })
    await journal.createEntry({
      title: 'Hard day',
      body: 'Tense meeting, replayed it for hours afterwards.',
      createdAt: '2026-02-02T20:00:00.000Z',
    })
    await emotions.createLog({
      emotionIds: ['e1'],
      note: 'Felt grounded after journaling.',
      createdAt: '2026-04-11T12:00:00.000Z',
    })

    const dataTypes = ['journal', 'emotionLogs'] as const

    // Preview path — resolves filters → object ids → assembler estimate.
    const preview = await queryScopePreview({
      dataTypes: [...dataTypes],
      start: START,
      end: END,
      dateRange: RANGE,
      locale: 'en',
    })

    // Build path — same scope (id-pinned, same window/descriptor/locale).
    const assembled = await assembleProfilePayload({
      dataTypes: [...dataTypes],
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: preview.objectIdsByType,
      locale: 'en',
    })

    // Headline equality + the estimate is genuinely `estimateTokens(text)`.
    expect(assembled.approxTokens).toBe(estimateTokens(assembled.text))
    expect(preview.approxTokens).toBe(assembled.approxTokens)
    expect(preview.approxTokens).toBeGreaterThan(0)
    // Per-type attribution matches across preview and build.
    expect(preview.tokensByType).toEqual(assembled.tokensByType)
    expect(assembled.tokensByType.journal).toBeGreaterThan(0)
    expect(assembled.tokensByType.emotionLogs).toBeGreaterThan(0)
  })

  it('never leaks a reflection aiSummary into the payload (Pillar 3 boundary)', async () => {
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
      freeformReflection: 'VISIBLE_FREEFORM_TEXT',
      aiSummary: 'SECRET_AI_SUMMARY_SHOULD_NOT_LEAK',
    })

    const assembled = await assembleProfilePayload({
      dataTypes: ['weeklyReflections'],
      start: '2020-01-01T00:00:00.000Z',
      end: '2030-12-31T23:59:59.999Z',
      dateRange: { kind: 'custom', start: '2020-01-01', end: '2030-12-31' },
      includedObjectIds: {},
      locale: 'en',
    })

    expect(assembled.text).toContain('VISIBLE_FREEFORM_TEXT')
    expect(assembled.text).not.toContain('SECRET_AI_SUMMARY_SHOULD_NOT_LEAK')
  })

  it('trims oldest records to fit an explicit budget (end-to-end ≤ budget)', async () => {
    // Keep all fixtures inside the ~8-week raw window (relative to NOW_MS) so this
    // exercises raw budget-trimming, not Pillar-3 tiering.
    const NOW_MS = Date.parse('2026-04-15T00:00:00.000Z')
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'oldest',
      body: 'OLDEST_MARKER ' + 'x'.repeat(3000),
      createdAt: '2026-03-20T00:00:00.000Z',
    })
    await journal.createEntry({ title: 'mid1', body: 'x'.repeat(3000), createdAt: '2026-03-27T00:00:00.000Z' })
    await journal.createEntry({ title: 'mid2', body: 'x'.repeat(3000), createdAt: '2026-04-03T00:00:00.000Z' })
    await journal.createEntry({
      title: 'newest',
      body: 'NEWEST_MARKER ' + 'x'.repeat(3000),
      createdAt: '2026-04-10T00:00:00.000Z',
    })

    const assembled = await assembleProfilePayload(
      {
        dataTypes: ['journal'],
        start: START,
        end: END,
        dateRange: RANGE,
        includedObjectIds: {},
        locale: 'en',
        maxPromptTokens: 2500, // ~2 of the 4 entries (each ~1015 tok)
      },
      NOW_MS,
    )

    // The conservative cost model holds end-to-end: the reassembled estimate fits.
    expect(assembled.approxTokens).toBeLessThanOrEqual(2500)
    expect(assembled.droppedByType.journal).toBeGreaterThan(0)
    expect(assembled.text).toContain('NEWEST_MARKER')
    expect(assembled.text).not.toContain('OLDEST_MARKER')
    expect(assembled.text).not.toContain('[SUMMARIZED HISTORY]') // all in raw tier
  })

  it('does not trim when the budget is null (hosted / unconfigured)', async () => {
    const journal = useJournalStore()
    for (let i = 1; i <= 5; i++) {
      await journal.createEntry({
        title: `e${i}`,
        body: 'x'.repeat(3000),
        createdAt: `2026-0${i}-01T00:00:00.000Z`,
      })
    }

    const assembled = await assembleProfilePayload({
      dataTypes: ['journal'],
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en',
      maxPromptTokens: null,
    })

    expect(assembled.droppedByType).toEqual({})
    expect(assembled.text.match(/--- Entry/g)?.length).toBe(5)
  })

  it('tiers older diary records into [SUMMARIZED HISTORY] and keeps recent raw', async () => {
    const NOW_MS = Date.parse('2026-06-15T00:00:00.000Z')
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'recent',
      body: 'RECENT_RAW_BODY about this week',
      createdAt: '2026-06-01T00:00:00.000Z',
    })
    await journal.createEntry({
      title: 'old',
      body: 'leadword ' + 'x'.repeat(2000) + ' OLD_TAIL_MARKER',
      createdAt: '2026-03-01T00:00:00.000Z',
    })

    const assembled = await assembleProfilePayload(
      {
        dataTypes: ['journal'],
        start: START,
        end: END,
        dateRange: RANGE,
        includedObjectIds: {},
        locale: 'en',
        maxPromptTokens: 100_000, // generous → nothing dropped, just tiered
      },
      NOW_MS,
    )

    // Recent entry stays raw + verbatim.
    expect(assembled.text).toContain('[JOURNAL ENTRIES]')
    expect(assembled.text).toContain('RECENT_RAW_BODY about this week')
    // Older entry is summarized (digest), not dumped verbatim.
    expect(assembled.text).toContain('[SUMMARIZED HISTORY]')
    expect(assembled.text).toMatch(/### Week 2026-W\d+/)
    expect(assembled.text).not.toContain('OLD_TAIL_MARKER')
    expect(assembled.summarizedPeriods ?? 0).toBeGreaterThanOrEqual(1)
    expect(assembled.droppedSummarizedPeriods).toBe(0)
    // The digest was cached.
    expect((await profilePeriodSummaryDexieRepository.list()).length).toBeGreaterThanOrEqual(1)
  })

  it('is deterministic across builds with summarization (cache reuse)', async () => {
    const NOW_MS = Date.parse('2026-06-15T00:00:00.000Z')
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'old',
      body: 'word '.repeat(50),
      createdAt: '2026-03-01T00:00:00.000Z',
    })
    const scope = {
      dataTypes: ['journal'] as const,
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en' as const,
      maxPromptTokens: 100_000,
    }
    const a = await assembleProfilePayload({ ...scope, dataTypes: [...scope.dataTypes] }, NOW_MS)
    const b = await assembleProfilePayload({ ...scope, dataTypes: [...scope.dataTypes] }, NOW_MS)
    expect(a.text).toContain('[SUMMARIZED HISTORY]')
    expect(a.text).toBe(b.text)
  })
})
