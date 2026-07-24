import type { MonthRef, YearRef } from '@/domain/period'
import type { Priority } from '@/domain/planning'
import type { MonthPlan, PriorityVerdict } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'

/**
 * The active Priorities in scope for a month: status `active` and the month's year present in
 * `years`. Priorities are annual (no per-month state), so "active this month" is derived from
 * the year alone, mirroring the filter in `usePlannerState`. Sorted by `order`, then title.
 */
export async function getActivePrioritiesForMonth(monthRef: MonthRef): Promise<Priority[]> {
  const year = monthRef.slice(0, 4) as YearRef
  const priorities = await priorityDexieRepository.listAll()
  return priorities
    .filter((priority) => priority.status === 'active' && priority.years.includes(year))
    .sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
        left.title.localeCompare(right.title),
    )
}

/** Lazily upsert the month's plan record with the chosen ≤3 top-priority ids (the "Zaplanuj miesiąc" pick). */
export async function setMonthTopPriorities(
  monthRef: MonthRef,
  topPriorityIds: string[],
): Promise<MonthPlan> {
  const existing = await periodPlanDexieRepository.getMonthPlan(monthRef)
  if (existing) {
    return periodPlanDexieRepository.updateMonthPlan(existing.id, { topPriorityIds })
  }
  return periodPlanDexieRepository.createMonthPlan({ monthRef, topPriorityIds })
}

function dedupeSignals(signals?: string[]): string[] {
  if (!signals) return []
  return Array.from(new Set(signals.map((signal) => signal.trim()).filter(Boolean)))
}

export interface MonthlyPriorityAssessmentInput {
  /** 1–5 effort self-rating, or null to clear. */
  effort?: number | null
  verdict?: PriorityVerdict | null
  note?: string
  /** Progress signals checked as "noticed this month". */
  observedProgressSignals?: string[]
  /** Risk signals checked as "noticed this month". */
  observedRiskSignals?: string[]
}

/**
 * Persist a month's per-priority assessment as a `PeriodObjectReflection` row
 * (`periodType:'month'`, `subjectType:'priority'`). The `input` is the full desired state for
 * the priority (not a partial patch). A row carrying neither effort, verdict nor note is
 * meaningless, so it is deleted instead of stored.
 */
export async function setMonthlyPriorityAssessment(
  monthRef: MonthRef,
  priorityId: string,
  input: MonthlyPriorityAssessmentInput,
): Promise<void> {
  const note = input.note?.trim() ?? ''
  const progressSignals = dedupeSignals(input.observedProgressSignals)
  const riskSignals = dedupeSignals(input.observedRiskSignals)
  const hasContent =
    note.length > 0 ||
    input.effort != null ||
    input.verdict != null ||
    progressSignals.length > 0 ||
    riskSignals.length > 0

  if (!hasContent) {
    await reflectionDexieRepository.deletePeriodObjectReflection(
      'month',
      monthRef,
      'priority',
      priorityId,
    )
    return
  }

  await reflectionDexieRepository.upsertPeriodObjectReflection({
    periodType: 'month',
    periodRef: monthRef,
    subjectType: 'priority',
    subjectId: priorityId,
    note,
    effort: input.effort ?? null,
    verdict: input.verdict ?? null,
    observedProgressSignals: progressSignals.length > 0 ? progressSignals : undefined,
    observedRiskSignals: riskSignals.length > 0 ? riskSignals : undefined,
  })
}
