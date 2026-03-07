/**
 * Dexie (IndexedDB) implementations for Planning System repositories
 *
 * This file provides concrete implementations of all planning repository
 * interfaces using Dexie for IndexedDB storage. Each implementation follows
 * the established patterns from other repositories in this codebase.
 */

import { getUserDatabase } from '@/services/userDatabase.service'
import type {
  Priority,
  Project,
  ProjectStatus,
  Commitment,
  WeeklyPlan,
  MonthlyPlan,
  YearlyPlan,
  Tracker,
  TrackerPeriod,
  CreatePriorityPayload,
  UpdatePriorityPayload,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateCommitmentPayload,
  UpdateCommitmentPayload,
  CreateWeeklyPlanPayload,
  UpdateWeeklyPlanPayload,
  CreateMonthlyPlanPayload,
  UpdateMonthlyPlanPayload,
  CreateYearlyPlanPayload,
  UpdateYearlyPlanPayload,
  CreateTrackerPayload,
  UpdateTrackerPayload,
  CreateTrackerPeriodPayload,
  UpdateTrackerPeriodPayload,
} from '@/domain/planning'
import type {
  Habit,
  HabitOccurrence,
  CreateHabitPayload,
  UpdateHabitPayload,
  CreateHabitOccurrencePayload,
  UpdateHabitOccurrencePayload,
} from '@/domain/habit'
import type {
  YearlyReflection,
  MonthlyReflection,
  WeeklyReflection,
  CreateYearlyReflectionPayload,
  UpdateYearlyReflectionPayload,
  CreateMonthlyReflectionPayload,
  UpdateMonthlyReflectionPayload,
  CreateWeeklyReflectionPayload,
  UpdateWeeklyReflectionPayload,
} from '@/domain/reflection'
/**
 * Deep-clone an object to produce a plain JS value that IndexedDB can store.
 * Vue reactive Proxy objects cannot be structured-cloned at the C++ level,
 * so we must strip them before any Dexie add()/put() call.
 */
function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

