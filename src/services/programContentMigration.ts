/**
 * Content migration for program enrollments.
 *
 * An enrollment remembers completed steps by INDEX into the definition's
 * step list. When a path changes shape (`ProgramDefinition.contentVersion`
 * bump), older enrollments are re-mapped here: every completed step is
 * matched by exercise slug to the first not-yet-consumed occurrence in the
 * new list (so a slug that appears twice, like the outcome instrument,
 * maps in order), and `currentStepIndex` becomes the first index without
 * a completion. Skipped optional steps carry no record, so after a
 * migration an optional step may be offered again — acceptable.
 *
 * Runs once per row in the Dexie upgrade (v28) and again as a safety net
 * in `runProgramScheduler`; both paths are idempotent. Pending step plan
 * items of a migrated enrollment are dropped (their slug may be stale);
 * the scheduler materializes the right one on the next run and
 * `reconcilePractices` re-derives the practice windows.
 *
 * Plan: ideas/html-plans/2026-09-26-shame-path-v2-compassion.html §7.
 */

import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { CompletedProgramStep, ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import { getProgramDefinition } from '@/data/programCatalog'
import { legacyProgramSteps } from '@/data/programCatalogLegacy'

export function definitionContentVersion(program: ProgramDefinition): number {
  return program.contentVersion ?? 1
}

export function enrollmentContentVersion(enrollment: ProgramEnrollment): number {
  return enrollment.contentVersion ?? 1
}

/** Whether the enrollment's indices are behind its definition. */
export function needsContentMigration(enrollment: ProgramEnrollment, program: ProgramDefinition): boolean {
  return enrollmentContentVersion(enrollment) < definitionContentVersion(program)
}

/**
 * Pure re-mapping. Returns the migrated enrollment, or null when nothing
 * to do (up to date, unknown legacy version, or unknown program).
 */
export function migrateEnrollmentContent(
  enrollment: ProgramEnrollment,
  program: ProgramDefinition,
): ProgramEnrollment | null {
  if (!needsContentMigration(enrollment, program)) return null
  const fromVersion = enrollmentContentVersion(enrollment)
  const oldSteps = legacyProgramSteps(program.slug, fromVersion)
  if (!oldSteps) {
    console.error(`No legacy step list for ${program.slug} v${fromVersion}; enrollment ${enrollment.id} left as is`)
    return null
  }
  const newSlugs = program.steps.map((step) => step.exerciseSlug)
  const consumed = new Set<number>()
  const completedSteps: CompletedProgramStep[] = []
  for (const completed of [...enrollment.completedSteps].sort((a, b) => a.stepIndex - b.stepIndex)) {
    const slug = oldSteps[completed.stepIndex]
    if (slug === undefined) continue
    const target = newSlugs.findIndex((candidate, index) => candidate === slug && !consumed.has(index))
    if (target === -1) continue // the exercise left the path: its record stays in exercise history
    consumed.add(target)
    completedSteps.push({ ...completed, stepIndex: target })
  }
  completedSteps.sort((a, b) => a.stepIndex - b.stepIndex)
  let currentStepIndex = 0
  while (consumed.has(currentStepIndex)) currentStepIndex += 1
  // A walked path stays walked.
  if (enrollment.status === 'completed') currentStepIndex = program.steps.length
  return {
    ...enrollment,
    completedSteps,
    currentStepIndex,
    contentVersion: definitionContentVersion(program),
  }
}

export interface ContentMigrationIO {
  enrollments: ProgramEnrollment[]
  planItems: ExercisePlanItem[]
  putEnrollment: (row: ProgramEnrollment) => Promise<unknown>
  deletePlanItem: (id: string) => Promise<unknown>
}

/**
 * Migrates every enrollment behind its definition and drops the pending
 * STEP plan items of the migrated ones (practices are reconciled by the
 * scheduler). Returns the migrated rows.
 */
export async function migrateEnrollmentsContent(io: ContentMigrationIO): Promise<ProgramEnrollment[]> {
  const migrated: ProgramEnrollment[] = []
  for (const enrollment of io.enrollments) {
    const program = getProgramDefinition(enrollment.programSlug)
    if (!program) continue
    const next = migrateEnrollmentContent(enrollment, program)
    if (!next) continue
    await io.putEnrollment(next)
    for (const item of io.planItems) {
      if (
        item.source === 'program' &&
        item.sourceRef === enrollment.id &&
        item.status === 'pending' &&
        (item.programRole ?? 'step') === 'step'
      ) {
        await io.deletePlanItem(item.id)
      }
    }
    migrated.push(next)
  }
  return migrated
}
