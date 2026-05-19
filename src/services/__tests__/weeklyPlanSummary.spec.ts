import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { DayRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import type { MeasurementSummary } from '@/services/measurementProgress'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'
import { buildWeeklyPlanSummary } from '@/services/weeklyPlanSummary'

const weekRef = '2026-W10' as WeekRef

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Morning walk',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...overrides,
  }
}

function makeKeyResult(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: 'kr-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Long run',
    goalId: 'goal-1',
    isActive: true,
    entryMode: 'value',
    cadence: 'weekly',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 20 },
    status: 'open',
    ...overrides,
  }
}

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Mood',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'rating',
    cadence: 'weekly',
    status: 'open',
    ...overrides,
  }
}

function makePlanning(overrides: Partial<MeasurementPlanningSummary> = {}): MeasurementPlanningSummary {
  return {
    activityState: 'active',
    scheduleScope: 'whole-week',
    scheduledDayRefs: [],
    ...overrides,
  }
}

function makeMeasurement(overrides: Partial<MeasurementSummary> = {}): MeasurementSummary {
  return {
    entryMode: 'completion',
    cadence: 'weekly',
    entryCount: 0,
    periodRef: weekRef,
    ...overrides,
  }
}

function makeEntry(
  subjectId: string,
  dayRef: string,
  value: number | null = 1,
): DailyMeasurementEntry {
  return {
    id: `${subjectId}-${dayRef}`,
    createdAt: `${dayRef}T08:00:00.000Z`,
    updatedAt: `${dayRef}T08:00:00.000Z`,
    subjectType: 'tracker',
    subjectId,
    dayRef: dayRef as DayRef,
    value,
  }
}

function krItem(
  overrides: Partial<{ id: string; status: MeasurementSummary['evaluationStatus'] }> = {},
): WeekObjectItem {
  const id = overrides.id ?? 'kr-1'
  return {
    key: `keyResult:${id}`,
    subjectType: 'keyResult',
    subject: makeKeyResult({ id }),
    planning: makePlanning(),
    measurement: makeMeasurement({ evaluationStatus: overrides.status }),
    sortOrder: 0,
  }
}

function habitItem(
  overrides: Partial<{ id: string; status: MeasurementSummary['evaluationStatus'] }> = {},
): WeekObjectItem {
  const id = overrides.id ?? 'habit-1'
  return {
    key: `habit:${id}`,
    subjectType: 'habit',
    subject: makeHabit({ id }),
    planning: makePlanning(),
    measurement: makeMeasurement({ evaluationStatus: overrides.status }),
    sortOrder: 100,
  }
}

function trackerItem(planning: Partial<MeasurementPlanningSummary>, id = 'tracker-1'): WeekObjectItem {
  return {
    key: `tracker:${id}`,
    subjectType: 'tracker',
    subject: makeTracker({ id }),
    planning: makePlanning(planning),
    measurement: makeMeasurement({ entryMode: 'rating' }),
    sortOrder: 200,
  }
}

