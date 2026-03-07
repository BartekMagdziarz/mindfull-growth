/**
 * Repository interfaces for the Planning & Reflection System (Epic 4)
 *
 * These interfaces define the contract for data access operations.
 * They are independent of any specific storage technology, allowing
 * for different implementations (e.g., IndexedDB, API, mock).
 */

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

// ============================================================================
// Priority Repository
// ============================================================================

/**
 * Repository interface for Priority entities
 *
 * Priorities represent directions of change within linked Life Areas.
 * Each Life Area can have multiple Priorities (recommended 1-3).
 */
export interface PriorityRepository {
  /**
   * Get all Priorities
   */
  getAll(): Promise<Priority[]>

  /**
   * Get a Priority by ID
   * @returns The Priority or undefined if not found
   */
  getById(id: string): Promise<Priority | undefined>

  /**
   * Get all Priorities linked to a specific Life Area
   * @param lifeAreaId - The Life Area ID
   */
  getByLifeAreaId(lifeAreaId: string): Promise<Priority[]>

  /**
   * Get all Priorities for a specific year
   * @param year - The year (e.g., 2026)
   */
  getByYear(year: number): Promise<Priority[]>

  /**
   * Get all active Priorities for a specific year
   * @param year - The year (e.g., 2026)
   */
  getActiveByYear(year: number): Promise<Priority[]>

  /**
   * Create a new Priority
   * @param data - Priority data (without id, createdAt, updatedAt)
   * @returns The created Priority with generated fields
   */
  create(data: CreatePriorityPayload): Promise<Priority>

  /**
   * Update an existing Priority
   * @param id - The Priority ID
   * @param data - Partial Priority data to update
   * @returns The updated Priority
   */
  update(id: string, data: UpdatePriorityPayload): Promise<Priority>

  /**
   * Delete a Priority
   * @param id - The Priority ID
   */
  delete(id: string): Promise<void>

  /**
   * Delete all Priorities linked to a Life Area
   * @param lifeAreaId - The Life Area ID
   */
  deleteByLifeAreaId(lifeAreaId: string): Promise<void>
}

// ============================================================================
// Project Repository
// ============================================================================

/**
 * Repository interface for Project entities
 *
 * Projects are multi-week initiatives tied to Life Areas and optionally to Priorities.
 * Projects can be linked to multiple months via monthIds.
 */
export interface ProjectRepository {
  /**
   * Get all Projects
   */
  getAll(): Promise<Project[]>

  /**
   * Get a Project by ID
   * @returns The Project or undefined if not found
   */
  getById(id: string): Promise<Project | undefined>

  /**
   * Get all Projects for a specific month plan
   * @param monthId - The MonthlyPlan ID
   */
  getByMonthId(monthId: string): Promise<Project[]>

  /**
   * Get all Projects linked to any of the given month plans
   * @param monthIds - Array of MonthlyPlan IDs
   */
  getByMonthIds(monthIds: string[]): Promise<Project[]>

  /**
   * Get all Projects linked to a specific Life Area
   * @param lifeAreaId - The Life Area ID
   */
  getByLifeAreaId(lifeAreaId: string): Promise<Project[]>

  /**
   * Get all Projects with a specific status
   * @param status - The project status
   */
  getByStatus(status: ProjectStatus): Promise<Project[]>

  /**
   * Get all active Projects (status = 'active')
   */
  getActive(): Promise<Project[]>

  /**
   * Create a new Project
   * @param data - Project data (without id, createdAt, updatedAt)
   * @returns The created Project with generated fields
   */
  create(data: CreateProjectPayload): Promise<Project>

  /**
   * Update an existing Project
   * @param id - The Project ID
   * @param data - Partial Project data to update
   * @returns The updated Project
   */
  update(id: string, data: UpdateProjectPayload): Promise<Project>

