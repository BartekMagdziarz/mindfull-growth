import { describe, it, expect } from 'vitest'
import type { MonthRef, DayRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { Quadrant } from '@/domain/emotion'
import type { MonthlyReflection, WeeklyReflection } from '@/domain/reflection'
import type { CalendarYearMonthSummary, YearMonthPillData } from '@/services/calendarViewQueries'
import {
  dayRings,
  matrixFromReflection,
  monthlyDimensionBars,
  monthPriorities,
  nonNullMean,
  pct,
  pillFraction,
  quadrantSegments,
  ratingToValue,
  ringsForPeriod,
  yearMonthRings,
} from '../streamData'
import { divergingRatingColor } from '@/utils/ratingGradient'

describe('streamData · number helpers', () => {
  it('pct rounds and guards zero denominator', () => {
    expect(pct(1, 2)).toBe(50)
    expect(pct(3, 4)).toBe(75)
    expect(pct(1, 3)).toBe(33)
    expect(pct(0, 0)).toBeNull()
    expect(pct(5, 0)).toBeNull()
  })

  it('nonNullMean ignores nulls and returns null when empty', () => {
    expect(nonNullMean([1, null, 0])).toBe(0.5)
    expect(nonNullMean([null, null])).toBeNull()
    expect(nonNullMean([])).toBeNull()
  })

  it('pillFraction maps monthly status and weekly ratios', () => {
    expect(pillFraction({ id: 'a', title: 'A', cadence: 'monthly', monthlyStatus: 'met' })).toBe(1)
    expect(pillFraction({ id: 'a', title: 'A', cadence: 'monthly', monthlyStatus: 'missed' })).toBe(0)
    expect(
      pillFraction({ id: 'a', title: 'A', cadence: 'monthly', monthlyStatus: 'no-data' }),
    ).toBeNull()
    expect(
      pillFraction({ id: 'a', title: 'A', cadence: 'weekly', weeksMet: 2, weeksTotal: 4 }),
    ).toBe(0.5)
    expect(pillFraction({ id: 'a', title: 'A', cadence: 'weekly', weeksMet: 0, weeksTotal: 0 })).toBeNull()
  })

  it('ratingToValue normalises 1–5 ratings to 0..1', () => {
    expect(ratingToValue(5)).toBe(1)
    expect(ratingToValue(1)).toBeCloseTo(0.2)
    expect(ratingToValue(null)).toBeNull()
    expect(ratingToValue(undefined)).toBeNull()
  })
})

describe('streamData · emotion segments', () => {
  it('keeps only non-empty quadrants in canonical order', () => {
    const counts: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 2,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 1,
      'low-energy-low-pleasantness': 3,
    }
    const segments = quadrantSegments(counts)
    expect(segments).toHaveLength(3)
    expect(segments.map((s) => s.weight)).toEqual([2, 1, 3])
  })

  it('returns no segments when there are no emotions', () => {
    expect(
      quadrantSegments({
        'high-energy-high-pleasantness': 0,
        'high-energy-low-pleasantness': 0,
        'low-energy-high-pleasantness': 0,
        'low-energy-low-pleasantness': 0,
      }),
    ).toHaveLength(0)
  })
})

describe('streamData · matrix from weekly reflection', () => {
  it('renders 4 area rows × 3 empty cells when the week has no reflection', () => {
    const matrix = matrixFromReflection(undefined)
    expect(matrix.map((row) => row.areaKey)).toEqual(['body', 'emotions', 'tasks', 'closeOnes'])
    for (const row of matrix) {
      expect(row.cells.map((cell) => cell.section)).toEqual(['demands', 'actions', 'state'])
      expect(row.cells.every((cell) => cell.rating === null && cell.color === null)).toBe(true)
    }
  })

  it('passes raw ratings through and inverts only the Demands column colors', () => {
    const reflection = {
      taskLoadRating: 5,
      physicalIntensityRating: 1,
      moodRating: 5,
      energyRating: 3,
      calmRating: null,
    } as unknown as WeeklyReflection
    const matrix = matrixFromReflection(reflection)
    const tasks = matrix.find((row) => row.areaKey === 'tasks')!
    const body = matrix.find((row) => row.areaKey === 'body')!
    const emotions = matrix.find((row) => row.areaKey === 'emotions')!

    // Heavy task load: raw rating kept, color inverted → strong rose (strain).
    const taskDemands = tasks.cells.find((cell) => cell.section === 'demands')!
    expect(taskDemands.rating).toBe(5)
    expect(taskDemands.color).toBe(divergingRatingColor(5, { invert: true }))
    expect(taskDemands.color).toBe('rgb(var(--rating-neg-5))')

    // Light physical load inverts the other way → strong sky (ease).
    const bodyDemands = body.cells.find((cell) => cell.section === 'demands')!
    expect(bodyDemands.color).toBe('rgb(var(--rating-pos-5))')

    // State/Actions columns are not inverted: great mood → strong sky.
    const moodCell = emotions.cells.find((cell) => cell.section === 'state')!
    expect(moodCell.rating).toBe(5)
    expect(moodCell.color).toBe('rgb(var(--rating-pos-5))')

    // Mid rating → neutral stop; unrated cell stays colorless.
    const energyCell = body.cells.find((cell) => cell.section === 'state')!
    expect(energyCell.color).toBe('rgb(var(--rating-neutral))')
    const calmCell = tasks.cells.find((cell) => cell.section === 'state')!
    expect(calmCell.rating).toBeNull()
    expect(calmCell.color).toBeNull()
  })
})

