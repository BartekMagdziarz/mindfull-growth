/**
 * Exercise completion service — the single write path for the unified
 * completion log (design §4.2). Called from every exercise store's
 * create action, the assessment submit path and the micro-exercise
 * store. Phase 2 wired plan auto-completion in here (§4.4), Phase 3
 * program advancement (§4.5) — keep all writes going through here.
 *
 * Known limitation (accepted): a manual/repeat plan and a program step
 * for the same slug race on oldest-pending-first in `autoCompleteFor` —
 * both mean "do this exercise", so whichever is older gets ticked.
 */

import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { autoCompleteFor } from '@/services/exercisePlanService'
import {
  advanceEnrollmentForPlan,
  type ProgramAdvancement,
} from '@/services/programSchedulerService'
import { getPeriodRefsForDate } from '@/utils/periods'

export interface RecordCompletionResult {
  completion: ExerciseCompletion
  /** Plan item auto-completed by this save, when one matched (§4.4). */
  completedPlan: ExercisePlanItem | null
  /** Program enrollment advanced by this save, when the plan was a step (§4.5). */
  programAdvancement: ProgramAdvancement | null
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
  let programAdvancement: ProgramAdvancement | null = null
  if (completedPlan?.source === 'program') {
    try {
      programAdvancement = await advanceEnrollmentForPlan(completedPlan)
    } catch (err) {
      // Program bookkeeping must never block the completion log write.
      console.error('Failed to advance program enrollment:', err)
    }
  }
  return { completion, completedPlan, programAdvancement }
}

export async function listCompletions(): Promise<ExerciseCompletion[]> {
  return exerciseCompletionDexieRepository.listAll()
}
