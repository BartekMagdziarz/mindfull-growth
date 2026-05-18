import type { Habit, KeyResult, MeasurementEntryMode, MeasurementTarget, PlanningCadence, Tracker } from '@/domain/planning'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import { getPeriodRefsForDate, getPeriodType } from '@/utils/periods'

export type MeasurementPeriodRef = MonthRef | WeekRef
export type MeasurementEvaluationStatus = 'met' | 'missed' | 'no-data'
export type MeasureableSubject = KeyResult | Habit | Tracker

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

function filterEntriesForSubjectAndPeriod(
  entries: DailyMeasurementEntry[],
  subjectId: string,
  periodRef: MeasurementPeriodRef,
): DailyMeasurementEntry[] {
  const periodType = getPeriodType(periodRef)
  return entries.filter((entry) => {
    if (entry.subjectId !== subjectId) return false
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

export function buildMeasurementSummary(
  subject: MeasureableSubject,
  allEntries: DailyMeasurementEntry[],
  periodRef: MeasurementPeriodRef,
): MeasurementSummary {
  /*
   * Measurement contract:
   * - Period bounds are inclusive by canonical dayRef.
   * - Weekly buckets come from getPeriodRefsForDate(dayRef).week.
   * - Monthly buckets come from getPeriodRefsForDate(dayRef).month.
   * - completion counts entries in the period.
   * - counter sums entry values, treating null as 0.
   * - value uses the target aggregation: sum, average, or last.
   * - rating uses the arithmetic average.
   * - No period entries produce actualValue undefined.
   * - Subjects with a target evaluate to met, missed, or no-data.
   * - Trackers without a target leave evaluationStatus undefined.
   */
  const entries = filterEntriesForSubjectAndPeriod(allEntries, subject.id, periodRef)
  const actualValue = computeActualValue(subject, entries)
  const target = 'target' in subject ? subject.target : undefined

  return {
    entryMode: subject.entryMode,
    cadence: subject.cadence,
    target,
    actualValue,
    evaluationStatus: target
      ? actualValue === undefined
        ? 'no-data'
        : compareActualToTarget(actualValue, target)
          ? 'met'
          : 'missed'
      : undefined,
    entryCount: entries.length,
    periodRef,
  }
}
