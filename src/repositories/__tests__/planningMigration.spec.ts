import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie, { type Table } from 'dexie'
import { UserDatabase } from '@/services/userDatabase.service'

class PlanningDatabaseV6 extends Dexie {
  priorities!: Table<Record<string, unknown>, string>
  goals!: Table<Record<string, unknown>, string>
  keyResults!: Table<Record<string, unknown>, string>
  habits!: Table<Record<string, unknown>, string>
  trackers!: Table<Record<string, unknown>, string>
  initiatives!: Table<Record<string, unknown>, string>
  monthPlans!: Table<Record<string, unknown>, string>
  weekPlans!: Table<Record<string, unknown>, string>
  goalMonthStates!: Table<Record<string, unknown>, string>
  cadencedMonthStates!: Table<Record<string, unknown>, string>
  cadencedWeekStates!: Table<Record<string, unknown>, string>
  cadencedDayAssignments!: Table<Record<string, unknown>, string>
  initiativePlanStates!: Table<Record<string, unknown>, string>
  trackerMonthStates!: Table<Record<string, unknown>, string>
  trackerWeekStates!: Table<Record<string, unknown>, string>
  trackerEntries!: Table<Record<string, unknown>, string>
  periodReflections!: Table<Record<string, unknown>, string>
  periodObjectReflections!: Table<Record<string, unknown>, string>

  constructor(name: string) {
    super(name)
    this.version(6).stores({
      priorities: 'id, year, isActive, *lifeAreaIds',
      goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      keyResults: 'id, goalId, status, isActive, cadence, kind',
      habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
      initiatives: 'id, status, isActive, goalId, *priorityIds, *lifeAreaIds',
      monthPlans: 'id, &monthRef',
      weekPlans: 'id, &weekRef',
      goalMonthStates: 'id, monthRef, goalId, activityState, &[monthRef+goalId]',
      cadencedMonthStates:
        'id, monthRef, subjectType, subjectId, activityState, &[monthRef+subjectType+subjectId], [subjectType+subjectId]',
      cadencedWeekStates:
        'id, weekRef, sourceMonthRef, subjectType, subjectId, activityState, [weekRef+subjectType+subjectId], [weekRef+sourceMonthRef+subjectType+subjectId], [subjectType+subjectId]',
      cadencedDayAssignments:
        'id, dayRef, subjectType, subjectId, &[dayRef+subjectType+subjectId], [subjectType+subjectId]',
      initiativePlanStates: 'id, &initiativeId, monthRef, weekRef, dayRef',
      trackerMonthStates: 'id, monthRef, trackerId, activityState, &[monthRef+trackerId]',
      trackerWeekStates: 'id, weekRef, trackerId, activityState, &[weekRef+trackerId]',
      trackerEntries:
        'id, trackerId, periodType, periodRef, &[trackerId+periodRef], [periodType+periodRef]',
      periodReflections: 'id, periodType, periodRef, &[periodType+periodRef]',
      periodObjectReflections:
        'id, periodType, periodRef, subjectType, subjectId, &[periodType+periodRef+subjectType+subjectId], [subjectType+subjectId]',
    })
  }
}

