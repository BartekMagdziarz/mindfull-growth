import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import {
  buildMonthlySliceBarSlots,
  buildMonthlySliceCompletionSlots,
  buildMonthlySliceValueLineSlots,
} from '@/services/monthlySliceChartData'
import { getChildPeriods } from '@/utils/periods'

const monthRef = '2026-05' as MonthRef
const weeks = getChildPeriods(monthRef) as WeekRef[]

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Walk',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 1 },
    status: 'open',
    ...overrides,
  }
}

function makeKR(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: 'kr-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'KR',
    goalId: 'goal-1',
    isActive: true,
    cadence: 'weekly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 5 },
    status: 'open',
    ...overrides,
  }
}

function makeEntry(
  subjectId: string,
  dayRef: string,
  value: number | null = 1,
  subjectType: 'habit' | 'keyResult' | 'tracker' = 'habit',
): DailyMeasurementEntry {
  return {
    id: `${subjectId}-${dayRef}`,
    createdAt: `${dayRef}T08:00:00.000Z`,
    updatedAt: `${dayRef}T08:00:00.000Z`,
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
    value,
  }
}

function makeCompletionTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Walk anytime',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    status: 'open',
    ...overrides,
  }
}

describe('buildMonthlySliceCompletionSlots', () => {
  it('returns one slot per week of the month', () => {
    const slots = buildMonthlySliceCompletionSlots(
      makeHabit(),
      [],
      monthRef,
      '2026-05-31' as DayRef,
    )
    expect(slots.length).toBe(weeks.length)
  })

  it('labels each slot with W{NN}', () => {
    const slots = buildMonthlySliceCompletionSlots(
      makeHabit(),
      [],
      monthRef,
      '2026-05-31' as DayRef,
    )
    for (const slot of slots) {
      expect(slot.label).toMatch(/^W\d{2}$/)
    }
  })

  it('marks future weeks as future state when todayDayRef is early', () => {
    const slots = buildMonthlySliceCompletionSlots(
      makeHabit(),
      [],
      monthRef,
      '2026-05-01' as DayRef,
    )
    // Last slot (latest week, e.g. W22) starts later in the month → 'future'.
    const last = slots[slots.length - 1]
    expect(last.state).toBe('future')
    expect(last.isFuture).toBe(true)
  })

  it('marks past weeks with met evaluation as done', () => {
    // Weekly habit with target min=1: a single completion entry per week →
    // each past week becomes 'done'.
    const entries: DailyMeasurementEntry[] = []
    for (const weekRef of weeks) {
      const days = getChildPeriods(weekRef) as DayRef[]
      const inMay = days.find((d) => d.startsWith('2026-05'))
      if (inMay) entries.push(makeEntry('habit-1', inMay))
    }
    const slots = buildMonthlySliceCompletionSlots(
      makeHabit({ id: 'habit-1' }),
      entries,
      monthRef,
      '2026-05-31' as DayRef,
    )
    const doneSlots = slots.filter((s) => s.state === 'done')
    expect(doneSlots.length).toBeGreaterThan(0)
  })

  it('clips current week evaluation to todayDayRef', () => {
    // Today on May 15 (Friday W20 in ISO 2026 calendar). The current-week
    // slot must report `isToday=true` and the future slots must be `future`.
    const slots = buildMonthlySliceCompletionSlots(
      makeHabit(),
      [],
      monthRef,
      '2026-05-15' as DayRef,
    )
    const currentSlots = slots.filter((s) => s.isToday)
    expect(currentSlots.length).toBe(1)
  })

  it('renders past entries on a target-less tracker as done (not neutral)', () => {
    // Tracker with completion entryMode and no target. buildMeasurementSummary
    // leaves evaluationStatus undefined for such subjects — the slot resolver
    // must promote entry-bearing past weeks to `done` instead of falling back
    // to the empty `future` state.
    const tracker = makeCompletionTracker({ id: 'walk-tracker' })
    const entries: DailyMeasurementEntry[] = []
    for (const weekRef of weeks) {
      const days = getChildPeriods(weekRef) as DayRef[]
      const inMay = days.find((d) => d.startsWith('2026-05'))
      if (inMay) entries.push(makeEntry('walk-tracker', inMay, 1, 'tracker'))
    }
    const slots = buildMonthlySliceCompletionSlots(
      tracker,
      entries,
      monthRef,
      '2026-05-31' as DayRef,
    )
    const doneSlots = slots.filter((s) => s.state === 'done')
    expect(doneSlots.length).toBeGreaterThan(0)
  })

  it('exposes entryCount as the slot value for completion subjects', () => {
    // Two entries in the same week should bump that slot's value to 2, so
    // the bars chart can render a taller bar there than in a single-entry week.
    const tracker = makeCompletionTracker({ id: 'walk-tracker' })
    const entries: DailyMeasurementEntry[] = [
      makeEntry('walk-tracker', '2026-05-05', 1, 'tracker'),
      makeEntry('walk-tracker', '2026-05-06', 1, 'tracker'),
      makeEntry('walk-tracker', '2026-05-12', 1, 'tracker'),
    ]
    const slots = buildMonthlySliceCompletionSlots(
      tracker,
      entries,
      monthRef,
      '2026-05-31' as DayRef,
    )
    const valuedSlots = slots.filter((s) => (s.value ?? 0) > 0)
    expect(valuedSlots.length).toBeGreaterThanOrEqual(2)
    const maxValue = Math.max(...valuedSlots.map((s) => s.value ?? 0))
    expect(maxValue).toBeGreaterThanOrEqual(2)
  })
})

describe('buildMonthlySliceBarSlots', () => {
  it('returns one slot per week with cumulative counter value', () => {
    const entries = [
      makeEntry('kr-1', '2026-05-04', 2),
      makeEntry('kr-1', '2026-05-05', 3),
      makeEntry('kr-1', '2026-05-11', 1),
    ]
    const slots = buildMonthlySliceBarSlots(
      makeKR({ id: 'kr-1' }),
      entries,
      monthRef,
      '2026-05-31' as DayRef,
    )
    expect(slots.length).toBe(weeks.length)
    // At least one slot should have a value > 0.
    const valued = slots.filter((s) => typeof s.value === 'number' && (s.value ?? 0) > 0)
    expect(valued.length).toBeGreaterThan(0)
  })

  it('returns undefined value for future weeks', () => {
    const slots = buildMonthlySliceBarSlots(
      makeKR(),
      [],
      monthRef,
      '2026-05-01' as DayRef,
    )
    const future = slots.filter((s) => s.isFuture)
    expect(future.length).toBeGreaterThan(0)
    for (const slot of future) {
      expect(slot.value).toBeUndefined()
    }
  })
})

describe('buildMonthlySliceValueLineSlots', () => {
  it('produces the same shape as bar slots', () => {
    const bar = buildMonthlySliceBarSlots(
      makeKR(),
      [],
      monthRef,
      '2026-05-31' as DayRef,
    )
    const line = buildMonthlySliceValueLineSlots(
      makeKR(),
      [],
      monthRef,
      '2026-05-31' as DayRef,
    )
    expect(line.length).toBe(bar.length)
  })
})
