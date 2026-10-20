import type { Goal } from '@/domain/planning'
import type { DayRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'

/**
 * Goals the post-reflection invite should list (spec D3): open, active goals
 * whose deadline fell on or before the period's last day — however long ago —
 * unless „Później” deferred the prompt into the future.
 */
export function selectGoalsAwaitingClosing(
  goals: readonly Goal[],
  periodEnd: DayRef,
  today: DayRef
): Goal[] {
  return goals
    .filter(
      goal =>
        goal.isActive &&
        goal.status === 'open' &&
        Boolean(goal.targetDate) &&
        (goal.targetDate as string) <= periodEnd &&
        (!goal.closingDeferredUntil || goal.closingDeferredUntil <= today)
    )
    .sort((left, right) => (left.targetDate as string).localeCompare(right.targetDate as string))
}

export async function getGoalsAwaitingClosing(periodEnd: DayRef, today: DayRef): Promise<Goal[]> {
  return selectGoalsAwaitingClosing(await goalDexieRepository.listAll(), periodEnd, today)
}
