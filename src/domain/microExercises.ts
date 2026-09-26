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

import type { EmotionGroupSelection } from '@/domain/emotionGroups'
import type { EmotionRating } from '@/domain/exercises'

export type MicroStepType =
  | 'info'
  | 'textList'
  | 'textarea'
  | 'slider'
  | 'emotionPick'
  | 'breathTimer'
  | 'choice'
  | 'entryPick'

/**
 * Conditional visibility: the step is shown only when the answer to an
 * earlier `choice` step is one of `in` (for a multiple choice: when any
 * picked option is). Hidden steps are neither validated nor saved.
 */
export interface MicroStepCondition {
  /** Key of an earlier `choice` step in the same definition. */
  step: string
  in: string[]
}

/** One condition, or several that must all hold (AND). */
export type MicroStepConditions = MicroStepCondition | MicroStepCondition[]

/**
 * A quiet quote under the step's description, taken from an earlier
 * entry: the latest entry of another micro (`latest`, e.g. the body
 * signals from the shame map) or the entry picked in an earlier
 * `entryPick` step of this run (`picked`). Never fills the field.
 * Label at `…<stepKey>.hintLabel`.
 */
export type MicroHintSource =
  | {
      source: 'latest'
      slug: string
      step: string
      /** Narrows the quoted entry by its own answers. */
      filter?: MicroStepConditions
      /** Shown only when the current run's answers match (e.g. a shame-only hint on a shared step). */
      when?: MicroStepConditions
    }
  | { source: 'picked'; pickStep: string; step: string }

interface MicroStepBase {
  /** i18n step key under `exerciseWizards.micro.<slug>.<key>.*`. */
  key: string
  /** Optional steps are passable without input (shown with a skip affordance). */
  optional?: boolean
  showWhen?: MicroStepConditions
  hintFrom?: MicroHintSource
}

export type MicroExerciseStep = MicroStepBase &
  (
    | { type: 'info' }
    | { type: 'textarea' }
    | { type: 'textList'; prompts: number }
    | { type: 'slider'; min: number; max: number; step?: number }
    | { type: 'emotionPick' }
    | {
        type: 'choice'
        /** Option ids; labels at `…<stepKey>.options.<id>`. */
        options: string[]
        /** Multiple choice saves `string[]`, single choice saves `string`. */
        multiple?: boolean
      }
    | {
        type: 'breathTimer'
        /** Seconds per phase: inhale / hold / exhale / hold. */
        phaseSeconds: [number, number, number, number]
        totalSeconds: number
      }
    | {
        /**
         * Pick one recent entry of another micro (e.g. a moment from
         * "Momenty" to work on). Saves the entry id. `show` lists the
         * response keys rendered on each card; `filter` narrows the
         * entries by their own choice answers.
         */
        type: 'entryPick'
        slug: string
        show: string[]
        filter?: MicroStepConditions
        /** Defaults: 10 entries from the last 21 days. */
        limit?: number
        days?: number
      }
  )

/**
 * Answers fixed before the run starts (catalog variants, e.g. "Moment
 * wstydu" = Momenty with `kind: 'shame'`). Preset steps are saved as
 * given and skipped in the flow.
 */
export type MicroPreset = Record<string, MicroStepValue>

export interface MicroExerciseDefinition {
  /** Catalog slug (`kind: 'micro'` entries). */
  slug: string
  /** camelCase key: step copy lives at `exerciseWizards.micro.<i18nKey>.*`. */
  i18nKey: string
  steps: MicroExerciseStep[]
  /**
   * Optional next exercise offered after saving (e.g. worry postponement →
   * worry tree). Copy at `exerciseWizards.micro.<i18nKey>.followUp.{title,description,cta}`.
   */
  followUp?: { route: string }
}

/** Per-step response value, keyed by the step's `key` in `responses`. */
export type MicroStepValue =
  | string
  | string[]
  | number
  /** emotionPick: group slug + optional 1–5 intensity (EmotionGroupPicker). */
  | EmotionGroupSelection[]
  /** Legacy emotionPick entries: word id + 0–100 intensity (EmotionSelector). */
  | EmotionRating[]
  /** breathTimer: seconds breathed + the rhythm used (absent in old entries). */
  | {
      completedSeconds: number
      phaseSeconds?: [number, number, number, number]
      /** Planned session length in whole breaths. */
      totalSeconds?: number
    }
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
