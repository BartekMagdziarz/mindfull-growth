import type { Habit, HabitOccurrence } from '@/domain/habit'
import type { TrackerCadence } from '@/domain/planning'
import { toLocalISODateString } from '@/utils/periodUtils'

// ============================================================================
// Types
// ============================================================================

export interface HabitGenerationInput {
  habits: Habit[]
  periodStartDate: string
  periodEndDate: string
  periodCadence: TrackerCadence
  occurrences: HabitOccurrence[]
  suppressedOccurrences: Array<{ habitId: string; periodStartDate: string }>
}

export interface EligibleHabit {
  habitId: string
  periodStartDate: string
  periodEndDate: string
}

export interface HabitGenerationResult {
  eligibleHabits: EligibleHabit[]
}

// ============================================================================
// Helpers
// ============================================================================

function shouldSkipDueToOccurrence(
  habitId: string,
  periodStartDate: string,
  occurrences: HabitOccurrence[]
): boolean {
  const occurrence = occurrences.find(
    (item) => item.habitId === habitId && item.periodStartDate === periodStartDate
  )
  if (!occurrence) return false
  if (occurrence.status === 'skipped' || occurrence.status === 'custom') return true
  if (occurrence.trackerPeriodId) return true
  return false
}

function shouldSkipDueToSuppression(
  habitId: string,
  periodStartDate: string,
  suppressed: Array<{ habitId: string; periodStartDate: string }>
): boolean {
  return suppressed.some(
    (item) => item.habitId === habitId && item.periodStartDate === periodStartDate
  )
}

// ============================================================================
// Main Generation Function
// ============================================================================

/**
 * Determine which active, non-paused habits are eligible for a given period/cadence.
 *
 * Returns a list of eligible habits with their period start/end dates.
 * The caller is responsible for creating TrackerPeriods via
 * `trackerStore.getTrackersByHabit(habitId)`.
 */
export function generateHabitItems(input: HabitGenerationInput): HabitGenerationResult {
  const eligibleHabits: EligibleHabit[] = []

  for (const habit of input.habits) {
    if (!habit.isActive || habit.isPaused) continue
    if (habit.cadence !== input.periodCadence) continue

    if (shouldSkipDueToSuppression(habit.id, input.periodStartDate, input.suppressedOccurrences)) {
      continue
    }
    if (shouldSkipDueToOccurrence(habit.id, input.periodStartDate, input.occurrences)) {
      continue
    }

    eligibleHabits.push({
      habitId: habit.id,
      periodStartDate: input.periodStartDate,
      periodEndDate: input.periodEndDate,
    })
  }

  return { eligibleHabits }
}

// ============================================================================
// Utilities
// ============================================================================

function parseLocalISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Compute the period start date for a habit based on its cadence.
 * Weekly habits use the week start date.
 * Monthly habits use the 1st of the month.
 */
export function getHabitPeriodStartDate(
  habit: Habit,
  weekStartDate: string,
  scheduledDate?: string
): string | null {
  if (habit.cadence === 'weekly') {
    return weekStartDate
  }

  // Monthly — period start is 1st of the month
  const reference = scheduledDate
    ? parseLocalISODate(scheduledDate)
    : parseLocalISODate(weekStartDate)

  return toLocalISODateString(new Date(reference.getFullYear(), reference.getMonth(), 1))
}
