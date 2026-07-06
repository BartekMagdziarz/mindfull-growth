/**
 * Program scheduler — materialization, advancement and lifecycle for
 * program ("ścieżka") enrollments over `exercisePlanItems`.
 *
 * One invariant guarded everywhere: an active enrollment has AT MOST
 * one pending plan item (`source: 'program'`, `sourceRef` = enrollment
 * id), and it always represents the current step. Materialization is
 * idempotent — any existing pending item for the enrollment blocks a
 * new one — so it can run on every Today load, on enroll/resume and
 * right after advancement (D2's safety net).
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
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { getProgramDefinition } from '@/data/programCatalog'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { skipPlan } from '@/services/exercisePlanService'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

export interface ProgramAdvancement {
  enrollment: ProgramEnrollment
  /** Next step's plan item, materialized right away; null on the last step. */
  nextPlanItem: ExercisePlanItem | null
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
  if (pending.length > 0) return null
  return exercisePlanDexieRepository.create({
    exerciseSlug: step.exerciseSlug,
    dayRef: eligibleDayForStep(program, enrollment, enrollment.currentStepIndex),
    source: 'program',
    sourceRef: enrollment.id,
  })
}

/**
 * Today-load reconciler: materializes the current step of every active
 * enrollment. Per-enrollment failures are logged and skipped — one bad
 * row must never block the rest.
 */
export async function runProgramScheduler(): Promise<ExercisePlanItem[]> {
  const enrollments = await programEnrollmentDexieRepository.listAll()
  const created: ExercisePlanItem[] = []
  for (const enrollment of enrollments.filter((e) => e.status === 'active')) {
    try {
      const item = await ensureCurrentStepMaterialized(enrollment)
      if (item) created.push(item)
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
  return { enrollment: updated, nextPlanItem: await ensureCurrentStepMaterialized(updated) }
}

/**
 * Enrolls into a program and materializes step 0. At most one
 * non-terminal (active/paused) enrollment per program — duplicates
 * would double-materialize steps.
 */
export async function enrollInProgram(
  programSlug: string,
): Promise<{ enrollment: ProgramEnrollment; planItem: ExercisePlanItem | null }> {
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
  return { enrollment, planItem: await ensureCurrentStepMaterialized(enrollment) }
}

/** Pauses an active enrollment, deleting its pending step (no orphans). */
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
 * its original eligible day (possibly past → overdue, D3).
 */
export async function resumeEnrollment(
  id: string,
): Promise<{ enrollment: ProgramEnrollment; planItem: ExercisePlanItem | null }> {
  await requireEnrollment(id, ['paused'])
  const enrollment = await programEnrollmentDexieRepository.update(id, { status: 'active' })
  return { enrollment, planItem: await ensureCurrentStepMaterialized(enrollment) }
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
  const pending = await exercisePlanDexieRepository.listPendingByProgramSourceRef(id)
  let skippedPlan: ExercisePlanItem | null = null
  if (pending[0]) {
    skippedPlan = await skipPlan(pending[0].id)
  }
  const nextStepIndex = enrollment.currentStepIndex + 1
  const updated = await programEnrollmentDexieRepository.update(id, {
    status: nextStepIndex >= program.steps.length ? 'completed' : 'active',
    currentStepIndex: nextStepIndex,
  })
  return { enrollment: updated, skippedPlan, nextPlanItem: await ensureCurrentStepMaterialized(updated) }
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
