import type { WeekRef } from '@/domain/period'

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
  /**
   * The step continues the user's latest record of this exercise instead
   * of starting a blank one (e.g. the second graded-exposure step reviews
   * the same ladder). Honoured by the program step tile's launch route.
   */
  continueLatest?: boolean
}

/**
 * A recurring exercise that runs ALONGSIDE the sequential steps (a daily
 * anger log, worry postponement every day…). The scheduler keeps exactly
 * one pending plan item per active practice; completing it schedules the
 * next one `everyDays` later. Practices never move `currentStepIndex`.
 *
 * Invariant (programCatalog.spec): a practice slug is never also a step
 * slug of the same program — `autoCompleteFor` matches plans by slug.
 */
export interface ProgramPractice {
  exerciseSlug: string
  /** 1 = daily, 2 = every other day… */
  everyDays: number
  /** 0-based step index; the practice starts once that step is done or skipped. Absent = from enrollment. */
  startsAfterStep?: number
  /** 0-based step index; the practice ends once that step is done or skipped. Absent = until the path ends. */
  endsAfterStep?: number
  /** `programs.<slug>.practices.<exerciseSlug>.intro`. */
  introKey?: string
}

/**
 * One real-world task per phase, proposed as a weekly intention in the
 * weekly planning ritual (never created automatically). Copy at
 * `programs.<slug>.tasks.<key>.{title,why}`.
 */
export interface ProgramWeeklyTask {
  /** Stable id, unique within the program. */
  key: string
  /** ProgramPhase.key the task belongs to; proposals follow the current step's phase. */
  phaseKey: string
  entryMode: 'completion' | 'counter'
  /** Weekly target count (1 for completion). */
  times: number
  /** Where an occurrence is logged, when it has a natural home (graded-exposure attempts…). */
  linkSlug?: string
}

/** Presentational grouping of steps; title at `programs.<slug>.phases.<key>.title`. */
export interface ProgramPhase {
  key: string
  /** 0-based index of the first step in this phase; phases are ascending. */
  fromStepIndex: number
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
  phases?: ProgramPhase[]
  practices?: ProgramPractice[]
  /**
   * Assessment taken as the first AND last step; the completion screen
   * compares the two attempts (e.g. GAD-7 before/after).
   */
  outcomeSlug?: string
  weeklyTasks?: ProgramWeeklyTask[]
  /**
   * The weekly reflection gets a "Ścieżka" step for this program: severity
   * question `programs.<slug>.reflection.severity` + the phase question
   * `programs.<slug>.phases.<key>.question`.
   */
  weeklyReflection?: boolean
}

export interface CompletedProgramStep {
  stepIndex: number
  completedAt: string
  /** Id of the completing exercise's result record, when known. */
  recordId?: string
}

/** One week's decision about the program's real-world task (weekly planning ritual). */
export interface ProgramWeekEntry {
  weekRef: WeekRef
  taskKey: string
  decision: 'accepted' | 'declined'
  /** The weekly intention created on acceptance. */
  intentionId?: string
  /** Set in the weekly reflection: propose the same task next week. */
  stayNextWeek?: boolean
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
  /** Weekly real-world task decisions, one entry per week at most (absent on older rows). */
  weekLog?: ProgramWeekEntry[]
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
  weekLog?: ProgramWeekEntry[]
}
