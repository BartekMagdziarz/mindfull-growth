import type { Habit, KeyResult, MeasurementEntryMode, MeasurementTarget, MultiCompletionItem, PlanningCadence, Tracker, WeeklyIntention } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import { getPeriodRefsForDate, getPeriodType } from '@/utils/periods'

export type MeasurementPeriodRef = MonthRef | WeekRef
export type MeasurementEvaluationStatus = 'met' | 'missed' | 'no-data'
export type MeasureableSubject = KeyResult | Habit | Tracker | WeeklyIntention

export const ON_TRACK_BANDS = {
  AHEAD: 0.75,
  ON_TRACK: 0.5,
} as const

export const TRACKER_TREND_DEADBAND_PCT = 0.05
export const EXECUTION_METRICS_MAX_PERIODS = 12

export interface MeasurementSummary {
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target?: MeasurementTarget
  actualValue?: number
  evaluationStatus?: MeasurementEvaluationStatus
  entryCount: number
  periodRef: MeasurementPeriodRef
  /**
   * Conjunction breakdown + qualified-day count — set only when the effective
   * target defines an `entryDays` condition. `evaluationStatus === 'met'` ⟺
   * `primaryMet && presenceMet`; zero entries still yield 'no-data' and leave
   * primaryMet/presenceMet undefined.
   */
  primaryMet?: boolean
  presenceMet?: boolean
  qualifiedEntryDays?: number
}

export function applyMeasurementTargetOverride(
  subject: MeasureableSubject,
  targetOverride?: MeasurementTarget
): MeasureableSubject {
  if (!targetOverride || !('target' in subject)) {
    return subject
  }

  return {
    ...subject,
    target: targetOverride,
  }
}

/**
 * Resolves the effective target for evaluating `subject` over `periodRef`.
 * Week periods cascade week override → month override → base target;
 * month periods only ever see the month override — a week sub-target must
 * never leak into month-level evaluation.
 */
export function applyMeasurementTargetCascade(
  subject: MeasureableSubject,
  periodRef: MeasurementPeriodRef,
  overrides: { monthOverride?: MeasurementTarget; weekOverride?: MeasurementTarget }
): MeasureableSubject {
  const effectiveOverride =
    getPeriodType(periodRef) === 'week'
      ? overrides.weekOverride ?? overrides.monthOverride
      : overrides.monthOverride

  return applyMeasurementTargetOverride(subject, effectiveOverride)
}

function filterEntriesForSubjectAndPeriod(
  entries: DailyMeasurementEntry[],
  subjectId: string,
  periodRef: MeasurementPeriodRef,
  asOfDayRef?: DayRef,
): DailyMeasurementEntry[] {
  const periodType = getPeriodType(periodRef)
  return entries.filter((entry) => {
    if (entry.subjectId !== subjectId) return false
    if (asOfDayRef !== undefined && entry.dayRef > asOfDayRef) return false
    const refs = getPeriodRefsForDate(entry.dayRef)
    return periodType === 'week' ? refs.week === periodRef : refs.month === periodRef
  })
}

function sumEntryValues(entries: DailyMeasurementEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
}

function averageEntryValues(entries: DailyMeasurementEntry[]): number | undefined {
  if (entries.length === 0) {
    return undefined
  }

  return sumEntryValues(entries) / entries.length
}

function lastEntryValue(entries: DailyMeasurementEntry[]): number | undefined {
  if (entries.length === 0) {
    return undefined
  }

  return [...entries].sort((left, right) => left.dayRef.localeCompare(right.dayRef)).at(-1)?.value ?? undefined
}

/** Non-archived multi-completion items, in stored order. */
export function multiCompletionActiveItems(subject: MeasureableSubject): MultiCompletionItem[] {
  return (subject.multiItems ?? []).filter((item) => !item.archived)
}

/**
 * Effective daily points threshold. Undefined stored threshold means "all
 * active items" and follows the current item list; an explicit threshold is
 * clamped to [1, sum of active weights] so it cannot go stale above the
 * reachable maximum after items are archived or weights lowered.
 */
export function multiCompletionEffectiveThreshold(subject: MeasureableSubject): number {
  const activeWeightSum = multiCompletionActiveItems(subject).reduce(
    (sum, item) => sum + item.weight,
    0,
  )
  const reachableMax = Math.max(activeWeightSum, 1)
  return Math.min(Math.max(subject.multiDailyThreshold ?? reachableMax, 1), reachableMax)
}

/**
 * Points earned on a day = sum of CURRENT weights of the checked items
 * (live-recompute contract: editing weights re-scores history). Archived items
 * still resolve; ids no longer present contribute nothing.
 */
export function multiCompletionDayPoints(
  subject: MeasureableSubject,
  entry: DailyMeasurementEntry,
): number {
  const weightById = new Map((subject.multiItems ?? []).map((item) => [item.id, item.weight]))
  return (entry.checkedItemIds ?? []).reduce((sum, id) => sum + (weightById.get(id) ?? 0), 0)
}

export function multiCompletionDayMet(
  subject: MeasureableSubject,
  entry: DailyMeasurementEntry,
): boolean {
  return multiCompletionDayPoints(subject, entry) >= multiCompletionEffectiveThreshold(subject)
}