  /**
   * Delete a Project
   * @param id - The Project ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Tracker Repository (Unified)
// ============================================================================

/**
 * Repository interface for Tracker entities (unified)
 */
export interface TrackerRepository {
  getAll(): Promise<Tracker[]>
  getById(id: string): Promise<Tracker | undefined>
  getByParent(parentType: 'project' | 'habit' | 'commitment', parentId: string): Promise<Tracker[]>
  getByLifeAreaId(lifeAreaId: string): Promise<Tracker[]>
  getByPriorityId(priorityId: string): Promise<Tracker[]>
  getStandalone(): Promise<Tracker[]>
  getActive(): Promise<Tracker[]>
  create(data: CreateTrackerPayload): Promise<Tracker>
  update(id: string, data: UpdateTrackerPayload): Promise<Tracker>
  delete(id: string): Promise<void>
  deleteByParent(parentType: 'project' | 'habit' | 'commitment', parentId: string): Promise<void>
}

// ============================================================================
// Tracker Period Repository
// ============================================================================

/**
 * Repository interface for TrackerPeriod entities
 */
export interface TrackerPeriodRepository {
  getAll(): Promise<TrackerPeriod[]>
  getById(id: string): Promise<TrackerPeriod | undefined>
  getByTrackerId(trackerId: string): Promise<TrackerPeriod[]>
  getByTrackerIdAndDateRange(trackerId: string, startDate: string, endDate: string): Promise<TrackerPeriod[]>
  getByTrackerIdAndPeriod(trackerId: string, startDate: string): Promise<TrackerPeriod | undefined>
  getByDateRange(startDate: string, endDate: string): Promise<TrackerPeriod[]>
  getByHabitId(habitId: string): Promise<TrackerPeriod[]>
  create(data: CreateTrackerPeriodPayload): Promise<TrackerPeriod>
  update(id: string, data: UpdateTrackerPeriodPayload): Promise<TrackerPeriod>
  delete(id: string): Promise<void>
  deleteByTrackerId(trackerId: string): Promise<void>
}

// ============================================================================
// Habit Repository
// ============================================================================

/**
 * Repository interface for Habit entities
 */
export interface HabitRepository {
  getAll(): Promise<Habit[]>
  getById(id: string): Promise<Habit | undefined>
  getActive(): Promise<Habit[]>
  create(data: CreateHabitPayload): Promise<Habit>
  update(id: string, data: UpdateHabitPayload): Promise<Habit>
  delete(id: string): Promise<void>
}

// ============================================================================
// Habit Occurrence Repository
// ============================================================================

/**
 * Repository interface for HabitOccurrence entities
 */
export interface HabitOccurrenceRepository {
  getAll(): Promise<HabitOccurrence[]>
  getById(id: string): Promise<HabitOccurrence | undefined>
  getByHabitId(habitId: string): Promise<HabitOccurrence[]>
  getByHabitIdAndPeriod(
    habitId: string,
    periodStartDate: string
  ): Promise<HabitOccurrence | undefined>
  create(data: CreateHabitOccurrencePayload): Promise<HabitOccurrence>
  update(id: string, data: UpdateHabitOccurrencePayload): Promise<HabitOccurrence>
  delete(id: string): Promise<void>
}

// ============================================================================
// Commitment Repository
// ============================================================================
export interface CommitmentRepository {
  getAll(): Promise<Commitment[]>
  getById(id: string): Promise<Commitment | undefined>
  getByWeeklyPlanId(weeklyPlanId: string): Promise<Commitment[]>
  getByMonthlyPlanId(monthlyPlanId: string): Promise<Commitment[]>
  getByProjectId(projectId: string): Promise<Commitment[]>
  getByLifeAreaId(lifeAreaId: string): Promise<Commitment[]>
  getByDateRange(startDate: string, endDate: string): Promise<Commitment[]>
  getByPeriodType(periodType: 'weekly' | 'monthly'): Promise<Commitment[]>
  create(data: CreateCommitmentPayload): Promise<Commitment>
  update(id: string, data: UpdateCommitmentPayload): Promise<Commitment>
  delete(id: string): Promise<void>
}

// ============================================================================
// Weekly Plan Repository
// ============================================================================

/**
 * Repository interface for WeeklyPlan entities
 *
 * Weekly Plans capture the output of weekly planning sessions,
 * including capacity notes, focus sentences, and linked commitments.
 * Plans now use flexible user-defined date ranges.
 */
export interface WeeklyPlanRepository {
  /**
   * Get all Weekly Plans
   */
  getAll(): Promise<WeeklyPlan[]>

  /**
   * Get a Weekly Plan by ID
   * @returns The Weekly Plan or undefined if not found
   */
  getById(id: string): Promise<WeeklyPlan | undefined>

  /**
   * Get all Weekly Plans where the given date falls within their range
   * @param date - The date to check (ISO string)
   * @returns Weekly Plans containing the date
   */
  getByDateOverlap(date: string): Promise<WeeklyPlan[]>

  /**
   * Get all Weekly Plans within a date range
   * @param startDate - Start of range (ISO string)
   * @param endDate - End of range (ISO string)
   */
  getByDateRange(startDate: string, endDate: string): Promise<WeeklyPlan[]>

