import type { Goal, Initiative } from '@/domain/planning'
import type { MeasureableSubject } from '@/services/measurementProgress'

/**
 * Forward-looking visibility predicates: "is this object still being actively pursued?"
 *
 * These gate the surfaces where the user picks or acts on objects *going forward* —
 * the Today view, the month/week planner sidebars, and the link pickers. A closed
 * (`completed`/`dropped`/`retired`) or archived (`isActive: false`) object must not
 * appear there.
 *
 * Historical/display surfaces (calendar tiles, plan-vs-execution, year overview,
 * month/week reflections) deliberately do NOT use these: they resolve period link
 * records against all non-archived objects regardless of `status`, so an object that
 * was active in a period stays visible in that period even after it is closed. Period
 * membership there comes from the link records' `activityState === 'active'`.
 */
export function isGoalOpen(goal: Goal): boolean {
  return goal.isActive && goal.status === 'open'
}

export function isMeasurementSubjectOpen(subject: MeasureableSubject): boolean {
  return subject.isActive && subject.status === 'open'
}

export function isInitiativeActive(initiative: Initiative): boolean {
  return initiative.isActive && initiative.status === 'open'
}
