import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, WeeklyIntention } from '@/domain/planning'
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

function makeIntention(overrides: Partial<WeeklyIntention> = {}): WeeklyIntention {
  return {
    id: 'intention-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Call a friend',
    isActive: true,
    weekRef,
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 1 },
    status: 'open',
    priorityIds: [],
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
    subjectType: 'weeklyIntention',
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

describe('buildWeeklyPlanSummary', () => {
  it('returns zeroed buckets for an empty input', () => {
    const summary = buildWeeklyPlanSummary([], [], weekRef)
    expect(summary).toEqual({
      keyResults: { total: 0, met: 0 },
      habits: { total: 0, met: 0 },
      intentions: { total: 0, met: 0 },
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

  it('evaluates intentions against the week entries — unmet without entries', () => {
    const met = makeIntention({ id: 'i-met' })
    const unmet = makeIntention({ id: 'i-unmet' })
    const summary = buildWeeklyPlanSummary(
      [],
      [makeEntry('i-met', '2026-03-09')],
      weekRef,
      [met, unmet],
    )
    // Plan-vs-execution semantics: a no-data intention still counts as planned.
    expect(summary.intentions).toEqual({ total: 2, met: 1 })
  })

  it('counts intention entries regardless of stored value — completion toggles use null', () => {
    // toggleTodayCompletion writes `value: null` for completion-mode subjects,
    // so the absence of a number must NOT exclude an entry from the count.
    const intention = makeIntention({ id: 'i-1' })
    const summary = buildWeeklyPlanSummary([], [makeEntry('i-1', '2026-03-10', null)], weekRef, [
      intention,
    ])
    expect(summary.intentions).toEqual({ total: 1, met: 1 })
  })

  it('ignores inactive intentions and entries outside the week', () => {
    const inactive = makeIntention({ id: 'i-inactive', isActive: false })
    const active = makeIntention({ id: 'i-active' })
    const summary = buildWeeklyPlanSummary(
      [],
      [makeEntry('i-active', '2026-03-16')], // next week — ignored
      weekRef,
      [inactive, active],
    )
    expect(summary.intentions).toEqual({ total: 1, met: 0 })
  })

  it('respects a multi-entry intention target', () => {
    const intention = makeIntention({
      id: 'i-3x',
      target: { kind: 'count', operator: 'min', value: 3 },
    })
    const summary = buildWeeklyPlanSummary(
      [],
      [makeEntry('i-3x', '2026-03-09'), makeEntry('i-3x', '2026-03-10')],
      weekRef,
      [intention],
    )
    expect(summary.intentions).toEqual({ total: 1, met: 0 })
  })

  it('mixes object types in a single bundle', () => {
    const summary = buildWeeklyPlanSummary(
      [
        krItem({ id: 'kr-a', status: 'met' }),
        krItem({ id: 'kr-b', status: 'missed' }),
        habitItem({ id: 'h-a', status: 'met' }),
        habitItem({ id: 'h-b', status: 'met' }),
        habitItem({ id: 'h-c', status: 'no-data' }),
      ],
      [makeEntry('i-a', '2026-03-09')],
      weekRef,
      [makeIntention({ id: 'i-a' }), makeIntention({ id: 'i-b' })],
    )
    expect(summary.keyResults).toEqual({ total: 2, met: 1 })
    expect(summary.habits).toEqual({ total: 3, met: 2 })
    expect(summary.intentions).toEqual({ total: 2, met: 1 })
  })
})