import type {
  PriorityRepository,
  ProjectRepository,
  CommitmentRepository,
  WeeklyPlanRepository,
  MonthlyPlanRepository,
  YearlyPlanRepository,
  YearlyReflectionRepository,
  MonthlyReflectionRepository,
  WeeklyReflectionRepository,
  TrackerRepository,
  TrackerPeriodRepository,
  HabitRepository,
  HabitOccurrenceRepository,
} from './planningRepository'

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

  async getByLifeAreaId(lifeAreaId: string): Promise<Priority[]> {
    try {
      const all = await this.db.priorities.toArray()
      return all.filter((p) => p.lifeAreaIds?.includes(lifeAreaId))
    } catch (error) {
      console.error(`Failed to get priorities for life area ${lifeAreaId}:`, error)
      throw new Error(`Failed to retrieve priorities for life area ${lifeAreaId}`)
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
      await this.db.priorities.add(toPlain(priority))
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
      await this.db.priorities.put(toPlain(updated))
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

  async deleteByLifeAreaId(lifeAreaId: string): Promise<void> {
    try {
      const priorities = await this.db.priorities.toArray()
      const ids = priorities
        .filter((p) => p.lifeAreaIds?.includes(lifeAreaId))
        .map((p) => p.id)
      if (ids.length > 0) {
        await this.db.priorities.bulkDelete(ids)
      }
    } catch (error) {
      console.error(`Failed to delete priorities for life area ${lifeAreaId}:`, error)
      throw new Error(`Failed to delete priorities for life area ${lifeAreaId}`)
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

  async getByMonthId(monthId: string): Promise<Project[]> {
    try {
      // monthIds is an array, so we filter manually
      const all = await this.db.projects.toArray()
      return all.filter((p) => p.monthIds?.includes(monthId))
    } catch (error) {
      console.error(`Failed to get projects for month ${monthId}:`, error)
      throw new Error(`Failed to retrieve projects for month ${monthId}`)
    }
  }

  async getByMonthIds(monthIds: string[]): Promise<Project[]> {
    try {
      // monthIds is an array, so we filter manually
      const all = await this.db.projects.toArray()
      return all.filter((p) => p.monthIds?.some((id) => monthIds.includes(id)))
    } catch (error) {
      console.error(`Failed to get projects for months:`, error)
      throw new Error(`Failed to retrieve projects for months`)
    }
  }

  async getByLifeAreaId(lifeAreaId: string): Promise<Project[]> {
    try {
      const all = await this.db.projects.toArray()
      return all.filter((p) => p.lifeAreaIds?.includes(lifeAreaId))
    } catch (error) {
      console.error(`Failed to get projects for life area ${lifeAreaId}:`, error)
      throw new Error(`Failed to retrieve projects for life area ${lifeAreaId}`)
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
      await this.db.projects.add(toPlain(project))
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
      await this.db.projects.put(toPlain(updated))
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
// Tracker Repository Implementation (Unified)
// ============================================================================

class TrackerDexieRepository implements TrackerRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<Tracker[]> {
    try {
      return await this.db.trackers.toArray()
    } catch (error) {
      console.error('Failed to get all trackers:', error)
      throw new Error('Failed to retrieve trackers from database')
    }
  }

  async getById(id: string): Promise<Tracker | undefined> {
    try {
      return await this.db.trackers.get(id)
    } catch (error) {
      console.error(`Failed to get tracker with id ${id}:`, error)
      throw new Error(`Failed to retrieve tracker with id ${id}`)
    }
  }

  async getByParent(parentType: 'project' | 'habit' | 'commitment', parentId: string): Promise<Tracker[]> {
    try {
      return await this.db.trackers
        .where('[parentType+parentId]')
        .equals([parentType, parentId])
        .toArray()
    } catch (error) {
      console.error(`Failed to get trackers for ${parentType} ${parentId}:`, error)
      throw new Error(`Failed to retrieve trackers for ${parentType} ${parentId}`)
    }
  }

  async getByLifeAreaId(lifeAreaId: string): Promise<Tracker[]> {
    try {
      const all = await this.db.trackers.toArray()
      return all.filter((t) => t.lifeAreaIds?.includes(lifeAreaId))
    } catch (error) {
      console.error(`Failed to get trackers for life area ${lifeAreaId}:`, error)
      throw new Error(`Failed to retrieve trackers for life area ${lifeAreaId}`)
    }
  }

  async getByPriorityId(priorityId: string): Promise<Tracker[]> {
    try {
      const all = await this.db.trackers.toArray()
      return all.filter((t) => t.priorityIds?.includes(priorityId))
    } catch (error) {
      console.error(`Failed to get trackers for priority ${priorityId}:`, error)
      throw new Error(`Failed to retrieve trackers for priority ${priorityId}`)
    }
  }

  async getStandalone(): Promise<Tracker[]> {
    try {
      const all = await this.db.trackers.toArray()
      return all.filter((t) => !t.parentType)
    } catch (error) {
      console.error('Failed to get standalone trackers:', error)
      throw new Error('Failed to retrieve standalone trackers')
    }
  }

  async getActive(): Promise<Tracker[]> {
    try {
      return await this.db.trackers.filter((t) => t.isActive).toArray()
    } catch (error) {
      console.error('Failed to get active trackers:', error)
      throw new Error('Failed to retrieve active trackers')
    }
  }

  async create(data: CreateTrackerPayload): Promise<Tracker> {
    try {
      const now = new Date().toISOString()
      const tracker: Tracker = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.trackers.add(toPlain(tracker))
      return tracker
    } catch (error) {
      console.error('Failed to create tracker:', error)
      throw new Error('Failed to create tracker in database')
    }
  }

  async update(id: string, data: UpdateTrackerPayload): Promise<Tracker> {
    try {
      const existing = await this.db.trackers.get(id)
      if (!existing) {
        throw new Error(`Tracker with id ${id} not found`)
      }

      const updated: Tracker = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.trackers.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update tracker with id ${id}:`, error)
      throw new Error(`Failed to update tracker with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.trackers.delete(id)
    } catch (error) {
      console.error(`Failed to delete tracker with id ${id}:`, error)
      throw new Error(`Failed to delete tracker with id ${id}`)
    }
  }

  async deleteByParent(parentType: 'project' | 'habit' | 'commitment', parentId: string): Promise<void> {
    try {
      const trackers = await this.db.trackers
        .where('[parentType+parentId]')
        .equals([parentType, parentId])
        .toArray()
      const ids = trackers.map((t) => t.id)
      if (ids.length > 0) {
        await this.db.trackers.bulkDelete(ids)
      }
    } catch (error) {
      console.error(`Failed to delete trackers for ${parentType} ${parentId}:`, error)
      throw new Error(`Failed to delete trackers for ${parentType} ${parentId}`)
    }
  }
}

// ============================================================================
// Tracker Period Repository Implementation
// ============================================================================

class TrackerPeriodDexieRepository implements TrackerPeriodRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<TrackerPeriod[]> {
    try {
      return await this.db.trackerPeriods.toArray()
    } catch (error) {
      console.error('Failed to get all tracker periods:', error)
      throw new Error('Failed to retrieve tracker periods from database')
    }
  }

  async getById(id: string): Promise<TrackerPeriod | undefined> {
    try {
      return await this.db.trackerPeriods.get(id)
    } catch (error) {
      console.error(`Failed to get tracker period with id ${id}:`, error)
      throw new Error(`Failed to retrieve tracker period with id ${id}`)
    }
  }

  async getByTrackerId(trackerId: string): Promise<TrackerPeriod[]> {
    try {
      return await this.db.trackerPeriods.where('trackerId').equals(trackerId).toArray()
    } catch (error) {
      console.error(`Failed to get tracker periods for tracker ${trackerId}:`, error)
      throw new Error(`Failed to retrieve tracker periods for tracker ${trackerId}`)
    }
  }

  async getByTrackerIdAndDateRange(
    trackerId: string,
    startDate: string,
    endDate: string
  ): Promise<TrackerPeriod[]> {
    try {
      const periods = await this.db.trackerPeriods
        .where('trackerId')
        .equals(trackerId)
        .toArray()
      return periods.filter((p) => p.startDate >= startDate && p.startDate <= endDate)
    } catch (error) {
      console.error(`Failed to get tracker periods for tracker ${trackerId} in range:`, error)
      throw new Error(`Failed to retrieve tracker periods for tracker ${trackerId} in range`)
    }
  }

  async getByTrackerIdAndPeriod(
    trackerId: string,
    startDate: string
  ): Promise<TrackerPeriod | undefined> {
    try {
      return await this.db.trackerPeriods
        .where('[trackerId+startDate]')
        .equals([trackerId, startDate])
        .first()
    } catch (error) {
      console.error(
        `Failed to get tracker period for tracker ${trackerId} at ${startDate}:`,
        error
      )
      throw new Error(
        `Failed to retrieve tracker period for tracker ${trackerId} at ${startDate}`
      )
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<TrackerPeriod[]> {
    try {
      return await this.db.trackerPeriods
        .where('startDate')
        .between(startDate, endDate, true, true)
        .toArray()
    } catch (error) {
      console.error(`Failed to get tracker periods for date range:`, error)
      throw new Error(`Failed to retrieve tracker periods for date range`)
    }
  }

  async getByHabitId(habitId: string): Promise<TrackerPeriod[]> {
    try {
      return await this.db.trackerPeriods.where('habitId').equals(habitId).toArray()
    } catch (error) {
      console.error(`Failed to get tracker periods for habit ${habitId}:`, error)
      throw new Error(`Failed to retrieve tracker periods for habit ${habitId}`)
    }
  }

  async create(data: CreateTrackerPeriodPayload): Promise<TrackerPeriod> {
    try {
      const now = new Date().toISOString()
      const period: TrackerPeriod = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.trackerPeriods.add(toPlain(period))
      return period
    } catch (error) {
      console.error('Failed to create tracker period:', error)
      throw new Error('Failed to create tracker period in database')
    }
  }

  async update(id: string, data: UpdateTrackerPeriodPayload): Promise<TrackerPeriod> {
    try {
      const existing = await this.db.trackerPeriods.get(id)
      if (!existing) {
        throw new Error(`Tracker period with id ${id} not found`)
      }

      const updated: TrackerPeriod = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.trackerPeriods.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update tracker period with id ${id}:`, error)
      throw new Error(`Failed to update tracker period with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.trackerPeriods.delete(id)
    } catch (error) {
      console.error(`Failed to delete tracker period with id ${id}:`, error)
      throw new Error(`Failed to delete tracker period with id ${id}`)
    }
  }

  async deleteByTrackerId(trackerId: string): Promise<void> {
    try {
      const periods = await this.db.trackerPeriods
        .where('trackerId')
        .equals(trackerId)
        .toArray()
      const ids = periods.map((p) => p.id)
      if (ids.length > 0) {
        await this.db.trackerPeriods.bulkDelete(ids)
      }
    } catch (error) {
      console.error(`Failed to delete tracker periods for tracker ${trackerId}:`, error)
      throw new Error(`Failed to delete tracker periods for tracker ${trackerId}`)
    }
  }
}

// ============================================================================
// Habit Repository Implementation
// ============================================================================

class HabitDexieRepository implements HabitRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<Habit[]> {
    try {
      return await this.db.habits.toArray()
    } catch (error) {
      console.error('Failed to get all habits:', error)
      throw new Error('Failed to retrieve habits from database')
    }
  }

  async getById(id: string): Promise<Habit | undefined> {
    try {
      return await this.db.habits.get(id)
    } catch (error) {
      console.error(`Failed to get habit with id ${id}:`, error)
      throw new Error(`Failed to retrieve habit with id ${id}`)
    }
  }

  async getActive(): Promise<Habit[]> {
    try {
      return await this.db.habits.filter((h) => h.isActive).toArray()
    } catch (error) {
      console.error('Failed to get active habits:', error)
      throw new Error('Failed to retrieve active habits')
    }
  }

  async create(data: CreateHabitPayload): Promise<Habit> {
    try {
      const now = new Date().toISOString()
      const habit: Habit = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.habits.add(toPlain(habit))
      return habit
    } catch (error) {
      console.error('Failed to create habit:', error)
      throw new Error('Failed to create habit in database')
    }
  }

  async update(id: string, data: UpdateHabitPayload): Promise<Habit> {
    try {
      const existing = await this.db.habits.get(id)
      if (!existing) {
        throw new Error(`Habit with id ${id} not found`)
      }

      const updated: Habit = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.habits.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update habit with id ${id}:`, error)
      throw new Error(`Failed to update habit with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.habits.delete(id)
    } catch (error) {
      console.error(`Failed to delete habit with id ${id}:`, error)
      throw new Error(`Failed to delete habit with id ${id}`)
    }
  }
}

// ============================================================================
// Habit Occurrence Repository Implementation
// ============================================================================

class HabitOccurrenceDexieRepository implements HabitOccurrenceRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<HabitOccurrence[]> {
    try {
      return await this.db.habitOccurrences.toArray()
    } catch (error) {
      console.error('Failed to get all habit occurrences:', error)
      throw new Error('Failed to retrieve habit occurrences from database')
    }
  }

  async getById(id: string): Promise<HabitOccurrence | undefined> {
    try {
      return await this.db.habitOccurrences.get(id)
    } catch (error) {
      console.error(`Failed to get habit occurrence with id ${id}:`, error)
      throw new Error(`Failed to retrieve habit occurrence with id ${id}`)
    }
  }

  async getByHabitId(habitId: string): Promise<HabitOccurrence[]> {
    try {
      return await this.db.habitOccurrences.where('habitId').equals(habitId).toArray()
    } catch (error) {
      console.error(`Failed to get habit occurrences for habit ${habitId}:`, error)
      throw new Error(`Failed to retrieve habit occurrences for habit ${habitId}`)
    }
  }

  async getByHabitIdAndPeriod(
    habitId: string,
    periodStartDate: string
  ): Promise<HabitOccurrence | undefined> {
    try {
      return await this.db.habitOccurrences
        .where('[habitId+periodStartDate]')
        .equals([habitId, periodStartDate])
        .first()
    } catch (error) {
      console.error(
        `Failed to get habit occurrence for habit ${habitId} period ${periodStartDate}:`,
        error
      )
      throw new Error(
        `Failed to retrieve habit occurrence for habit ${habitId} period ${periodStartDate}`
      )
    }
  }

  async create(data: CreateHabitOccurrencePayload): Promise<HabitOccurrence> {
    try {
      const now = new Date().toISOString()
      const occurrence: HabitOccurrence = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.habitOccurrences.add(toPlain(occurrence))
      return occurrence
    } catch (error) {
      console.error('Failed to create habit occurrence:', error)
      throw new Error('Failed to create habit occurrence in database')
    }
  }

  async update(id: string, data: UpdateHabitOccurrencePayload): Promise<HabitOccurrence> {
    try {
      const existing = await this.db.habitOccurrences.get(id)
      if (!existing) {
        throw new Error(`Habit occurrence with id ${id} not found`)
      }

      const updated: HabitOccurrence = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.habitOccurrences.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update habit occurrence with id ${id}:`, error)
      throw new Error(`Failed to update habit occurrence with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.habitOccurrences.delete(id)
    } catch (error) {
      console.error(`Failed to delete habit occurrence with id ${id}:`, error)
      throw new Error(`Failed to delete habit occurrence with id ${id}`)
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

  async getByWeeklyPlanId(weeklyPlanId: string): Promise<Commitment[]> {
    try {
      return await this.db.commitments.where('weeklyPlanId').equals(weeklyPlanId).toArray()
    } catch (error) {
      console.error(`Failed to get commitments for weekly plan ${weeklyPlanId}:`, error)
      throw new Error(`Failed to retrieve commitments for weekly plan ${weeklyPlanId}`)
    }
  }

  async getByMonthlyPlanId(monthlyPlanId: string): Promise<Commitment[]> {
    try {
      return await this.db.commitments.where('monthlyPlanId').equals(monthlyPlanId).toArray()
    } catch (error) {
      console.error(`Failed to get commitments for monthly plan ${monthlyPlanId}:`, error)
      throw new Error(`Failed to retrieve commitments for monthly plan ${monthlyPlanId}`)
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

  async getByLifeAreaId(lifeAreaId: string): Promise<Commitment[]> {
    try {
      const all = await this.db.commitments.toArray()
      return all.filter((c) => c.lifeAreaIds?.includes(lifeAreaId))
    } catch (error) {
      console.error(`Failed to get commitments for life area ${lifeAreaId}:`, error)
      throw new Error(`Failed to retrieve commitments for life area ${lifeAreaId}`)
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Commitment[]> {
    try {
      return await this.db.commitments
        .where('startDate')
        .between(startDate, endDate, true, true)
        .toArray()
    } catch (error) {
      console.error(`Failed to get commitments for date range:`, error)
      throw new Error(`Failed to retrieve commitments for date range`)
    }
  }

  async getByPeriodType(periodType: 'weekly' | 'monthly'): Promise<Commitment[]> {
    try {
      return await this.db.commitments.where('periodType').equals(periodType).toArray()
    } catch (error) {
      console.error(`Failed to get commitments for period type ${periodType}:`, error)
      throw new Error(`Failed to retrieve commitments for period type ${periodType}`)
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
      await this.db.commitments.add(toPlain(commitment))
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
      await this.db.commitments.put(toPlain(updated))
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

  async getByDateOverlap(date: string): Promise<WeeklyPlan[]> {
    try {
      const all = await this.db.weeklyPlans.toArray()
      return all.filter((wp) => wp.startDate <= date && wp.endDate >= date)
    } catch (error) {
      console.error(`Failed to get weekly plans for date ${date}:`, error)
      throw new Error(`Failed to retrieve weekly plans for date ${date}`)
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<WeeklyPlan[]> {
    try {
      const all = await this.db.weeklyPlans.toArray()
      // Return plans that overlap with the given range
      return all.filter((wp) => wp.startDate <= endDate && wp.endDate >= startDate)
    } catch (error) {
      console.error(`Failed to get weekly plans for date range:`, error)
      throw new Error(`Failed to retrieve weekly plans for date range`)
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
      await this.db.weeklyPlans.add(toPlain(weeklyPlan))
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
      await this.db.weeklyPlans.put(toPlain(updated))
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
// Monthly Plan Repository Implementation
// ============================================================================

class MonthlyPlanDexieRepository implements MonthlyPlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<MonthlyPlan[]> {
    try {
      return await this.db.monthlyPlans.toArray()
    } catch (error) {
      console.error('Failed to get all monthly plans:', error)
      throw new Error('Failed to retrieve monthly plans from database')
    }
  }

  async getById(id: string): Promise<MonthlyPlan | undefined> {
    try {
      return await this.db.monthlyPlans.get(id)
    } catch (error) {
      console.error(`Failed to get monthly plan with id ${id}:`, error)
      throw new Error(`Failed to retrieve monthly plan with id ${id}`)
    }
  }

  async getByDateOverlap(date: string): Promise<MonthlyPlan[]> {
    try {
      const all = await this.db.monthlyPlans.toArray()
      return all.filter((mp) => mp.startDate <= date && mp.endDate >= date)
    } catch (error) {
      console.error(`Failed to get monthly plans for date ${date}:`, error)
      throw new Error(`Failed to retrieve monthly plans for date ${date}`)
    }
  }

  async getByYear(year: number): Promise<MonthlyPlan[]> {
    try {
      return await this.db.monthlyPlans.where('year').equals(year).toArray()
    } catch (error) {
      console.error(`Failed to get monthly plans for year ${year}:`, error)
      throw new Error(`Failed to retrieve monthly plans for year ${year}`)
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<MonthlyPlan[]> {
    try {
      const all = await this.db.monthlyPlans.toArray()
      // Return plans that overlap with the given range
      return all.filter((mp) => mp.startDate <= endDate && mp.endDate >= startDate)
    } catch (error) {
      console.error(`Failed to get monthly plans for date range:`, error)
      throw new Error(`Failed to retrieve monthly plans for date range`)
    }
  }

  async create(data: CreateMonthlyPlanPayload): Promise<MonthlyPlan> {
    try {
      const now = new Date().toISOString()
      const monthlyPlan: MonthlyPlan = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.monthlyPlans.add(toPlain(monthlyPlan))
      return monthlyPlan
    } catch (error) {
      console.error('Failed to create monthly plan:', error)
      throw new Error('Failed to create monthly plan in database')
    }
  }

  async update(id: string, data: UpdateMonthlyPlanPayload): Promise<MonthlyPlan> {
    try {
      const existing = await this.db.monthlyPlans.get(id)
      if (!existing) {
        throw new Error(`Monthly plan with id ${id} not found`)
      }

      const updated: MonthlyPlan = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.monthlyPlans.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update monthly plan with id ${id}:`, error)
      throw new Error(`Failed to update monthly plan with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.monthlyPlans.delete(id)
    } catch (error) {
      console.error(`Failed to delete monthly plan with id ${id}:`, error)
      throw new Error(`Failed to delete monthly plan with id ${id}`)
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

  async getByDateOverlap(date: string): Promise<YearlyPlan[]> {
    try {
      const all = await this.db.yearlyPlans.toArray()
      return all.filter((yp) => yp.startDate <= date && yp.endDate >= date)
    } catch (error) {
      console.error(`Failed to get yearly plans for date ${date}:`, error)
      throw new Error(`Failed to retrieve yearly plans for date ${date}`)
    }
  }

  async getByYear(year: number): Promise<YearlyPlan[]> {
    try {
      return await this.db.yearlyPlans.where('year').equals(year).toArray()
    } catch (error) {
      console.error(`Failed to get yearly plans for year ${year}:`, error)
      throw new Error(`Failed to retrieve yearly plans for year ${year}`)
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
      await this.db.yearlyPlans.add(toPlain(yearlyPlan))
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
      await this.db.yearlyPlans.put(toPlain(updated))
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
// Yearly Reflection Repository Implementation
// ============================================================================

class YearlyReflectionDexieRepository implements YearlyReflectionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<YearlyReflection[]> {
    try {
      return await this.db.yearlyReflections.toArray()
    } catch (error) {
      console.error('Failed to get all yearly reflections:', error)
      throw new Error('Failed to retrieve yearly reflections from database')
    }
  }

  async getById(id: string): Promise<YearlyReflection | undefined> {
    try {
      return await this.db.yearlyReflections.get(id)
    } catch (error) {
      console.error(`Failed to get yearly reflection with id ${id}:`, error)
      throw new Error(`Failed to retrieve yearly reflection with id ${id}`)
    }
  }

  async getByYearlyPlanId(yearlyPlanId: string): Promise<YearlyReflection | undefined> {
    try {
      return await this.db.yearlyReflections.where('yearlyPlanId').equals(yearlyPlanId).first()
    } catch (error) {
      console.error(`Failed to get yearly reflection for plan ${yearlyPlanId}:`, error)
      throw new Error(`Failed to retrieve yearly reflection for plan ${yearlyPlanId}`)
    }
  }

  async create(data: CreateYearlyReflectionPayload): Promise<YearlyReflection> {
    try {
      const now = new Date().toISOString()
      const reflection: YearlyReflection = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.yearlyReflections.add(toPlain(reflection))
      return reflection
    } catch (error) {
      console.error('Failed to create yearly reflection:', error)
      throw new Error('Failed to create yearly reflection in database')
    }
  }

  async update(id: string, data: UpdateYearlyReflectionPayload): Promise<YearlyReflection> {
    try {
      const existing = await this.db.yearlyReflections.get(id)
      if (!existing) {
        throw new Error(`Yearly reflection with id ${id} not found`)
      }

      const updated: YearlyReflection = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.yearlyReflections.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update yearly reflection with id ${id}:`, error)
      throw new Error(`Failed to update yearly reflection with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.yearlyReflections.delete(id)
    } catch (error) {
      console.error(`Failed to delete yearly reflection with id ${id}:`, error)
      throw new Error(`Failed to delete yearly reflection with id ${id}`)
    }
  }
}

// ============================================================================
// Monthly Reflection Repository Implementation
// ============================================================================

class MonthlyReflectionDexieRepository implements MonthlyReflectionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<MonthlyReflection[]> {
    try {
      return await this.db.monthlyReflections.toArray()
    } catch (error) {
      console.error('Failed to get all monthly reflections:', error)
      throw new Error('Failed to retrieve monthly reflections from database')
    }
  }

  async getById(id: string): Promise<MonthlyReflection | undefined> {
    try {
      return await this.db.monthlyReflections.get(id)
    } catch (error) {
      console.error(`Failed to get monthly reflection with id ${id}:`, error)
      throw new Error(`Failed to retrieve monthly reflection with id ${id}`)
    }
  }

  async getByMonthlyPlanId(monthlyPlanId: string): Promise<MonthlyReflection | undefined> {
    try {
      return await this.db.monthlyReflections.where('monthlyPlanId').equals(monthlyPlanId).first()
    } catch (error) {
      console.error(`Failed to get monthly reflection for plan ${monthlyPlanId}:`, error)
      throw new Error(`Failed to retrieve monthly reflection for plan ${monthlyPlanId}`)
    }
  }

  async create(data: CreateMonthlyReflectionPayload): Promise<MonthlyReflection> {
    try {
      const now = new Date().toISOString()
      const reflection: MonthlyReflection = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.monthlyReflections.add(toPlain(reflection))
      return reflection
    } catch (error) {
      console.error('Failed to create monthly reflection:', error)
      throw new Error('Failed to create monthly reflection in database')
    }
  }

  async update(id: string, data: UpdateMonthlyReflectionPayload): Promise<MonthlyReflection> {
    try {
      const existing = await this.db.monthlyReflections.get(id)
      if (!existing) {
        throw new Error(`Monthly reflection with id ${id} not found`)
      }

      const updated: MonthlyReflection = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.monthlyReflections.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update monthly reflection with id ${id}:`, error)
      throw new Error(`Failed to update monthly reflection with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.monthlyReflections.delete(id)
    } catch (error) {
      console.error(`Failed to delete monthly reflection with id ${id}:`, error)
      throw new Error(`Failed to delete monthly reflection with id ${id}`)
    }
  }
}

// ============================================================================
// Weekly Reflection Repository Implementation
// ============================================================================

class WeeklyReflectionDexieRepository implements WeeklyReflectionRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<WeeklyReflection[]> {
    try {
      return await this.db.weeklyReflections.toArray()
    } catch (error) {
      console.error('Failed to get all weekly reflections:', error)
      throw new Error('Failed to retrieve weekly reflections from database')
    }
  }

  async getById(id: string): Promise<WeeklyReflection | undefined> {
    try {
      return await this.db.weeklyReflections.get(id)
    } catch (error) {
      console.error(`Failed to get weekly reflection with id ${id}:`, error)
      throw new Error(`Failed to retrieve weekly reflection with id ${id}`)
    }
  }

  async getByWeeklyPlanId(weeklyPlanId: string): Promise<WeeklyReflection | undefined> {
    try {
      return await this.db.weeklyReflections.where('weeklyPlanId').equals(weeklyPlanId).first()
    } catch (error) {
      console.error(`Failed to get weekly reflection for plan ${weeklyPlanId}:`, error)
      throw new Error(`Failed to retrieve weekly reflection for plan ${weeklyPlanId}`)
    }
  }

  async create(data: CreateWeeklyReflectionPayload): Promise<WeeklyReflection> {
    try {
      const now = new Date().toISOString()
      const reflection: WeeklyReflection = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      }
      await this.db.weeklyReflections.add(toPlain(reflection))
      return reflection
    } catch (error) {
      console.error('Failed to create weekly reflection:', error)
      throw new Error('Failed to create weekly reflection in database')
    }
  }

  async update(id: string, data: UpdateWeeklyReflectionPayload): Promise<WeeklyReflection> {
    try {
      const existing = await this.db.weeklyReflections.get(id)
      if (!existing) {
        throw new Error(`Weekly reflection with id ${id} not found`)
      }

      const updated: WeeklyReflection = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      }
      await this.db.weeklyReflections.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update weekly reflection with id ${id}:`, error)
      throw new Error(`Failed to update weekly reflection with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.weeklyReflections.delete(id)
    } catch (error) {
      console.error(`Failed to delete weekly reflection with id ${id}:`, error)
      throw new Error(`Failed to delete weekly reflection with id ${id}`)
    }
  }
}

// ============================================================================
// Export Singleton Instances
// ============================================================================

export const priorityDexieRepository = new PriorityDexieRepository()
export const projectDexieRepository = new ProjectDexieRepository()
export const trackerDexieRepository = new TrackerDexieRepository()
export const trackerPeriodDexieRepository = new TrackerPeriodDexieRepository()
export const habitDexieRepository = new HabitDexieRepository()
export const habitOccurrenceDexieRepository = new HabitOccurrenceDexieRepository()
export const commitmentDexieRepository = new CommitmentDexieRepository()
export const weeklyPlanDexieRepository = new WeeklyPlanDexieRepository()
export const monthlyPlanDexieRepository = new MonthlyPlanDexieRepository()
export const yearlyPlanDexieRepository = new YearlyPlanDexieRepository()
export const yearlyReflectionDexieRepository = new YearlyReflectionDexieRepository()
export const monthlyReflectionDexieRepository = new MonthlyReflectionDexieRepository()
export const weeklyReflectionDexieRepository = new WeeklyReflectionDexieRepository()
