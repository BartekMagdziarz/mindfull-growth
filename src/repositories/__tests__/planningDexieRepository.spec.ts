import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { connectUserDatabase, disconnectUserDatabase } from '@/services/userDatabase.service'
import {
  focusAreaDexieRepository,
  priorityDexieRepository,
  projectDexieRepository,
  commitmentDexieRepository,
  weeklyPlanDexieRepository,
  quarterlyPlanDexieRepository,
  yearlyPlanDexieRepository,
} from '../planningDexieRepository'
import type { FocusArea } from '@/domain/planning'

describe('Planning System Repositories', () => {
  const testUserId = `test-user-${Date.now()}-${Math.random()}`
  const testDbName = `MindfullGrowthDB_${testUserId}`

  beforeEach(async () => {
    // Connect to a test user database
    await connectUserDatabase(testUserId)
  })

  afterEach(async () => {
    // Disconnect and clean up
    await disconnectUserDatabase()
    try {
      await Dexie.delete(testDbName)
    } catch {
      // Ignore cleanup errors
    }
  })

  // ==========================================================================
  // Focus Area Repository Tests
  // ==========================================================================

  describe('FocusAreaDexieRepository', () => {
    describe('create', () => {
      it('creates a focus area with generated id and timestamps', async () => {
        const focusArea = await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Health & Fitness',
          description: 'Focus on physical health',
          color: '#4CAF50',
          isActive: true,
          sortOrder: 0,
        })

        expect(focusArea.id).toBeDefined()
        expect(focusArea.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
        expect(focusArea.createdAt).toBeDefined()
        expect(focusArea.updatedAt).toBeDefined()
        expect(focusArea.year).toBe(2026)
        expect(focusArea.name).toBe('Health & Fitness')
        expect(focusArea.description).toBe('Focus on physical health')
        expect(focusArea.color).toBe('#4CAF50')
        expect(focusArea.isActive).toBe(true)
        expect(focusArea.sortOrder).toBe(0)
      })
    })

    describe('getAll', () => {
      it('returns all focus areas', async () => {
        await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Health',
          isActive: true,
          sortOrder: 0,
        })
        await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Career',
          isActive: true,
          sortOrder: 1,
        })

        const all = await focusAreaDexieRepository.getAll()
        expect(all).toHaveLength(2)
      })

      it('returns empty array when no focus areas exist', async () => {
        const all = await focusAreaDexieRepository.getAll()
        expect(all).toEqual([])
      })
    })

    describe('getById', () => {
      it('returns focus area by id', async () => {
        const created = await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Health',
          isActive: true,
          sortOrder: 0,
        })

        const found = await focusAreaDexieRepository.getById(created.id)
        expect(found).toBeDefined()
        expect(found?.id).toBe(created.id)
        expect(found?.name).toBe('Health')
      })

      it('returns undefined for non-existent id', async () => {
        const found = await focusAreaDexieRepository.getById('non-existent-id')
        expect(found).toBeUndefined()
      })
    })

    describe('getByYear', () => {
      it('returns focus areas for a specific year', async () => {
        await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Health 2026',
          isActive: true,
          sortOrder: 0,
        })
        await focusAreaDexieRepository.create({
          year: 2027,
          name: 'Health 2027',
          isActive: true,
          sortOrder: 0,
        })

        const year2026 = await focusAreaDexieRepository.getByYear(2026)
        expect(year2026).toHaveLength(1)
        expect(year2026[0].name).toBe('Health 2026')
      })
    })

    describe('getActiveByYear', () => {
      it('returns only active focus areas for a year', async () => {
        await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Active Focus',
          isActive: true,
          sortOrder: 0,
        })
        await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Inactive Focus',
          isActive: false,
          sortOrder: 1,
        })

        const active = await focusAreaDexieRepository.getActiveByYear(2026)
        expect(active).toHaveLength(1)
        expect(active[0].name).toBe('Active Focus')
      })
    })

    describe('update', () => {
      it('updates focus area and updatedAt timestamp', async () => {
        const created = await focusAreaDexieRepository.create({
          year: 2026,
          name: 'Original Name',
          isActive: true,
          sortOrder: 0,
        })

        // Small delay to ensure updatedAt changes
        await new Promise((resolve) => setTimeout(resolve, 10))

        const updated = await focusAreaDexieRepository.update(created.id, {
          name: 'Updated Name',
        })

        expect(updated.name).toBe('Updated Name')
        expect(updated.updatedAt).not.toBe(created.updatedAt)
        expect(updated.createdAt).toBe(created.createdAt)
      })

      it('throws error for non-existent focus area', async () => {
        await expect(
          focusAreaDexieRepository.update('non-existent', { name: 'Test' })
        ).rejects.toThrow()
      })
    })

    describe('delete', () => {
      it('deletes a focus area', async () => {
        const created = await focusAreaDexieRepository.create({
          year: 2026,
          name: 'To Delete',
          isActive: true,
          sortOrder: 0,
        })

        await focusAreaDexieRepository.delete(created.id)

        const found = await focusAreaDexieRepository.getById(created.id)
        expect(found).toBeUndefined()
      })
    })
  })

  // ==========================================================================
  // Priority Repository Tests
  // ==========================================================================

  describe('PriorityDexieRepository', () => {
    let focusArea: FocusArea

    beforeEach(async () => {
      focusArea = await focusAreaDexieRepository.create({
        year: 2026,
        name: 'Health',
        isActive: true,
        sortOrder: 0,
      })
    })

    describe('create', () => {
      it('creates a priority with generated id and timestamps', async () => {
        const priority = await priorityDexieRepository.create({
          focusAreaId: focusArea.id,
          year: 2026,
          name: 'Build exercise habit',
          successSignals: ['Exercise 3x/week', 'Feel more energetic'],
          constraints: ["Don't sacrifice sleep"],
          isActive: true,
          sortOrder: 0,
        })

        expect(priority.id).toBeDefined()
        expect(priority.focusAreaId).toBe(focusArea.id)
        expect(priority.successSignals).toHaveLength(2)
        expect(priority.constraints).toHaveLength(1)
      })
    })

    describe('getByFocusAreaId', () => {
      it('returns priorities for a focus area', async () => {
        await priorityDexieRepository.create({
          focusAreaId: focusArea.id,
          year: 2026,
          name: 'Priority 1',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        })
        await priorityDexieRepository.create({
          focusAreaId: focusArea.id,
          year: 2026,
          name: 'Priority 2',
          successSignals: [],
          isActive: true,
          sortOrder: 1,
        })

        const priorities = await priorityDexieRepository.getByFocusAreaId(focusArea.id)
        expect(priorities).toHaveLength(2)
      })
    })

    describe('deleteByFocusAreaId', () => {
      it('deletes all priorities for a focus area', async () => {
        await priorityDexieRepository.create({
          focusAreaId: focusArea.id,
          year: 2026,
          name: 'Priority 1',
          successSignals: [],
          isActive: true,
          sortOrder: 0,
        })
        await priorityDexieRepository.create({
          focusAreaId: focusArea.id,
          year: 2026,
          name: 'Priority 2',
          successSignals: [],
          isActive: true,
          sortOrder: 1,
        })

        await priorityDexieRepository.deleteByFocusAreaId(focusArea.id)

        const priorities = await priorityDexieRepository.getByFocusAreaId(focusArea.id)
        expect(priorities).toHaveLength(0)
      })
    })
  })

  // ==========================================================================
  // Project Repository Tests
  // ==========================================================================

  describe('ProjectDexieRepository', () => {
    let focusArea: FocusArea

    beforeEach(async () => {
      focusArea = await focusAreaDexieRepository.create({
        year: 2026,
        name: 'Health',
        isActive: true,
        sortOrder: 0,
      })
    })

    describe('create', () => {
      it('creates a project with generated id and timestamps', async () => {
        const project = await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-01-01',
          name: 'Complete Couch to 5K',
          description: 'Running program',
          targetOutcome: 'Run 5K without stopping',
          status: 'planned',
        })

        expect(project.id).toBeDefined()
        expect(project.focusAreaId).toBe(focusArea.id)
        expect(project.status).toBe('planned')
      })
    })

    describe('getByQuarter', () => {
      it('returns projects for a specific quarter', async () => {
        await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-01-01',
          name: 'Q1 Project',
          status: 'active',
        })
        await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-04-01',
          name: 'Q2 Project',
          status: 'planned',
        })

        const q1Projects = await projectDexieRepository.getByQuarter('2026-01-01')
        expect(q1Projects).toHaveLength(1)
        expect(q1Projects[0].name).toBe('Q1 Project')
      })
    })

    describe('getByStatus', () => {
      it('returns projects with specific status', async () => {
        await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-01-01',
          name: 'Active Project',
          status: 'active',
        })
        await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-01-01',
          name: 'Completed Project',
          status: 'completed',
        })

        const active = await projectDexieRepository.getByStatus('active')
        expect(active).toHaveLength(1)
        expect(active[0].name).toBe('Active Project')
      })
    })

    describe('getActive', () => {
      it('returns only active projects', async () => {
        await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-01-01',
          name: 'Active',
          status: 'active',
        })
        await projectDexieRepository.create({
          focusAreaId: focusArea.id,
          quarterStart: '2026-01-01',
          name: 'Planned',
          status: 'planned',
        })

        const active = await projectDexieRepository.getActive()
        expect(active).toHaveLength(1)
        expect(active[0].name).toBe('Active')
      })
    })
  })

  // ==========================================================================
  // Commitment Repository Tests
  // ==========================================================================

  describe('CommitmentDexieRepository', () => {
    describe('create', () => {
      it('creates a commitment with generated id and timestamps', async () => {
        const commitment = await commitmentDexieRepository.create({
          weekStartDate: '2026-01-19',
          name: 'Run 3 times',
          isNonNegotiable: true,
          status: 'planned',
        })

        expect(commitment.id).toBeDefined()
        expect(commitment.weekStartDate).toBe('2026-01-19')
        expect(commitment.isNonNegotiable).toBe(true)
        expect(commitment.status).toBe('planned')
      })
    })

    describe('getByWeek', () => {
      it('returns commitments for a specific week', async () => {
        await commitmentDexieRepository.create({
          weekStartDate: '2026-01-19',
          name: 'Week 1 Commitment',
          isNonNegotiable: false,
          status: 'planned',
        })
        await commitmentDexieRepository.create({
          weekStartDate: '2026-01-26',
          name: 'Week 2 Commitment',
          isNonNegotiable: false,
          status: 'planned',
        })

        const week1 = await commitmentDexieRepository.getByWeek('2026-01-19')
        expect(week1).toHaveLength(1)
        expect(week1[0].name).toBe('Week 1 Commitment')
      })
    })

    describe('update status', () => {
      it('updates commitment status', async () => {
        const commitment = await commitmentDexieRepository.create({
          weekStartDate: '2026-01-19',
          name: 'Test Commitment',
          isNonNegotiable: false,
          status: 'planned',
        })

        const updated = await commitmentDexieRepository.update(commitment.id, {
          status: 'done',
          reflectionNote: 'Completed successfully!',
        })

        expect(updated.status).toBe('done')
        expect(updated.reflectionNote).toBe('Completed successfully!')
      })
    })
  })

  // ==========================================================================
  // Weekly Plan Repository Tests
  // ==========================================================================

  describe('WeeklyPlanDexieRepository', () => {
    describe('create', () => {
      it('creates a weekly plan with generated id and timestamps', async () => {
        const plan = await weeklyPlanDexieRepository.create({
          weekStartDate: '2026-01-19',
          capacityNote: 'High capacity this week',
          focusSentence: 'Focus on health goals',
          adaptiveIntention: 'Stay flexible with schedule',
          commitmentIds: [],
          reflectionCompleted: false,
        })

        expect(plan.id).toBeDefined()
        expect(plan.weekStartDate).toBe('2026-01-19')
        expect(plan.focusSentence).toBe('Focus on health goals')
        expect(plan.reflectionCompleted).toBe(false)
      })
    })

    describe('getByWeek', () => {
      it('returns weekly plan for a specific week', async () => {
        await weeklyPlanDexieRepository.create({
          weekStartDate: '2026-01-19',
          commitmentIds: [],
          reflectionCompleted: false,
        })

        const plan = await weeklyPlanDexieRepository.getByWeek('2026-01-19')
        expect(plan).toBeDefined()
        expect(plan?.weekStartDate).toBe('2026-01-19')
      })

      it('returns undefined for week without plan', async () => {
        const plan = await weeklyPlanDexieRepository.getByWeek('2026-01-19')
        expect(plan).toBeUndefined()
      })
    })

    describe('update reflection', () => {
      it('updates reflection fields', async () => {
        const plan = await weeklyPlanDexieRepository.create({
          weekStartDate: '2026-01-19',
          commitmentIds: [],
          reflectionCompleted: false,
        })

        const updated = await weeklyPlanDexieRepository.update(plan.id, {
          reflectionCompleted: true,
          whatHelped: 'Morning routine',
          whatGotInTheWay: 'Unexpected meetings',
          whatILearned: 'Need buffer time',
          nextWeekSeed: 'Block calendar better',
        })

        expect(updated.reflectionCompleted).toBe(true)
        expect(updated.whatHelped).toBe('Morning routine')
        expect(updated.nextWeekSeed).toBe('Block calendar better')
      })
    })
  })

  // ==========================================================================
  // Quarterly Plan Repository Tests
  // ==========================================================================

  describe('QuarterlyPlanDexieRepository', () => {
    describe('create', () => {
      it('creates a quarterly plan with generated id and timestamps', async () => {
        const plan = await quarterlyPlanDexieRepository.create({
          quarterStart: '2026-01-01',
          year: 2026,
          quarter: 1,
          secondaryFocusAreaIds: [],
          projectIds: [],
          reflectionCompleted: false,
        })

        expect(plan.id).toBeDefined()
        expect(plan.year).toBe(2026)
        expect(plan.quarter).toBe(1)
      })
    })

    describe('getByQuarter', () => {
      it('returns quarterly plan by year and quarter', async () => {
        await quarterlyPlanDexieRepository.create({
          quarterStart: '2026-01-01',
          year: 2026,
          quarter: 1,
          secondaryFocusAreaIds: [],
          projectIds: [],
          reflectionCompleted: false,
        })

        const plan = await quarterlyPlanDexieRepository.getByQuarter(2026, 1)
        expect(plan).toBeDefined()
        expect(plan?.year).toBe(2026)
        expect(plan?.quarter).toBe(1)
      })

      it('returns undefined for non-existent quarter', async () => {
        const plan = await quarterlyPlanDexieRepository.getByQuarter(2026, 1)
        expect(plan).toBeUndefined()
      })
    })

    describe('getByYear', () => {
      it('returns all quarterly plans for a year', async () => {
        await quarterlyPlanDexieRepository.create({
          quarterStart: '2026-01-01',
          year: 2026,
          quarter: 1,
          secondaryFocusAreaIds: [],
          projectIds: [],
          reflectionCompleted: false,
        })
        await quarterlyPlanDexieRepository.create({
          quarterStart: '2026-04-01',
          year: 2026,
          quarter: 2,
          secondaryFocusAreaIds: [],
          projectIds: [],
          reflectionCompleted: false,
        })

        const plans = await quarterlyPlanDexieRepository.getByYear(2026)
        expect(plans).toHaveLength(2)
      })
    })
  })

  // ==========================================================================
  // Yearly Plan Repository Tests
  // ==========================================================================

  describe('YearlyPlanDexieRepository', () => {
    describe('create', () => {
      it('creates a yearly plan with generated id and timestamps', async () => {
        const plan = await yearlyPlanDexieRepository.create({
          year: 2026,
          yearTheme: 'Growth',
          focusAreaIds: [],
          reflectionCompleted: false,
        })

        expect(plan.id).toBeDefined()
        expect(plan.year).toBe(2026)
        expect(plan.yearTheme).toBe('Growth')
        expect(plan.reflectionCompleted).toBe(false)
      })
    })

    describe('getByYear', () => {
      it('returns yearly plan for a specific year', async () => {
        await yearlyPlanDexieRepository.create({
          year: 2026,
          focusAreaIds: [],
          reflectionCompleted: false,
        })

        const plan = await yearlyPlanDexieRepository.getByYear(2026)
        expect(plan).toBeDefined()
        expect(plan?.year).toBe(2026)
      })

      it('returns undefined for year without plan', async () => {
        const plan = await yearlyPlanDexieRepository.getByYear(2026)
        expect(plan).toBeUndefined()
      })
    })

    describe('update reflection', () => {
      it('updates reflection fields at year end', async () => {
        const plan = await yearlyPlanDexieRepository.create({
          year: 2026,
          focusAreaIds: [],
          reflectionCompleted: false,
        })

        const updated = await yearlyPlanDexieRepository.update(plan.id, {
          reflectionCompleted: true,
          yearInOnePhrase: 'A year of growth',
          biggestWins: ['Completed marathon', 'Got promoted'],
          biggestLessons: ['Need more rest', 'Delegation is key'],
          carryForward: 'Continue health focus',
        })

        expect(updated.reflectionCompleted).toBe(true)
        expect(updated.yearInOnePhrase).toBe('A year of growth')
        expect(updated.biggestWins).toHaveLength(2)
        expect(updated.carryForward).toBe('Continue health focus')
      })
    })
  })
})