  /**
   * Create a new Weekly Plan
   * @param data - Weekly Plan data (without id, createdAt, updatedAt)
   * @returns The created Weekly Plan with generated fields
   */
  create(data: CreateWeeklyPlanPayload): Promise<WeeklyPlan>

  /**
   * Update an existing Weekly Plan
   * @param id - The Weekly Plan ID
   * @param data - Partial Weekly Plan data to update
   * @returns The updated Weekly Plan
   */
  update(id: string, data: UpdateWeeklyPlanPayload): Promise<WeeklyPlan>

  /**
   * Delete a Weekly Plan
   * @param id - The Weekly Plan ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Monthly Plan Repository
// ============================================================================

/**
 * Repository interface for MonthlyPlan entities
 *
 * Monthly Plans capture the output of monthly planning sessions,
 * including focus area selection, intentions, and linked projects.
 * Plans now use flexible user-defined date ranges.
 */
export interface MonthlyPlanRepository {
  /**
   * Get all Monthly Plans
   */
  getAll(): Promise<MonthlyPlan[]>

  /**
   * Get a Monthly Plan by ID
   * @returns The Monthly Plan or undefined if not found
   */
  getById(id: string): Promise<MonthlyPlan | undefined>

  /**
   * Get all Monthly Plans where the given date falls within their range
   * @param date - The date to check (ISO string)
   * @returns Monthly Plans containing the date
   */
  getByDateOverlap(date: string): Promise<MonthlyPlan[]>

  /**
   * Get all Monthly Plans for a specific year
   * @param year - The year (e.g., 2026)
   */
  getByYear(year: number): Promise<MonthlyPlan[]>

  /**
   * Get all Monthly Plans within a date range
   * @param startDate - Start of range (ISO string)
   * @param endDate - End of range (ISO string)
   */
  getByDateRange(startDate: string, endDate: string): Promise<MonthlyPlan[]>

  /**
   * Create a new Monthly Plan
   * @param data - Monthly Plan data (without id, createdAt, updatedAt)
   * @returns The created Monthly Plan with generated fields
   */
  create(data: CreateMonthlyPlanPayload): Promise<MonthlyPlan>

  /**
   * Update an existing Monthly Plan
   * @param id - The Monthly Plan ID
   * @param data - Partial Monthly Plan data to update
   * @returns The updated Monthly Plan
   */
  update(id: string, data: UpdateMonthlyPlanPayload): Promise<MonthlyPlan>

  /**
   * Delete a Monthly Plan
   * @param id - The Monthly Plan ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Yearly Plan Repository
// ============================================================================

/**
 * Repository interface for YearlyPlan entities
 *
 * Yearly Plans capture the output of yearly planning sessions,
 * including the year theme and linked focus areas.
 * Plans now use flexible user-defined date ranges.
 */
export interface YearlyPlanRepository {
  /**
   * Get all Yearly Plans
   */
  getAll(): Promise<YearlyPlan[]>

  /**
   * Get a Yearly Plan by ID
   * @returns The Yearly Plan or undefined if not found
   */
  getById(id: string): Promise<YearlyPlan | undefined>

  /**
   * Get all Yearly Plans where the given date falls within their range
   * @param date - The date to check (ISO string)
   * @returns Yearly Plans containing the date
   */
  getByDateOverlap(date: string): Promise<YearlyPlan[]>

  /**
   * Get all Yearly Plans for a specific year (by year field for grouping)
   * @param year - The year (e.g., 2026)
   */
  getByYear(year: number): Promise<YearlyPlan[]>

  /**
   * Create a new Yearly Plan
   * @param data - Yearly Plan data (without id, createdAt, updatedAt)
   * @returns The created Yearly Plan with generated fields
   */
  create(data: CreateYearlyPlanPayload): Promise<YearlyPlan>

  /**
   * Update an existing Yearly Plan
   * @param id - The Yearly Plan ID
   * @param data - Partial Yearly Plan data to update
   * @returns The updated Yearly Plan
   */
  update(id: string, data: UpdateYearlyPlanPayload): Promise<YearlyPlan>

  /**
   * Delete a Yearly Plan
   * @param id - The Yearly Plan ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Yearly Reflection Repository
// ============================================================================

/**
 * Repository interface for YearlyReflection entities
 *
 * Yearly Reflections capture reflections on yearly planning periods,
 * stored separately from the YearlyPlan itself.
 */
export interface YearlyReflectionRepository {
  /**
   * Get all Yearly Reflections
   */
  getAll(): Promise<YearlyReflection[]>

