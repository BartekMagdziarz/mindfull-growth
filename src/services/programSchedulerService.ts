/**
 * Program scheduler — materialization, advancement and lifecycle for
 * program ("ścieżka") enrollments over `exercisePlanItems`.
 *
 * Invariants guarded everywhere, per active enrollment
 * (`source: 'program'`, `sourceRef` = enrollment id):
 * - AT MOST one pending STEP item (`programRole` 'step' or absent), and it
 *   always represents the current step;
 * - AT MOST one pending PRACTICE item per practice whose window is open
 *   (`programRole: 'practice'`, matched by slug).
 * Materialization is idempotent, so it can run on every Today load, on
 * enroll/resume and right after advancement (D2's safety net).
 *
 * Pure functions over the repositories — no Pinia imports, so
 * `exerciseCompletionService` can call `advanceEnrollmentForPlan`
 * without a cycle. Reactive cache patching lives in
 * `programEnrollment.store`.
 *
 * Design: docs/exercise-scheduling-design.md §4.5 (D2/D6).
 */

import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment, ProgramPractice } from '@/domain/program'
import { getProgramDefinition } from '@/data/programCatalog'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { skipPlan } from '@/services/exercisePlanService'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

/** Practice plan items created / hard-deleted by one reconciliation pass. */
export interface PracticeReconciliation {
  created: ExercisePlanItem[]
  removedPlanIds: string[]
}

export interface ProgramAdvancement {
  enrollment: ProgramEnrollment
  /** Next step's plan item, materialized right away; null on the last step. */
  nextPlanItem: ExercisePlanItem | null
  /** Practices whose window opened or closed with this step (absent = none). */
  practices?: PracticeReconciliation
}

export interface EnrollmentLifecycleResult {
  enrollment: ProgramEnrollment
  /** Plan items hard-deleted by pause/abandon — for cache eviction. */
  removedPlanIds: string[]
}

export type ProgramStepStateKind = 'done' | 'skipped' | 'current' | 'locked'

export interface ProgramStepState {
  state: ProgramStepStateKind
  /** Set for 'done' steps. */
  completedAt?: string
  recordId?: string
  /** Set for the 'current' step — earliest day the step can be due. */
  eligibleDay?: DayRef
}

/**
 * Earliest eligible day for a step: the previous completion's local day
 * plus the step's `minGapDays`; step 0 (or a run of skipped steps with
 * no completion yet) anchors on the enrollment start. Deliberately NOT
 * clamped to today — a past eligible day renders as overdue (D3), it
 * never rewrites the schedule.
 */
export function eligibleDayForStep(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  stepIndex: number,
): DayRef {
  const step = program.steps[stepIndex]
  if (!step) {
    throw new Error(`Program ${program.slug} has no step ${stepIndex}`)
  }
  // Skipped optional steps leave no entry, so the anchor is the latest
  // ACTUAL completion below this step (skips add no delay).
  const anchor = enrollment.completedSteps
    .filter((completed) => completed.stepIndex < stepIndex)
    .reduce<string | undefined>(
      (latest, completed) => (!latest || completed.completedAt > latest ? completed.completedAt : latest),
      undefined,
    )
  const anchorDay = getPeriodRefsForDate(anchor ?? enrollment.startedAt).day
  return addDaysToDayRef(anchorDay, step.minGapDays)
}

export function isPracticeItem(item: ExercisePlanItem): boolean {
  return item.programRole === 'practice'
}

function todayDayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}

/**
 * Whether a practice runs at the enrollment's current step. Windows are
 * expressed in steps, not dates: `startsAfterStep` / `endsAfterStep` are
 * passed once the index moves beyond them (done or skipped alike).
 */
export function isPracticeWindowOpen(
  program: ProgramDefinition,
  practice: ProgramPractice,
  enrollment: ProgramEnrollment,
): boolean {
  if (enrollment.status !== 'active') return false
  const index = enrollment.currentStepIndex
  if (index >= program.steps.length) return false
  if (practice.startsAfterStep !== undefined && index <= practice.startsAfterStep) return false
  if (practice.endsAfterStep !== undefined && index > practice.endsAfterStep) return false
  return true
}

