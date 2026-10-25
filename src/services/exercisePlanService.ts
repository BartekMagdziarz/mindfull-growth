import { userDatabaseOperation } from '@/repositories/userDatabaseOperation'
/**
 * Exercise plan service — repeats & (Phase 3) program-step delivery
 * over the `exercisePlanItems` table.
 *
 * Pure functions over the repository — no Pinia imports, so
 * `exerciseCompletionService` can call `autoCompleteFor` without a
 * cycle. Reactive cache patching lives in `exercisePlan.store`.
 *
 * Design: docs/exercise-scheduling-design.md §4.4 (D3/D6).
 */

import type { ExercisePlanItem, ExercisePlanSource } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'

export async function createPlan(
  slug: string,
  dayRef: DayRef,
  source: ExercisePlanSource = 'repeat'
): Promise<ExercisePlanItem> {
  return exercisePlanDexieRepository.create({ exerciseSlug: slug, dayRef, source })
}

/** Reschedules a plan; status stays whatever it was (pending in practice). */
export async function movePlan(id: string, dayRef: DayRef): Promise<ExercisePlanItem> {
  return exercisePlanDexieRepository.update(id, { dayRef })
}

export async function skipPlan(id: string): Promise<ExercisePlanItem> {
  return exercisePlanDexieRepository.update(id, { status: 'skipped' })
}

/** Hard-deletes a plan — the repeat prompt's "undo". */
export async function cancelPlan(id: string): Promise<void> {
  return exercisePlanDexieRepository.delete(id)
}

export async function listPlans(): Promise<ExercisePlanItem[]> {
  return exercisePlanDexieRepository.listAll()
}

/** Oldest first: by planned day, then by creation time. */
function byDayThenCreated(a: ExercisePlanItem, b: ExercisePlanItem): number {
  return a.dayRef === b.dayRef
    ? a.createdAt.localeCompare(b.createdAt)
    : a.dayRef.localeCompare(b.dayRef)
}

/** A path step's plan item: its day only governs when Today shows it. */
function isProgramStepItem(item: ExercisePlanItem): boolean {
  return item.source === 'program' && item.programRole === 'step'
}

/**
 * Marks the oldest pending plan for `slug` with `dayRef <= day` as done
 * (design §4.4 — the user never ticks a plan manually). Returns the
 * completed item, or null when nothing matched. DayRef comparison is a
 * plain string compare — 'YYYY-MM-DD' orders lexicographically.
 *
 * A path step done before its eligible day still counts (design §4.5):
 * the step tile offers "Rozpocznij" ahead of time, so the gap only
 * paces delivery, it never discards the user's work.
 */
export async function autoCompleteFor(
  slug: string,
  day: DayRef,
  recordId?: string
): Promise<ExercisePlanItem | null> {
  return userDatabaseOperation('rw', ['exercisePlanItems'], async () => {
    const pending = await exercisePlanDexieRepository.listPendingBySlug(slug)
    const due = pending
      .filter(item => item.dayRef <= day || isProgramStepItem(item))
      .sort(byDayThenCreated)
    const oldest = due[0]
    if (!oldest) return null
    return exercisePlanDexieRepository.update(oldest.id, { status: 'done', recordId })
  })
}

/**
 * Whether a path is waiting on `slug` as its step. Any day counts, like in
 * `autoCompleteFor`: the step lifts an assessment's retake lock, because
 * the path paces its own measurements (start · połowa · koniec · powrót).
 */
export async function hasPendingProgramStep(slug: string): Promise<boolean> {
  const pending = await exercisePlanDexieRepository.listPendingBySlug(slug)
  return pending.some(isProgramStepItem)
}

/**
 * Due + overdue selector shared by the store, the Today tile and tests:
 * pending items with `dayRef <= todayRef` (D3 — overdue items carry
 * forward, their dayRef is never rewritten), oldest first.
 */
export function selectDueItems(items: ExercisePlanItem[], todayRef: DayRef): ExercisePlanItem[] {
  return items
    .filter(item => item.status === 'pending' && item.dayRef <= todayRef)
    .sort(byDayThenCreated)
}

export interface RepeatChipOption {
  days: number
  labelKey: string
  suggested: boolean
}

const STANDARD_CHIP_DAYS = [3, 7, 14, 30] as const

const STANDARD_CHIP_KEYS: Record<number, string> = {
  3: 'exercises.repeatPrompt.chips.in3Days',
  7: 'exercises.repeatPrompt.chips.inWeek',
  14: 'exercises.repeatPrompt.chips.in2Weeks',
  30: 'exercises.repeatPrompt.chips.inMonth',
}

/**
 * Chip model for `RepeatPlanPrompt`: the four standard intervals, plus
 * a leading dynamic chip when the suggested interval isn't one of them
 * (catalog uses 1 and 2). `days === 1` renders as "tomorrow"; other
 * dynamic values use the plural key (resolved via `tp` by the caller).
 */
export function buildRepeatChipOptions(suggestedDays?: number): RepeatChipOption[] {
  const options: RepeatChipOption[] = STANDARD_CHIP_DAYS.map(days => ({
    days,
    labelKey: STANDARD_CHIP_KEYS[days]!,
    suggested: days === suggestedDays,
  }))
  if (
    suggestedDays !== undefined &&
    suggestedDays >= 1 &&
    !STANDARD_CHIP_DAYS.includes(suggestedDays as (typeof STANDARD_CHIP_DAYS)[number])
  ) {
    options.unshift({
      days: suggestedDays,
      labelKey:
        suggestedDays === 1
          ? 'exercises.repeatPrompt.chips.tomorrow'
          : 'exercises.repeatPrompt.chips.inDays',
      suggested: true,
    })
  }
  return options
}

/**
 * Days from `now` until an assessment's retake eligibility — the
 * prompt prefill for assessments (design §4.4). Undefined when absent
 * or already eligible (fall back to catalog / no suggestion).
 */
export function retakeSuggestedDays(
  retakeEligibleAt: string | undefined,
  now: Date = new Date()
): number | undefined {
  if (!retakeEligibleAt) return undefined
  const eligible = new Date(retakeEligibleAt)
  if (Number.isNaN(eligible.getTime())) return undefined
  const days = Math.ceil((eligible.getTime() - now.getTime()) / 86_400_000)
  return days >= 1 ? days : undefined
}
