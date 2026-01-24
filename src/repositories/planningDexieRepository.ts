/**
 * Dexie (IndexedDB) implementations for Planning System repositories
 *
 * This file provides concrete implementations of all planning repository
 * interfaces using Dexie for IndexedDB storage. Each implementation follows
 * the established patterns from other repositories in this codebase.
 */

import { getUserDatabase } from '@/services/userDatabase.service'
import type {
  FocusArea,
  Priority,
  Project,
  ProjectStatus,
  Commitment,
  WeeklyPlan,
  QuarterlyPlan,
  YearlyPlan,
  CreateFocusAreaPayload,
  UpdateFocusAreaPayload,
  CreatePriorityPayload,
  UpdatePriorityPayload,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateCommitmentPayload,
  UpdateCommitmentPayload,
  CreateWeeklyPlanPayload,
  UpdateWeeklyPlanPayload,
  CreateQuarterlyPlanPayload,
  UpdateQuarterlyPlanPayload,
  CreateYearlyPlanPayload,
  UpdateYearlyPlanPayload,
} from '@/domain/planning'
import type {
  FocusAreaRepository,
  PriorityRepository,
  ProjectRepository,
  CommitmentRepository,
  WeeklyPlanRepository,
  QuarterlyPlanRepository,
  YearlyPlanRepository,
} from './planningRepository'

// ============================================================================
// Focus Area Repository Implementation
// ============================================================================

class FocusAreaDexieRepository implements FocusAreaRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<FocusArea[]> {
    try {
      return await this.db.focusAreas.toArray()
    } catch (error) {
      console.error('Failed to get all focus areas:', error)
      throw new Error('Failed to retrieve focus areas from database')
    }
  }

  async getById(id: string): Promise<FocusArea | undefined> {
    try {
      return await this.db.focusAreas.get(id)
    } catch (error) {
      console.error(`Failed to get focus area with id ${id}:`, error)
      throw new Error(`Failed to retrieve focus area with id ${id}`)
    }
  }

  async getByYear(year: number): Promise<FocusArea[]> {
    try {
      return await this.db.focusAreas.where('year').equals(year).toArray()
    } catch (error) {
      console.error(`Failed to get focus areas for year ${year}:`, error)
      throw new Error(`Failed to retrieve focus areas for year ${year}`)
    }
  }

  async getActiveByYear(year: number): Promise<FocusArea[]> {
    try {
      const allForYear = await this.db.focusAreas.where('year').equals(year).toArray()
      return allForYear.filter((fa) => fa.isActive)
    } catch (error) {
      console.error(`Failed to get active focus areas for year ${year}:`, error)
      throw new Error(`Failed to retrieve active focus areas for year ${year}`)
    }
  }

  async create(data: CreateFocusAreaPayload): Promise<FocusArea> {
    try {
      const now = new Date().toISOString()
      const focusArea: FocusArea = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.focusAreas.add(focusArea)
      return focusArea
    } catch (error) {
      console.error('Failed to create focus area:', error)
      throw new Error('Failed to create focus area in database')
    }
  }

  async update(id: string, data: UpdateFocusAreaPayload): Promise<FocusArea> {
    try {
      const existing = await this.db.focusAreas.get(id)
      if (!existing) {
        throw new Error(`Focus area with id ${id} not found`)
      }

      const updated: FocusArea = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.focusAreas.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update focus area with id ${id}:`, error)
      throw new Error(`Failed to update focus area with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.focusAreas.delete(id)
    } catch (error) {
      console.error(`Failed to delete focus area with id ${id}:`, error)
      throw new Error(`Failed to delete focus area with id ${id}`)
    }
  }
}

// ============================================================================
// Priority Repository Implementation
// ============================================================================