/**
 * Day the next practice occurrence is due: the last occurrence handled
 * (done or skipped) in this enrollment + `everyDays`, or — for the first one — the window's
 * opening (the latest completion up to `startsAfterStep`, else the
 * enrollment start). Unlike steps, a NEW practice occurrence is never born
 * overdue: the day is clamped to today, so a resume after a long pause or
 * a late step does not surface a stale "overdue" habit. An existing
 * pending occurrence still turns overdue normally (D3).
 */
export function eligibleDayForPractice(
  practice: ProgramPractice,
  enrollment: ProgramEnrollment,
  lastDoneAt: string | undefined,
  today: DayRef,
): DayRef {
  let base: DayRef
  if (lastDoneAt) {
    base = addDaysToDayRef(getPeriodRefsForDate(lastDoneAt).day, practice.everyDays)
  } else {
    const anchor =
      practice.startsAfterStep === undefined
        ? undefined
        : enrollment.completedSteps
            .filter((completed) => completed.stepIndex <= practice.startsAfterStep!)
            .reduce<string | undefined>(
              (latest, completed) =>
                !latest || completed.completedAt > latest ? completed.completedAt : latest,
              undefined,
            )
    base = getPeriodRefsForDate(anchor ?? enrollment.startedAt).day
  }
  return base < today ? today : base
}

/**
 * Brings the enrollment's practice items in line with its current step:
 * deletes pending occurrences whose window closed (or whose practice no
 * longer exists), and materializes one occurrence for every open window
 * that has none. Non-active enrollments end up with no pending practice.
 */
export async function reconcilePractices(
  enrollment: ProgramEnrollment,
  today: DayRef = todayDayRef(),
): Promise<PracticeReconciliation> {
  const program = getProgramDefinition(enrollment.programSlug)
  const practices = program?.practices ?? []
  const pending = (await exercisePlanDexieRepository.listPendingByProgramSourceRef(enrollment.id)).filter(
    isPracticeItem,
  )
  if (!program || (practices.length === 0 && pending.length === 0)) {
    return { created: [], removedPlanIds: [] }
  }

  const open = practices.filter((practice) => isPracticeWindowOpen(program, practice, enrollment))
  const openSlugs = new Set(open.map((practice) => practice.exerciseSlug))

  const removedPlanIds: string[] = []
  for (const item of pending) {
    if (!openSlugs.has(item.exerciseSlug)) {
      await exercisePlanDexieRepository.delete(item.id)
      removedPlanIds.push(item.id)
    }
  }

  const pendingSlugs = new Set(pending.map((item) => item.exerciseSlug))
  const missing = open.filter((practice) => !pendingSlugs.has(practice.exerciseSlug))
  const created: ExercisePlanItem[] = []
  if (missing.length > 0) {
    const history = await exercisePlanDexieRepository.listByProgramSourceRef(enrollment.id)
    for (const practice of missing) {
      // A skipped occurrence counts as handled too — otherwise skipping
      // today's practice would re-create it for today on the next load.
      const lastDoneAt = history
        .filter(
          (item) =>
            isPracticeItem(item) &&
            (item.status === 'done' || item.status === 'skipped') &&
            item.exerciseSlug === practice.exerciseSlug,
        )
        .reduce<string | undefined>(
          (latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest),
          undefined,
        )
      created.push(
        await exercisePlanDexieRepository.create({
          exerciseSlug: practice.exerciseSlug,
          dayRef: eligibleDayForPractice(practice, enrollment, lastDoneAt, today),
          source: 'program',
          sourceRef: enrollment.id,
          programRole: 'practice',
        }),
      )
    }
  }
  return { created, removedPlanIds }
}

/**
 * After a practice occurrence was auto-completed: schedule the next one.
 * Returns null when the plan isn't a practice of an existing enrollment.
 */
