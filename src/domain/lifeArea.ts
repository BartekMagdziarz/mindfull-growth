/**
 * Domain models for Life Areas
 *
 * Life Areas are persistent, profile-level entities representing ongoing
 * responsibilities and dimensions of a user's life (e.g., Health, Career,
 * Relationships). Life Areas persist across years and serve as the canonical source for:
 * - Wheel of Life exercise (area names)
 * - Yearly Planning narratives and linked priorities
 * - Area-level dashboards (linked projects, priorities, scores over time)
 */

// ============================================================================
// Types
// ============================================================================

export type ReviewCadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/**
 * A leading or lagging indicator used to track progress in a life area.
 * Leading = habits/actions you do; Lagging = outcomes you get.
 */
export interface LifeAreaMeasure {
  name: string
  type: 'leading' | 'lagging'
}

/**
 * LifeArea
 *
 * A persistent life dimension that the user maintains over time.
 * Think of it as an ongoing responsibility with no finish line.
 *
 * Each area can hold rich metadata: purpose, maintenance standard,
 * success picture, measures, constraints, and review cadence.
 */
export interface LifeArea {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  name: string // e.g., "Health & Fitness"
  icon?: string // Icon id from entity icon catalog (legacy emoji values still render)
  color?: string // Hex color code
  purpose?: string // Why this area exists for the user (1–2 sentences)
  maintenanceStandard?: string // "Good enough" baseline (what maintained looks like)
  successPicture?: string // What a 9/10 looks like in plain language
  measures: LifeAreaMeasure[] // Leading and lagging indicators
  constraints?: string[] // Blockers, failure modes, recurring risks
  reviewCadence: ReviewCadence // How often to review this area
  isActive: boolean // Soft delete / archive
  sortOrder: number // User-defined ordering
}

// ============================================================================
// Default Areas
// ============================================================================

/**
 * Default life areas suggested on first use.
 * Matches DEFAULT_WHEEL_OF_LIFE_AREAS from exercises.ts for consistency.
 */
export const DEFAULT_LIFE_AREAS: string[] = [
  'Health & Fitness',
  'Career & Work',
  'Finances',
  'Relationships',
  'Family',
  'Personal Growth',
  'Fun & Recreation',
  'Physical Environment',
]

// ============================================================================
// Helper Types for Create/Update Operations
// ============================================================================

export type CreateLifeAreaPayload = Omit<LifeArea, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateLifeAreaPayload = Partial<Omit<LifeArea, 'id' | 'createdAt' | 'updatedAt'>>
