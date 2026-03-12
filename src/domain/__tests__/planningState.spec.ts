import { describe, expect, it } from 'vitest'
import type {
  CreateCadencedMonthStatePayload,
  CreateCadencedWeekStatePayload,
  CreateInitiativePlanStatePayload,
  CreatePeriodObjectReflectionPayload,
  CreateTrackerEntryPayload,
} from '@/domain/planningState'
import {
  normalizeCadencedMonthStatePayload,
  normalizeCadencedWeekStatePayload,
  normalizeInitiativePlanStatePayload,
  normalizePeriodObjectReflectionPayload,
  normalizeTrackerEntryPayload,
} from '@/domain/planningState'

describe('planningState domain normalization', () => {
  it('rejects targetCount for specific-days planning', () => {
    expect(() =>
      normalizeCadencedMonthStatePayload({
        monthRef: '2026-03',
        subjectType: 'habit',
        subjectId: 'habit-1',
        activityState: 'active',
        planningMode: 'specific-days',
        targetCount: 3,
      } as CreateCadencedMonthStatePayload)
    ).toThrow('specific-days does not support targetCount')
  })

  it('validates sourceMonthRef overlap for week states', () => {
    expect(() =>
      normalizeCadencedWeekStatePayload({
        weekRef: '2026-W10',
        sourceMonthRef: '2026-02',
        subjectType: 'keyResult',
        subjectId: 'kr-1',
        activityState: 'active',
      } as CreateCadencedWeekStatePayload)
    ).toThrow('sourceMonthRef must overlap CadencedWeekState.weekRef')
  })

  it('validates hierarchical initiative scheduling', () => {
    expect(() =>
      normalizeInitiativePlanStatePayload({
        initiativeId: 'initiative-1',
        monthRef: '2026-03',
        weekRef: '2026-W10',
        dayRef: '2026-04-01',
      } as CreateInitiativePlanStatePayload)
    ).toThrow('dayRef must belong to weekRef')
  })

  it('requires tracker entries to use a matching periodRef type', () => {
    expect(() =>
      normalizeTrackerEntryPayload({
        trackerId: 'tracker-1',
        periodType: 'week',
        periodRef: '2026-03-12',
        value: 4,
      } as CreateTrackerEntryPayload)
    ).toThrow('periodRef must match TrackerEntry.periodType')
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