export async function advancePracticeForPlan(
  completedPlan: ExercisePlanItem,
): Promise<PracticeReconciliation | null> {
  if (completedPlan.source !== 'program' || !completedPlan.sourceRef || !isPracticeItem(completedPlan)) {
    return null
  }
  const enrollment = await programEnrollmentDexieRepository.getById(completedPlan.sourceRef)
  if (!enrollment) return null
  return reconcilePractices(enrollment)
}

/**
 * Ensures the enrollment's current step has a pending plan item; returns
 * the created item, or null when nothing was (or should be) created —
 * non-active enrollment, path already walked, unknown program, or an
 * existing pending item (the idempotency key).
 */
export async function ensureCurrentStepMaterialized(
  enrollment: ProgramEnrollment,
): Promise<ExercisePlanItem | null> {
  if (enrollment.status !== 'active') return null
  const program = getProgramDefinition(enrollment.programSlug)
  if (!program) {
    console.error(`Unknown program ${enrollment.programSlug} for enrollment ${enrollment.id}`)
    return null
  }
  const step = program.steps[enrollment.currentStepIndex]
  if (!step) return null
  const pending = await exercisePlanDexieRepository.listPendingByProgramSourceRef(enrollment.id)
  if (pending.some((item) => !isPracticeItem(item))) return null
  return exercisePlanDexieRepository.create({
    exerciseSlug: step.exerciseSlug,
    dayRef: eligibleDayForStep(program, enrollment, enrollment.currentStepIndex),
    source: 'program',
    sourceRef: enrollment.id,
    programRole: 'step',
  })
}

/**
 * Today-load reconciler: materializes the current step and the open
 * practices of every active enrollment; returns the created items.
 * Per-enrollment failures are logged and skipped — one bad row must never
 * block the rest.
 */
export async function runProgramScheduler(): Promise<ExercisePlanItem[]> {
  const enrollments = await programEnrollmentDexieRepository.listAll()
  const created: ExercisePlanItem[] = []
  for (const enrollment of enrollments.filter((e) => e.status === 'active')) {
    try {
      const item = await ensureCurrentStepMaterialized(enrollment)
      if (item) created.push(item)
      created.push(...(await reconcilePractices(enrollment)).created)
    } catch (err) {
      console.error(`Failed to materialize program step for enrollment ${enrollment.id}:`, err)
    }
  }
  return created
}

/**
 * Advances an enrollment after its program plan item was auto-completed
 * (`recordCompletion` → `autoCompleteFor`). The plan→step mapping is the
 * enrollment's `currentStepIndex` — never the slug (thought-record ×3
 * shares one slug across steps); the slug only sanity-guards against a
 * stale item. Returns null when the plan isn't an advanceable program
 * step.
 */
export async function advanceEnrollmentForPlan(
  completedPlan: ExercisePlanItem,
): Promise<ProgramAdvancement | null> {
  if (completedPlan.source !== 'program' || !completedPlan.sourceRef) return null
  // Practices recur alongside the steps and never move the index.
  if (isPracticeItem(completedPlan)) return null
  const enrollment = await programEnrollmentDexieRepository.getById(completedPlan.sourceRef)
  if (!enrollment || enrollment.status !== 'active') return null
  const program = getProgramDefinition(enrollment.programSlug)
  if (!program) {
    console.error(`Unknown program ${enrollment.programSlug} for enrollment ${enrollment.id}`)
    return null
  }
  const step = program.steps[enrollment.currentStepIndex]
  if (!step || step.exerciseSlug !== completedPlan.exerciseSlug) {
    console.error(
      `Program plan ${completedPlan.id} (${completedPlan.exerciseSlug}) does not match ` +
        `step ${enrollment.currentStepIndex} of enrollment ${enrollment.id}`,
    )
    return null
  }
  const nextStepIndex = enrollment.currentStepIndex + 1
  const updated = await programEnrollmentDexieRepository.update(enrollment.id, {
    status: nextStepIndex >= program.steps.length ? 'completed' : 'active',
    currentStepIndex: nextStepIndex,
    completedSteps: [
      ...enrollment.completedSteps,
      {
        stepIndex: enrollment.currentStepIndex,
        completedAt: new Date().toISOString(),
        recordId: completedPlan.recordId,
      },
    ],
  })
  const nextPlanItem = await ensureCurrentStepMaterialized(updated)
  return { enrollment: updated, nextPlanItem, practices: await reconcilePractices(updated) }
}

