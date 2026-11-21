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
  /**
   * The step starts with context: `moment` opens a picker over the path's
   * Momenty before launching (`?momentId=`), `fairDemand` seeds the wizard
   * with the latest "uczciwe wymaganie" from "O czym jest ten wstyd?"
   * (`?seed=fairDemand`). Honoured by the step tile (plan v3 §7.3).
   */
  startFrom?: 'moment' | 'fairDemand'
  /** Extra route query for the exercise (e.g. `partTag` preselecting an IFS part, `kind` presetting a shared micro). */
  launchQuery?: Record<string, string>
  /**
   * For a micro step that starts from a moment: target step key → the
   * moment's response key whose text is carried over as an editable
   * prefill (`?prefill=`), e.g. `{ observation: 'situation' }`.
   */
  momentPrefill?: Record<string, string>
  /**
   * Completing this step closes the path (`status: 'completed'`,
   * `completedAt`). Steps after it must be `afterCompletion` follow-ups.
   */
  closesPath?: boolean
  /**
   * Delivered after the path closed ("Powrót" — the follow-up measure some
   * weeks later): the scheduler keeps materializing such steps for a
   * `completed` enrollment; `minGapDays` anchors on the previous completion
   * as usual (the closing step's completion is the path's `completedAt`).
   */
  afterCompletion?: boolean
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
  /**
   * The practice of one phase (plan 2026-11-17, shame path): the path hands
   * it over once the phase's FIRST step is done — that step creates what the
   * practice rehearses — and keeps it in the day plan until the next phase's
   * first step is done. The first phase's practice runs from the enrollment.
   * Afterwards it stays available on demand. Replaces the two step indices
   * (see `practiceStepWindow`).
   */
  phaseKey?: string
  /** `programs.<slug>.practices.<exerciseSlug>.intro`. */
  introKey?: string
}

/**
 * Presentational grouping of steps; copy at
 * `programs.<slug>.phases.<key>.{title,why,question}`. Paths built as
 * "phases = weeks" (shame v3) set `week`; a follow-up phase ("Powrót")
 * has none.
 */
export interface ProgramPhase {
  key: string
  /** 0-based index of the first step in this phase; phases are ascending. */
  fromStepIndex: number
  /** 1-based week number shown on the phase card; absent = not a week. */
  week?: number
}

/**
 * The practice's window in steps. A phase practice (`phaseKey`) opens after
 * its phase's first step and closes after the next phase's first step; the
 * first phase's practice is open from the enrollment. Other practices carry
 * their own indices.
 */
export function practiceStepWindow(
  program: Pick<ProgramDefinition, 'phases'>,
  practice: ProgramPractice
): { startsAfterStep?: number; endsAfterStep?: number } {
  const phases = program.phases ?? []
  const index = practice.phaseKey ? phases.findIndex(phase => phase.key === practice.phaseKey) : -1
  if (index < 0) {
    return { startsAfterStep: practice.startsAfterStep, endsAfterStep: practice.endsAfterStep }
  }
  return {
    startsAfterStep: index === 0 ? undefined : phases[index]!.fromStepIndex,
    endsAfterStep: phases[index + 1]?.fromStepIndex,
  }
}

/**
 * Whether the path puts the practice into the day plan at the enrollment's
 * current step. Windows are expressed in steps, not dates: an index is
 * passed once the enrollment moves beyond it (done or skipped alike).
 */
export function isPracticeWindowOpen(
  program: Pick<ProgramDefinition, 'phases' | 'steps'>,
  practice: ProgramPractice,
  enrollment: Pick<ProgramEnrollment, 'status' | 'currentStepIndex'>
): boolean {
  if (enrollment.status !== 'active') return false
  const index = enrollment.currentStepIndex
  if (index >= program.steps.length) return false
  const { startsAfterStep, endsAfterStep } = practiceStepWindow(program, practice)
  if (startsAfterStep !== undefined && index <= startsAfterStep) return false
  if (endsAfterStep !== undefined && index > endsAfterStep) return false
  return true
}

/**
 * Practices the path has already handed over — running now or available on
 * demand after their window — in definition order. A closed path has handed
 * over all of them. (Lists in the dose check, the maintenance plan, Powrót.)
 */
export function handedOverPractices(
  program: Pick<ProgramDefinition, 'phases' | 'practices'>,
  enrollment: Pick<ProgramEnrollment, 'status' | 'currentStepIndex'>
): ProgramPractice[] {
  return (program.practices ?? []).filter(practice => {
    if (enrollment.status === 'completed') return true
    const { startsAfterStep } = practiceStepWindow(program, practice)
    return startsAfterStep === undefined || enrollment.currentStepIndex > startsAfterStep
  })
}

