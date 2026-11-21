import type { MicroExerciseEntry, MicroStepValue } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import {
  isPracticeWindowOpen,
  practiceEveryDays,
  PRACTICE_OVERRIDE_ALL,
  type ProgramDefinition,
  type ProgramEnrollment,
} from '@/domain/program'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

/**
 * After-the-steps layer of a path (plan v3 §3.5–3.6, P4): the letter to a
 * future self that resurfaces on its day, and the mid-path dose check that
 * may propose that the practices come up less often. Pure functions; the
 * service writes.
 */

// ── List na gorszy dzień ────────────────────────────────────────────

export const FUTURE_LETTER_SLUG = 'letter-to-future-self'
const RETURN_IN_DAYS: Record<string, number> = { w4: 28, w8: 56, w12: 84 }

/** The day a letter written now comes back: the chosen `returnIn` (default: the eight-week return). */
export function futureLetterShowAt(
  responses: Record<string, MicroStepValue>,
  writtenOn: DayRef
): DayRef {
  const choice = typeof responses.returnIn === 'string' ? responses.returnIn : 'w8'
  return addDaysToDayRef(writtenOn, RETURN_IN_DAYS[choice] ?? RETURN_IN_DAYS.w8!)
}

/** From its day on, the letter waits in the path view and as a "Najbliżej" marker until it is read. */
export function futureLetterDue(
  enrollment: Pick<ProgramEnrollment, 'futureLetter'>,
  today: DayRef
): boolean {
  return Boolean(enrollment.futureLetter && enrollment.futureLetter.showAt <= today)
}

// ── Czy nie za dużo? ────────────────────────────────────────────────

export const DOSE_CHECK_SLUG = 'dose-check'

export interface DoseProposalItem {
  slug: string
  /** Every how many days the practice comes up now (definition or the user's override). */
  from: number
  /** Proposed number of days. */
  to: number
}

export interface DoseProposal {
  /** `tooMuch` → every third day; `none` → once a week. */
  kind: 'tooMuch' | 'none'
  entryId: string
  items: DoseProposalItem[]
}

/** Days between occurrences each answer proposes. */
const DOSE_TARGET_DAYS = { tooMuch: 3, none: 7 } as const

/**
 * What the path view proposes after the dose check (never "do more"):
 * "za dużo" → every practice coming up more often than every third day
 * slows down to every third day; "nie robię ich" → every practice goes
 * weekly. The proposal disappears once the user decided — any override
 * written after the check counts as a decision, including "zostaw jak
 * jest" (an override equal to what runs now).
 */
export function doseProposal(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment,
  entries: readonly MicroExerciseEntry[]
): DoseProposal | null {
  const check = [...entries]
    .filter(
      entry => entry.exerciseSlug === DOSE_CHECK_SLUG && entry.createdAt >= enrollment.startedAt
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (!check) return null
  const load = check.responses.load
  if (load !== 'tooMuch' && load !== 'none') return null
  if (
    enrollment.updatedAt > check.createdAt &&
    enrollment.practiceOverrides &&
    Object.keys(enrollment.practiceOverrides).length
  ) {
    return null
  }
  const to = DOSE_TARGET_DAYS[load]
  const items: DoseProposalItem[] = (program.practices ?? [])
    .filter(practice => isPracticeWindowOpen(program, practice, enrollment))
    .flatMap(practice => {
      const from = practiceEveryDays(practice, enrollment)
      return from >= to ? [] : [{ slug: practice.exerciseSlug, from, to }]
    })
  return items.length ? { kind: load, entryId: check.id, items } : null
}

/**
 * The overrides an accepted proposal writes: the listed practices, plus
 * `PRACTICE_OVERRIDE_ALL` so the practices of later phases come up no more
 * often than the user just agreed to.
 */
export function doseOverrides(proposal: DoseProposal): Record<string, { everyDays: number }> {
  return {
    ...Object.fromEntries(proposal.items.map(item => [item.slug, { everyDays: item.to }])),
    [PRACTICE_OVERRIDE_ALL]: { everyDays: DOSE_TARGET_DAYS[proposal.kind] },
  }
}

/** Overrides that keep every open practice as it runs now — "zostaw jak jest" as a recorded decision. */
export function keepRhythmOverrides(
  program: ProgramDefinition,
  enrollment: ProgramEnrollment
): Record<string, { everyDays: number }> {
  const result: Record<string, { everyDays: number }> = {}
  for (const practice of program.practices ?? []) {
    if (isPracticeWindowOpen(program, practice, enrollment))
      result[practice.exerciseSlug] = { everyDays: practiceEveryDays(practice, enrollment) }
  }
  return result
}

export function todayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}
