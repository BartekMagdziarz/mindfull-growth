import { describe, it, expect, beforeEach, vi } from 'vitest'
import Dexie, { type Table } from 'dexie'
import {
  priorityDexieRepository,
  projectDexieRepository,
  commitmentDexieRepository,
  trackerDexieRepository,
  trackerPeriodDexieRepository,
  habitDexieRepository,
  habitOccurrenceDexieRepository,
} from '@/repositories/planningDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import { UserDatabase } from '@/services/userDatabase.service'
import type {
  Commitment,
  MonthlyPlan,
  Project,
  YearlyPlan,
} from '@/domain/planning'

const baseTimestamp = '2026-01-01T00:00:00.000Z'

function buildPriority(id: string, lifeAreaIds: string[], year = 2026) {
  return {
    id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    lifeAreaIds,
    year,
    name: `Priority ${id}`,
    successSignals: [],
    constraints: [],
    isActive: true,
    sortOrder: 0,
  }
}

function buildProject(params: {
  id: string
  lifeAreaIds?: string[]
  priorityIds?: string[]
  monthIds?: string[]
  status?: 'planned' | 'active' | 'paused' | 'completed' | 'abandoned'
}) {
  return {
    id: params.id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    name: `Project ${params.id}`,
    description: undefined,
    targetOutcome: undefined,
    monthIds: params.monthIds ?? [],
    lifeAreaIds: params.lifeAreaIds ?? [],
    priorityIds: params.priorityIds ?? [],
    status: params.status ?? 'planned',
  }
}

function buildCommitment(params: {
  id: string
  weeklyPlanId?: string
  projectId?: string
  lifeAreaIds?: string[]
  startDate?: string
  endDate?: string
  periodType?: 'weekly' | 'monthly'
}) {
  return {
    id: params.id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    startDate: params.startDate ?? '2026-01-05',
    endDate: params.endDate ?? '2026-01-11',
    periodType: params.periodType ?? 'weekly',
    weeklyPlanId: params.weeklyPlanId,
    projectId: params.projectId,
    lifeAreaIds: params.lifeAreaIds ?? [],
    priorityIds: [],
    name: `Commitment ${params.id}`,
    status: 'planned' as const,
  }
}

function buildTracker(params: {
  id: string
  parentType?: 'project' | 'habit'
  parentId?: string
}) {
  return {
    id: params.id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    parentType: params.parentType,
    parentId: params.parentId,
    lifeAreaIds: [],
    priorityIds: [],
    name: `Tracker ${params.id}`,
    type: 'count' as const,
    cadence: 'weekly' as const,
    targetCount: 3,
    sortOrder: 0,
    isActive: true,
  }
}


class PlanningDatabaseV14 extends Dexie {
  projects!: Table<Project, string>
  commitments!: Table<Commitment, string>
  monthlyPlans!: Table<MonthlyPlan, string>
  yearlyPlans!: Table<YearlyPlan, string>

  constructor(name: string) {
    super(name)
    this.version(14).stores({
      projects: 'id, status, *lifeAreaIds, *priorityIds',
      commitments: 'id, weeklyPlanId, projectId, status, *lifeAreaIds, *priorityIds',
      monthlyPlans: 'id, year, startDate, endDate',
      yearlyPlans: 'id, year, startDate, endDate',
    })
  }
}