class PriorityDexieRepository implements PriorityRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<Priority[]> {
    try {
      return await this.db.priorities.toArray()
    } catch (error) {
      console.error('Failed to get all priorities:', error)
      throw new Error('Failed to retrieve priorities from database')
    }
  }

  async getById(id: string): Promise<Priority | undefined> {
    try {
      return await this.db.priorities.get(id)
    } catch (error) {
      console.error(`Failed to get priority with id ${id}:`, error)
      throw new Error(`Failed to retrieve priority with id ${id}`)
    }
  }

  async getByFocusAreaId(focusAreaId: string): Promise<Priority[]> {
    try {
      return await this.db.priorities.where('focusAreaId').equals(focusAreaId).toArray()
    } catch (error) {
      console.error(`Failed to get priorities for focus area ${focusAreaId}:`, error)
      throw new Error(`Failed to retrieve priorities for focus area ${focusAreaId}`)
    }
  }

  async getByYear(year: number): Promise<Priority[]> {
    try {
      return await this.db.priorities.where('year').equals(year).toArray()
    } catch (error) {
      console.error(`Failed to get priorities for year ${year}:`, error)
      throw new Error(`Failed to retrieve priorities for year ${year}`)
    }
  }

  async getActiveByYear(year: number): Promise<Priority[]> {
    try {
      const allForYear = await this.db.priorities.where('year').equals(year).toArray()
      return allForYear.filter((p) => p.isActive)
    } catch (error) {
      console.error(`Failed to get active priorities for year ${year}:`, error)
      throw new Error(`Failed to retrieve active priorities for year ${year}`)
    }
  }

  async create(data: CreatePriorityPayload): Promise<Priority> {
    try {
      const now = new Date().toISOString()
      const priority: Priority = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.priorities.add(priority)
      return priority
    } catch (error) {
      console.error('Failed to create priority:', error)
      throw new Error('Failed to create priority in database')
    }
  }

  async update(id: string, data: UpdatePriorityPayload): Promise<Priority> {
    try {
      const existing = await this.db.priorities.get(id)
      if (!existing) {
        throw new Error(`Priority with id ${id} not found`)
      }

      const updated: Priority = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.priorities.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update priority with id ${id}:`, error)
      throw new Error(`Failed to update priority with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.priorities.delete(id)
    } catch (error) {
      console.error(`Failed to delete priority with id ${id}:`, error)
      throw new Error(`Failed to delete priority with id ${id}`)
    }
  }

  async deleteByFocusAreaId(focusAreaId: string): Promise<void> {
    try {
      await this.db.priorities.where('focusAreaId').equals(focusAreaId).delete()
    } catch (error) {
      console.error(`Failed to delete priorities for focus area ${focusAreaId}:`, error)
      throw new Error(`Failed to delete priorities for focus area ${focusAreaId}`)
    }
  }
}

// ============================================================================
// Project Repository Implementation
// ============================================================================

