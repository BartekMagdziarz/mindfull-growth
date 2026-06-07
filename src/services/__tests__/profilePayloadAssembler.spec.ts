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
import { rawTierCutoffIso } from '@/services/profilePeriodSummary.service'
import { getPeriodRefsForDate } from '@/utils/periods'
import { loadFoundationSourceData } from '@/services/foundationCompleteness'
import { profilePeriodSummaryDexieRepository } from '@/repositories/profilePeriodSummaryDexieRepository'
import type { ProfileDateRange } from '@/domain/userProfile'
import type { WeekRef } from '@/domain/period'

vi.mock('@/services/foundationCompleteness', () => ({
  computeFoundationStatuses: vi.fn(() => []),
  foundationCompletionCount: vi.fn(() => 0),
  loadFoundationSourceData: vi.fn(async () => {}),
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

  it('self-hydrates the journal store when built cold (records exist only in Dexie)', async () => {
    // Write straight to Dexie WITHOUT touching the Pinia store — mimics opening the
    // profile build in a fresh session where no view has hydrated the journal store.
    const db = getUserDatabase()
    await db.journalEntries.add({
      id: 'jrnl-cold-1',
      createdAt: '2026-04-12T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z',
      title: 'Cold start',
      body: 'COLD_BUILD_BODY that exists only in Dexie',
      emotionIds: [],
      peopleTagIds: [],
      contextTagIds: [],
    })

    // Build directly (no preview to warm the store first). It must still appear.
    const assembled = await assembleProfilePayload({
      dataTypes: ['journal'],
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en',
      maxPromptTokens: null,
    })

    expect(assembled.text).toContain('COLD_BUILD_BODY')
    expect(assembled.tokensByType.journal ?? 0).toBeGreaterThan(0)
  })

  it('hydrates foundation source data when foundation is in scope', async () => {
    vi.mocked(loadFoundationSourceData).mockClear()
    await assembleProfilePayload({
      dataTypes: ['foundation'],
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en',
      maxPromptTokens: null,
    })
    // Without this the build's [FOUNDATION SNAPSHOT] reads empty cold stores.
    expect(loadFoundationSourceData).toHaveBeenCalled()
  })

  it('self-hydrates the life-area store for the planning [LIFE AREAS] block when cold', async () => {
    // A life area exists only in Dexie; the lifeArea store is cold (fresh Pinia).
    const db = getUserDatabase()
    await db.lifeAreas.add({
      id: 'la-cold-1',
      name: 'COLD_LIFE_AREA Health',
      isActive: true,
      sortOrder: 0,
      reflectionSignals: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const assembled = await assembleProfilePayload({
      dataTypes: ['planning'],
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en',
      maxPromptTokens: null,
    })

    expect(assembled.text).toContain('[LIFE AREAS]')
    expect(assembled.text).toContain('COLD_LIFE_AREA Health')
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
        maxPromptTokens: 3000, // ~2 of the 4 entries (each ~1219 tok at chars/2.5)
      },
      NOW_MS,
    )

    // The conservative cost model holds end-to-end: the reassembled estimate fits.
    expect(assembled.approxTokens).toBeLessThanOrEqual(3000)
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

  it('sends old history raw with no summarization when the payload fits the budget', async () => {
    // Fix #2: tiering is gated on budget pressure. A 3-month-old entry (older than
    // the ~8-week raw cutoff) stays RAW + verbatim when the budget isn't pressured.
    const NOW_MS = Date.parse('2026-06-15T00:00:00.000Z')
    const journal = useJournalStore()
    await journal.createEntry({
      title: 'old but small',
      body: 'OLD_RAW_FULL_TEXT from months ago',
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
        maxPromptTokens: 100_000, // raw fits comfortably → no tiering
      },
      NOW_MS,
    )

    expect(assembled.text).not.toContain('[SUMMARIZED HISTORY]')
    expect(assembled.text).toContain('OLD_RAW_FULL_TEXT from months ago')
    expect(assembled.summarizedPeriods ?? 0).toBe(0)
    expect(assembled.droppedSummarizedPeriods).toBe(0)
    expect(assembled.droppedByType).toEqual({})
    // Nothing summarized → no digest cached.
    expect((await profilePeriodSummaryDexieRepository.list()).length).toBe(0)
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

    const base = {
      dataTypes: ['journal'] as const,
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en' as const,
    }
    // Measure the full raw size, then budget one token below it: the raw payload
    // no longer fits → tiering activates, while the tiny digest fits comfortably.
    const raw = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: null },
      NOW_MS,
    )
    const assembled = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: raw.approxTokens - 1 },
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
      body: 'word '.repeat(400),
      createdAt: '2026-03-01T00:00:00.000Z',
    })
    const base = {
      dataTypes: ['journal'] as const,
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en' as const,
    }
    // Self-calibrate a pressured budget so tiering activates (see test above).
    const raw = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: null },
      NOW_MS,
    )
    const budget = raw.approxTokens - 1
    const a = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: budget },
      NOW_MS,
    )
    const b = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: budget },
      NOW_MS,
    )
    expect(a.text).toContain('[SUMMARIZED HISTORY]')
    expect(a.text).toBe(b.text)
  })

  it('keeps the raw-boundary week raw-only — no record in both raw and a digest (#3)', async () => {
    const NOW_MS = Date.parse('2026-06-15T00:00:00.000Z')
    const rawCutoff = rawTierCutoffIso(NOW_MS)
    const boundaryWeek = getPeriodRefsForDate(rawCutoff).week

    const journal = useJournalStore()
    // A record exactly at the raw cutoff: it's in the boundary ISO week AND
    // `createdAt >= rawCutoff`, so it must stay RAW — never also summarized.
    await journal.createEntry({
      title: 'boundary',
      body: 'BOUNDARY_RECORD_MARKER right at the cutoff',
      createdAt: rawCutoff,
    })
    // A clearly-older record so a real digest exists (forces [SUMMARIZED HISTORY]).
    await journal.createEntry({
      title: 'older',
      body: 'word '.repeat(400),
      createdAt: '2026-01-15T00:00:00.000Z',
    })

    const base = {
      dataTypes: ['journal'] as const,
      start: START,
      end: END,
      dateRange: RANGE,
      includedObjectIds: {},
      locale: 'en' as const,
    }
    // Pressure the budget so tiering activates (self-calibrated, see above).
    const raw = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: null },
      NOW_MS,
    )
    const assembled = await assembleProfilePayload(
      { ...base, dataTypes: [...base.dataTypes], maxPromptTokens: raw.approxTokens - 1 },
      NOW_MS,
    )

    // Tiering ran (the older record is summarized) ...
    expect(assembled.text).toContain('[SUMMARIZED HISTORY]')
    // ... but the boundary record is RAW and appears exactly once (no double-count).
    expect(assembled.text).toContain('[JOURNAL ENTRIES]')
    expect(assembled.text.split('BOUNDARY_RECORD_MARKER').length - 1).toBe(1)
    // The boundary week itself is never summarized — that was the overlap bug.
    expect(assembled.text).not.toContain(`### Week ${boundaryWeek}`)
  })
})