describe('planningDexieRepository', () => {
  let db: UserDatabase

  beforeEach(async () => {
    db = await connectTestDatabase()
    await db.priorities.clear()
    await db.projects.clear()
    await db.commitments.clear()
    await db.trackers.clear()
    await db.trackerPeriods.clear()
    await db.habits.clear()
    await db.habitOccurrences.clear()
    vi.useRealTimers()
  })

  describe('priorityDexieRepository', () => {
    it('filters priorities by life area id', async () => {
      await db.priorities.bulkAdd([
        buildPriority('p-1', ['la-1']),
        buildPriority('p-2', ['la-2']),
        buildPriority('p-3', ['la-1', 'la-3']),
      ])

      const result = await priorityDexieRepository.getByLifeAreaId('la-1')

      expect(result.map((p) => p.id)).toEqual(['p-1', 'p-3'])
    })

    it('deletes priorities by life area id', async () => {
      await db.priorities.bulkAdd([
        buildPriority('p-1', ['la-1']),
        buildPriority('p-2', ['la-2']),
      ])

      await priorityDexieRepository.deleteByLifeAreaId('la-1')

      const remaining = await db.priorities.toArray()
      expect(remaining.map((p) => p.id)).toEqual(['p-2'])
    })
  })

  describe('projectDexieRepository', () => {
    it('filters projects by month id', async () => {
      await db.projects.bulkAdd([
        buildProject({ id: 'proj-1', monthIds: ['m-1'], lifeAreaIds: ['la-1'] }),
        buildProject({ id: 'proj-2', monthIds: ['m-2'], lifeAreaIds: ['la-1'] }),
      ])

      const result = await projectDexieRepository.getByMonthId('m-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('proj-1')
    })

    it('filters projects by life area id', async () => {
      await db.projects.bulkAdd([
        buildProject({ id: 'proj-1', lifeAreaIds: ['la-1'] }),
        buildProject({ id: 'proj-2', lifeAreaIds: ['la-2'] }),
      ])

      const result = await projectDexieRepository.getByLifeAreaId('la-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('proj-1')
    })

    it('filters projects by status', async () => {
      await db.projects.bulkAdd([
        buildProject({ id: 'proj-1', status: 'active' }),
        buildProject({ id: 'proj-2', status: 'planned' }),
      ])

      const result = await projectDexieRepository.getByStatus('active')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('proj-1')
    })
  })

  describe('commitmentDexieRepository', () => {
    it('filters commitments by weekly plan id', async () => {
      await db.commitments.bulkAdd([
        buildCommitment({ id: 'c-1', weeklyPlanId: 'week-1' }),
        buildCommitment({ id: 'c-2', weeklyPlanId: 'week-2' }),
      ])

      const result = await commitmentDexieRepository.getByWeeklyPlanId('week-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c-1')
    })

    it('filters commitments by project id', async () => {
      await db.commitments.bulkAdd([
        buildCommitment({ id: 'c-1', weeklyPlanId: 'week-1', projectId: 'proj-1' }),
        buildCommitment({ id: 'c-2', weeklyPlanId: 'week-1', projectId: 'proj-2' }),
      ])

      const result = await commitmentDexieRepository.getByProjectId('proj-1')

      expect(result).toHaveLength(1)
      expect(result[0].projectId).toBe('proj-1')
    })

    it('filters commitments by life area id', async () => {
      await db.commitments.bulkAdd([
        buildCommitment({ id: 'c-1', weeklyPlanId: 'week-1', lifeAreaIds: ['la-1'] }),
        buildCommitment({ id: 'c-2', weeklyPlanId: 'week-1', lifeAreaIds: ['la-2'] }),
      ])

      const result = await commitmentDexieRepository.getByLifeAreaId('la-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c-1')
    })
  })

  describe('trackerDexieRepository', () => {
    it('creates, updates, and deletes a tracker', async () => {
      const created = await trackerDexieRepository.create({
        parentType: 'habit',
        parentId: 'habit-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Tracker A',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      })

      const fetched = await trackerDexieRepository.getById(created.id)
      expect(fetched?.id).toBe(created.id)

      const byParent = await trackerDexieRepository.getByParent('habit', 'habit-1')
      expect(byParent).toHaveLength(1)
      expect(byParent[0].id).toBe(created.id)

      const updated = await trackerDexieRepository.update(created.id, { name: 'Tracker B' })
      expect(updated.name).toBe('Tracker B')

      await trackerDexieRepository.delete(created.id)
      const removed = await trackerDexieRepository.getById(created.id)
      expect(removed).toBeUndefined()
    })

    it('deletes trackers by parent', async () => {
      await db.trackers.bulkAdd([
        buildTracker({ id: 'pt-1', parentType: 'habit', parentId: 'habit-1' }),
        buildTracker({ id: 'pt-2', parentType: 'habit', parentId: 'habit-2' }),
      ])

      await trackerDexieRepository.deleteByParent('habit', 'habit-1')

      const remaining = await db.trackers.toArray()
      expect(remaining.map((t) => t.id)).toEqual(['pt-2'])
    })
  })

  describe('habitDexieRepository', () => {
    it('creates, updates, and deletes a habit', async () => {
      const created = await habitDexieRepository.create({
        name: 'Habit A',
        isActive: true,
        isPaused: false,
        cadence: 'weekly',
        lifeAreaIds: ['la-1'],
        priorityIds: ['pr-1'],
      })

      const fetched = await habitDexieRepository.getById(created.id)
      expect(fetched?.id).toBe(created.id)

      const updated = await habitDexieRepository.update(created.id, { name: 'Habit B' })
      expect(updated.name).toBe('Habit B')

      await habitDexieRepository.delete(created.id)
      const removed = await habitDexieRepository.getById(created.id)
      expect(removed).toBeUndefined()
    })
  })

  describe('habitOccurrenceDexieRepository', () => {
    it('creates, updates, and deletes a habit occurrence', async () => {
      const created = await habitOccurrenceDexieRepository.create({
        habitId: 'habit-1',
        periodType: 'weekly',
        periodStartDate: '2026-01-06',
        status: 'generated',
      })

      const byId = await habitOccurrenceDexieRepository.getById(created.id)
      expect(byId?.id).toBe(created.id)

      const fetched = await habitOccurrenceDexieRepository.getByHabitIdAndPeriod(
        'habit-1',
        '2026-01-06'
      )
      expect(fetched?.id).toBe(created.id)

      const byHabit = await habitOccurrenceDexieRepository.getByHabitId('habit-1')
      expect(byHabit).toHaveLength(1)

      const updated = await habitOccurrenceDexieRepository.update(created.id, {
        status: 'completed',
      })
      expect(updated.status).toBe('completed')

      await habitOccurrenceDexieRepository.delete(created.id)
      const removed = await habitOccurrenceDexieRepository.getById(created.id)
      expect(removed).toBeUndefined()
    })
  })

  describe('trackerPeriodDexieRepository', () => {
    it('creates, updates, and deletes a tracker period', async () => {
      const created = await trackerPeriodDexieRepository.create({
        trackerId: 'tracker-1',
        startDate: '2026-01-05',
        endDate: '2026-01-11',
        ticks: [{ index: 0, completed: true }],
      })

      const byId = await trackerPeriodDexieRepository.getById(created.id)
      expect(byId?.id).toBe(created.id)

      const byTracker = await trackerPeriodDexieRepository.getByTrackerId('tracker-1')
      expect(byTracker).toHaveLength(1)

      const byRange = await trackerPeriodDexieRepository.getByTrackerIdAndDateRange(
        'tracker-1',
        '2026-01-01',
        '2026-01-31'
      )
      expect(byRange).toHaveLength(1)

      const updated = await trackerPeriodDexieRepository.update(created.id, {
        ticks: [{ index: 0, completed: true }, { index: 1, completed: true }],
      })
      expect(updated.ticks).toHaveLength(2)

      await trackerPeriodDexieRepository.delete(created.id)
      const removed = await trackerPeriodDexieRepository.getById(created.id)
      expect(removed).toBeUndefined()
    })
  })

  describe('migration v14→v15 defaults', () => {
    it('adds defaults for new epic 5 fields', async () => {
      const dbName = `PlanningMigration_${Date.now()}_${Math.random()}`
      const legacyDb = new PlanningDatabaseV14(dbName)
      await legacyDb.open()

      const legacyProject: Project = {
        id: 'proj-legacy',
        createdAt: baseTimestamp,
        updatedAt: baseTimestamp,
        lifeAreaIds: [],
        priorityIds: [],
        monthIds: [],
        name: 'Legacy Project',
        description: undefined,
        targetOutcome: undefined,
        status: 'planned',
      }

      const legacyCommitment: Commitment = {
        id: 'commit-legacy',
        createdAt: baseTimestamp,
        updatedAt: baseTimestamp,
        startDate: '2026-01-05',
        endDate: '2026-01-11',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Legacy Commitment',
        status: 'planned',
      }

      const legacyYearlyPlan: YearlyPlan = {
        id: 'year-legacy',
        createdAt: baseTimestamp,
        updatedAt: baseTimestamp,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: [],
      }

      await legacyDb.projects.add(legacyProject)
      await legacyDb.commitments.add(legacyCommitment)
      await legacyDb.yearlyPlans.add(legacyYearlyPlan)
      await legacyDb.close()

      const migratedDb = new UserDatabase(dbName)
      await migratedDb.open()

      const migratedProject = await migratedDb.projects.get('proj-legacy')
      expect(migratedProject?.objective).toBeUndefined()
      expect(migratedProject?.focusWeekIds).toEqual([])
      expect(migratedProject?.focusMonthIds).toEqual([])

      // Legacy DB fields (sourceType, isAutoGenerated) are migrated at DB level
      // but no longer part of the Commitment TS interface
      const migratedCommitment = await migratedDb.commitments.get('commit-legacy') as Record<string, unknown> | undefined
      expect(migratedCommitment?.sourceType).toBe('manual')
      expect(migratedCommitment?.isAutoGenerated).toBe(false)

      const migratedYearlyPlan = await migratedDb.yearlyPlans.get('year-legacy')
      expect(migratedYearlyPlan?.lifeAreaNarratives).toEqual({})

      await migratedDb.close()
      await Dexie.delete(dbName)
    })
  })
})
