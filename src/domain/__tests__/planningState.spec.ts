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
