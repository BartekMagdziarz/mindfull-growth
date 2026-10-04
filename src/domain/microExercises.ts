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
import type { WeekRef } from '@/domain/period'

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
export type MicroHintSource = (
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
) & {
  /** Quote the whole text (a letter read back in "Powrót"), not the usual ~160 chars. */
  full?: boolean
}

interface MicroStepBase {
  /** i18n step key under `exerciseWizards.micro.<slug>.<key>.*`. */
  key: string
  /** Optional steps are passable without input (shown with a skip affordance). */
  optional?: boolean
  /** Optional only while these conditions hold (e.g. `situation` is optional in the shame branch of Momenty). */
  optionalWhen?: MicroStepConditions
  showWhen?: MicroStepConditions
  hintFrom?: MicroHintSource
  /**
   * Soft minimum length for prose steps (letters, writing after a moment):
   * the runner shows a counter and a gentle note below it, never a block —
   * the evidence says a real paragraph moves the trait, a one-liner doesn't.
   */
  minLength?: number
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
        /**
         * Options resolved at runtime and listed before the static ones:
         * the practices of the user's open paths (exercise slugs, labelled
         * by their catalog title). Used by the maintenance plan, the dose
         * check and "Powrót".
         */
        optionsFrom?: 'programPractices'
        /**
         * optionId → IFS part tag: when the user has a part with that tag,
         * the option reads as the part's own name (the shame path's
         * Ukrywający · Krytyk · Oskarżyciel · Unikający, renameable).
         */
        labelsFromParts?: Record<string, string>
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

/**
 * Answers proposed before the run starts — unlike a preset the steps ARE
 * shown, pre-filled and editable (e.g. "Zapisz jako moment" after the
 * shame response carries the moves over). Travels in the route query.
 */
export type MicroPrefill = Record<string, MicroStepValue>

/** How `afterSave.prefillFrom` maps a source response onto a target step. */
export type MicroPrefillRule =
  | string
  | {
      from: string
      /** Option-id translation between two choice steps (e.g. move → response). */
      map?: Record<string, string>
    }

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
  /**
   * From this step on (once it is answered and every step still ahead is
   * optional) the runner offers "Zapisz teraz" — the quick Momenty entry
   * ends after five taps, the rest is there for whoever wants it.
   */
  earlyFinishAfter?: string
  /**
   * A practice that turns compassion inward: the runner offers a quiet
   * "Za dużo na dziś" exit that saves what is there with `tooMuchToday`
   * and hands over to the soothing breath (backdraft rule, plan v3 D5).
   */
  innerPractice?: boolean
  /**
   * Action on the saved screen that opens another micro with answers
   * carried over as a prefill (copy at `…<i18nKey>.afterSave.{title,description,cta}`).
   */
  afterSave?: { route: string; prefillFrom?: Record<string, MicroPrefillRule> }
}

/** Response key the runner sets when the user leaves an inner practice early. */
export const TOO_MUCH_TODAY_KEY = 'tooMuchToday'

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
  /**
   * Set by `programTaskBridgeService` when saving this entry counted as a
   * day of a path's weekly task (the task's `linkSlug` matched).
   */
  programRef?: MicroEntryProgramRef
}

export interface MicroEntryProgramRef {
  enrollmentId: string
  taskKey: string
  weekRef: WeekRef
}

export interface UpdateMicroExerciseEntryPayload {
  programRef?: MicroEntryProgramRef
  journalEntryId?: string
}

export interface CreateMicroExerciseEntryPayload {
  exerciseSlug: string
  responses: Record<string, MicroStepValue>
  journalEntryId?: string
  /** Override for deterministic seeds; defaults to now. */
  createdAt?: string
}