/**
 * Enrolls into a program and materializes step 0. At most one
 * non-terminal (active/paused) enrollment per program — duplicates
 * would double-materialize steps.
 */
export async function enrollInProgram(programSlug: string): Promise<{
  enrollment: ProgramEnrollment
  planItem: ExercisePlanItem | null
  practices: PracticeReconciliation
}> {
  const program = getProgramDefinition(programSlug)
  if (!program) {
    throw new Error(`Unknown program ${programSlug}`)
  }
  const existing = await programEnrollmentDexieRepository.listAll()
  const open = existing.find(
    (e) => e.programSlug === programSlug && (e.status === 'active' || e.status === 'paused'),
  )
  if (open) {
    throw new Error(`Already enrolled in program ${programSlug}`)
  }
  const enrollment = await programEnrollmentDexieRepository.create({ programSlug })
  const planItem = await ensureCurrentStepMaterialized(enrollment)
  return { enrollment, planItem, practices: await reconcilePractices(enrollment) }
}

/** Pauses an active enrollment, deleting its pending step and practices (no orphans). */
export async function pauseEnrollment(id: string): Promise<EnrollmentLifecycleResult> {
  await requireEnrollment(id, ['active'])
  const removedPlanIds = await deletePendingProgramItems(id)
  return {
    enrollment: await programEnrollmentDexieRepository.update(id, { status: 'paused' }),
    removedPlanIds,
  }
}

/**
 * Resumes a paused enrollment and re-materializes the current step at
 * its original eligible day (possibly past → overdue, D3). Practices
 * restart from today (see `eligibleDayForPractice`).
 */
export async function resumeEnrollment(id: string): Promise<{
  enrollment: ProgramEnrollment
  planItem: ExercisePlanItem | null
  practices: PracticeReconciliation
}> {
  await requireEnrollment(id, ['paused'])
  const enrollment = await programEnrollmentDexieRepository.update(id, { status: 'active' })
  const planItem = await ensureCurrentStepMaterialized(enrollment)
  return { enrollment, planItem, practices: await reconcilePractices(enrollment) }
}

/** Terminal: abandons an active or paused enrollment + cleans pendings. */
export async function abandonEnrollment(id: string): Promise<EnrollmentLifecycleResult> {
  await requireEnrollment(id, ['active', 'paused'])
  const removedPlanIds = await deletePendingProgramItems(id)
  return {
    enrollment: await programEnrollmentDexieRepository.update(id, { status: 'abandoned' }),
    removedPlanIds,
  }
}

/**
 * Skips the current step (optional steps only): the pending item is
 * marked 'skipped' (kept, D3-style history), the index advances WITHOUT
 * a completion entry, and the next step materializes anchored on the
 * latest actual completion — a skip adds no delay.
 */
export async function skipOptionalStep(id: string): Promise<{
  enrollment: ProgramEnrollment
  skippedPlan: ExercisePlanItem | null
  nextPlanItem: ExercisePlanItem | null
  practices: PracticeReconciliation
}> {
  const enrollment = await requireEnrollment(id, ['active'])
  const program = getProgramDefinition(enrollment.programSlug)
  if (!program) {
    throw new Error(`Unknown program ${enrollment.programSlug}`)
  }
  const step = program.steps[enrollment.currentStepIndex]
  if (!step?.optional) {
    throw new Error(`Step ${enrollment.currentStepIndex} of ${program.slug} is not optional`)
  }
  const pendingStep = (await exercisePlanDexieRepository.listPendingByProgramSourceRef(id)).find(
    (item) => !isPracticeItem(item),
  )
  let skippedPlan: ExercisePlanItem | null = null
  if (pendingStep) {
    skippedPlan = await skipPlan(pendingStep.id)
  }
  const nextStepIndex = enrollment.currentStepIndex + 1
  const updated = await programEnrollmentDexieRepository.update(id, {
    status: nextStepIndex >= program.steps.length ? 'completed' : 'active',
    currentStepIndex: nextStepIndex,
  })
  const nextPlanItem = await ensureCurrentStepMaterialized(updated)
  return { enrollment: updated, skippedPlan, nextPlanItem, practices: await reconcilePractices(updated) }
}

