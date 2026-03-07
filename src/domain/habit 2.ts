/**
 * Domain models for Habits
 *
 * Habits are standalone recurring trackers — each Habit owns a Tracker
 * (via parentType: 'habit', parentId: habitId) and creates TrackerPeriods
 * each cadence through the planning flow.
 */

import type { TrackerCadence } from '@/domain/planning'

// ============================================================================
// Core Habit Models
// ============================================================================

/**
 * Habit
 *
 * A recurring tracker with weekly or monthly cadence.
 * Each habit owns a Tracker entity (parentType: 'habit', parentId: this.id)
 * which defines how it's measured (count, adherence, value, rating, checkin).
 * TrackerPeriods are created during planning when the user confirms the habit.
 */
export interface Habit {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  name: string
  isActive: boolean
  isPaused: boolean
  cadence: TrackerCadence // 'weekly' | 'monthly'
  lifeAreaIds: string[]
  priorityIds: string[]
}

/**
 * HabitOccurrence
 *
 * Tracks whether a habit was included or skipped for a specific planning period.
 */
export interface HabitOccurrence {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  habitId: string
  periodType: TrackerCadence
  periodStartDate: string // ISO date for the period start
  status: 'generated' | 'skipped' | 'custom' | 'completed'
  trackerPeriodId?: string // Reference to generated TrackerPeriod
}

// ============================================================================
// Helper Types for Create/Update Operations
// ============================================================================

export type CreateHabitPayload = Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateHabitPayload = Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateHabitOccurrencePayload = Omit<
  HabitOccurrence,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateHabitOccurrencePayload = Partial<
  Omit<HabitOccurrence, 'id' | 'createdAt' | 'updatedAt'>
>
