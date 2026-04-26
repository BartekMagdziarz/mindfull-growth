import { describe, expect, it } from 'vitest'
import { fireEvent, render, type RenderOptions } from '@testing-library/vue'
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

describe('TodayItemRow — simplified collapsed + expand-on-click layout', () => {
  it('renders weekly counter habit with inline ± controls in title row', () => {
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
    const { getByText, getByLabelText } = renderRow(item, [
      makeEntry('habit', 'habit-counter', '2026-03-10', 4),
      makeEntry('habit', 'habit-counter', TODAY, 3),
    ])

    // Title button rendered
    expect(getByText('Habit habit-counter')).toBeTruthy()
    // Inline counter controls in title row
    expect(getByLabelText('Increment')).toBeTruthy()
    expect(getByLabelText('Decrement')).toBeTruthy()
  })

  it('renders weekly value tracker with click-to-edit value pill (no inline ± buttons)', () => {
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

    // Value mode does not render counter ± controls
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
    expect(container.querySelector('[aria-label="Decrement"]')).toBeNull()
    // The inline value pill button is present
    expect(container.querySelector('.today-inline-value-btn')).toBeTruthy()
  })

  it('renders weekly rating tracker with inline ± controls in title row', () => {
    const tracker = makeTracker('tracker-rating', { entryMode: 'rating' })
    const item = makeMeasurementItem(
      'tracker',
      tracker,
      makeSummary({ entryMode: 'rating', actualValue: 4, periodRef: WEEK_REF }),
      makePlanning(),
      makeEntry('tracker', 'tracker-rating', TODAY, 4),
    )
    const { getByLabelText } = renderRow(item, [
      makeEntry('tracker', 'tracker-rating', TODAY, 4),
    ])

    // Rating entries render inline counter-style ± buttons
    expect(getByLabelText('Increment')).toBeTruthy()
    expect(getByLabelText('Decrement')).toBeTruthy()
  })

  it('renders completion-dots with inline today circle (no number input)', () => {
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
    const { container, getByRole } = renderRow(item, [
      makeEntry('habit', 'habit-completion-small', '2026-03-10'),
    ])

    // Today toggle button rendered
    expect(getByRole('button', { name: 'Record today' })).toBeTruthy()
    // No number input or counter controls in collapsed state
    expect(container.querySelector('input[type="number"]')).toBeNull()
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders completion-ring with inline today circle for count target > 7', () => {
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
    const { getByRole } = renderRow(item)

    // Inline today toggle button rendered
    expect(getByRole('button', { name: 'Record today' })).toBeTruthy()
  })

  it('renders monthly counter habit with inline ± controls', () => {
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
    const { getByLabelText } = renderRow(item, [
      makeEntry('habit', 'monthly-counter', '2026-03-02', 3),
    ])

    // CounterEntryControl's Increment button rendered
    expect(getByLabelText('Increment')).toBeTruthy()
    expect(getByLabelText('Decrement')).toBeTruthy()
  })

  it('renders monthly value tracker with click-to-edit value pill (no ± buttons)', () => {
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

    // Value pill renders, but no ± buttons
    expect(container.querySelector('.today-inline-value-btn')).toBeTruthy()
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders monthly rating habit with inline ± controls', () => {
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
    const { getByLabelText } = renderRow(item, [
      makeEntry('habit', 'monthly-rating', '2026-03-05', 8),
    ])

    expect(getByLabelText('Increment')).toBeTruthy()
    expect(getByLabelText('Decrement')).toBeTruthy()
  })

  it('renders monthly completion tracker with inline check button (no ± / no number input)', () => {
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
    const { container, getByRole } = renderRow(item, [
      makeEntry('tracker', 'monthly-completion', '2026-03-01'),
    ])

    // Inline today toggle button rendered with no ± or number input
    expect(getByRole('button', { name: 'Record today' })).toBeTruthy()
    expect(container.querySelector('input[type="number"]')).toBeNull()
    expect(container.querySelector('[aria-label="Increment"]')).toBeNull()
  })

  it('renders initiative with inlined checkmark and no chart', () => {
    const item = makeInitiativeItem('init-1', 'Book photographer')
    const { getByText } = renderRow(item)

    expect(getByText('Book photographer')).toBeTruthy()
  })

  it('reveals chart and actions menu only after expansion', async () => {
    const habit = makeHabit('habit-expand', {
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
    )
    const { container, getByRole, queryByRole } = renderRow(item, [
      makeEntry('habit', 'habit-expand', '2026-03-10', 4),
    ])

    // Collapsed: no actions menu button (lives in the expanded footer)
    expect(queryByRole('button', { name: /more actions/i })).toBeNull()

    // Click the card body to expand (the card root is the article element)
    const article = container.querySelector('article')
    expect(article).toBeTruthy()
    await fireEvent.click(article!)

    // Expanded: actions menu button visible
    expect(getByRole('button', { name: /more actions/i })).toBeTruthy()
  })
})