/**
 * Timeline model for the program detail view. Null enrollment (not
 * enrolled / abandoned history hidden) → every step 'locked'. Steps
 * below the index are 'done' (with their completion) or 'skipped';
 * the index itself is 'current' while the enrollment is active or
 * paused, with its computed eligible day.
 */
export function deriveStepStates(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment | null,
): ProgramStepState[] {
  return program.steps.map((_, index) => {
    if (!enrollment) return { state: 'locked' }
    if (index < enrollment.currentStepIndex) {
      const completed = enrollment.completedSteps.find((c) => c.stepIndex === index)
      return completed
        ? { state: 'done', completedAt: completed.completedAt, recordId: completed.recordId }
        : { state: 'skipped' }
    }
    if (
      index === enrollment.currentStepIndex &&
      (enrollment.status === 'active' || enrollment.status === 'paused')
    ) {
      return { state: 'current', eligibleDay: eligibleDayForStep(program, enrollment, index) }
    }
    return { state: 'locked' }
  })
}

export type ProgramPracticeStateKind = 'upcoming' | 'active' | 'ended'

export interface ProgramPracticeState {
  practice: ProgramPractice
  state: ProgramPracticeStateKind
  /** Active practices: the pending occurrence, when materialized. */
  pendingItem?: ExercisePlanItem
}

/**
 * Practice rail model for the program detail view: not started yet
 * (no enrollment, or its window opens after a later step), running (with
 * its pending occurrence) or over. A paused enrollment keeps its open
 * practices 'active' but without a pending occurrence.
 */
export function derivePracticeStates(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment | null | undefined,
  planItems: readonly ExercisePlanItem[],
): ProgramPracticeState[] {
  return (program.practices ?? []).map((practice) => {
    if (!enrollment) return { practice, state: 'upcoming' }
    const index = enrollment.currentStepIndex
    if (
      enrollment.status === 'completed' ||
      index >= program.steps.length ||
      (practice.endsAfterStep !== undefined && index > practice.endsAfterStep)
    ) {
      return { practice, state: 'ended' }
    }
    if (practice.startsAfterStep !== undefined && index <= practice.startsAfterStep) {
      return { practice, state: 'upcoming' }
    }
    const pendingItem = planItems.find(
      (item) =>
        item.status === 'pending' &&
        item.source === 'program' &&
        item.sourceRef === enrollment.id &&
        isPracticeItem(item) &&
        item.exerciseSlug === practice.exerciseSlug,
    )
    return pendingItem ? { practice, state: 'active', pendingItem } : { practice, state: 'active' }
  })
}

async function requireEnrollment(
  id: string,
  allowedStatuses: ProgramEnrollment['status'][],
): Promise<ProgramEnrollment> {
  const enrollment = await programEnrollmentDexieRepository.getById(id)
  if (!enrollment) {
    throw new Error(`Program enrollment ${id} not found`)
  }
  if (!allowedStatuses.includes(enrollment.status)) {
    throw new Error(`Program enrollment ${id} is ${enrollment.status}, expected ${allowedStatuses.join('/')}`)
  }
  return enrollment
}

async function deletePendingProgramItems(enrollmentId: string): Promise<string[]> {
  const pending = await exercisePlanDexieRepository.listPendingByProgramSourceRef(enrollmentId)
  for (const item of pending) {
    await exercisePlanDexieRepository.delete(item.id)
  }
  return pending.map((item) => item.id)
}
