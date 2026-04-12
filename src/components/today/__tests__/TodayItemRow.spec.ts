import { describe, expect, it } from 'vitest'
import { render, type RenderOptions } from '@testing-library/vue'
import TodayItemRow from '@/components/today/TodayItemRow.vue'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Habit, Initiative, Tracker } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  InitiativePlanState,
  MeasurementDayAssignment,
  MeasurementSubjectType,
} from '@/domain/planningState'
import type { MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import type {
  TodayInitiativeItem,
  TodayItem,
  TodayMeasurementItem,
} from '@/services/todayViewQueries'

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

function makeInitiativeItem(id: string, title: string): TodayInitiativeItem {
  const initiative: Initiative = {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    title,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    status: 'open',
  }
  const planState: InitiativePlanState = {
    id: `plan-${id}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    initiativeId: id,
    monthRef: MONTH_REF,
    weekRef: WEEK_REF,
    dayRef: TODAY,
  }
  return {
    kind: 'initiative',
    key: `initiative:${id}`,
    panelType: 'initiative',
    initiative,
    planState,
    contextPeriodRef: TODAY,
    sectionId: 'scheduled',
    isScheduledToday: true,
    canHide: false,
    canReschedule: true,
    canDelete: true,
  }
}

function renderRow(
  item: TodayItem,
  rawEntries: DailyMeasurementEntry[] = [],
  allDayAssignments: MeasurementDayAssignment[] = [],
  options: RenderOptions<typeof TodayItemRow> = {},
) {
  return render(TodayItemRow, {
    ...options,
    props: {
      item,
      todayDayRef: TODAY,
      rawEntries,
      allDayAssignments,
      isPending: false,
    },
  })
}

describe('TodayItemRow — unified three-zone layout', () => {
  it('renders weekly counter habit with DailyBarsChart, AggregateBar, and CounterEntryControl', () => {
    const habit = makeHabit('habit-counter', {
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 10 },
    })
    const item = makeMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'counter',
        actualValue: 7,
        target: habit.target,
        periodRef: WEEK_REF,
      }),
      makePlanning(),
      makeEntry('habit', 'habit-counter', TODAY, 3),
    )
    const { container, getByText, getByLabelText } = renderRow(item, [
      makeEntry('habit', 'habit-counter', '2026-03-10', 4),
      makeEntry('habit', 'habit-counter', TODAY, 3),
    ])

    // Title button rendered
    expect(getByText('Habit habit-counter')).toBeTruthy()
    // CounterEntryControl's Increment button present on the right
    expect(getByLabelText('Increment')).toBeTruthy()
    // The chart area uses the three-zone wrapper (left flex:2, right flex:1)
    expect(container.querySelector('[style*="flex: 2 1 0"]')).toBeTruthy()
    expect(container.querySelector('[style*="flex: 1 1 0"]')).toBeTruthy()
  })

  it('renders weekly value habit with ValueLineChart and TodayEntryInput', () => {
    const habit = makeHabit('habit-value', {
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
    const { container } = renderRow(item, [
      makeEntry('habit', 'habit-value', '2026-03-10', 6.8),
    ])

    // Value entries render a number input in the right column
    const numberInput = container.querySelector('input[type="number"]')
    expect(numberInput).toBeTruthy()
    // No Increment button for value mode
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders weekly rating tracker with RatingSegmentedBars and TodayEntryInput', () => {
    const tracker = makeTracker('tracker-rating', { entryMode: 'rating' })
    const item = makeMeasurementItem(
      'tracker',
      tracker,
      makeSummary({ entryMode: 'rating', actualValue: 4, periodRef: WEEK_REF }),
      makePlanning(),
      makeEntry('tracker', 'tracker-rating', TODAY, 4),
    )
    const { container } = renderRow(item, [
      makeEntry('tracker', 'tracker-rating', TODAY, 4),
    ])

    // Rating entries render a number input in the right column
    expect(container.querySelector('input[type="number"]')).toBeTruthy()
    // Counter controls are absent
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders completion-dots with no right column', () => {
    const habit = makeHabit('habit-completion-small', {
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
    const { container } = renderRow(item, [
      makeEntry('habit', 'habit-completion-small', '2026-03-10'),
    ])

    // Left column present, right column absent
    expect(container.querySelector('[style*="flex: 2 1 0"]')).toBeTruthy()
    expect(container.querySelector('[style*="flex: 1 1 0"]')).toBeNull()
    // No right-column inputs
    expect(container.querySelector('input[type="number"]')).toBeNull()
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders completion-ring with no right column for count target > 7', () => {
    const habit = makeHabit('habit-completion-large', {
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 15 },
    })
    const item = makeMeasurementItem(
      'habit',
      habit,
      makeSummary({
        entryMode: 'completion',
        actualValue: 5,
        target: habit.target,
        periodRef: WEEK_REF,
      }),
    )
    const { container } = renderRow(item)

    // Left column present (ring rendered inside)
    expect(container.querySelector('[style*="flex: 2 1 0"]')).toBeTruthy()
    // No right column for completion-ring
    expect(container.querySelector('[style*="flex: 1 1 0"]')).toBeNull()
  })

  it('renders monthly counter habit with CounterRing and CounterEntryControl', () => {
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
      }),
    )
    const { container, getByLabelText } = renderRow(item, [
      makeEntry('habit', 'monthly-counter', '2026-03-02', 3),
    ])

    // CounterEntryControl's Increment button rendered on the right
    expect(getByLabelText('Increment')).toBeTruthy()
    // Both columns present
    expect(container.querySelector('[style*="flex: 2 1 0"]')).toBeTruthy()
    expect(container.querySelector('[style*="flex: 1 1 0"]')).toBeTruthy()
  })

  it('renders monthly value tracker with sparkline and number input', () => {
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
    const { container } = renderRow(item, [
      makeEntry('tracker', 'monthly-value', '2026-03-01', 72),
      makeEntry('tracker', 'monthly-value', '2026-03-08', 73),
    ])

    // Value entry input in the right column
    expect(container.querySelector('input[type="number"]')).toBeTruthy()
    // Counter controls absent
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders monthly rating habit with smooth bar and number input', () => {
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
      }),
    )
    const { container } = renderRow(item, [
      makeEntry('habit', 'monthly-rating', '2026-03-05', 8),
    ])

    // Rating input in the right column
    expect(container.querySelector('input[type="number"]')).toBeTruthy()
  })

  it('renders monthly completion tracker with summary number and check button (no number input)', () => {
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
    const { container } = renderRow(item, [
      makeEntry('tracker', 'monthly-completion', '2026-03-01'),
    ])

    // Right column renders with a check button, not a number input
    expect(container.querySelector('[style*="flex: 1 1 0"]')).toBeTruthy()
    expect(container.querySelector('input[type="number"]')).toBeNull()
    // Counter controls absent
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders initiative with title row + inlined checkmark and no three-zone grid', () => {
    const item = makeInitiativeItem('init-1', 'Book photographer')
    const { container, getByText } = renderRow(item)

    expect(getByText('Book photographer')).toBeTruthy()
    // Initiative uses the compact title row layout — no three-zone grid,
    // so no flex:2/flex:1 wrappers.
    expect(container.querySelector('[style*="flex: 2 1 0"]')).toBeNull()
    expect(container.querySelector('[style*="flex: 1 1 0"]')).toBeNull()
  })
})
