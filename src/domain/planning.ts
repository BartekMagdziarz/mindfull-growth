/**
 * Domain models for the Periodic Planning & Reflection System (Epic 4)
 *
 * This file defines all the core domain interfaces for the planning system:
 * - FocusArea: Yearly high-level life areas
 * - Priority: Direction of change within a Focus Area
 * - Project: Quarterly multi-week initiatives
 * - Commitment: Weekly actionable items
 * - WeeklyPlan: Weekly planning session output
 * - QuarterlyPlan: Quarterly planning session output
 * - YearlyPlan: Yearly planning session output
 */

// ============================================================================
// Status Types
// ============================================================================

/**
 * Status for Projects - tracks lifecycle from planning to completion
 */
export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed' | 'abandoned'

/**
 * Status for Commitments - tracks weekly completion state
 */
export type CommitmentStatus = 'planned' | 'done' | 'partial' | 'skipped'

// ============================================================================
// Core Domain Models
// ============================================================================

/**
 * FocusArea (Yearly)
 *
 * High-level areas of intentional investment that persist across the year.
 * Examples: "Health & Fitness", "Career Growth", "Relationships", "Learning"
 *
 * Focus Areas are the top-level containers that give structure to the user's
 * yearly intentions. They should be limited to 3-5 for manageability.
 */
export interface FocusArea {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  year: number // e.g., 2026
  name: string // e.g., "Health & Fitness", "Career Growth"
  description?: string // Optional longer description
  color?: string // Optional color for visual distinction (hex code)
  isActive: boolean // Can be paused/deactivated
  sortOrder: number // For user-defined ordering
}

/**
 * Priority (Yearly)
 *
 * Direction of change within a Focus Area – not rigid goals, but where
 * the user is trying to move. Each Focus Area can have 1-3 Priorities.
 *
 * Priorities include:
 * - Success signals: Observable indicators that things are going well
 * - Constraints: What NOT to sacrifice (anti-goals)
 */
export interface Priority {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  focusAreaId: string // Reference to parent Focus Area
  year: number // e.g., 2026
  name: string // e.g., "Build consistent exercise habit"
  successSignals: string[] // What good looks like (observable indicators)
  constraints?: string[] // What not to sacrifice (anti-goals)
  isActive: boolean // Can be paused
  sortOrder: number // For ordering within Focus Area
}

/**
 * Project (Quarterly)
 *
 * Multi-week initiatives tied to a Focus Area or Priority with concrete outcomes.
 * Projects are the main unit of work for a quarter and should have clear
 * deliverables or end states.
 */
export interface Project {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  focusAreaId: string // Reference to Focus Area
  priorityId?: string // Optional reference to specific Priority
  quarterStart: string // ISO date of quarter start (e.g., "2026-01-01")
  name: string // e.g., "Complete Couch to 5K program"
  description?: string // What this project aims to achieve
  targetOutcome?: string // Concrete deliverable or end state
  status: ProjectStatus
  completedAt?: string // ISO timestamp when marked complete/abandoned
  reflectionNote?: string // End-of-project reflection
}

/**
 * Commitment (Weekly)
 *
 * Small, actionable items chosen for the week, linked to Projects or Focus Areas.
 * Commitments are the weekly "moves" that advance Projects forward.
 *
 * Key concept: One commitment per week should be marked as "non-negotiable"
 * - the must-do item that takes priority over stretch goals.
 */
export interface Commitment {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  weekStartDate: string // ISO date of week start (Monday)
  projectId?: string // Optional link to Project
  focusAreaId?: string // Optional link to Focus Area (if no project)
  name: string // e.g., "Run 3 times this week"
  isNonNegotiable: boolean // Mark as must-do vs. stretch
  status: CommitmentStatus
  reflectionNote?: string // Brief note on completion
}

// ============================================================================
// Planning Session Models
// ============================================================================

/**
 * WeeklyPlan
 *
 * Captures the weekly planning session output. Should be quick to complete
 * (5-10 minutes) and focuses on capacity-aware commitment selection.
 *
 * The plan includes:
 * - Planning inputs: capacity assessment, focus sentence, adaptive intention
 * - Linked commitments for the week
 * - Reflection outputs: filled during weekly reflection at week's end
 */
