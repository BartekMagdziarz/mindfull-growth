/**
 * Exercise plan items — scheduled repeats & program steps
 *
 * One entity covers user-scheduled repeats (Phase 2) and program-step
 * deliveries (Phase 3) via the `source` discriminator (design D6).
 * Pending items with a past `dayRef` are overdue but keep their date —
 * the "due" query is `status === 'pending' && dayRef <= today` (D3).
 * Completion is automatic: `recordCompletion` marks the oldest matching
 * pending item done; the user never ticks a plan manually.
 *
 * Design: docs/exercise-scheduling-design.md §4.4.
 */

import type { DayRef } from '@/domain/period'

export type ExercisePlanStatus = 'pending' | 'done' | 'skipped'

/** 'manual' = ad-hoc plan, 'repeat' = post-save prompt, 'program' = Phase 3. */
export type ExercisePlanSource = 'manual' | 'repeat' | 'program'

export interface ExercisePlanItem {
  id: string
  /** Catalog slug (`src/data/exerciseCatalog.ts`). */
  exerciseSlug: string
  /** Planned day; NEVER rewritten when overdue (D3). */
  dayRef: DayRef
  status: ExercisePlanStatus
  source: ExercisePlanSource
  /** Enrollment id when `source === 'program'` (Phase 3, §4.5). */
  sourceRef?: string
  /** Id of the completing exercise's result record, set on auto-complete. */
  recordId?: string
  note?: string
  createdAt: string
  updatedAt: string
}

/** `status` is absent by design — the repository always creates 'pending'. */
export interface CreateExercisePlanItemPayload {
  exerciseSlug: string
  dayRef: DayRef
  source: ExercisePlanSource
  sourceRef?: string
  note?: string
}

export interface UpdateExercisePlanItemPayload {
  dayRef?: DayRef
  status?: ExercisePlanStatus
  recordId?: string
  note?: string
}