describe('buildWeeklyPlanSummary', () => {
  it('returns zeroed buckets for an empty input', () => {
    const summary = buildWeeklyPlanSummary([], [], weekRef)
    expect(summary).toEqual({
      keyResults: { total: 0, met: 0 },
      habits: { total: 0, met: 0 },
      trackers: { total: 0, assignedDays: 0, filledDays: 0 },
    })
  })

  it('counts met / total for key results', () => {
    const summary = buildWeeklyPlanSummary(
      [
        krItem({ id: 'kr-a', status: 'met' }),
        krItem({ id: 'kr-b', status: 'missed' }),
        krItem({ id: 'kr-c', status: 'no-data' }),
        krItem({ id: 'kr-d', status: 'met' }),
      ],
      [],
      weekRef,
    )
    expect(summary.keyResults).toEqual({ total: 4, met: 2 })
  })

  it('counts met / total for habits independently of KR-y', () => {
    const summary = buildWeeklyPlanSummary(
      [
        habitItem({ id: 'h-a', status: 'met' }),
        habitItem({ id: 'h-b', status: 'missed' }),
        krItem({ id: 'kr-a', status: 'met' }),
      ],
      [],
      weekRef,
    )
    expect(summary.habits).toEqual({ total: 2, met: 1 })
    expect(summary.keyResults).toEqual({ total: 1, met: 1 })
  })

  it('does not count habits without an evaluation status as met', () => {
    const summary = buildWeeklyPlanSummary(
      [habitItem({ id: 'h-a' })], // no status — defaults to undefined
      [],
      weekRef,
    )
    expect(summary.habits).toEqual({ total: 1, met: 0 })
  })

  it('treats whole-week trackers as 7 assigned days and caps fills at 7', () => {
    const tracker = trackerItem({ scheduleScope: 'whole-week', scheduledDayRefs: [] }, 't-1')
    const entries = [
      makeEntry('t-1', '2026-03-09'),
      makeEntry('t-1', '2026-03-10'),
      makeEntry('t-1', '2026-03-11'),
      makeEntry('t-1', '2026-03-12', null), // null = not filled
    ]
    const summary = buildWeeklyPlanSummary([tracker], entries, weekRef)
    expect(summary.trackers).toEqual({ total: 1, assignedDays: 7, filledDays: 3 })
  })

  it('uses scheduledDayRefs as denominator for specific-days trackers', () => {
    const tracker = trackerItem(
      {
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-09', '2026-03-11', '2026-03-13'] as DayRef[],
      },
      't-2',
    )
    const entries = [
      makeEntry('t-2', '2026-03-09'),
      makeEntry('t-2', '2026-03-11'),
      makeEntry('t-2', '2026-03-10'), // not in scheduled set — ignored
    ]
    const summary = buildWeeklyPlanSummary([tracker], entries, weekRef)
    expect(summary.trackers).toEqual({ total: 1, assignedDays: 3, filledDays: 2 })
  })

  it('skips assigned-day accounting for unassigned trackers but still counts them', () => {
    const tracker = trackerItem({ scheduleScope: 'unassigned', scheduledDayRefs: [] }, 't-3')
    const summary = buildWeeklyPlanSummary([tracker], [], weekRef)
    expect(summary.trackers).toEqual({ total: 1, assignedDays: 0, filledDays: 0 })
  })

  it('aggregates across multiple trackers with different scopes', () => {
    const wholeWeek = trackerItem({ scheduleScope: 'whole-week', scheduledDayRefs: [] }, 't-a')
    const specific = trackerItem(
      {
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-09', '2026-03-10'] as DayRef[],
      },
      't-b',
    )
    const entries = [
      makeEntry('t-a', '2026-03-09'),
      makeEntry('t-a', '2026-03-10'),
      makeEntry('t-b', '2026-03-09'),
      makeEntry('t-b', '2026-03-16'), // outside week — ignored for whole-week filter
    ]
    const summary = buildWeeklyPlanSummary([wholeWeek, specific], entries, weekRef)
    expect(summary.trackers).toEqual({ total: 2, assignedDays: 7 + 2, filledDays: 2 + 1 })
  })

  it('ignores entries with null value when counting filled days for trackers', () => {
    const tracker = trackerItem({ scheduleScope: 'whole-week', scheduledDayRefs: [] }, 't-1')
    const entries = [
      makeEntry('t-1', '2026-03-09', null),
      makeEntry('t-1', '2026-03-10', 4),
    ]
    const summary = buildWeeklyPlanSummary([tracker], entries, weekRef)
    expect(summary.trackers.filledDays).toBe(1)
  })

  it('mixes object types in a single bundle', () => {
    const summary = buildWeeklyPlanSummary(
      [
        krItem({ id: 'kr-a', status: 'met' }),
        krItem({ id: 'kr-b', status: 'missed' }),
        habitItem({ id: 'h-a', status: 'met' }),
        habitItem({ id: 'h-b', status: 'met' }),
        habitItem({ id: 'h-c', status: 'no-data' }),
        trackerItem({ scheduleScope: 'whole-week', scheduledDayRefs: [] }, 't-a'),
      ],
      [makeEntry('t-a', '2026-03-09')],
      weekRef,
    )
    expect(summary.keyResults).toEqual({ total: 2, met: 1 })
    expect(summary.habits).toEqual({ total: 3, met: 2 })
    expect(summary.trackers).toEqual({ total: 1, assignedDays: 7, filledDays: 1 })
  })
})
