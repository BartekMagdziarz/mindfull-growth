import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { DayRef } from '@/domain/period'
import {
  computeHabitExecutionMetrics,
  computeKRExecutionMetrics,
  computeTrackerExecutionMetrics,
} from '@/services/profileLLMAssistsHelpers'
import { addDaysToDayRef } from '@/utils/periods'

const NOW = new Date('2026-03-20T12:00:00.000Z')

function makeEntry(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  dayRef: string,
  value: number | null = 1,
): DailyMeasurementEntry {
  return {
    id: `${subjectType}-${subjectId}-${dayRef}`,
    createdAt: `${dayRef}T08:00:00.000Z`,
    updatedAt: `${dayRef}T08:00:00.000Z`,
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
    value,
  }
}

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
    title: 'Long run',
    goalId: 'goal-1',
    isActive: true,
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 1 },
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
    ratingScaleMin: 1,
    ratingScale: 10,
    status: 'open',
    ...overrides,
  }
}

function weeklyEntries(subjectType: MeasurementSubjectType, subjectId: string, metWeeks: number): DailyMeasurementEntry[] {
  const currentWeekMondays = [
    '2026-03-16',
    '2026-03-09',
    '2026-03-02',
    '2026-02-23',
    '2026-02-16',
    '2026-02-09',
    '2026-02-02',
    '2026-01-26',
    '2026-01-19',
    '2026-01-12',
    '2026-01-05',
    '2025-12-29',
  ]
  return currentWeekMondays
    .slice(0, metWeeks)
    .map((dayRef) => makeEntry(subjectType, subjectId, dayRef))
}

function trackerEntries(recentValues: number[], baselineValues: number[]): DailyMeasurementEntry[] {
  const recent = recentValues.map((value, index) => (
    makeEntry('tracker', 'tracker-1', addDaysToDayRef('2026-03-20' as DayRef, -index), value)
  ))
  const baseline = baselineValues.map((value, index) => (
    makeEntry('tracker', 'tracker-1', addDaysToDayRef('2026-02-18' as DayRef, -index), value)
  ))
  return [...recent, ...baseline]
}

describe('execution metric helpers', () => {
  it('counts a weekly habit streak from the previous week when the current week is not met', () => {
    const habit = makeHabit()
    const metrics = computeHabitExecutionMetrics(habit, [
      makeEntry('habit', habit.id, '2026-03-09'),
    ], NOW)

    expect(metrics.currentStreak).toBe(1)
  })

  it('counts a weekly habit streak through the current week when it is met', () => {
    const habit = makeHabit()
    const metrics = computeHabitExecutionMetrics(habit, [
      makeEntry('habit', habit.id, '2026-03-16'),
      makeEntry('habit', habit.id, '2026-03-09'),
      makeEntry('habit', habit.id, '2026-03-02'),
      makeEntry('habit', habit.id, '2026-02-23'),
    ], NOW)

    expect(metrics.currentStreak).toBe(4)
  })

  it('breaks a weekly habit streak when the chain to today is missing', () => {
    const habit = makeHabit()
    const metrics = computeHabitExecutionMetrics(habit, [
      makeEntry('habit', habit.id, '2026-02-02'),
    ], NOW)

    expect(metrics.currentStreak).toBe(0)
  })

  it('counts a monthly habit entry on the first day of the new month', () => {
    const habit = makeHabit({ cadence: 'monthly' })
    const metrics = computeHabitExecutionMetrics(habit, [
      makeEntry('habit', habit.id, '2026-04-01'),
    ], new Date('2026-04-01T12:00:00.000Z'))

    expect(metrics.currentStreak).toBe(1)
    expect(metrics.lastCompletedAt).toBe('2026-04-01')
  })

  it('does not penalize habit completion rate for periods before the habit was created', () => {
    const habit = makeHabit({ createdAt: '2026-03-03T00:00:00.000Z' })
    const metrics = computeHabitExecutionMetrics(habit, [
      makeEntry('habit', habit.id, '2026-03-03'),
      makeEntry('habit', habit.id, '2026-03-09'),
      makeEntry('habit', habit.id, '2026-03-16'),
    ], NOW)

    expect(metrics.completionRate30d).toBe(1)
  })

  it('computes progress fraction for numeric value KRs', () => {
    const kr = makeKR({
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 42 },
    })
    const metrics = computeKRExecutionMetrics(kr, [
      makeEntry('keyResult', kr.id, '2026-03-18', 28),
    ], NOW)

    expect(metrics.currentValue).toBe(28)
    expect(metrics.targetValue).toBe(42)
    expect(metrics.progressFraction).toBe(28 / 42)
  })

  it('omits progress fraction for non-value KRs', () => {
    expect(computeKRExecutionMetrics(makeKR({ entryMode: 'completion' }), [], NOW).progressFraction).toBeUndefined()
    expect(computeKRExecutionMetrics(makeKR({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 12 },
    }), [], NOW).progressFraction).toBeUndefined()
  })

  it('classifies KR on-track bands', () => {
    expect(computeKRExecutionMetrics(makeKR(), weeklyEntries('keyResult', 'kr-1', 9), NOW).onTrack).toBe('ahead')
    expect(computeKRExecutionMetrics(makeKR(), weeklyEntries('keyResult', 'kr-1', 6), NOW).onTrack).toBe('on-track')
    expect(computeKRExecutionMetrics(makeKR(), weeklyEntries('keyResult', 'kr-1', 4), NOW).onTrack).toBe('behind')
  })

  it('returns no-data for KRs without recent entries', () => {
    expect(computeKRExecutionMetrics(makeKR(), [], NOW).onTrack).toBe('no-data')
  })

  it('detects a falling tracker trend', () => {
    const metrics = computeTrackerExecutionMetrics(
      makeTracker(),
      trackerEntries(Array(30).fill(6), Array(60).fill(6.75)),
      NOW,
    )

    expect(metrics.avg30d).toBe(6)
    expect(metrics.avg90d).toBe(6.5)
    expect(metrics.trend).toBe('falling')
  })

  it('keeps tracker trend flat inside the deadband', () => {
    const metrics = computeTrackerExecutionMetrics(
      makeTracker(),
      trackerEntries(Array(30).fill(6.05), Array(60).fill(5.975)),
      NOW,
    )

    expect(metrics.trend).toBe('flat')
  })

  it('keeps tracker trend flat without enough baseline samples', () => {
    const metrics = computeTrackerExecutionMetrics(
      makeTracker(),
      trackerEntries([7, 7, 7, 7, 7], []),
      NOW,
    )

    expect(metrics.avg30d).toBe(7)
    expect(metrics.trend).toBe('flat')
  })

  it('detects a rising tracker trend', () => {
    const metrics = computeTrackerExecutionMetrics(
      makeTracker(),
      trackerEntries(Array(30).fill(7), Array(60).fill(5.5)),
      NOW,
    )

    expect(metrics.trend).toBe('rising')
  })
})
