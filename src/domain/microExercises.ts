/**
 * Micro exercises — 2–5 minute data-driven exercises
 *
 * Unlike the bespoke wizards (one component + one table each), micro
 * exercises are definitions interpreted by one generic runner
 * (`MicroExerciseRunner.vue`) and persisted into one table
 * (`microExerciseEntries`). Definitions live in
 * `src/data/microExercises.ts`; step copy in
 * `exerciseWizards.micro.<slug>.<stepKey>.*`.
 *
 * Design: docs/exercise-scheduling-design.md §4.3 (decision D1).
 */

import type { EmotionRating } from '@/domain/exercises'

export type MicroStepType =
  | 'info'
  | 'textList'
  | 'textarea'
  | 'slider'
  | 'emotionPick'
  | 'breathTimer'

interface MicroStepBase {
  /** i18n step key under `exerciseWizards.micro.<slug>.<key>.*`. */
  key: string
  /** Optional steps are passable without input (shown with a skip affordance). */
  optional?: boolean
}

export type MicroExerciseStep = MicroStepBase &
  (
    | { type: 'info' }
    | { type: 'textarea' }
    | { type: 'textList'; prompts: number }
    | { type: 'slider'; min: number; max: number; step?: number }
    | { type: 'emotionPick' }
    | {
        type: 'breathTimer'
        /** Seconds per phase: inhale / hold / exhale / hold. */
        phaseSeconds: [number, number, number, number]
        totalSeconds: number
      }
  )

export interface MicroExerciseDefinition {
  /** Catalog slug (`kind: 'micro'` entries). */
  slug: string
  /** camelCase key: step copy lives at `exerciseWizards.micro.<i18nKey>.*`. */
  i18nKey: string
  steps: MicroExerciseStep[]
}

/** Per-step response value, keyed by the step's `key` in `responses`. */
export type MicroStepValue =
  | string
  | string[]
  | number
  | EmotionRating[]
  | { completedSeconds: number }
  | null

export interface MicroExerciseEntry {
  id: string
  exerciseSlug: string
  createdAt: string
  updatedAt: string
  responses: Record<string, MicroStepValue>
  /** Journal linking arrives with the deferred D4 follow-up (design §4.8). */
  journalEntryId?: string
}

export interface CreateMicroExerciseEntryPayload {
  exerciseSlug: string
  responses: Record<string, MicroStepValue>
  journalEntryId?: string
  /** Override for deterministic seeds; defaults to now. */
  createdAt?: string
}
