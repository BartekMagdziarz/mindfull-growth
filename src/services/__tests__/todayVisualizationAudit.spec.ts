import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import { auditMeasurementRecords } from '@/services/todayVisualizationAudit'

const TIMESTAMP = '2026-01-01T00:00:00.000Z'

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    title: 'Meditate',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 5 },
    status: 'open',
    ...overrides,
  } as Habit
}

function makeKeyResult(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: 'kr-1',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    title: 'Ship onboarding',
    isActive: true,
    goalId: 'goal-1',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...overrides,
  } as KeyResult
}

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    title: 'Weight',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'monthly',
    entryMode: 'value',
    status: 'open',
    ...overrides,
  } as Tracker
}

describe('auditMeasurementRecords', () => {
  it('returns an empty array for clean data', () => {
    const habits = [makeHabit(), makeHabit({ id: 'habit-2', entryMode: 'counter' })]
    const keyResults = [
      makeKeyResult(),
      makeKeyResult({
        id: 'kr-2',
        entryMode: 'value',
        target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 100 },
      }),
    ]
    const trackers = [makeTracker(), makeTracker({ id: 'tracker-2', entryMode: 'counter' })]

    expect(auditMeasurementRecords(habits, keyResults, trackers)).toEqual([])
  })

  it('flags habits and key results where completion pairs with a non-count target', () => {
    // Simulate legacy/import records that bypassed the normalizer by casting
    // through the broader Habit/KeyResult types.
    const brokenHabit = makeHabit({
      id: 'habit-broken',
      title: 'Mood check',
      entryMode: 'completion',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 10 },
    })
    const brokenKr = makeKeyResult({
      id: 'kr-broken',
      title: 'Daily rating',
      entryMode: 'completion',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 },
    })

    const records = auditMeasurementRecords(
      [makeHabit(), brokenHabit],
      [makeKeyResult(), brokenKr],
      [makeTracker()],
    )

    expect(records).toHaveLength(2)
    expect(records).toEqual(
      expect.arrayContaining([
        {
          subjectType: 'habit',
          subjectId: 'habit-broken',
          title: 'Mood check',
          reason: 'completion entry mode requires count target',
        },
        {
          subjectType: 'keyResult',
          subjectId: 'kr-broken',
          title: 'Daily rating',
          reason: 'completion entry mode requires count target',
        },
      ]),
    )
  })

  it('never flags trackers because the domain type has no target field', () => {
    const trackers = [
      makeTracker({ entryMode: 'completion' }),
      makeTracker({ id: 'tracker-2', entryMode: 'value' }),
      makeTracker({ id: 'tracker-3', entryMode: 'counter' }),
      makeTracker({ id: 'tracker-4', entryMode: 'rating' }),
    ]

    expect(auditMeasurementRecords([], [], trackers)).toEqual([])
  })
})
