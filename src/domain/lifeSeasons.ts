import type { PeriodicEntryType } from './periodicEntry'

/**
 * Status of a cascading goal
 */
export type GoalStatus = 'active' | 'completed' | 'deferred' | 'dropped'

/**
 * Tracker type determines how progress is measured
 */
export type TrackerType = 'boolean' | 'count' | 'scale'

/**
 * How often a tracker should be logged
 */
export type TrackerFrequency = 'daily' | 'weekly'

/**
 * Template section types for customizable period templates
 */
export type TemplateSectionType = 'list' | 'text' | 'scale' | 'prompt'

/**
 * Cascading goal that flows from higher to lower periods
 * Goals created at yearly level can cascade down to quarterly, weekly, and daily
 */
export interface CascadingGoal {
  id: string
  title: string
  description?: string
  sourceEntryId: string // Which periodic entry created this goal
  sourcePeriodType: PeriodicEntryType
  status: GoalStatus
  parentGoalId?: string // Parent goal this was derived from (higher level)
  childGoalIds: string[] // Child goals at lower levels
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  completedAt?: string // ISO timestamp when completed
}

/**
 * Tracker for measuring goal progress over time
 * Can be attached to any goal and tracked daily or weekly
 */
export interface GoalTracker {
  id: string
  goalId: string // Associated cascading goal
  name: string
  type: TrackerType
  targetValue?: number // For count/scale types (e.g., 60 for "60 minutes")
  unit?: string // Human-readable unit (e.g., "minutes", "times", "pages")
  frequency: TrackerFrequency
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

/**
 * Individual tracking entry - records progress for a specific date
 */
export interface TrackerEntry {
  id: string
  trackerId: string
  date: string // ISO date YYYY-MM-DD
  value: number | boolean // boolean for 'boolean' type, number for 'count'/'scale'
  note?: string // Optional note about this entry
  createdAt: string // ISO timestamp
}

/**
 * Custom template section for period templates
 * Allows users to customize what questions/prompts appear in each period type
 */
export interface TemplateSection {
  id: string
  type: TemplateSectionType
  title: string
  icon?: string // Icon name from heroicons
  placeholder?: string
  prompts?: string[] // Suggested prompts for this section
  maxItems?: number // For list-type sections
  isRequired: boolean
  order: number
}

/**
 * User's custom template for a period type
 * Each user can have their own template per period type
 */
export interface PeriodTemplate {
  id: string
  periodType: PeriodicEntryType
  name: string
  sections: TemplateSection[]
  isDefault: boolean // Whether this is the system default template
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

/**
 * Reflection on goal progress during a period review
 */
export interface GoalReflection {
  goalId: string
  progressNote: string
  progressRating?: number // 1-5 scale
  nextSteps?: string
}

// Helper type for creating new cascading goals
export interface CreateCascadingGoalPayload {
  title: string
  description?: string
  sourceEntryId: string
  sourcePeriodType: PeriodicEntryType
  parentGoalId?: string
}

// Helper type for updating goals
export interface UpdateCascadingGoalPayload {
  title?: string
  description?: string
  status?: GoalStatus
  completedAt?: string
}

// Helper type for creating new trackers
export interface CreateGoalTrackerPayload {
  goalId: string
  name: string
  type: TrackerType
  targetValue?: number
  unit?: string
  frequency: TrackerFrequency
}

// Helper type for creating tracker entries
export interface CreateTrackerEntryPayload {
  trackerId: string
  date: string
  value: number | boolean
  note?: string
}

// Helper type for creating template sections
export interface CreateTemplateSectionPayload {
  type: TemplateSectionType
  title: string
  icon?: string
  placeholder?: string
  prompts?: string[]
  maxItems?: number
  isRequired: boolean
  order: number
}

// Helper type for creating templates
export interface CreatePeriodTemplatePayload {
  periodType: PeriodicEntryType
  name: string
  sections: CreateTemplateSectionPayload[]
}
