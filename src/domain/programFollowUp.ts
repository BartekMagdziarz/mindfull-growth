import type { MicroExerciseEntry, MicroStepValue } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment, ProgramPractice } from '@/domain/program'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

/**
 * After-the-steps layer of a path (plan v3 §3.5–3.6, P4): the letter to a
 * future self that resurfaces on its day, and the mid-path dose check that
 * may propose a calmer practice rhythm. Pure functions; the service writes.
 */

// ── List na gorszy dzień ────────────────────────────────────────────

export const FUTURE_LETTER_SLUG = 'letter-to-future-self'
const RETURN_IN_DAYS: Record<string, number> = { w4: 28, w8: 56, w12: 84 }

/** The day a letter written now comes back: the chosen `returnIn` (default: the eight-week return). */
export function futureLetterShowAt(responses: Record<string, MicroStepValue>, writtenOn: DayRef): DayRef {
  const choice = typeof responses.returnIn === 'string' ? responses.returnIn : 'w8'
  return addDaysToDayRef(writtenOn, RETURN_IN_DAYS[choice] ?? RETURN_IN_DAYS.w8!)
}

/** From its day on, the letter waits in the path view and in Today (Today keeps it a week). */
export function futureLetterDue(enrollment: Pick<ProgramEnrollment, 'futureLetter'>, today: DayRef): boolean {
  return Boolean(enrollment.futureLetter && enrollment.futureLetter.showAt <= today)
}

export function futureLetterFresh(enrollment: Pick<ProgramEnrollment, 'futureLetter'>, today: DayRef, days = 7): boolean {
  const showAt = enrollment.futureLetter?.showAt
  return Boolean(showAt && showAt <= today && today <= addDaysToDayRef(showAt as DayRef, days - 1))
}

// ── Czy nie za dużo? ────────────────────────────────────────────────

export const DOSE_CHECK_SLUG = 'dose-check'
export const BREATH_SLUG = 'paced-breathing'

export interface DoseProposalItem {
  slug: string
  /** Rhythm the practice runs at now (definition or the user's override). */
  from: number
  /** Proposed rhythm. */
  to: number
}

export interface DoseProposal {
  /** `tooMuch` → less often; `none` → only the breath stays. */
  kind: 'tooMuch' | 'none'
  entryId: string
  items: DoseProposalItem[]
}

function practiceRhythm(practice: ProgramPractice, enrollment: Pick<ProgramEnrollment, 'practiceOverrides'>): number {
  const override = enrollment.practiceOverrides?.[practice.exerciseSlug]
  return override && override.everyDays > 0 ? override.everyDays : practice.everyDays
}

function windowOpen(program: ProgramDefinition, practice: ProgramPractice, enrollment: ProgramEnrollment): boolean {
  if (enrollment.status !== 'active') return false
  const index = enrollment.currentStepIndex
  if (index >= program.steps.length) return false
  if (practice.startsAfterStep !== undefined && index <= practice.startsAfterStep) return false
  if (practice.endsAfterStep !== undefined && index > practice.endsAfterStep) return false
  return true
}

/**
 * What the path view proposes after the dose check (never "do more"):
 * "za dużo" → every practice running more often than every third day
 * slows down to every third day; "nie robię ich" → everything but the
 * breath goes weekly. The proposal disappears once the user decided —
 * any override written after the check counts as a decision, including
 * "zostaw jak jest" (an override equal to the current rhythm).
 */
export function doseProposal(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  entries: readonly MicroExerciseEntry[],
): DoseProposal | null {
  const check = [...entries]
    .filter((entry) => entry.exerciseSlug === DOSE_CHECK_SLUG && entry.createdAt >= enrollment.startedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!check) return null
  const load = check.responses.load
  if (load !== 'tooMuch' && load !== 'none') return null
  if (enrollment.updatedAt > check.createdAt && enrollment.practiceOverrides && Object.keys(enrollment.practiceOverrides).length) {
    return null
  }
  const open = (program.practices ?? []).filter((practice) => windowOpen(program, practice, enrollment))
  const items: DoseProposalItem[] = open.flatMap((practice) => {
    const from = practiceRhythm(practice, enrollment)
    if (load === 'none') {
      return practice.exerciseSlug === BREATH_SLUG || from >= 7 ? [] : [{ slug: practice.exerciseSlug, from, to: 7 }]
    }
    return from >= 3 ? [] : [{ slug: practice.exerciseSlug, from, to: 3 }]
  })
  return items.length ? { kind: load, entryId: check.id, items } : null
}

/** Overrides that keep every open practice at its current rhythm — "zostaw jak jest" as a recorded decision. */
export function keepRhythmOverrides(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
): Record<string, { everyDays: number }> {
  const result: Record<string, { everyDays: number }> = {}
  for (const practice of program.practices ?? []) {
    if (windowOpen(program, practice, enrollment)) result[practice.exerciseSlug] = { everyDays: practiceRhythm(practice, enrollment) }
  }
  return result
}

export function todayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}
