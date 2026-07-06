/**
 * Programs ("ścieżki") — curated exercise sequences
 *
 * A program is a static, code-defined sequence of catalog exercises
 * (`src/data/programCatalog.ts`); the user's participation is a
 * `ProgramEnrollment` row. Step delivery rides on `ExercisePlanItem`
 * (`source: 'program'`, `sourceRef` = enrollment id — design D6):
 * the scheduler materializes exactly one pending item for the current
 * step at its earliest eligible day (sequential unlock + `minGapDays`,
 * design D2), and completion advances `currentStepIndex`.
 *
 * Design: docs/exercise-scheduling-design.md §4.5.
 */

export type ProgramEnrollmentStatus = 'active' | 'paused' | 'completed' | 'abandoned'

export interface ProgramStep {
  /** Catalog slug (`src/data/exerciseCatalog.ts`) — wizard, assessment or micro. */
  exerciseSlug: string
  /** Minimum days since the previous step's completion (enrollment start for step 0). */
  minGapDays: number
  /** Skippable from the program detail view without a completion entry. */
  optional?: boolean
  /** "Why this step" guidance copy, `programs.<slug>.steps.step<n>.intro`. */
  introKey?: string
}

export interface ProgramDefinition {
  slug: string
  /** `programs.<slug>` — title/description/step copy namespace. */
  i18nKey: string
  /** Material Symbols name. */
  icon: string
  estimatedWeeks: number
  steps: ProgramStep[]
  /** Route offered as the path's finale once the enrollment completes. */
  finaleRouteName?: string
}

export interface CompletedProgramStep {
  stepIndex: number
  completedAt: string
  /** Id of the completing exercise's result record, when known. */
  recordId?: string
}

export interface ProgramEnrollment {
  id: string
  programSlug: string
  status: ProgramEnrollmentStatus
  startedAt: string
  /** Next step to deliver; equals `steps.length` once completed. */
  currentStepIndex: number
  /** Skipped optional steps get no entry — the timeline derives them. */
  completedSteps: CompletedProgramStep[]
  createdAt: string
  updatedAt: string
}

/**
 * `status`/`currentStepIndex`/`completedSteps` are absent by design — the
 * repository always creates an active enrollment at step 0. `startedAt`
 * is overridable for seeds and tests only.
 */
export interface CreateProgramEnrollmentPayload {
  programSlug: string
  startedAt?: string
}

export interface UpdateProgramEnrollmentPayload {
  status?: ProgramEnrollmentStatus
  currentStepIndex?: number
  completedSteps?: CompletedProgramStep[]
}
