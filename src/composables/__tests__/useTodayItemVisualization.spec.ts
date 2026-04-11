import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Habit, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'

const WEEK_REF = '2026-W10' as WeekRef
const MONTH_REF = '2026-03' as MonthRef
const TODAY = '2026-03-12' as DayRef

function makeEntry(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  dayRef: string,
  value: number | null = null,
): DailyMeasurementEntry {
  return {
    id: `entry-${subjectId}-${dayRef}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
    value,
  }
}

function makePlanning(overrides: Partial<MeasurementPlanningSummary> = {}): MeasurementPlanningSummary {
  return {
    scheduleScope: 'whole-week',
    scheduledDayRefs: [],
    ...overrides,
  }
}

function makeSummary(overrides: Partial<MeasurementSummary> = {}): MeasurementSummary {
  return {
    entryMode: 'counter',
    cadence: 'weekly',
    entryCount: 0,
    periodRef: WEEK_REF,
    ...overrides,
  }
}

function makeHabit(id: string, overrides: Partial<Habit> = {}): Habit {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    title: `Habit ${id}`,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...overrides,
  }
}

function makeTracker(id: string, overrides: Partial<Tracker> = {}): Tracker {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    title: `Tracker ${id}`,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'value',
    status: 'open',
    ...overrides,
  }
}

function makeMeasurementItem(
  subjectType: MeasurementSubjectType,
  subject: Habit | Tracker,
  measurement: MeasurementSummary,
  planning: MeasurementPlanningSummary = makePlanning(),
  todayEntry?: DailyMeasurementEntry,
): TodayMeasurementItem {
  return {
    kind: 'measurement',
    key: `${subjectType}:${subject.id}`,
    panelType: subjectType,
    subjectType,
    subject,
    planning,
    measurement,
    todayEntry,
    contextPeriodRef: measurement.periodRef,
    sectionId: 'week',
    isScheduledToday: false,
    canHide: true,
    canReschedule: false,
    canDelete: false,
  }
}

function runVisualization(
  item: TodayMeasurementItem,
  rawEntries: DailyMeasurementEntry[],
  allDayAssignments: MeasurementDayAssignment[] = [],
) {
  return useTodayItemVisualization(
    ref(item as TodayItem),
    ref(rawEntries),
    ref(allDayAssignments),
    ref(TODAY),
  )
}

describe('useTodayItemVisualization', () => {
  it('routes tracker value items to valueLineSlots', () => {
    const tracker = makeTracker('tracker-1')
    const item = makeMeasurementItem(
      'tracker',
      tracker,
      makeSummary({ entryMode: 'value', actualValue: 6.5, periodRef: WEEK_REF }),
    )
    const viz = runVisualization(item, [
      makeEntry('tracker', 'tracker-1', '2026-03-10', 6.1),
      makeEntry('tracker', 'tracker-1', '2026-03-12', 6.5),
    ])

    expect(viz.vizType.value).toBe('value-line')
    expect(viz.valueLineSlots.value).toHaveLength(7)
    expect(viz.barSlots.value).toEqual([])
    expect(viz.completionSlots.value).toEqual([])
    expect(viz.targetValue.value).toBeUndefined()
  })

  it('routes habit value average items to valueLineSlots', () => {
    const habit = makeHabit('habit-average', {
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const item = makeMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'value',
        actualValue: 7.1,
        target: habit.target,
        periodRef: WEEK_REF,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('habit', 'habit-average', '2026-03-09', 6.8),
      makeEntry('habit', 'habit-average', '2026-03-12', 7.4),
    ])

    expect(viz.vizType.value).toBe('value-line')
    expect(viz.valueLineSlots.value).toHaveLength(7)
    expect(viz.barSlots.value).toEqual([])
    expect(viz.completionSlots.value).toEqual([])
    expect(viz.targetValue.value).toBe(7)
  })

  it('routes habit value sum items to barSlots', () => {
    const habit = makeHabit('habit-sum', {
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 20 },
    })
    const item = makeMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'value',
        actualValue: 12,
        target: habit.target,
        periodRef: WEEK_REF,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('habit', 'habit-sum', '2026-03-10', 5),
      makeEntry('habit', 'habit-sum', '2026-03-12', 7),
    ])

    expect(viz.vizType.value).toBe('daily-bars')
    expect(viz.barSlots.value).toHaveLength(7)
    expect(viz.valueLineSlots.value).toEqual([])
    expect(viz.completionSlots.value).toEqual([])
  })

  it('routes counter items to barSlots', () => {
    const habit = makeHabit('habit-counter', {
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 10 },
    })
    const item = makeMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'counter',
        actualValue: 8,
        target: habit.target,
        periodRef: WEEK_REF,
      }),
      makePlanning({ scheduleScope: 'whole-week' }),
      makeEntry('habit', 'habit-counter', '2026-03-12', 3),
    )
    const viz = runVisualization(item, [
      makeEntry('habit', 'habit-counter', '2026-03-10', 5),
      makeEntry('habit', 'habit-counter', '2026-03-12', 3),
    ])

    expect(viz.vizType.value).toBe('daily-bars')
    expect(viz.barSlots.value).toHaveLength(7)
    expect(viz.valueLineSlots.value).toEqual([])
    expect(viz.completionSlots.value).toEqual([])
  })

  it('routes completion items to completionSlots', () => {
    const habit = makeHabit('habit-completion', {
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
    })
    const item = makeMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'completion',
        actualValue: 1,
        target: habit.target,
        periodRef: WEEK_REF,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('habit', 'habit-completion', '2026-03-10'),
    ])

    expect(viz.vizType.value).toBe('completion-dots')
    expect(viz.completionSlots.value.length).toBeGreaterThan(0)
    expect(viz.barSlots.value).toEqual([])
    expect(viz.valueLineSlots.value).toEqual([])
  })

  it('routes rating trackers to rating-segmented and reuses bar slots', () => {
    const tracker = makeTracker('tracker-rating', { entryMode: 'rating' })
    const item = makeMeasurementItem(
      'tracker',
      tracker,
      makeSummary({ entryMode: 'rating', actualValue: 4, periodRef: WEEK_REF }),
      makePlanning({ scheduleScope: 'whole-week' }),
      makeEntry('tracker', 'tracker-rating', '2026-03-12', 4),
    )
    const viz = runVisualization(item, [
      makeEntry('tracker', 'tracker-rating', '2026-03-10', 3),
      makeEntry('tracker', 'tracker-rating', '2026-03-12', 4),
    ])

    // Story 3: rating entries take the segmented primitive but the composable
    // reuses `barSlots` because the slot shape is identical to daily bars.
    expect(viz.vizType.value).toBe('rating-segmented')
    expect(viz.barSlots.value).toHaveLength(7)
    expect(viz.valueLineSlots.value).toEqual([])
    expect(viz.completionSlots.value).toEqual([])
  })
})

describe('useTodayItemVisualization — monthly cadence', () => {
  function makeMonthlyMeasurementItem(
    subjectType: MeasurementSubjectType,
    subject: Habit | Tracker,
    measurement: MeasurementSummary,
    todayEntry?: DailyMeasurementEntry,
  ): TodayMeasurementItem {
    return {
      kind: 'measurement',
      key: `${subjectType}:${subject.id}`,
      panelType: subjectType,
      subjectType,
      subject,
      planning: { scheduleScope: 'whole-month', scheduledDayRefs: [] } as MeasurementPlanningSummary,
      measurement,
      todayEntry,
      contextPeriodRef: MONTH_REF,
      sectionId: 'month',
      isScheduledToday: false,
      canHide: true,
      canReschedule: false,
      canDelete: false,
    }
  }

  it('routes monthly counter habit + count target to counter-ring', () => {
    const habit = makeHabit('monthly-counter', {
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 50 },
    })
    const item = makeMonthlyMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'counter',
        cadence: 'monthly',
        actualValue: 32,
        entryCount: 10,
        target: habit.target,
        periodRef: MONTH_REF,
        evaluationStatus: undefined,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('habit', 'monthly-counter', '2026-03-02', 3),
      makeEntry('habit', 'monthly-counter', '2026-03-10', 5),
    ])

    expect(viz.vizType.value).toBe('counter-ring')
    expect(viz.counterRingData.value).toBeDefined()
    expect(viz.counterRingData.value?.current).toBe(32)
    expect(viz.counterRingData.value?.target).toBe(50)
    expect(viz.valueSparklineData.value).toBeUndefined()
    expect(viz.ratingSmoothData.value).toBeUndefined()
    expect(viz.summaryNumberData.value).toBeUndefined()
    expect(viz.barSlots.value).toEqual([])
  })

  it('routes monthly value tracker to value-sparkline-summary', () => {
    const tracker = makeTracker('monthly-value', {
      cadence: 'monthly',
      entryMode: 'value',
    })
    const item = makeMonthlyMeasurementItem(
      'tracker',
      tracker,
      makeSummary({
        entryMode: 'value',
        cadence: 'monthly',
        actualValue: 74,
        entryCount: 3,
        periodRef: MONTH_REF,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('tracker', 'monthly-value', '2026-03-01', 72),
      makeEntry('tracker', 'monthly-value', '2026-03-08', 73),
      makeEntry('tracker', 'monthly-value', '2026-03-12', 74),
    ])

    expect(viz.vizType.value).toBe('value-sparkline-summary')
    expect(viz.valueSparklineData.value).toBeDefined()
    expect(viz.valueSparklineData.value?.points).toHaveLength(3)
    expect(viz.valueSparklineData.value?.aggregationLabel).toBe('last')
    expect(viz.valueSparklineData.value?.hasData).toBe(true)
    expect(viz.counterRingData.value).toBeUndefined()
    expect(viz.ratingSmoothData.value).toBeUndefined()
    expect(viz.summaryNumberData.value).toBeUndefined()
    expect(viz.valueLineSlots.value).toEqual([])
  })

  it('routes monthly rating habit + rating target to rating-smooth', () => {
    const habit = makeHabit('monthly-rating', {
      cadence: 'monthly',
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const item = makeMonthlyMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'rating',
        cadence: 'monthly',
        actualValue: 7.8,
        entryCount: 12,
        target: habit.target,
        periodRef: MONTH_REF,
        evaluationStatus: 'met',
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('habit', 'monthly-rating', '2026-03-05', 8),
      makeEntry('habit', 'monthly-rating', '2026-03-12', 7),
    ])

    expect(viz.vizType.value).toBe('rating-smooth')
    expect(viz.ratingSmoothData.value).toBeDefined()
    expect(viz.ratingSmoothData.value?.averageValue).toBeCloseTo(7.8)
    expect(viz.ratingSmoothData.value?.targetValue).toBe(7)
    expect(viz.ratingSmoothData.value?.targetOperator).toBe('gte')
    expect(viz.ratingSmoothData.value?.status).toBe('met')
    expect(viz.counterRingData.value).toBeUndefined()
    expect(viz.valueSparklineData.value).toBeUndefined()
    expect(viz.summaryNumberData.value).toBeUndefined()
    expect(viz.barSlots.value).toEqual([])
  })

  it('routes monthly completion tracker to summary-number with days-logged', () => {
    const tracker = makeTracker('monthly-completion', {
      cadence: 'monthly',
      entryMode: 'completion',
    })
    const item = makeMonthlyMeasurementItem(
      'tracker',
      tracker,
      makeSummary({
        entryMode: 'completion',
        cadence: 'monthly',
        entryCount: 9,
        periodRef: MONTH_REF,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('tracker', 'monthly-completion', '2026-03-01'),
      makeEntry('tracker', 'monthly-completion', '2026-03-03'),
    ])

    expect(viz.vizType.value).toBe('summary-number')
    expect(viz.summaryNumberData.value).toBeDefined()
    expect(viz.summaryNumberData.value?.sublabelKind).toBe('days-logged')
    expect(viz.summaryNumberData.value?.value).toBe(9)
    expect(viz.counterRingData.value).toBeUndefined()
    expect(viz.valueSparklineData.value).toBeUndefined()
    expect(viz.ratingSmoothData.value).toBeUndefined()
  })

  it('routes monthly counter tracker to summary-number with total-sum', () => {
    const tracker = makeTracker('monthly-counter-tracker', {
      cadence: 'monthly',
      entryMode: 'counter',
    })
    const item = makeMonthlyMeasurementItem(
      'tracker',
      tracker,
      makeSummary({
        entryMode: 'counter',
        cadence: 'monthly',
        actualValue: 120,
        entryCount: 15,
        periodRef: MONTH_REF,
      }),
    )
    const viz = runVisualization(item, [
      makeEntry('tracker', 'monthly-counter-tracker', '2026-03-01', 10),
    ])

    expect(viz.vizType.value).toBe('summary-number')
    expect(viz.summaryNumberData.value?.sublabelKind).toBe('total-sum')
    expect(viz.summaryNumberData.value?.value).toBe(120)
  })
})