/**
 * `practiceOverrides` key for "every practice the path hands over from now
 * on": the mid-path dose decision must outlive the phase it was taken in.
 */
export const PRACTICE_OVERRIDE_ALL = '*'

/**
 * How often the practice comes up for this enrollment: its own override,
 * else the path-wide one (never faster than the definition), else the
 * definition.
 */
export function practiceEveryDays(
  practice: ProgramPractice,
  enrollment: Pick<ProgramEnrollment, 'practiceOverrides'>
): number {
  const own = enrollment.practiceOverrides?.[practice.exerciseSlug]
  if (own && own.everyDays > 0) return own.everyDays
  const all = enrollment.practiceOverrides?.[PRACTICE_OVERRIDE_ALL]
  return all && all.everyDays > practice.everyDays ? all.everyDays : practice.everyDays
}

export interface ProgramDefinition {
  slug: string
  /** `programs.<slug>` — title/description/step copy namespace. */
  i18nKey: string
  /**
   * Bumped when the step list changes shape (order, inserts, removals);
   * enrollments carry the version they were created under and are
   * migrated by `programContentMigration` (completed steps re-mapped by
   * exercise slug). Absent = 1.
   */
  contentVersion?: number
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
   * compares the two attempts (e.g. GAD-7 before/after). Superseded by
   * `outcomeSlugs` — readers treat it as a one-element list.
   */
  outcomeSlug?: string
  /**
   * Instruments measured along the path (each appears as a step at least
   * twice: first in the opening phase). The detail view shows one series
   * per instrument, labelled by the step's phase (start / połowa / koniec /
   * powrót); attempts outside the steps are not part of the series.
   */
  outcomeSlugs?: string[]
  /** Keys of the path's knowledge cards (`src/data/programKnowledge.ts`). */
  knowledgeCards?: string[]
  /**
   * Micro whose latest entry carries the user's own goal statement
   * (`sign`) and main target (`mainTarget`) for the dashboard header.
   */
  signSlug?: string
  /**
   * The weekly reflection gets a "Ścieżka" step for this program: severity
   * question `programs.<slug>.reflection.severity` + the phase question
   * `programs.<slug>.phases.<key>.question`.
   */
  weeklyReflection?: boolean
  /**
   * Category of the Momenty entries this path logs (variant
   * `moment-<kind>`); the weekly reflection lists the week's moments and
   * the detail view offers "Zapisz moment".
   */
  momentKind?: 'shame' | 'anger' | 'anxiety' | 'other'
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
  /** `ProgramDefinition.contentVersion` the step indices refer to (absent = 1). */
  contentVersion?: number
  /** Set when the path closed (last step, or the `closesPath` step). */
  completedAt?: string
  /** How often practices come up, overridden by the user (mid-path dose check); `PRACTICE_OVERRIDE_ALL` covers later ones. */
  practiceOverrides?: Record<string, { everyDays: number }>
  /** "List do siebie na później": the micro entry, the day it resurfaces, and when it was opened. */
  futureLetter?: { entryId: string; showAt: string; readAt?: string }
  /** Knowledge cards the user opened (marker only, never a gate). */
  readCards?: string[]
  /** IFS parts the path offered to create that the user removed — not recreated. */
  partsDismissed?: string[]
  /** "Moje zdania" the user hid from the path view (`ownSentenceKey`); the entries stay. */
  hiddenSentences?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Whether the enrollment still receives step items: active, or already
 * `completed` with an `afterCompletion` follow-up step ahead ("Powrót").
 */
export function isDeliveringEnrollment(
  program: Pick<ProgramDefinition, 'steps'>,
  enrollment: Pick<ProgramEnrollment, 'status' | 'currentStepIndex'>
): boolean {
  if (enrollment.status === 'active') return true
  if (enrollment.status !== 'completed') return false
  return program.steps[enrollment.currentStepIndex]?.afterCompletion === true
}

/**
 * `status`/`currentStepIndex`/`completedSteps` are absent by design — the
 * repository always creates an active enrollment at step 0. `startedAt`
 * is overridable for seeds and tests only.
 */
export interface CreateProgramEnrollmentPayload {
  programSlug: string
  startedAt?: string
  /** The definition's current content version; stamped by the scheduler. */
  contentVersion?: number
}

export interface UpdateProgramEnrollmentPayload {
  status?: ProgramEnrollmentStatus
  currentStepIndex?: number
  completedSteps?: CompletedProgramStep[]
  contentVersion?: number
  completedAt?: string
  practiceOverrides?: Record<string, { everyDays: number }>
  futureLetter?: { entryId: string; showAt: string; readAt?: string }
  readCards?: string[]
  partsDismissed?: string[]
  hiddenSentences?: string[]
}