describe('streamData · rings', () => {
  it('future periods read "—" (null, plan-only)', () => {
    const rings = ringsForPeriod([], [], '2020-01' as MonthRef, 'future', '2020-01-31' as DayRef)
    expect(rings.map((r) => r.key)).toEqual(['goals', 'habits', 'trackers'])
    expect(rings.every((r) => r.pct === null && r.planOnly)).toBe(true)
  })

  it('year-month rings are Goals + Habits only (trackers ring dropped)', () => {
    const summary = {
      goalGroups: [
        { goalId: 'g1', pills: [{ cadence: 'weekly', weeksMet: 2, weeksTotal: 4 } as YearMonthPillData] },
      ],
      habitGroups: [{ habitId: 'h1', pill: { cadence: 'monthly', monthlyStatus: 'met' } as YearMonthPillData }],
    } as unknown as CalendarYearMonthSummary
    const rings = yearMonthRings(summary, 'past', 6)
    expect(rings.map((r) => r.key)).toEqual(['goals', 'habits'])
    expect(rings.find((r) => r.key === 'goals')!.pct).toBe(50)
    expect(rings.find((r) => r.key === 'habits')!.pct).toBe(100)
  })

  it('goals ring weights each goal once, not each KR', () => {
    const summary = {
      goalGroups: [
        { goalId: 'g1', pills: [{ cadence: 'monthly', monthlyStatus: 'missed' } as YearMonthPillData] },
        {
          goalId: 'g2',
          pills: [
            { cadence: 'monthly', monthlyStatus: 'met' } as YearMonthPillData,
            { cadence: 'monthly', monthlyStatus: 'met' } as YearMonthPillData,
          ],
        },
      ],
      habitGroups: [],
    } as unknown as CalendarYearMonthSummary
    // goal means: g1 = 0, g2 = 1 → average 0.5 (KR-weighting would give ≈67).
    expect(yearMonthRings(summary, 'past', 6).find((r) => r.key === 'goals')!.pct).toBe(50)
  })

  it('caps weekly attainment to elapsed weeks so a current month is not diluted', () => {
    expect(pillFraction({ id: 'a', title: 'A', cadence: 'weekly', weeksMet: 2, weeksTotal: 4 }, 2)).toBe(1)
    expect(pillFraction({ id: 'a', title: 'A', cadence: 'weekly', weeksMet: 2, weeksTotal: 4 })).toBe(0.5)
  })

  it('day rings measure engagement (objects with an entry that day)', () => {
    const entries = [
      { subjectType: 'keyResult', subjectId: 'k1', dayRef: '2020-01-02', value: 1 },
    ] as DailyMeasurementEntry[]
    const rings = dayRings(new Set(['k1', 'k2']), new Set(['h1']), entries, 'past')
    expect(rings.find((r) => r.key === 'goals')!.pct).toBe(50) // 1 of 2 KRs logged
    expect(rings.find((r) => r.key === 'habits')!.pct).toBe(0) // 0 of 1 habit logged
  })
})

describe('streamData · monthly-dimension bars', () => {
  it('returns the 5 monthly reflection dimensions, dim for future months', () => {
    const bars = monthlyDimensionBars(undefined, 'future')
    expect(bars.map((b) => b.key)).toEqual(['balance', 'purpose', 'growth', 'coherence', 'agency'])
    expect(bars.every((b) => b.value === null)).toBe(true)
  })

  it('is empty when a past month has no monthly reflection', () => {
    const bars = monthlyDimensionBars(undefined, 'past')
    expect(bars.every((b) => b.value === null)).toBe(true)
  })

  it('maps the monthly reflection ratings to bar heights', () => {
    const reflection = {
      balanceRating: 5,
      purposeRating: null,
      growthRating: 3,
      coherenceRating: 1,
      agencyRating: 4,
    } as unknown as MonthlyReflection
    const bars = monthlyDimensionBars(reflection, 'past')
    const byKey = Object.fromEntries(bars.map((b) => [b.key, b.value]))
    expect(byKey.balance).toBe(1) // 5/5
    expect(byKey.purpose).toBeNull() // unrated
    expect(byKey.growth).toBeCloseTo(0.6) // 3/5
    expect(byKey.agency).toBeCloseTo(0.8) // 4/5
  })
})

describe('streamData · month priorities', () => {
  const priorities = new Map<string, { title: string; icon?: string }>([
    ['p1', { title: 'Zdrowie', icon: 'cardiology' }],
    ['p2', { title: 'Kariera' }],
  ])
  const effort = (id: string): number | null => (id === 'p1' ? 4 : null)

  it('resolves top-3 ids to name + effort, padding empty slots with a "—"', () => {
    const out = monthPriorities(['p1', 'p2'], priorities, effort)
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ key: 'p1', name: 'Zdrowie', icon: 'cardiology', rating: 4, empty: false })
    // missing icon falls back to a neutral one; effort null = picked-not-rated
    expect(out[1]).toMatchObject({ key: 'p2', name: 'Kariera', icon: 'flag', rating: null, empty: false })
    expect(out[2].empty).toBe(true)
  })

  it('returns 3 empty slots when nothing is picked', () => {
    const out = monthPriorities(undefined, priorities, effort)
    expect(out).toHaveLength(3)
    expect(out.every((s) => s.empty)).toBe(true)
  })

  it('skips ids whose priority no longer exists, then pads', () => {
    const out = monthPriorities(['p1', 'gone'], priorities, effort)
    expect(out.filter((s) => !s.empty)).toHaveLength(1)
    expect(out[0].key).toBe('p1')
  })

  it('caps at the first 3 ids', () => {
    const out = monthPriorities(['p1', 'p2', 'p1', 'p2'], priorities, effort)
    expect(out.filter((s) => !s.empty)).toHaveLength(3)
  })
})