class ProjectDexieRepository implements ProjectRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<Project[]> {
    try {
      return await this.db.projects.toArray()
    } catch (error) {
      console.error('Failed to get all projects:', error)
      throw new Error('Failed to retrieve projects from database')
    }
  }

  async getById(id: string): Promise<Project | undefined> {
    try {
      return await this.db.projects.get(id)
    } catch (error) {
      console.error(`Failed to get project with id ${id}:`, error)
      throw new Error(`Failed to retrieve project with id ${id}`)
    }
  }

  async getByQuarter(quarterStart: string): Promise<Project[]> {
    try {
      return await this.db.projects.where('quarterStart').equals(quarterStart).toArray()
    } catch (error) {
      console.error(`Failed to get projects for quarter ${quarterStart}:`, error)
      throw new Error(`Failed to retrieve projects for quarter ${quarterStart}`)
    }
  }

  async getByFocusAreaId(focusAreaId: string): Promise<Project[]> {
    try {
      return await this.db.projects.where('focusAreaId').equals(focusAreaId).toArray()
    } catch (error) {
      console.error(`Failed to get projects for focus area ${focusAreaId}:`, error)
      throw new Error(`Failed to retrieve projects for focus area ${focusAreaId}`)
    }
  }

  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    try {
      return await this.db.projects.where('status').equals(status).toArray()
    } catch (error) {
      console.error(`Failed to get projects with status ${status}:`, error)
      throw new Error(`Failed to retrieve projects with status ${status}`)
    }
  }

  async getActive(): Promise<Project[]> {
    try {
      return await this.db.projects.where('status').equals('active').toArray()
    } catch (error) {
      console.error('Failed to get active projects:', error)
      throw new Error('Failed to retrieve active projects')
    }
  }

  async create(data: CreateProjectPayload): Promise<Project> {
    try {
      const now = new Date().toISOString()
      const project: Project = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.projects.add(project)
      return project
    } catch (error) {
      console.error('Failed to create project:', error)
      throw new Error('Failed to create project in database')
    }
  }

  async update(id: string, data: UpdateProjectPayload): Promise<Project> {
    try {
      const existing = await this.db.projects.get(id)
      if (!existing) {
        throw new Error(`Project with id ${id} not found`)
      }

      const updated: Project = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.projects.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update project with id ${id}:`, error)
      throw new Error(`Failed to update project with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.projects.delete(id)
    } catch (error) {
      console.error(`Failed to delete project with id ${id}:`, error)
      throw new Error(`Failed to delete project with id ${id}`)
    }
  }
}

// ============================================================================
// Commitment Repository Implementation
// ============================================================================

class CommitmentDexieRepository implements CommitmentRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<Commitment[]> {
    try {
      return await this.db.commitments.toArray()
    } catch (error) {
      console.error('Failed to get all commitments:', error)
      throw new Error('Failed to retrieve commitments from database')
    }
  }

  async getById(id: string): Promise<Commitment | undefined> {
    try {
      return await this.db.commitments.get(id)
    } catch (error) {
      console.error(`Failed to get commitment with id ${id}:`, error)
      throw new Error(`Failed to retrieve commitment with id ${id}`)
    }
  }

  async getByWeek(weekStartDate: string): Promise<Commitment[]> {
    try {
      return await this.db.commitments.where('weekStartDate').equals(weekStartDate).toArray()
    } catch (error) {
      console.error(`Failed to get commitments for week ${weekStartDate}:`, error)
      throw new Error(`Failed to retrieve commitments for week ${weekStartDate}`)
    }
  }

  async getByProjectId(projectId: string): Promise<Commitment[]> {
    try {
      return await this.db.commitments.where('projectId').equals(projectId).toArray()
    } catch (error) {
      console.error(`Failed to get commitments for project ${projectId}:`, error)
      throw new Error(`Failed to retrieve commitments for project ${projectId}`)
    }
  }

  async getByFocusAreaId(focusAreaId: string): Promise<Commitment[]> {
    try {
      // focusAreaId is not indexed, so we filter manually
      const all = await this.db.commitments.toArray()
      return all.filter((c) => c.focusAreaId === focusAreaId)
    } catch (error) {
      console.error(`Failed to get commitments for focus area ${focusAreaId}:`, error)
      throw new Error(`Failed to retrieve commitments for focus area ${focusAreaId}`)
    }
  }

  async create(data: CreateCommitmentPayload): Promise<Commitment> {
    try {
      const now = new Date().toISOString()
      const commitment: Commitment = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.commitments.add(commitment)
      return commitment
    } catch (error) {
      console.error('Failed to create commitment:', error)
      throw new Error('Failed to create commitment in database')
    }
  }

  async update(id: string, data: UpdateCommitmentPayload): Promise<Commitment> {
    try {
      const existing = await this.db.commitments.get(id)
      if (!existing) {
        throw new Error(`Commitment with id ${id} not found`)
      }

      const updated: Commitment = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.commitments.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update commitment with id ${id}:`, error)
      throw new Error(`Failed to update commitment with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.commitments.delete(id)
    } catch (error) {
      console.error(`Failed to delete commitment with id ${id}:`, error)
      throw new Error(`Failed to delete commitment with id ${id}`)
    }
  }
}

