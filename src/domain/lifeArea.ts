/**
 * Domain models for Life Areas
 *
 * Life Areas are persistent, profile-level entities representing ongoing
 * responsibilities and dimensions of a user's life (e.g., Health, Career,
 * Relationships). Life Areas persist across years and serve as the canonical source for:
 * - Wheel of Life exercise area names
 * - profile-level life area management
 * - reflective context for exercises and score history over time
 */

// ============================================================================
// Types
// ============================================================================

/**
 * LifeArea
 *
 * A persistent life dimension that the user maintains over time.
 * Think of it as a stable part of the user's life map, not a goal, task,
 * tracker, or measurement system.
 *
 * Each area stores the user's own reflective language: meaning, desired
 * condition, typical risks, and lightweight reflection signals.
 */
export interface LifeArea {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  name: string // e.g., "Health & Fitness"
  icon?: string // Icon id from entity icon catalog (legacy emoji values still render)
  color?: string // Hex color code
  meaning?: string // Why this area matters and what role it plays in the user's life
  desiredState?: string // What healthy / good condition generally looks and feels like
  typicalRisks?: string // Negative patterns, emotions, neglect, and risks to notice
  reflectionSignals: string[] // Simple reflective questions or attention points
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
