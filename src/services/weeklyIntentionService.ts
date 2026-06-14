import type { MeasurementEntryMode, MeasurementTarget, WeeklyIntention } from '@/domain/planning'
import type { WeekRef } from '@/domain/period'
import type { WeekPlan, WeekTopPriorityRef } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { linkMeasurementPeriod } from '@/services/planningMutations'

export interface CreateWeeklyIntentionInput {
  weekRef: WeekRef
  title: string
  description?: string
  icon?: string
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
}

/**
 * Create a week-scoped intention and immediately schedule it into its week.
 * `linkMeasurementPeriod` creates the active overlapping month state(s) + an active
 * week state (scope `unassigned`), which makes the intention appear in the Today view's
 * "this week" section and satisfies the week-state activation invariants.
 */
export async function createWeeklyIntention(
  input: CreateWeeklyIntentionInput,
): Promise<WeeklyIntention> {
  const intention = await weeklyIntentionDexieRepository.create({
    weekRef: input.weekRef,
    title: input.title,
    description: input.description,
    icon: input.icon,
    isActive: true,
    entryMode: input.entryMode,
    cadence: 'weekly',
    target: input.target,
    ratingScaleMin: input.ratingScaleMin,
    ratingScale: input.ratingScale,
    status: 'open',
  })

  await linkMeasurementPeriod({
    subjectType: 'weeklyIntention',
    subjectId: intention.id,
    cadence: 'weekly',
    periodRef: input.weekRef,
  })

  return intention
}

export function listWeeklyIntentions(weekRef: WeekRef): Promise<WeeklyIntention[]> {
  return weeklyIntentionDexieRepository.listByWeek(weekRef)
}

/** Lazily upsert the week's plan record with the chosen top-3 priority refs. */
export async function setWeekTopPriorities(
  weekRef: WeekRef,
  topPriorities: WeekTopPriorityRef[],
): Promise<WeekPlan> {
  const existing = await periodPlanDexieRepository.getWeekPlan(weekRef)
  if (existing) {
    return periodPlanDexieRepository.updateWeekPlan(existing.id, { topPriorities })
  }
  return periodPlanDexieRepository.createWeekPlan({ weekRef, topPriorities })
}