// ============================================================================
// Weekly Plan Repository Implementation
// ============================================================================

class WeeklyPlanDexieRepository implements WeeklyPlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<WeeklyPlan[]> {
    try {
      return await this.db.weeklyPlans.toArray()
    } catch (error) {
      console.error('Failed to get all weekly plans:', error)
      throw new Error('Failed to retrieve weekly plans from database')
    }
  }

  async getById(id: string): Promise<WeeklyPlan | undefined> {
    try {
      return await this.db.weeklyPlans.get(id)
    } catch (error) {
      console.error(`Failed to get weekly plan with id ${id}:`, error)
      throw new Error(`Failed to retrieve weekly plan with id ${id}`)
    }
  }

  async getByWeek(weekStartDate: string): Promise<WeeklyPlan | undefined> {
    try {
      return await this.db.weeklyPlans.where('weekStartDate').equals(weekStartDate).first()
    } catch (error) {
      console.error(`Failed to get weekly plan for week ${weekStartDate}:`, error)
      throw new Error(`Failed to retrieve weekly plan for week ${weekStartDate}`)
    }
  }

  async create(data: CreateWeeklyPlanPayload): Promise<WeeklyPlan> {
    try {
      const now = new Date().toISOString()
      const weeklyPlan: WeeklyPlan = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.weeklyPlans.add(weeklyPlan)
      return weeklyPlan
    } catch (error) {
      console.error('Failed to create weekly plan:', error)
      throw new Error('Failed to create weekly plan in database')
    }
  }

  async update(id: string, data: UpdateWeeklyPlanPayload): Promise<WeeklyPlan> {
    try {
      const existing = await this.db.weeklyPlans.get(id)
      if (!existing) {
        throw new Error(`Weekly plan with id ${id} not found`)
      }

      const updated: WeeklyPlan = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.weeklyPlans.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update weekly plan with id ${id}:`, error)
      throw new Error(`Failed to update weekly plan with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.weeklyPlans.delete(id)
    } catch (error) {
      console.error(`Failed to delete weekly plan with id ${id}:`, error)
      throw new Error(`Failed to delete weekly plan with id ${id}`)
    }
  }
}

// ============================================================================
// Quarterly Plan Repository Implementation
// ============================================================================

class QuarterlyPlanDexieRepository implements QuarterlyPlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<QuarterlyPlan[]> {
    try {
      return await this.db.quarterlyPlans.toArray()
    } catch (error) {
      console.error('Failed to get all quarterly plans:', error)
      throw new Error('Failed to retrieve quarterly plans from database')
    }
  }

  async getById(id: string): Promise<QuarterlyPlan | undefined> {
    try {
      return await this.db.quarterlyPlans.get(id)
    } catch (error) {
      console.error(`Failed to get quarterly plan with id ${id}:`, error)
      throw new Error(`Failed to retrieve quarterly plan with id ${id}`)
    }
  }

  async getByQuarter(year: number, quarter: 1 | 2 | 3 | 4): Promise<QuarterlyPlan | undefined> {
    try {
      return await this.db.quarterlyPlans.where('[year+quarter]').equals([year, quarter]).first()
    } catch (error) {
      console.error(`Failed to get quarterly plan for Q${quarter} ${year}:`, error)
      throw new Error(`Failed to retrieve quarterly plan for Q${quarter} ${year}`)
    }
  }

  async getByYear(year: number): Promise<QuarterlyPlan[]> {
    try {
      // Year is the first part of the compound index, so we can use it for range queries
      const all = await this.db.quarterlyPlans.toArray()
      return all.filter((qp) => qp.year === year)
    } catch (error) {
      console.error(`Failed to get quarterly plans for year ${year}:`, error)
      throw new Error(`Failed to retrieve quarterly plans for year ${year}`)
    }
  }

  async create(data: CreateQuarterlyPlanPayload): Promise<QuarterlyPlan> {
    try {
      const now = new Date().toISOString()
      const quarterlyPlan: QuarterlyPlan = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.quarterlyPlans.add(quarterlyPlan)
      return quarterlyPlan
    } catch (error) {
      console.error('Failed to create quarterly plan:', error)
      throw new Error('Failed to create quarterly plan in database')
    }
  }

  async update(id: string, data: UpdateQuarterlyPlanPayload): Promise<QuarterlyPlan> {
    try {
      const existing = await this.db.quarterlyPlans.get(id)
      if (!existing) {
        throw new Error(`Quarterly plan with id ${id} not found`)
      }

      const updated: QuarterlyPlan = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.quarterlyPlans.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update quarterly plan with id ${id}:`, error)
      throw new Error(`Failed to update quarterly plan with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.quarterlyPlans.delete(id)
    } catch (error) {
      console.error(`Failed to delete quarterly plan with id ${id}:`, error)
      throw new Error(`Failed to delete quarterly plan with id ${id}`)
    }
  }
}

