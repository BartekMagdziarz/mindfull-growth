import { describe, expect, it } from 'vitest'
import type {
  CreateDailyMeasurementEntryPayload,
  CreateInitiativePlanStatePayload,
  CreateMeasurementMonthStatePayload,
  CreateMeasurementWeekStatePayload,
  CreatePeriodObjectReflectionPayload,
} from '@/domain/planningState'
import {
  normalizeDailyMeasurementEntryPayload,
  normalizeInitiativePlanStatePayload,
  normalizeMeasurementMonthStatePayload,
  normalizeMeasurementWeekStatePayload,
  normalizePeriodObjectReflectionPayload,
} from '@/domain/planningState'
import { parsePeriodRef } from '@/utils/periods'

describe('planningState domain normalization', () => {
  it('normalizes shared month and week schedule scope state', () => {
    const monthState = normalizeMeasurementMonthStatePayload({
      monthRef: parsePeriodRef('2026-03') as CreateMeasurementMonthStatePayload['monthRef'],
      subjectType: 'habit',
      subjectId: ' habit-1 ',
      activityState: 'active',
      scheduleScope: 'specific-days',
      successNote: '  Kept momentum  ',
    } satisfies CreateMeasurementMonthStatePayload)

    expect(monthState).toEqual({
      monthRef: '2026-03',
      subjectType: 'habit',
      subjectId: 'habit-1',
      activityState: 'active',
      scheduleScope: 'specific-days',
      successNote: 'Kept momentum',
    })

    const weekState = normalizeMeasurementWeekStatePayload({
      weekRef: parsePeriodRef('2026-W10') as CreateMeasurementWeekStatePayload['weekRef'],
      sourceMonthRef: parsePeriodRef('2026-03') as CreateMeasurementWeekStatePayload['sourceMonthRef'],
      subjectType: 'tracker',
      subjectId: 'tracker-1',
      activityState: 'paused',
      scheduleScope: 'whole-week',
    } satisfies CreateMeasurementWeekStatePayload)

    expect(weekState.sourceMonthRef).toBe('2026-03')
    expect(weekState.scheduleScope).toBe('whole-week')
  })

  it('supports month-level target overrides and clearing them', () => {
    const created = normalizeMeasurementMonthStatePayload({
      monthRef: parsePeriodRef('2026-03') as CreateMeasurementMonthStatePayload['monthRef'],
      subjectType: 'keyResult',
      subjectId: 'kr-1',
      activityState: 'active',
      scheduleScope: 'unassigned',
      targetOverride: {
        kind: 'count',
        operator: 'min',
        value: 3,
      },
    } satisfies CreateMeasurementMonthStatePayload)

    expect(created.targetOverride).toEqual({
      kind: 'count',
      operator: 'min',
      value: 3,
    })

    const cleared = normalizeMeasurementMonthStatePayload(
      {
        targetOverride: undefined,
      },
      {
        id: 'state-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        ...created,
      },
    )

    expect(cleared.targetOverride).toBeUndefined()
  })

  it('supports week-level target overrides, preserving and clearing them', () => {
    const created = normalizeMeasurementWeekStatePayload({
      weekRef: parsePeriodRef('2026-W10') as CreateMeasurementWeekStatePayload['weekRef'],
      subjectType: 'habit',
      subjectId: 'habit-1',
      activityState: 'active',
      scheduleScope: 'whole-week',
      targetOverride: {
        kind: 'count',
        operator: 'min',
        value: 2,
      },
    } satisfies CreateMeasurementWeekStatePayload)

    expect(created.targetOverride).toEqual({
      kind: 'count',
      operator: 'min',
      value: 2,
    })

    const existing = {
      id: 'week-state-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      ...created,
    }

    // Upsert without the targetOverride key preserves the stored override.
    const preserved = normalizeMeasurementWeekStatePayload(
      {
        scheduleScope: 'specific-days',
      },
      existing,
    )
    expect(preserved.targetOverride).toEqual({
      kind: 'count',
      operator: 'min',
      value: 2,
    })

    // Explicit undefined clears it.
    const cleared = normalizeMeasurementWeekStatePayload(
      {
        targetOverride: undefined,
      },
      existing,
    )
    expect(cleared.targetOverride).toBeUndefined()
  })

  it('falls back to existing week override fields when partially updated', () => {
    const existing = {
      id: 'week-state-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      weekRef: '2026-W10' as CreateMeasurementWeekStatePayload['weekRef'],
      subjectType: 'habit' as const,
      subjectId: 'habit-1',
      activityState: 'active' as const,
      scheduleScope: 'whole-week' as const,
      targetOverride: {
        kind: 'count' as const,
        operator: 'min' as const,
        value: 2,
      },
    }

    const updated = normalizeMeasurementWeekStatePayload(
      {
        targetOverride: { value: 4 },
      } as never,
      existing,
    )

    expect(updated.targetOverride).toEqual({
      kind: 'count',
      operator: 'min',
      value: 4,
    })
  })

  it('validates overlapping sourceMonthRef for week states', () => {
    expect(() =>
      normalizeMeasurementWeekStatePayload({
        weekRef: '2026-W10',
        sourceMonthRef: '2026-02',
        subjectType: 'keyResult',
        subjectId: 'kr-1',
        activityState: 'active',
        scheduleScope: 'whole-week',
      } as CreateMeasurementWeekStatePayload),
    ).toThrow('sourceMonthRef must overlap MeasurementWeekState.weekRef')
  })

  it('validates daily measurement entry values', () => {
    const normalized = normalizeDailyMeasurementEntryPayload({
      subjectType: 'tracker',
      subjectId: 'tracker-1',
      dayRef: parsePeriodRef('2026-03-12') as CreateDailyMeasurementEntryPayload['dayRef'],
      value: null,
    } satisfies CreateDailyMeasurementEntryPayload)

    expect(normalized.value).toBeNull()

    expect(() =>
      normalizeDailyMeasurementEntryPayload({
        subjectType: 'tracker',
        subjectId: 'tracker-1',
        dayRef: '2026-03-12',
        value: Number.NaN,
      } as CreateDailyMeasurementEntryPayload),
    ).toThrow('DailyMeasurementEntry.value must be a finite number or null')
  })

  it('validates hierarchical initiative scheduling', () => {
    expect(() =>
      normalizeInitiativePlanStatePayload({
        initiativeId: 'initiative-1',
        monthRef: '2026-03',
        weekRef: '2026-W10',
        dayRef: '2026-04-01',
      } as CreateInitiativePlanStatePayload),
    ).toThrow('dayRef must belong to weekRef')
  })

  it('trims reflection notes and subject ids', () => {
    const normalized = normalizePeriodObjectReflectionPayload({
      periodType: 'week',
      periodRef: '2026-W10',
      subjectType: 'initiative',
      subjectId: ' initiative-1 ',
      note: '  Useful reflection  ',
    } as CreatePeriodObjectReflectionPayload)

    expect(normalized).toEqual({
      periodType: 'week',
      periodRef: '2026-W10',
      subjectType: 'initiative',
      subjectId: 'initiative-1',
      note: 'Useful reflection',
    })
  })
})
