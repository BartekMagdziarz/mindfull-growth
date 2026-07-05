/**
 * Exercise completion service — the single write path for the unified
 * completion log (design §4.2). Called from every exercise store's
 * create action, the assessment submit path and the micro-exercise
 * store. Phase 2 extends `recordCompletion` with plan auto-completion,
 * Phase 3 with program advancement — keep all writes going through
 * here.
 */

import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import { exerciseCompletionDexieRepository } from '@/repositories/exerciseCompletionDexieRepository'
import { getPeriodRefsForDate } from '@/utils/periods'

export async function recordCompletion(
  slug: string,
  recordId?: string,
): Promise<ExerciseCompletion> {
  const now = new Date()
  return exerciseCompletionDexieRepository.create({
    exerciseSlug: slug,
    completedAt: now.toISOString(),
    // Local day, NOT the UTC date — a 23:30 completion belongs to the
    // user's current day.
    dayRef: getPeriodRefsForDate(now).day,
    recordId,
    source: 'standalone',
  })
}

export async function listCompletions(): Promise<ExerciseCompletion[]> {
  return exerciseCompletionDexieRepository.listAll()
}
