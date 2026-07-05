/**
 * Unified exercise completion log
 *
 * One row per completed exercise (bespoke wizard, psychometric
 * assessment or micro exercise) so "what was completed when" is a
 * single indexed query instead of loading 30+ stores. Written by
 * `src/services/exerciseCompletionService.ts`; backfilled once from
 * the legacy per-exercise tables in the Dexie v23 upgrade.
 *
 * Design: docs/exercise-scheduling-design.md §4.2.
 */

import type { DayRef } from '@/domain/period'

/**
 * How the completion came about. 'plan' (repeats) and 'program'
 * (ścieżki) arrive in Phases 2–3; Phase 1 writes only 'standalone'.
 */
export type ExerciseCompletionSource = 'standalone' | 'plan' | 'program'

export interface ExerciseCompletion {
  id: string
  /** Catalog slug (`src/data/exerciseCatalog.ts`). */
  exerciseSlug: string
  /** Local day the completion belongs to, derived from `completedAt`. */
  dayRef: DayRef
  /** ISO timestamp. */
  completedAt: string
  /** Id of the exercise's own result record, when one exists. */
  recordId?: string
  source: ExerciseCompletionSource
}

export interface CreateExerciseCompletionPayload {
  exerciseSlug: string
  dayRef: DayRef
  completedAt: string
  recordId?: string
  source: ExerciseCompletionSource
}
