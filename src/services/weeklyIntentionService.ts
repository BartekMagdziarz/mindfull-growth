import type { MeasurementEntryMode, MeasurementTarget, MultiCompletionItem, WeeklyIntention } from '@/domain/planning'
import { createMultiCompletionItem } from '@/domain/planning'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { WeekPlan, WeekTopPriorityRef } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { linkMeasurementPeriod, unlinkMeasurementPeriod } from '@/services/planningMutations'
import { getChildPeriods } from '@/utils/periods'

export interface CreateWeeklyIntentionInput {
  weekRef: WeekRef
  title: string
  description?: string
  icon?: string
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  multiItems?: MultiCompletionItem[]
  multiDailyThreshold?: number
  /** Optional priorities this intention serves (links it to the monthly focus confrontation). */
  priorityIds?: string[]
}

/**
 * Multi-completion requires a non-empty item list; every intention editing
 * surface (composer, library card, week-plan card) may switch the mode without
 * configuring items, so the service seeds a single default item named after
 * the intention itself.
 */
function seedMultiItems(title: string): MultiCompletionItem[] {
  return [createMultiCompletionItem(title.trim() || '—')]
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
    multiItems:
      input.entryMode === 'multi-completion'
        ? input.multiItems?.length
          ? input.multiItems
          : seedMultiItems(input.title)
        : undefined,
    multiDailyThreshold: input.multiDailyThreshold,
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

/** All intentions of the month's (child-period) weeks, in week order. */
export async function listWeeklyIntentionsForMonth(monthRef: MonthRef): Promise<WeeklyIntention[]> {
  const weekRefs = getChildPeriods(monthRef) as WeekRef[]
  const lists = await Promise.all(
    weekRefs.map((weekRef) => weeklyIntentionDexieRepository.listByWeek(weekRef)),
  )
  return lists.flat()
}

export interface UpdateWeeklyIntentionInput {
  title?: string
  description?: string
  icon?: string
  entryMode?: MeasurementEntryMode
  target?: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  multiItems?: MultiCompletionItem[]
  multiDailyThreshold?: number
  priorityIds?: string[]
}

/** Edit an existing intention's title / measurement. */
export async function updateWeeklyIntention(
  id: string,
  input: UpdateWeeklyIntentionInput,
): Promise<WeeklyIntention> {
  if (input.entryMode === 'multi-completion' && !input.multiItems) {
    // Switching to multi-completion from a surface that doesn't edit items:
    // keep stored items when they exist, otherwise seed the default one.
    const existing = await weeklyIntentionDexieRepository.getById(id)
    if (!existing?.multiItems?.length) {
      input = { ...input, multiItems: seedMultiItems(input.title ?? existing?.title ?? '') }
    }
  }
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
