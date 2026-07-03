import type { MeasurementEntryMode, MeasurementTarget, WeeklyIntention } from '@/domain/planning'
import type { WeekRef } from '@/domain/period'
import type { WeekPlan, WeekTopPriorityRef } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { linkMeasurementPeriod, unlinkMeasurementPeriod } from '@/services/planningMutations'

export interface CreateWeeklyIntentionInput {
  weekRef: WeekRef
  title: string
  description?: string
  icon?: string
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  /** Optional priorities this intention serves (links it to the monthly focus confrontation). */
  priorityIds?: string[]
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
    priorityIds: input.priorityIds ?? [],
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

export interface UpdateWeeklyIntentionInput {
  title?: string
  description?: string
  icon?: string
  entryMode?: MeasurementEntryMode
  target?: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  priorityIds?: string[]
}

/** Edit an existing intention's title / measurement. */
export function updateWeeklyIntention(
  id: string,
  input: UpdateWeeklyIntentionInput,
): Promise<WeeklyIntention> {
  return weeklyIntentionDexieRepository.update(id, input)
}

/**
 * Delete a week-scoped intention. `createWeeklyIntention` links it into its week + overlapping
 * months via `linkMeasurementPeriod`; unlink first so we don't orphan those week/month planning
 * states (and any day assignments) before removing the row itself.
 */
export async function deleteWeeklyIntention(id: string, weekRef: WeekRef): Promise<void> {
  await unlinkMeasurementPeriod({
    subjectType: 'weeklyIntention',
    subjectId: id,
    cadence: 'weekly',
    periodRef: weekRef,
  })
  await weeklyIntentionDexieRepository.delete(id)
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
