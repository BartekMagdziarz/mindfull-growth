import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectTestDatabase } from '@/test/testDatabase'
import { getUserDatabase } from '@/services/userDatabaseService'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository as planning } from '@/repositories/planningStateDexieRepository'
import { assessmentsDexieRepository as assessments } from '@/repositories/assessmentsDexieRepository'
import { getPeriodRefsForDate } from '@/utils/periods'
import type { DayRef, MonthRef } from '@/domain/period'
import { createHistoryTools } from '../tools'
import { saveHistoryAccessPolicy } from '../access'
import { captureHistorySnapshot } from '../snapshot'
import { getTestUserId } from '@/test/testDatabase'
import { HISTORY_TOOL_DEFINITIONS, invokeHistoryTool } from '../toolDefinitions'
import type { SourceRef } from '../contracts'

const now = '2026-10-05T18:00:00.000Z'
const options = { asOf: now, timeZone: 'Europe/Warsaw' }
async function clear() {
  vi.useRealTimers()
  const db = await connectTestDatabase()
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
}
beforeEach(async () => {
  await clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
})
afterEach(clear)
async function habit(entryMode: 'counter' | 'completion' | 'value' = 'completion') {
  return habitDexieRepository.create({
    title: 'Test aktywności',
    isActive: true,
    status: 'open',
    lifeAreaIds: [],
    priorityIds: [],
    cadence: 'weekly',
    entryMode,
    target:
      entryMode === 'value'
        ? { kind: 'value', aggregation: 'average', operator: 'gte', value: 5 }
        : { kind: 'count', operator: 'min', value: 3 },
  })
}

