import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { LifeArea } from '@/domain/lifeArea'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import type { Goal, Habit, Initiative, KeyResult, Priority, Tracker } from '@/domain/planning'
import type {
  CadencedDayAssignment,
  CadencedMonthState,
  CadencedWeekState,
  GoalMonthState,
  InitiativePlanState,
  MonthPlan,
  PeriodObjectReflection,
  PeriodReflection,
  TrackerEntry,
  TrackerMonthState,
  TrackerWeekState,
  WeekPlan,
} from '@/domain/planningState'

class PlanningDatabaseV3 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  lifeAreas!: Table<LifeArea, string>
  lifeAreaAssessments!: Table<LifeAreaAssessment, string>

  constructor(name: string) {
    super(name)
    this.version(3).stores({
      journalEntries: 'id',
      lifeAreas: 'id, isActive',
      lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
    })
  }
}

class PlanningDatabaseV4 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  lifeAreas!: Table<LifeArea, string>
  lifeAreaAssessments!: Table<LifeAreaAssessment, string>
  priorities!: Table<Priority, string>
  goals!: Table<Goal, string>
  keyResults!: Table<KeyResult, string>
  habits!: Table<Habit, string>
  trackers!: Table<Tracker, string>
  initiatives!: Table<Initiative, string>

  constructor(name: string) {
    super(name)
    this.version(3).stores({
      journalEntries: 'id',
      lifeAreas: 'id, isActive',
      lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
    })
    this.version(4).stores({
      journalEntries: 'id',
      lifeAreas: 'id, isActive',
      lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
      priorities: 'id, year, isActive, *lifeAreaIds',
      goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      keyResults: 'id, goalId, status, isActive, cadence, kind',
      habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
      initiatives: 'id, isActive, goalId, *priorityIds, *lifeAreaIds',
    })
  }
}

class PlanningDatabaseV5 extends Dexie {
  journalEntries!: Table<JournalEntry, string>
  lifeAreas!: Table<LifeArea, string>
  lifeAreaAssessments!: Table<LifeAreaAssessment, string>
  priorities!: Table<Priority, string>
  goals!: Table<Goal, string>
  keyResults!: Table<KeyResult, string>
  habits!: Table<Habit, string>
  trackers!: Table<Tracker, string>
  initiatives!: Table<Initiative, string>
  monthPlans!: Table<MonthPlan, string>
  weekPlans!: Table<WeekPlan, string>
  goalMonthStates!: Table<GoalMonthState, string>
  cadencedMonthStates!: Table<CadencedMonthState, string>
  cadencedWeekStates!: Table<CadencedWeekState, string>
  cadencedDayAssignments!: Table<CadencedDayAssignment, string>
  initiativePlanStates!: Table<InitiativePlanState, string>
  trackerMonthStates!: Table<TrackerMonthState, string>
  trackerWeekStates!: Table<TrackerWeekState, string>
  trackerEntries!: Table<TrackerEntry, string>
  periodReflections!: Table<PeriodReflection, string>
  periodObjectReflections!: Table<PeriodObjectReflection, string>

  constructor(name: string) {
    super(name)
    this.version(4).stores({
      journalEntries: 'id',
      lifeAreas: 'id, isActive',
      lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
      priorities: 'id, year, isActive, *lifeAreaIds',
      goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      keyResults: 'id, goalId, status, isActive, cadence, kind',
      habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
      initiatives: 'id, isActive, goalId, *priorityIds, *lifeAreaIds',
    })
    this.version(5).stores({
      journalEntries: 'id',
      lifeAreas: 'id, isActive',
      lifeAreaAssessments: 'id, createdAt, *lifeAreaIds',
      priorities: 'id, year, isActive, *lifeAreaIds',
      goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
      keyResults: 'id, goalId, status, isActive, cadence, kind',
      habits: 'id, status, isActive, cadence, kind, *priorityIds, *lifeAreaIds',
      trackers: 'id, status, isActive, analysisPeriod, entryMode, kind, *priorityIds, *lifeAreaIds',
      initiatives: 'id, isActive, goalId, *priorityIds, *lifeAreaIds',
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

describe('planning migration v3 to v4', () => {
  let dbName: string

  beforeEach(() => {
    dbName = `PlanningMigration_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    await Dexie.delete(dbName)
  })

  it('preserves existing data and creates the new planning tables', async () => {
    const v3 = new PlanningDatabaseV3(dbName)
    await v3.open()
    await v3.journalEntries.add({
      id: 'journal-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      body: 'Existing entry',
    })
    await v3.lifeAreas.add({
      id: 'la-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      name: 'Health',
      measures: [],
      reviewCadence: 'monthly',
      isActive: true,
      sortOrder: 1,
    })
    await v3.close()

    const v4 = new PlanningDatabaseV4(dbName)
    await v4.open()

    expect(v4.verno).toBe(4)
    expect(await v4.journalEntries.get('journal-1')).toMatchObject({ body: 'Existing entry' })
    expect(await v4.lifeAreas.get('la-1')).toMatchObject({ name: 'Health' })
    expect(await v4.priorities.count()).toBe(0)
    expect(await v4.goals.count()).toBe(0)
    expect(await v4.keyResults.count()).toBe(0)
    expect(await v4.habits.count()).toBe(0)
    expect(await v4.trackers.count()).toBe(0)
    expect(await v4.initiatives.count()).toBe(0)

    await v4.close()
  })
})

describe('planning migration v4 to v5', () => {
  let dbName: string

  beforeEach(() => {
    dbName = `PlanningMigrationV5_${Date.now()}_${Math.random()}`
  })

  afterEach(async () => {
    await Dexie.delete(dbName)
  })

  it('preserves planning objects and creates the new planning-state tables', async () => {
    const v4 = new PlanningDatabaseV4(dbName)
    await v4.open()
    await v4.goals.add({
      id: 'goal-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Existing goal',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    await v4.habits.add({
      id: 'habit-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Existing habit',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      kind: 'generic',
      config: {},
      status: 'open',
    })
    await v4.close()

    const v5 = new PlanningDatabaseV5(dbName)
    await v5.open()

    expect(v5.verno).toBe(5)
    expect(await v5.goals.get('goal-1')).toMatchObject({ title: 'Existing goal' })
    expect(await v5.habits.get('habit-1')).toMatchObject({ title: 'Existing habit' })
    expect(await v5.monthPlans.count()).toBe(0)
    expect(await v5.weekPlans.count()).toBe(0)
    expect(await v5.goalMonthStates.count()).toBe(0)
    expect(await v5.cadencedMonthStates.count()).toBe(0)
    expect(await v5.cadencedWeekStates.count()).toBe(0)
    expect(await v5.cadencedDayAssignments.count()).toBe(0)
    expect(await v5.initiativePlanStates.count()).toBe(0)
    expect(await v5.trackerMonthStates.count()).toBe(0)
    expect(await v5.trackerWeekStates.count()).toBe(0)
    expect(await v5.trackerEntries.count()).toBe(0)
    expect(await v5.periodReflections.count()).toBe(0)
    expect(await v5.periodObjectReflections.count()).toBe(0)

    await v5.close()
  })
})