  /**
   * Get a Yearly Reflection by ID
   * @returns The Yearly Reflection or undefined if not found
   */
  getById(id: string): Promise<YearlyReflection | undefined>

  /**
   * Get the Yearly Reflection for a specific YearlyPlan
   * @param yearlyPlanId - The YearlyPlan ID
   * @returns The Yearly Reflection or undefined if not found
   */
  getByYearlyPlanId(yearlyPlanId: string): Promise<YearlyReflection | undefined>

  /**
   * Create a new Yearly Reflection
   * @param data - Yearly Reflection data (without id, createdAt, updatedAt)
   * @returns The created Yearly Reflection with generated fields
   */
  create(data: CreateYearlyReflectionPayload): Promise<YearlyReflection>

  /**
   * Update an existing Yearly Reflection
   * @param id - The Yearly Reflection ID
   * @param data - Partial Yearly Reflection data to update
   * @returns The updated Yearly Reflection
   */
  update(id: string, data: UpdateYearlyReflectionPayload): Promise<YearlyReflection>

  /**
   * Delete a Yearly Reflection
   * @param id - The Yearly Reflection ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Monthly Reflection Repository
// ============================================================================

/**
 * Repository interface for MonthlyReflection entities
 *
 * Monthly Reflections capture reflections on monthly planning periods,
 * stored separately from the MonthlyPlan itself.
 */
export interface MonthlyReflectionRepository {
  /**
   * Get all Monthly Reflections
   */
  getAll(): Promise<MonthlyReflection[]>

  /**
   * Get a Monthly Reflection by ID
   * @returns The Monthly Reflection or undefined if not found
   */
  getById(id: string): Promise<MonthlyReflection | undefined>

  /**
   * Get the Monthly Reflection for a specific MonthlyPlan
   * @param monthlyPlanId - The MonthlyPlan ID
   * @returns The Monthly Reflection or undefined if not found
   */
  getByMonthlyPlanId(monthlyPlanId: string): Promise<MonthlyReflection | undefined>

  /**
   * Create a new Monthly Reflection
   * @param data - Monthly Reflection data (without id, createdAt, updatedAt)
   * @returns The created Monthly Reflection with generated fields
   */
  create(data: CreateMonthlyReflectionPayload): Promise<MonthlyReflection>

  /**
   * Update an existing Monthly Reflection
   * @param id - The Monthly Reflection ID
   * @param data - Partial Monthly Reflection data to update
   * @returns The updated Monthly Reflection
   */
  update(id: string, data: UpdateMonthlyReflectionPayload): Promise<MonthlyReflection>

  /**
   * Delete a Monthly Reflection
   * @param id - The Monthly Reflection ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Weekly Reflection Repository
// ============================================================================

/**
 * Repository interface for WeeklyReflection entities
 *
 * Weekly Reflections capture reflections on weekly planning periods,
 * stored separately from the WeeklyPlan itself.
 */
export interface WeeklyReflectionRepository {
  /**
   * Get all Weekly Reflections
   */
  getAll(): Promise<WeeklyReflection[]>

  /**
   * Get a Weekly Reflection by ID
   * @returns The Weekly Reflection or undefined if not found
   */
  getById(id: string): Promise<WeeklyReflection | undefined>

  /**
   * Get the Weekly Reflection for a specific WeeklyPlan
   * @param weeklyPlanId - The WeeklyPlan ID
   * @returns The Weekly Reflection or undefined if not found
   */
  getByWeeklyPlanId(weeklyPlanId: string): Promise<WeeklyReflection | undefined>

  /**
   * Create a new Weekly Reflection
   * @param data - Weekly Reflection data (without id, createdAt, updatedAt)
   * @returns The created Weekly Reflection with generated fields
   */
  create(data: CreateWeeklyReflectionPayload): Promise<WeeklyReflection>

  /**
   * Update an existing Weekly Reflection
   * @param id - The Weekly Reflection ID
   * @param data - Partial Weekly Reflection data to update
   * @returns The updated Weekly Reflection
   */
  update(id: string, data: UpdateWeeklyReflectionPayload): Promise<WeeklyReflection>

  /**
   * Delete a Weekly Reflection
   * @param id - The Weekly Reflection ID
   */
  delete(id: string): Promise<void>
}

