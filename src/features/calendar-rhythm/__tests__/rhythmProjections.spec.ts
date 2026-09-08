import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import {
  effectiveTarget,
  objectCompletion,
  periodRating,
  periodStats,
  resolveMarkKind,
  seriesFor,
  unitsFor,
} from '../rhythmProjections'
import { emptyRhythmScenario, type RhythmObject, type RhythmScenario } from '../rhythmScenario'

const CLOCK = '2026-07-15' as DayRef
const MONTH = '2026-07' as MonthRef
const WEEK = '2026-W28' as WeekRef // Mon 13 – Sun 19 July

function habit(overrides: Partial<RhythmObject> = {}): RhythmObject {
  return {
    key: 'habit:h1',
    title: 'Rozciąganie',
    family: 'habit',
    priorityKeys: ['p1'],
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 3 },
    evidenceRole: 'action',
    ...overrides,
  }
}

function scenario(patch: Partial<RhythmScenario> = {}): RhythmScenario {
  return { ...emptyRhythmScenario(CLOCK), ...patch }
}

describe('unitsFor', () => {
  it('gives a month its real weeks and marks the ones that reach outside it', () => {
    const units = unitsFor('month', MONTH, CLOCK)

    expect(units).toHaveLength(5)
    expect(units[0].kind).toBe('week')
    expect(units[0].partial).toBe(true)
    expect(units[0].visibleBounds.start).toBe('2026-07-01')
    expect(units[0].fullBounds.start).toBe('2026-06-29')
    expect(units.find(unit => unit.state === 'current')?.ref).toBe(WEEK)
  })

  it('gives a week seven days and a year twelve months', () => {
    expect(unitsFor('week', WEEK, CLOCK).map(unit => unit.label)).toEqual(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'])
    expect(unitsFor('year', '2026', CLOCK)).toHaveLength(12)
  })
})

describe('seriesFor', () => {
  it('reads a missing day as "no record", not as a zero', () => {
    const object = habit()
    const state = scenario({
      objects: [object],
      entries: [
        { id: 'e1', objectKey: object.key, dayRef: '2026-07-13' as DayRef },
        { id: 'e2', objectKey: object.key, dayRef: '2026-07-15' as DayRef },
      ],
    })

    const series = seriesFor(state, object, unitsFor('month', MONTH, CLOCK), 'month', MONTH)
    const currentWeek = series.points.find(point => point.unitRef === WEEK)

    expect(currentWeek?.value).toBe(2)
    expect(series.points[0].value).toBeNull()
    expect(series.points[0].readout).toBe('Brak zapisu')
  })

  it('never shows a target for a partial week and never counts future units', () => {
    const object = habit()
    const state = scenario({
      objects: [object],
      assignments: [{ id: 'a1', objectKey: object.key, scope: { kind: 'week', ref: WEEK } }],
    })

    const series = seriesFor(state, object, unitsFor('month', MONTH, CLOCK), 'month', MONTH)

    expect(series.points[0].target).toBeNull() // boundary week
    expect(series.points.find(point => point.unitRef === WEEK)?.target).toBe(3)
    const future = series.points.filter(point => point.state === 'future')
    expect(future.every(point => point.value === null)).toBe(true)
  })

  it('sums a monthly-cadence object into Σ and keeps a whole-period plan out of it', () => {
    const object = habit({ key: 'habit:h2', cadence: 'monthly', target: { kind: 'count', operator: 'min', value: 4 } })
    const state = scenario({
      objects: [object],
      entries: [
        { id: 'e1', objectKey: object.key, dayRef: '2026-07-02' as DayRef },
        { id: 'e2', objectKey: object.key, dayRef: '2026-07-14' as DayRef },
      ],
      assignments: [{ id: 'a1', objectKey: object.key, scope: { kind: 'month', ref: MONTH } }],
    })

    const series = seriesFor(state, object, unitsFor('month', MONTH, CLOCK), 'month', MONTH)

    expect(series.periodTotal).toEqual(expect.objectContaining({ value: 2, target: 4 }))
    expect(series.periodPlan).toBeUndefined()
  })
})

describe('effectiveTarget', () => {
  it('cascades base → month override → week override', () => {
    const object = habit()
    const state = scenario({
      objects: [object],
      overrides: [
        { objectKey: object.key, scope: { kind: 'month', ref: MONTH }, target: { kind: 'count', operator: 'min', value: 5 } },
        { objectKey: object.key, scope: { kind: 'week', ref: WEEK }, target: { kind: 'count', operator: 'min', value: 2 } },
      ],
    })

    expect(effectiveTarget(state, object, MONTH)?.value).toBe(5)
    expect(effectiveTarget(state, object, MONTH, WEEK)?.value).toBe(2)
    expect(effectiveTarget(scenario({ objects: [object] }), object, MONTH)?.value).toBe(3)
  })
})

describe('resolveMarkKind', () => {
  it('follows entry mode, target and cadence', () => {
    expect(resolveMarkKind(habit(), 'month')).toBe('slots')
    expect(resolveMarkKind(habit({ target: { kind: 'count', operator: 'min', value: 12 } }), 'month')).toBe('day-slots')
    expect(resolveMarkKind(habit({ entryMode: 'rating', target: undefined }), 'month')).toBe('rating-point')
    expect(resolveMarkKind(habit({ entryMode: 'counter' }), 'month')).toBe('bar-target')
    expect(resolveMarkKind(habit(), 'year')).toBe('bar-target')
  })
})

describe('objectCompletion', () => {
  it('checks only closed weeks that were planned or recorded', () => {
    const object = habit()
    const state = scenario({
      objects: [object],
      // W26 (29.06–05.07) planned and met, W27 (06–12.07) planned and missed,
      // the remaining weeks are neither planned nor recorded.
      assignments: [
        { id: 'a1', objectKey: object.key, scope: { kind: 'week', ref: '2026-W26' as WeekRef } },
        { id: 'a2', objectKey: object.key, scope: { kind: 'week', ref: '2026-W27' as WeekRef } },
      ],
      entries: [
        { id: 'e1', objectKey: object.key, dayRef: '2026-06-29' as DayRef },
        { id: 'e2', objectKey: object.key, dayRef: '2026-06-30' as DayRef },
        { id: 'e3', objectKey: object.key, dayRef: '2026-07-01' as DayRef },
        { id: 'e4', objectKey: object.key, dayRef: '2026-07-07' as DayRef },
      ],
    })

    const completion = objectCompletion(state, object, 'month', MONTH, unitsFor('month', MONTH, CLOCK))

    expect(completion.basis).toBe('targets')
    expect(completion.ratio).toEqual({ done: 1, total: 2 })
  })

  it('falls back to presence for an object without a target', () => {
    const object = habit({ key: 'tracker:t1', family: 'tracker', target: undefined, evidenceRole: 'observation', entryMode: 'rating' })
    const state = scenario({
      objects: [object],
      entries: [{ id: 'e1', objectKey: object.key, dayRef: '2026-07-14' as DayRef, value: 4 }],
    })

    const completion = objectCompletion(state, object, 'month', MONTH, unitsFor('month', MONTH, CLOCK))

    expect(completion.basis).toBe('presence')
    expect(completion.ratio.done).toBe(1)
  })
})

describe('periodStats and periodRating', () => {
  it('counts reflections of closed sub-periods only', () => {
    const state = scenario({
      weeklyReflections: [
        {
          weekRef: '2026-W26' as WeekRef,
          status: 'done',
          effort: [3, 3, 3, 3],
          state: [4, 4, 4, 4],
          demands: [2, 2, 2, 2],
          anchors: { good: '', hard: '', lessons: '' },
        },
      ],
    })

    const stats = periodStats(state, 'month', MONTH, unitsFor('month', MONTH, CLOCK))

    // W26 and W27 are closed on 15 July; only W26 carries a reflection.
    expect(stats.reflections).toEqual({ done: 1, total: 2 })
  })

  it('reads the month rating from its own reflection and the year from its months', () => {
    const monthly = {
      monthRef: MONTH,
      status: 'done' as const,
      compass: [4, 4, 2, null, 5],
      anchors: { proud: '', challenges: '', growth: '' },
      priorityVerdicts: [],
    }
    const june = { ...monthly, monthRef: '2026-06' as MonthRef, compass: [2, 2, 2, 2, 2] }
    const state = scenario({ monthlyReflections: [monthly, june] })

    const month = periodRating(state, 'month', MONTH, unitsFor('month', MONTH, CLOCK))
    expect(month.compass).toEqual([4, 4, 2, null, 5])
    expect(month.mean).toBeCloseTo(3.75)

    // Only closed months feed the year: July is still running on 15 July.
    const year = periodRating(state, 'year', '2026', unitsFor('year', '2026', CLOCK))
    expect(year.months).toEqual({ done: 1, total: 6 })
    expect(year.compass).toEqual([2, 2, 2, 2, 2])
  })
})