export interface WeeklyPlan {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  weekStartDate: string // ISO date of week start (Monday)

  // Planning inputs
  capacityNote?: string // How user feels about their capacity this week
  focusSentence?: string // "What would make this a good week?"
  adaptiveIntention?: string // "How I want to show up if things get messy"

  // Linked data
  commitmentIds: string[] // Commitments for this week

  // Reflection outputs (filled during weekly reflection)
  reflectionCompleted: boolean
  whatHelped?: string
  whatGotInTheWay?: string
  whatILearned?: string
  nextWeekSeed?: string // Handoff thought for next week
}

/**
 * QuarterlyPlan
 *
 * Captures the quarterly planning session output. Focuses on selecting
 * focus areas for the quarter and defining projects.
 *
 * The plan includes:
 * - Primary and secondary focus areas for the quarter
 * - Quarter intention (overall guiding statement)
 * - Projects planned for the quarter
 * - Reflection outputs: filled during quarterly reflection
 */
export interface QuarterlyPlan {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  quarterStart: string // ISO date (e.g., "2026-01-01")
  year: number
  quarter: 1 | 2 | 3 | 4

  // Planning inputs
  primaryFocusAreaId?: string // Main focus for this quarter
  secondaryFocusAreaIds: string[] // Other active areas (max 2 recommended)
  quarterIntention?: string // Overall intention for the quarter

  // Linked data
  projectIds: string[] // Projects planned for this quarter

  // Reflection outputs
  reflectionCompleted: boolean
  wins?: string[]
  challenges?: string[]
  learnings?: string[]
  adjustments?: string // What to change going forward
}

/**
 * YearlyPlan
 *
 * Captures the yearly planning session output. This is the highest level
 * of planning and sets the direction for the entire year.
 *
 * The plan includes:
 * - Optional year theme ("word of the year")
 * - Focus Areas defined for the year
 * - Reflection outputs: filled at year end
 */
export interface YearlyPlan {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  year: number

  // Planning inputs
  yearTheme?: string // Optional "word of the year" or theme

  // Linked data
  focusAreaIds: string[] // Focus Areas for this year

  // Reflection outputs (filled at year end)
  reflectionCompleted: boolean
  yearInOnePhrase?: string
  biggestWins?: string[]
  biggestLessons?: string[]
  carryForward?: string // What to take into next year
}

// ============================================================================
// Helper Types for Create/Update Operations
// ============================================================================

/**
 * Payload for creating a new FocusArea
 * Omits auto-generated fields (id, createdAt, updatedAt)
 */
export type CreateFocusAreaPayload = Omit<FocusArea, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a FocusArea
 * All fields optional except those that shouldn't change
 */
export type UpdateFocusAreaPayload = Partial<Omit<FocusArea, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Payload for creating a new Priority
 */
export type CreatePriorityPayload = Omit<Priority, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a Priority
 */
export type UpdatePriorityPayload = Partial<Omit<Priority, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Payload for creating a new Project
 */
export type CreateProjectPayload = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a Project
 */
export type UpdateProjectPayload = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Payload for creating a new Commitment
 */
export type CreateCommitmentPayload = Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a Commitment
 */
export type UpdateCommitmentPayload = Partial<Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Payload for creating a new WeeklyPlan
 */
export type CreateWeeklyPlanPayload = Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a WeeklyPlan
 */
export type UpdateWeeklyPlanPayload = Partial<Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Payload for creating a new QuarterlyPlan
 */
export type CreateQuarterlyPlanPayload = Omit<QuarterlyPlan, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a QuarterlyPlan
 */
export type UpdateQuarterlyPlanPayload = Partial<
  Omit<QuarterlyPlan, 'id' | 'createdAt' | 'updatedAt'>
>

/**
 * Payload for creating a new YearlyPlan
 */
export type CreateYearlyPlanPayload = Omit<YearlyPlan, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Payload for updating a YearlyPlan
 */
export type UpdateYearlyPlanPayload = Partial<Omit<YearlyPlan, 'id' | 'createdAt' | 'updatedAt'>>