describe('planning migration v6 to v7', () => {
  let dbName: string

  beforeEach(() => {
    dbName = `PlanningMigration_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    await Dexie.delete(dbName)
  })

  it('clean-breaks measurement objects and legacy planning state while preserving plan shells', async () => {
    const v6 = new PlanningDatabaseV6(dbName)
    await v6.open()

    await v6.priorities.add({
      id: 'priority-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Priority',
      isActive: true,
      year: '2026',
      lifeAreaIds: [],
    })
    await v6.goals.add({
      id: 'goal-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Goal',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    await v6.initiatives.add({
      id: 'initiative-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Initiative',
      isActive: true,
      goalId: 'goal-1',
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    await v6.keyResults.add({
      id: 'kr-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'KR',
      isActive: true,
      goalId: 'goal-1',
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    await v6.habits.add({
      id: 'habit-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Habit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    await v6.trackers.add({
      id: 'tracker-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Tracker',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      analysisPeriod: 'week',
      entryMode: 'day',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    await v6.monthPlans.add({
      id: 'month-plan-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      monthRef: '2026-03',
    })
    await v6.weekPlans.add({
      id: 'week-plan-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      weekRef: '2026-W10',
    })
    await v6.goalMonthStates.add({
      id: 'goal-state-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      monthRef: '2026-03',
      goalId: 'goal-1',
      activityState: 'active',
    })
    await v6.cadencedMonthStates.add({
      id: 'cadenced-month-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      monthRef: '2026-03',
      subjectType: 'habit',
      subjectId: 'habit-1',
      activityState: 'active',
      planningMode: 'times-per-period',
      targetCount: 4,
    })
    await v6.cadencedWeekStates.add({
      id: 'cadenced-week-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      weekRef: '2026-W10',
      subjectType: 'kr',
      subjectId: 'kr-1',
      activityState: 'active',
    })
    await v6.cadencedDayAssignments.add({
      id: 'cadenced-day-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      dayRef: '2026-03-12',
      subjectType: 'habit',
      subjectId: 'habit-1',
    })
    await v6.initiativePlanStates.add({
      id: 'initiative-plan-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      initiativeId: 'initiative-1',
      monthRef: '2026-03',
      weekRef: '2026-W10',
    })
    await v6.trackerMonthStates.add({
      id: 'tracker-month-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      monthRef: '2026-03',
      trackerId: 'tracker-1',
      activityState: 'active',
    })
    await v6.trackerWeekStates.add({
      id: 'tracker-week-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      weekRef: '2026-W10',
      trackerId: 'tracker-1',
      activityState: 'active',
    })
    await v6.trackerEntries.add({
      id: 'tracker-entry-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      trackerId: 'tracker-1',
      periodType: 'day',
      periodRef: '2026-03-12',
      value: 8,
      note: 'old note',
    })
    await v6.periodReflections.add({
      id: 'period-reflection-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      periodType: 'week',
      periodRef: '2026-W10',
      note: 'Reflection',
    })
    await v6.periodObjectReflections.bulkAdd([
      {
        id: 'object-reflection-initiative',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        periodType: 'week',
        periodRef: '2026-W10',
        subjectType: 'initiative',
        subjectId: 'initiative-1',
        note: 'Keep me',
      },
      {
        id: 'object-reflection-tracker',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        periodType: 'week',
        periodRef: '2026-W10',
        subjectType: 'tracker',
        subjectId: 'tracker-1',
        note: 'Delete me',
      },
    ])
    await v6.close()

    const v7 = new UserDatabase(dbName)
    await v7.open()

    expect(await v7.priorities.count()).toBe(1)
    expect(await v7.goals.count()).toBe(1)
    expect(await v7.initiatives.count()).toBe(1)
    expect(await v7.keyResults.count()).toBe(0)
    expect(await v7.habits.count()).toBe(0)
    expect(await v7.trackers.count()).toBe(0)

    expect(await v7.monthPlans.count()).toBe(1)
    expect(await v7.weekPlans.count()).toBe(1)
    expect(await v7.goalMonthStates.count()).toBe(1)
    expect(await v7.initiativePlanStates.count()).toBe(1)
    expect(await v7.periodReflections.count()).toBe(1)

    expect(await v7.measurementMonthStates.count()).toBe(0)
    expect(await v7.measurementWeekStates.count()).toBe(0)
    expect(await v7.measurementDayAssignments.count()).toBe(0)
    expect(await v7.dailyMeasurementEntries.count()).toBe(0)

    const objectReflections = await v7.periodObjectReflections.toArray()
    expect(objectReflections).toHaveLength(1)
    expect(objectReflections[0]?.subjectType).toBe('initiative')

    await v7.close()
  })
})
