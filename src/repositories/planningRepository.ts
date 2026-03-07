/**
 * Repository interfaces for the Planning & Reflection System (Epic 4)
 *
 * These interfaces define the contract for data access operations.
 * They are independent of any specific storage technology, allowing
 * for different implementations (e.g., IndexedDB, API, mock).
 */

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

// ============================================================================
// Focus Area Repository
// ============================================================================

/**
 * Repository interface for FocusArea entities
 *
 * Focus Areas are yearly high-level life areas that users want to invest in.
 * They serve as the top-level organizational unit in the planning hierarchy.
 */
export interface FocusAreaRepository {
  /**
   * Get all Focus Areas
   */
  getAll(): Promise<FocusArea[]>

  /**
   * Get a Focus Area by ID
   * @returns The Focus Area or undefined if not found
   */
  getById(id: string): Promise<FocusArea | undefined>

  /**
   * Get all Focus Areas for a specific year
   * @param year - The year (e.g., 2026)
   */
  getByYear(year: number): Promise<FocusArea[]>

  /**
   * Get all active Focus Areas for a specific year
   * @param year - The year (e.g., 2026)
   */
  getActiveByYear(year: number): Promise<FocusArea[]>

  /**
   * Create a new Focus Area
   * @param data - Focus Area data (without id, createdAt, updatedAt)
   * @returns The created Focus Area with generated fields
   */
  create(data: CreateFocusAreaPayload): Promise<FocusArea>

  /**
   * Update an existing Focus Area
   * @param id - The Focus Area ID
   * @param data - Partial Focus Area data to update
   * @returns The updated Focus Area
   */
  update(id: string, data: UpdateFocusAreaPayload): Promise<FocusArea>

  /**
   * Delete a Focus Area
   * @param id - The Focus Area ID
   */
  delete(id: string): Promise<void>
}

// ============================================================================
// Priority Repository
// ============================================================================

/**
 * Repository interface for Priority entities
 *
 * Priorities represent directions of change within a Focus Area.
 * Each Focus Area can have multiple Priorities (recommended 1-3).
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
   * Get all Priorities for a specific Focus Area
   * @param focusAreaId - The Focus Area ID
   */
  getByFocusAreaId(focusAreaId: string): Promise<Priority[]>

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
   * Delete all Priorities for a Focus Area
   * Useful when deleting a Focus Area and its children
   * @param focusAreaId - The Focus Area ID
   */
  deleteByFocusAreaId(focusAreaId: string): Promise<void>
}

// ============================================================================
// Project Repository
// ============================================================================

/**
 * Repository interface for Project entities
 *
 * Projects are quarterly multi-week initiatives tied to Focus Areas
 * and optionally to Priorities.
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
   * Get all Projects for a specific quarter
   * @param quarterStart - ISO date string of quarter start (e.g., "2026-01-01")
   */
  getByQuarter(quarterStart: string): Promise<Project[]>

  /**
   * Get all Projects for a specific Focus Area
   * @param focusAreaId - The Focus Area ID
   */
  getByFocusAreaId(focusAreaId: string): Promise<Project[]>

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
// Commitment Repository
// ============================================================================

/**
 * Repository interface for Commitment entities
 *
 * Commitments are weekly actionable items linked to Projects or Focus Areas.
 * They represent the small moves that advance projects forward.
 */
export interface CommitmentRepository {
  /**
   * Get all Commitments
   */
  getAll(): Promise<Commitment[]>

  /**
   * Get a Commitment by ID
   * @returns The Commitment or undefined if not found
   */
  getById(id: string): Promise<Commitment | undefined>

  /**
   * Get all Commitments for a specific week
   * @param weekStartDate - ISO date string of week start (Monday)
   */
  getByWeek(weekStartDate: string): Promise<Commitment[]>

  /**
   * Get all Commitments for a specific Project
   * @param projectId - The Project ID
   */
  getByProjectId(projectId: string): Promise<Commitment[]>

  /**
   * Get all Commitments for a specific Focus Area (direct link, not via Project)
   * @param focusAreaId - The Focus Area ID
   */
  getByFocusAreaId(focusAreaId: string): Promise<Commitment[]>

  /**
   * Create a new Commitment
   * @param data - Commitment data (without id, createdAt, updatedAt)
   * @returns The created Commitment with generated fields
   */
  create(data: CreateCommitmentPayload): Promise<Commitment>

  /**
   * Update an existing Commitment
   * @param id - The Commitment ID
   * @param data - Partial Commitment data to update
   * @returns The updated Commitment
   */
  update(id: string, data: UpdateCommitmentPayload): Promise<Commitment>

  /**
   * Delete a Commitment
   * @param id - The Commitment ID
   */
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
   * Get the Weekly Plan for a specific week
   * Each week should have at most one plan (weekStartDate is unique)
   * @param weekStartDate - ISO date string of week start (Monday)
   * @returns The Weekly Plan or undefined if not found
   */
  getByWeek(weekStartDate: string): Promise<WeeklyPlan | undefined>

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
// Quarterly Plan Repository
// ============================================================================

/**
 * Repository interface for QuarterlyPlan entities
 *
 * Quarterly Plans capture the output of quarterly planning sessions,
 * including focus area selection, intentions, and linked projects.
 */
export interface QuarterlyPlanRepository {
  /**
   * Get all Quarterly Plans
   */
  getAll(): Promise<QuarterlyPlan[]>

  /**
   * Get a Quarterly Plan by ID
   * @returns The Quarterly Plan or undefined if not found
   */
  getById(id: string): Promise<QuarterlyPlan | undefined>

  /**
   * Get the Quarterly Plan for a specific quarter
   * Each quarter should have at most one plan (year+quarter is unique)
   * @param year - The year (e.g., 2026)
   * @param quarter - The quarter (1, 2, 3, or 4)
   * @returns The Quarterly Plan or undefined if not found
   */
  getByQuarter(year: number, quarter: 1 | 2 | 3 | 4): Promise<QuarterlyPlan | undefined>

  /**
   * Get all Quarterly Plans for a specific year
   * @param year - The year (e.g., 2026)
   */
  getByYear(year: number): Promise<QuarterlyPlan[]>

  /**
   * Create a new Quarterly Plan
   * @param data - Quarterly Plan data (without id, createdAt, updatedAt)
   * @returns The created Quarterly Plan with generated fields
   */
  create(data: CreateQuarterlyPlanPayload): Promise<QuarterlyPlan>

  /**
   * Update an existing Quarterly Plan
   * @param id - The Quarterly Plan ID
   * @param data - Partial Quarterly Plan data to update
   * @returns The updated Quarterly Plan
   */
  update(id: string, data: UpdateQuarterlyPlanPayload): Promise<QuarterlyPlan>

  /**
   * Delete a Quarterly Plan
   * @param id - The Quarterly Plan ID
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
   * Get the Yearly Plan for a specific year
   * Each year should have at most one plan (year is unique)
   * @param year - The year (e.g., 2026)
   * @returns The Yearly Plan or undefined if not found
   */
  getByYear(year: number): Promise<YearlyPlan | undefined>

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
