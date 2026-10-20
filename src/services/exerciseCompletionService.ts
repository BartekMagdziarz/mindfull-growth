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
import { userDatabaseOperation } from '@/repositories/userDatabaseOperation'
import { captureUserSession } from '@/services/userSessionScope'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { autoCompleteFor } from '@/services/exercisePlanService'
import {
  advanceEnrollmentForPlan,
  advancePracticeForPlan,
  isPracticeItem,
  type PracticeReconciliation,
  type ProgramAdvancement,
} from '@/services/programSchedulerService'
import { recordTaskProgress } from '@/services/programTaskBridgeService'
import { ensureShamePartsForEntry } from '@/services/shamePartsService'
import { getPeriodRefsForDate } from '@/utils/periods'
import { reportError } from '@/utils/reportError'

export interface RecordCompletionResult {
  completion: ExerciseCompletion
  /** Plan item auto-completed by this save, when one matched (§4.4). */
  completedPlan: ExercisePlanItem | null
  /** Program enrollment advanced by this save, when the plan was a step (§4.5). */
  programAdvancement: ProgramAdvancement | null
  /** Next occurrence scheduled by this save, when the plan was a program practice. */
  practiceReconciliation?: PracticeReconciliation | null
  /** Weekly intentions (path tasks) that got this day counted (plan v2 §5). */
  taskIntentionIds?: string[]
}

export async function recordCompletion(
  slug: string,
  recordId?: string,
  eventId?: string
): Promise<RecordCompletionResult> {
  const session = captureUserSession()
  if (eventId !== undefined && (!eventId.trim() || eventId.length > 256)) {
    throw new Error('Invalid completion event id')
  }
  const now = new Date()
  // Local day, NOT the UTC date — a 23:30 completion belongs to the
  // user's current day.
  const dayRef = getPeriodRefsForDate(now).day
  let planFailed = false
  let saved: {
    completion: ExerciseCompletion
    completedPlan: ExercisePlanItem | null
    duplicate?: boolean
  }
  try {
    saved = await userDatabaseOperation(
      'rw',
      ['exercisePlanItems', 'exerciseCompletions'],
      async db => {
        if (eventId) {
          const existing = await db.exerciseCompletions.where('eventId').equals(eventId).first()
          if (existing) {
            if (existing.exerciseSlug !== slug || existing.recordId !== recordId)
              throw new Error('Completion event conflict')
            return { completion: existing, completedPlan: null, duplicate: true }
          }
        }
        let completedPlan: ExercisePlanItem | null
        try {
          completedPlan = await autoCompleteFor(slug, dayRef, recordId)
        } catch (error) {
          planFailed = true
          throw error
        }
        const completion = await exerciseCompletionDexieRepository.create({
          exerciseSlug: slug,
          completedAt: now.toISOString(),
          dayRef,
          recordId,
          ...(eventId ? { eventId } : {}),
          source: completedPlan ? 'plan' : 'standalone',
        })
        return { completion, completedPlan }
      }
    )
  } catch (err) {
    session.assertCurrent()
    if (!planFailed) throw err
    // A failed plan transaction is rolled back before the standalone fallback.
    reportError('exerciseCompletionService.recordCompletion', err)
    const completion = await exerciseCompletionDexieRepository.create({
      exerciseSlug: slug,
      completedAt: now.toISOString(),
      dayRef,
      recordId,
      ...(eventId ? { eventId } : {}),
      source: 'standalone',
    })
    saved = { completion, completedPlan: null }
  }
  session.assertCurrent()
  const { completion, completedPlan } = saved
  if (saved.duplicate) return { completion, completedPlan: null, programAdvancement: null }
  let taskIntentionIds: string[] = []
  try {
    // A path's weekly task anchored on this exercise gets its day (plan v2 §5).
    taskIntentionIds = (await recordTaskProgress(slug, dayRef, recordId)).intentionIds
    session.assertCurrent()
  } catch (err) {
    session.assertCurrent()
    // Task bookkeeping must never block the completion log write.
    reportError('exerciseCompletionService.recordCompletion', err)
  }
  if (slug === 'shame-map' && recordId) {
    try {
      // The compass reactions become IFS parts the path works with (plan v3 §4).
      await ensureShamePartsForEntry(recordId)
      session.assertCurrent()
    } catch (err) {
      session.assertCurrent()
      // Part bookkeeping must never block the completion log write.
      reportError('exerciseCompletionService.recordCompletion', err)
    }
  }
  let programAdvancement: ProgramAdvancement | null = null
  let practiceReconciliation: PracticeReconciliation | null = null
  if (completedPlan?.source === 'program') {
    try {
      if (isPracticeItem(completedPlan)) {
        practiceReconciliation = await advancePracticeForPlan(completedPlan)
      } else {
        programAdvancement = await advanceEnrollmentForPlan(completedPlan)
      }
    } catch (err) {
      session.assertCurrent()
      // Program bookkeeping must never block the completion log write.
      reportError('exerciseCompletionService.recordCompletion', err)
    }
  }
  session.assertCurrent()
  return {
    completion,
    completedPlan,
    programAdvancement,
    ...(practiceReconciliation ? { practiceReconciliation } : {}),
    ...(taskIntentionIds.length ? { taskIntentionIds } : {}),
  }
}

export async function listCompletions(): Promise<ExerciseCompletion[]> {
  return exerciseCompletionDexieRepository.listAll()
}
