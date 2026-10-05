/**
 * Writes of the path's after-the-steps layer (plan v3 P4): the letter to a
 * future self recorded on its enrollment, and practice rhythm overrides
 * decided from the dose check. Reads/derivations live in
 * `domain/programFollowUp.ts`; the scheduler honours the overrides
 * through `effectivePractice`.
 */

import { getProgramDefinition } from '@/data/programCatalog'
import type { MicroStepValue } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import { FUTURE_LETTER_SLUG, futureLetterShowAt } from '@/domain/programFollowUp'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { reconcilePractices, type PracticeReconciliation } from '@/services/programSchedulerService'
import { captureUserSession } from '@/services/userSessionScope'
import { getPeriodRefsForDate } from '@/utils/periods'

/**
 * The enrollment a letter belongs to: the newest open (active/paused)
 * enrollment of a program that has the letter as a step, else the newest
 * completed one (the letter may be the last thing written before the close).
 */
function letterEnrollment(enrollments: readonly ProgramEnrollment[]): ProgramEnrollment | undefined {
  const candidates = enrollments
    .filter((enrollment) => {
      const program = getProgramDefinition(enrollment.programSlug)
      return program?.steps.some((step) => step.exerciseSlug === FUTURE_LETTER_SLUG) && enrollment.status !== 'abandoned'
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return candidates.find((c) => c.status === 'active' || c.status === 'paused') ?? candidates[0]
}

/** Stores the just-written letter on its enrollment with the day it comes back; null when no path takes it. */
export async function recordFutureLetter(
  entryId: string,
  responses: Record<string, MicroStepValue>,
  writtenOn: DayRef = getPeriodRefsForDate(new Date()).day,
): Promise<ProgramEnrollment | null> {
  const session = captureUserSession()
  const enrollment = letterEnrollment(await session.wait(programEnrollmentDexieRepository.listAll()))
  if (!enrollment) return null
  return session.wait(
    programEnrollmentDexieRepository.update(enrollment.id, {
      futureLetter: { entryId, showAt: futureLetterShowAt(responses, writtenOn) },
    }),
  )
}

/** Merges rhythm overrides into the enrollment and lets the scheduler re-read them. */
export async function setPracticeOverrides(
  enrollmentId: string,
  overrides: Record<string, { everyDays: number }>,
): Promise<{ enrollment: ProgramEnrollment; practices: PracticeReconciliation }> {
  const session = captureUserSession()
  const current = await session.wait(programEnrollmentDexieRepository.getById(enrollmentId))
  if (!current) throw new Error(`Program enrollment ${enrollmentId} not found`)
  const enrollment = await session.wait(
    programEnrollmentDexieRepository.update(enrollmentId, {
      practiceOverrides: { ...(current.practiceOverrides ?? {}), ...overrides },
    }),
  )
  const practices = await session.wait(reconcilePractices(enrollment))
  return { enrollment, practices }
}