describe('history tool boundary contracts', () => {
  it('offers exactly six read-only tools and rejects arbitrary operations or model-provided clocks', async () => {
    const api = createHistoryTools(options)
    expect(HISTORY_TOOL_DEFINITIONS.map(d => d.name)).toEqual([
      'get_history_overview',
      'list_history_facets',
      'search_history',
      'read_sources',
      'get_execution_summary',
      'get_history_guide',
    ])
    expect(() => invokeHistoryTool(api, 'saveHistoryAccessPolicy', {})).toThrow('Unknown tool')
    expect(() => invokeHistoryTool(api, 'search_history', { asOf: '2030-01-01' })).toThrow(
      'Unexpected'
    )
    await expect(invokeHistoryTool(api, 'search_history', {})).resolves.toMatchObject({
      totalMatches: 0,
    })
    await expect(invokeHistoryTool(api, 'read_sources', {})).rejects.toMatchObject({
      code: 'invalid-input',
    })
  })

  it('supports family-only emotion logs without requiring a legacy word selection', async () => {
    const log = await emotionLogDexieRepository.create({
      emotionIds: [],
      emotionFamilyIds: ['radosc'],
      note: 'Przyjemny wieczór',
    })
    const api = createHistoryTools(options)
    const facets = await api.listHistoryFacets()
    expect(facets.emotionFamilies.items).toEqual([{ id: 'radosc', name: 'Radość', count: 1 }])
    expect((await api.searchHistory({ emotionFamilyIds: ['radosc'] })).items[0].ref.id).toBe(log.id)
  })

  it('does not use old AI summaries to bypass exclusions', async () => {
    await getUserDatabase().profilePeriodSummaries.add({
      id: 'unsafe-old-summary',
      periodRef: '2026-W39',
      kind: 'deterministic',
      tier: 1,
      content: 'SECRET_SUMMARY',
      inputHash: 'old',
      recordCount: 1,
      createdAt: now,
    })
    const api = createHistoryTools(options)
    expect((await api.searchHistory({ query: 'SECRET_SUMMARY' })).totalMatches).toBe(0)
    expect((await api.getHistoryOverview()).totalSources).toBe(0)
  })

  it('invalidates an in-flight snapshot after access changes', async () => {
    const db = getUserDatabase()
    const state = await captureHistorySnapshot(db, getTestUserId(), now, 'pl', 'Europe/Warsaw')
    await saveHistoryAccessPolicy({ excludedKinds: ['journal'], excludedSources: [] })
    await expect(state.assertCurrent()).rejects.toMatchObject({ code: 'session-changed' })
  })

  it('bounds a multi-source read and allows lossless continuation', async () => {
    const refs: SourceRef[] = []
    for (let i = 0; i < 4; i++) {
      const entry = await journalDexieRepository.create({ body: `${i}`.repeat(10000) })
      refs.push({ collection: 'journalEntries', id: entry.id })
    }
    const api = createHistoryTools(options)
    const result = await api.readSources({
      requests: refs.map(ref => ({ ref })),
      maxCharsPerSource: 8000,
    })
    const used = result.items.reduce(
      (n, item) =>
        n + (item.status === 'ok' ? item.blocks.reduce((m, b) => m + b.text.length, 0) : 0),
      0
    )
    expect(used).toBe(24000)
    expect(result.budgetExhausted).toBe(true)
    expect(result.items[3]).toMatchObject({ status: 'ok', complete: false, nextOffset: 0 })
    const first = result.items[0]
    if (first.status !== 'ok') throw Error('Expected first page')
    const rest = (
      await api.readSources({
        requests: [{ ref: first.ref, offset: first.nextOffset!, expectedVersion: first.version }],
      })
    ).items[0]
    if (rest.status !== 'ok') throw Error('Expected continuation')
    expect(rest.complete).toBe(true)
    expect([...first.blocks, ...rest.blocks].map(b => b.text).join('')).toBe('0'.repeat(10000))
  })

  it('uses application arithmetic for counter and average values; filters by event day for backfilled entries', async () => {
    const week = getPeriodRefsForDate('2026-09-30T12:00:00').week
    for (const mode of ['counter', 'value'] as const) {
      const subject = await habit(mode)
      for (const [dayRef, value] of [
        ['2026-09-29', 2],
        ['2026-09-30', 6],
      ] as const) {
        await planning.upsertDailyMeasurementEntry({
          subjectType: 'habit',
          subjectId: subject.id,
          dayRef: dayRef as DayRef,
          value,
        })
      }
      const api = createHistoryTools(options)
      const result = await api.getExecutionSummary({
        subjects: [{ collection: 'habits', id: subject.id }],
        periodRef: week,
      })
      expect(result.items[0]).toMatchObject({
        entryCount: 2,
        actualValue: mode === 'counter' ? 8 : 4,
        periodComplete: true,
      })
      const day = await api.searchHistory({
        kinds: ['measurement'],
        from: '2026-09-29',
        to: '2026-09-29',
        relatedRefs: [{ collection: 'habits', id: subject.id }],
      })
      expect(day.items).toHaveLength(1)
    }
  })

  it('requires an explicit month for conflicting target overrides in a boundary week', async () => {
    const subject = await habit()
    const week = getPeriodRefsForDate('2026-09-30T12:00:00').week
    for (const [month, value] of [
      ['2026-09', 2],
      ['2026-10', 4],
    ] as const) {
      await planning.upsertMeasurementMonthState({
        subjectType: 'habit',
        subjectId: subject.id,
        monthRef: month as MonthRef,
        activityState: 'active',
        scheduleScope: 'unassigned',
        targetOverride: { kind: 'count', operator: 'min', value },
      })
    }
    const api = createHistoryTools(options)
    const input = { subjects: [{ collection: 'habits' as const, id: subject.id }], periodRef: week }
    expect((await api.getExecutionSummary(input)).items[0]).toMatchObject({
      status: 'ambiguous-month',
    })
    expect(
      (await api.getExecutionSummary({ ...input, sourceMonthRef: '2026-10' })).items[0]
    ).toMatchObject({ status: 'ok', target: { value: 4 }, evaluation: 'no-data' })
  })

  it('withholds derived assessment results after an answer is excluded or deleted', async () => {
    const attempt = await assessments.startAttempt({
      assessmentId: 'vlq',
      instrumentVersion: 'test',
      language: 'pl',
      scoringKeyVersion: 'test',
      missingDataPolicyVersion: 'test',
      totalItems: 1,
    })
    const answer = await assessments.saveResponse({
      attemptId: attempt.id,
      assessmentId: 'vlq',
      itemId: 'test-item',
      responseValue: 5,
      reverseFlagAtTime: false,
      scoringKeyVersion: 'test',
    })
    const api = createHistoryTools(options)
    expect((await api.searchHistory({ kinds: ['assessment'] })).totalMatches).toBe(2)
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'assessmentResponses', id: answer.id }],
    })
    expect((await api.searchHistory({ kinds: ['assessment'] })).totalMatches).toBe(0)
    await saveHistoryAccessPolicy({ excludedKinds: [], excludedSources: [] })
    await getUserDatabase().assessmentResponses.delete(answer.id)
    expect((await api.searchHistory({ kinds: ['assessment'] })).totalMatches).toBe(0)
  })
})
