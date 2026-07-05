/**
 * Exercise completion service — the single write path for the unified
 * completion log (design §4.2). Called from every exercise store's
 * create action, the assessment submit path and the micro-exercise
 * store. Phase 2 wired plan auto-completion in here (§4.4); Phase 3
 * adds program advancement — keep all writes going through here.
 */

import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { autoCompleteFor } from '@/services/exercisePlanService'
import { getPeriodRefsForDate } from '@/utils/periods'

export interface RecordCompletionResult {
  completion: ExerciseCompletion
  /** Plan item auto-completed by this save, when one matched (§4.4). */
  completedPlan: ExercisePlanItem | null
}

export async function recordCompletion(
  slug: string,
  recordId?: string,
): Promise<RecordCompletionResult> {
  const now = new Date()
  // Local day, NOT the UTC date — a 23:30 completion belongs to the
  // user's current day.
  const dayRef = getPeriodRefsForDate(now).day
  let completedPlan: ExercisePlanItem | null = null
  try {
    completedPlan = await autoCompleteFor(slug, dayRef, recordId)
  } catch (err) {
    // Plan bookkeeping must never block the completion log write.
    console.error('Failed to auto-complete exercise plan:', err)
  }
  const completion = await exerciseCompletionDexieRepository.create({
    exerciseSlug: slug,
    completedAt: now.toISOString(),
    dayRef,
    recordId,
    source: completedPlan ? 'plan' : 'standalone',
  })
  return { completion, completedPlan }
}

export async function listCompletions(): Promise<ExerciseCompletion[]> {
  return exerciseCompletionDexieRepository.listAll()
}