// ============================================================================
// Yearly Plan Repository Implementation
// ============================================================================

class YearlyPlanDexieRepository implements YearlyPlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<YearlyPlan[]> {
    try {
      return await this.db.yearlyPlans.toArray()
    } catch (error) {
      console.error('Failed to get all yearly plans:', error)
      throw new Error('Failed to retrieve yearly plans from database')
    }
  }

  async getById(id: string): Promise<YearlyPlan | undefined> {
    try {
      return await this.db.yearlyPlans.get(id)
    } catch (error) {
      console.error(`Failed to get yearly plan with id ${id}:`, error)
      throw new Error(`Failed to retrieve yearly plan with id ${id}`)
    }
  }

  async getByYear(year: number): Promise<YearlyPlan | undefined> {
    try {
      return await this.db.yearlyPlans.where('year').equals(year).first()
    } catch (error) {
      console.error(`Failed to get yearly plan for year ${year}:`, error)
      throw new Error(`Failed to retrieve yearly plan for year ${year}`)
    }
  }

  async create(data: CreateYearlyPlanPayload): Promise<YearlyPlan> {
    try {
      const now = new Date().toISOString()
      const yearlyPlan: YearlyPlan = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.yearlyPlans.add(yearlyPlan)
      return yearlyPlan
    } catch (error) {
      console.error('Failed to create yearly plan:', error)
      throw new Error('Failed to create yearly plan in database')
    }
  }

  async update(id: string, data: UpdateYearlyPlanPayload): Promise<YearlyPlan> {
    try {
      const existing = await this.db.yearlyPlans.get(id)
      if (!existing) {
        throw new Error(`Yearly plan with id ${id} not found`)
      }

      const updated: YearlyPlan = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.yearlyPlans.put(updated)
      return updated
    } catch (error) {
      console.error(`Failed to update yearly plan with id ${id}:`, error)
      throw new Error(`Failed to update yearly plan with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.yearlyPlans.delete(id)
    } catch (error) {
      console.error(`Failed to delete yearly plan with id ${id}:`, error)
      throw new Error(`Failed to delete yearly plan with id ${id}`)
    }
  }
}

// ============================================================================
// Export Singleton Instances
// ============================================================================

export const focusAreaDexieRepository = new FocusAreaDexieRepository()
export const priorityDexieRepository = new PriorityDexieRepository()
export const projectDexieRepository = new ProjectDexieRepository()
export const commitmentDexieRepository = new CommitmentDexieRepository()
export const weeklyPlanDexieRepository = new WeeklyPlanDexieRepository()
export const quarterlyPlanDexieRepository = new QuarterlyPlanDexieRepository()
export const yearlyPlanDexieRepository = new YearlyPlanDexieRepository()
