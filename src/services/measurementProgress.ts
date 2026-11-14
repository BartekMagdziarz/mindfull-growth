import type {
  Habit,
  KeyResult,
  MeasurementEntryMode,
  MeasurementTarget,
  MultiCompletionItem,
  PlanningCadence,
  Tracker,
  WeeklyIntention,
} from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import { getPeriodBounds, getPeriodRefsForDate, getPeriodType } from '@/utils/periods'

export type MeasurementPeriodRef = MonthRef | WeekRef
export type MeasurementEvaluationStatus = 'met' | 'missed' | 'no-data'
import { resolveMeasurementCriteria, type CriteriaDefinition } from '@/domain/measurementCriteria'

export interface MeasurementDefinition extends CriteriaDefinition {
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  /** Read-only override metadata; never persisted by object normalizers. */
  measurementTargetOverride?: MeasurementTarget
}
export type MeasurementEntry = Pick<DailyMeasurementEntry, 'dayRef' | 'value' | 'checkedItemIds'>

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
): MeasureableSubject & { measurementTargetOverride?: MeasurementTarget } {
  if (!targetOverride || !('target' in subject)) {
    return subject
  }

  return {
    ...subject,
    target: targetOverride,
    measurementTargetOverride: targetOverride,
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
): MeasureableSubject & { measurementTargetOverride?: MeasurementTarget } {
  const effectiveOverride =
    getPeriodType(periodRef) === 'week'
      ? (overrides.weekOverride ?? overrides.monthOverride)
      : overrides.monthOverride

  return applyMeasurementTargetOverride(
    resolveMeasurementCriteria(subject, getPeriodBounds(periodRef).start),
    effectiveOverride
  )
}

function filterEntriesForSubjectAndPeriod(
  entries: DailyMeasurementEntry[],
  subjectId: string,
  periodRef: MeasurementPeriodRef,
  asOfDayRef?: DayRef
): DailyMeasurementEntry[] {
  const periodType = getPeriodType(periodRef)
  return entries.filter(entry => {
    if (entry.subjectId !== subjectId) return false
    if (asOfDayRef !== undefined && entry.dayRef > asOfDayRef) return false
    const refs = getPeriodRefsForDate(entry.dayRef)
    return periodType === 'week' ? refs.week === periodRef : refs.month === periodRef
  })
}

function sumEntryValues(entries: MeasurementEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
}

function averageEntryValues(entries: MeasurementEntry[]): number | undefined {
  if (entries.length === 0) {
    return undefined
  }

  return sumEntryValues(entries) / entries.length
}

function lastEntryValue(entries: MeasurementEntry[]): number | undefined {
  if (entries.length === 0) {
    return undefined
  }

  return (
    [...entries].sort((left, right) => left.dayRef.localeCompare(right.dayRef)).at(-1)?.value ??
    undefined
  )
}

/** Non-archived multi-completion items, in stored order. */
export function multiCompletionActiveItems(
  subject: CriteriaDefinition,
  dayRef?: DayRef
): MultiCompletionItem[] {
  const effective = dayRef ? resolveMeasurementCriteria(subject, dayRef) : subject
  return (effective.multiItems ?? []).filter(item => !item.archived)
}

/**
 * Effective daily points threshold. Undefined stored threshold means "all
 * active items" and follows the current item list; an explicit threshold is
 * clamped to [1, sum of active weights] so it cannot go stale above the
 * reachable maximum after items are archived or weights lowered.
 */
export function multiCompletionEffectiveThreshold(
  subject: CriteriaDefinition,
  dayRef?: DayRef
): number {
  const effective = dayRef ? resolveMeasurementCriteria(subject, dayRef) : subject
  const activeWeightSum = multiCompletionActiveItems(effective).reduce(
    (sum, item) => sum + item.weight,
    0
  )
  const reachableMax = Math.max(activeWeightSum, 1)
  return Math.min(Math.max(effective.multiDailyThreshold ?? reachableMax, 1), reachableMax)
}

/**
 * Points earned on a day use the criteria version effective on that date.
 * Versionless legacy objects use their current definition. Archived items
 * still resolve; ids no longer present contribute nothing.
 */
export function multiCompletionDayPoints(
  subject: CriteriaDefinition,
  entry: MeasurementEntry
): number {
  const effective = resolveMeasurementCriteria(subject, entry.dayRef)
  const weightById = new Map((effective.multiItems ?? []).map(item => [item.id, item.weight]))
  return (entry.checkedItemIds ?? []).reduce((sum, id) => sum + (weightById.get(id) ?? 0), 0)
}

export function multiCompletionDayMet(
  subject: CriteriaDefinition,
  entry: MeasurementEntry
): boolean {
  return (
    multiCompletionDayPoints(subject, entry) >=
    multiCompletionEffectiveThreshold(subject, entry.dayRef)
  )
}

function computeActualValue(
  subject: MeasurementDefinition,
  entries: MeasurementEntry[]
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
      const aggregation = subject.target?.kind === 'value' ? subject.target.aggregation : 'last'
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
      return entries.filter(entry => multiCompletionDayMet(subject, entry)).length
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
export function countQualifiedEntryDays(
  entryMode: MeasurementEntryMode,
  entries: MeasurementEntry[]
): number {
  if (entryMode === 'counter') {
    return entries.filter(entry => (entry.value ?? 0) >= 1).length
  }
  return entries.length
}

function compareEntryDays(
  qualifiedDays: number,
  condition: NonNullable<MeasurementTarget['entryDays']>
): boolean {
  return condition.operator === 'min'
    ? qualifiedDays >= condition.value
    : qualifiedDays <= condition.value
}

export function buildMeasurementSummary(
  subject: MeasureableSubject & { measurementTargetOverride?: MeasurementTarget },
  allEntries: DailyMeasurementEntry[],
  periodRef: MeasurementPeriodRef,
  asOfDayRef?: DayRef
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
   *   reach the daily threshold in the criteria version for their date.
   *   Versionless legacy objects fall back to the current definition.
   * - Targets and value aggregation use the criteria at the period start;
   *   explicit period overrides keep priority over the versioned base target.
   * - No period entries produce actualValue undefined.
   * - Subjects with a target evaluate to met, missed, or no-data.
   * - Trackers without a target leave evaluationStatus undefined.
   * - Targets with an entryDays condition evaluate as a conjunction: the
   *   primary metric AND the qualified-day count must both hold for 'met'.
   *   Zero entries stay 'no-data' (also under a max condition), matching the
   *   behaviour of targets without the condition.
   */
  const entries = filterEntriesForSubjectAndPeriod(allEntries, subject.id, periodRef, asOfDayRef)
  return {
    ...summarizeMeasurementEntries(subject, entries, getPeriodBounds(periodRef).start),
    periodRef,
  }
}

/** Shared evaluation for planners, object charts and calendar projections. */
export function summarizeMeasurementEntries(
  definition: MeasurementDefinition,
  entries: MeasurementEntry[],
  periodStart: DayRef
): Omit<MeasurementSummary, 'periodRef'> {
  const resolved = resolveMeasurementCriteria(definition, periodStart)
  const subject = definition.measurementTargetOverride
    ? { ...resolved, target: definition.measurementTargetOverride }
    : resolved
  const actualValue = computeActualValue(subject, entries)
  const target = subject.target
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
    primaryMet,
    presenceMet,
    qualifiedEntryDays,
  }
}
