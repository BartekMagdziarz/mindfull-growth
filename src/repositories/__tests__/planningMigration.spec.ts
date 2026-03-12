import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Dexie, { type Table } from 'dexie'
import type { JournalEntry } from '@/domain/journal'
import type { LifeArea } from '@/domain/lifeArea'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import type { Goal, Habit, Initiative, KeyResult, Priority, Tracker } from '@/domain/planning'

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
