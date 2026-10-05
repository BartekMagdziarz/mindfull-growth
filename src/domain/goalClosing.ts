import type {
  Goal,
  GoalClosingEvaluation,
  GoalClosingKeyResultSnapshot,
  GoalClosingMonthState,
  GoalOutcome,
} from './planning'

/**
 * Pure rules of the goal closing ritual
 * (ideas/html-plans/2026-10-04-goal-closing-ritual.html, D1/D5).
 *
 * The facts step shows every key result period by period across the goal window,
 * in its own cadence: weekly key results week by week, monthly ones month by
 * month. A whole-window verdict per key result is a heuristic on top of those
 * periods; the share below is the single constant behind it.
 */

/** A key result counts as met over its window when at least this share of planned periods were met. */
export const GOAL_CLOSING_MET_SHARE = 2 / 3

export interface GoalClosingMonthsVerdict {
  evaluation: GoalClosingEvaluation
  monthsMet: number
  monthsPlanned: number
}

/**
 * Whole-window verdict from period states (months or weeks, oldest first).
 * - unplanned and ongoing periods are ignored (an unfinished, not-yet-met
 *   period is neither a success nor a failure);
 * - no planned period with data → 'no-data';
 * - met when the last planned period with data was met, or when the met share
 *   over all planned periods reaches GOAL_CLOSING_MET_SHARE.
 */
export function evaluateClosingMonths(
  months: readonly { state: GoalClosingMonthState }[],
): GoalClosingMonthsVerdict {
  const planned = months.filter((month) => month.state !== 'unplanned' && month.state !== 'ongoing')
  const monthsPlanned = planned.length
  const monthsMet = planned.filter((month) => month.state === 'met').length
  const decided = planned.filter((month) => month.state !== 'no-data')
  if (decided.length === 0) {
    return { evaluation: 'no-data', monthsMet, monthsPlanned }
  }
  const lastDecided = decided[decided.length - 1]
  const met = lastDecided.state === 'met' || monthsMet / monthsPlanned >= GOAL_CLOSING_MET_SHARE
  return { evaluation: met ? 'met' : 'missed', monthsMet, monthsPlanned }
}

/**
 * Pre-selected outcome on the verdict step. Only key results that were in the
 * plan count; with none, nothing is suggested and the user picks unaided.
 */
export function suggestGoalOutcome(
  keyResults: readonly Pick<GoalClosingKeyResultSnapshot, 'evaluation'>[],
): GoalOutcome | null {
  const decided = keyResults.filter((item) => item.evaluation !== 'no-data')
  if (decided.length === 0) return null
  const met = decided.filter((item) => item.evaluation === 'met').length
  if (met === decided.length) return 'achieved'
  if (met === 0) return 'missed'
  return 'partial'
}

/** The mirror step exists only when the creation wizard left something to mirror. */
export function goalHasStartMirror(
  goal: Pick<Goal, 'successDefinition' | 'confidenceRating' | 'obstacles'>,
): boolean {
  return Boolean(goal.successDefinition || goal.confidenceRating !== undefined || goal.obstacles)
}