function computeActualValue(
  subject: MeasureableSubject,
  entries: DailyMeasurementEntry[],
): number | undefined {
  if (entries.length === 0) {
    return undefined
  }

  switch (subject.entryMode) {
    case 'completion':
      return entries.length
    case 'counter':
      return sumEntryValues(entries)
    case 'value': {
      const aggregation =
        'target' in subject && subject.target.kind === 'value' ? subject.target.aggregation : 'last'
      switch (aggregation) {
        case 'sum':
          return sumEntryValues(entries)
        case 'average':
          return averageEntryValues(entries)
        case 'last':
          return lastEntryValue(entries)
      }
      break
    }
    case 'rating':
      return averageEntryValues(entries)
    case 'multi-completion':
      // The aggregate is the number of MET days (daily points threshold
      // reached), not the number of entries — partial days don't count.
      return entries.filter((entry) => multiCompletionDayMet(subject, entry)).length
  }
}

function compareActualToTarget(actualValue: number, target: MeasurementTarget): boolean {
  switch (target.kind) {
    case 'count':
      return target.operator === 'min' ? actualValue >= target.value : actualValue <= target.value
    case 'value':
    case 'rating':
      return target.operator === 'gte' ? actualValue >= target.value : actualValue <= target.value
  }
}

/**
 * Days that count toward the entryDays condition. Entries are unique per
 * (subject, day), so entries map 1:1 to days. A qualifying day is any day with
 * an entry, except for counters where an explicitly logged zero is not an
 * execution — only entries with value >= 1 qualify. Multi-completion entries
 * always qualify (an entry exists only with at least one checked item), even
 * when the day stays below the daily threshold.
 */
function countQualifiedEntryDays(
  entryMode: MeasurementEntryMode,
  entries: DailyMeasurementEntry[],
): number {
  if (entryMode === 'counter') {
    return entries.filter((entry) => (entry.value ?? 0) >= 1).length
  }
  return entries.length
}

function compareEntryDays(
  qualifiedDays: number,
  condition: NonNullable<MeasurementTarget['entryDays']>,
): boolean {
  return condition.operator === 'min'
    ? qualifiedDays >= condition.value
    : qualifiedDays <= condition.value
}

export function buildMeasurementSummary(
  subject: MeasureableSubject,
  allEntries: DailyMeasurementEntry[],
  periodRef: MeasurementPeriodRef,
  asOfDayRef?: DayRef,
): MeasurementSummary {
  /*
   * Measurement contract:
   * - Period bounds are inclusive by canonical dayRef.
   * - Weekly buckets come from getPeriodRefsForDate(dayRef).week.
   * - Monthly buckets come from getPeriodRefsForDate(dayRef).month.
   * - asOfDayRef, when provided, additionally drops entries with dayRef > asOfDayRef
   *   so the summary reflects cumulative state through that day. Callers use this
   *   to scope display aggregates to the time-context they are rendered in
   *   (today in the Today view, end of the displayed week in weekly views).
   * - completion counts entries in the period.
   * - counter sums entry values, treating null as 0.
   * - value uses the target aggregation: sum, average, or last.
   * - rating uses the arithmetic average.
   * - multi-completion counts MET days: entries whose checked-item points
   *   (current weights) reach the effective daily threshold. Points, threshold
   *   and thus historical met-status are recomputed live from the subject's
   *   current multiItems/multiDailyThreshold.
   * - No period entries produce actualValue undefined.
   * - Subjects with a target evaluate to met, missed, or no-data.
   * - Trackers without a target leave evaluationStatus undefined.
   * - Targets with an entryDays condition evaluate as a conjunction: the
   *   primary metric AND the qualified-day count must both hold for 'met'.
   *   Zero entries stay 'no-data' (also under a max condition), matching the
   *   behaviour of targets without the condition.
   */
  const entries = filterEntriesForSubjectAndPeriod(allEntries, subject.id, periodRef, asOfDayRef)
  const actualValue = computeActualValue(subject, entries)
  const target = 'target' in subject ? subject.target : undefined
  const entryDaysCondition = target?.entryDays
  const qualifiedEntryDays = entryDaysCondition
    ? countQualifiedEntryDays(subject.entryMode, entries)
    : undefined

  let evaluationStatus: MeasurementEvaluationStatus | undefined
  let primaryMet: boolean | undefined
  let presenceMet: boolean | undefined
  if (target) {
    if (actualValue === undefined) {
      evaluationStatus = 'no-data'
    } else if (entryDaysCondition && qualifiedEntryDays !== undefined) {
      primaryMet = compareActualToTarget(actualValue, target)
      presenceMet = compareEntryDays(qualifiedEntryDays, entryDaysCondition)
      evaluationStatus = primaryMet && presenceMet ? 'met' : 'missed'
    } else {
      evaluationStatus = compareActualToTarget(actualValue, target) ? 'met' : 'missed'
    }
  }

  return {
    entryMode: subject.entryMode,
    cadence: subject.cadence,
    target,
    actualValue,
    evaluationStatus,
    entryCount: entries.length,
    periodRef,
    primaryMet,
    presenceMet,
    qualifiedEntryDays,
  }
}
