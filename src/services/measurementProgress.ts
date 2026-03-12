import type { Habit, KeyResult, MeasurementEntryMode, MeasurementTarget, PlanningCadence, Tracker } from '@/domain/planning'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import { getPeriodRefsForDate, getPeriodType } from '@/utils/periods'

export type MeasurementPeriodRef = MonthRef | WeekRef
export type MeasurementEvaluationStatus = 'met' | 'missed' | 'no-data'
export type MeasureableSubject = KeyResult | Habit | Tracker

export interface MeasurementSummary {
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target?: MeasurementTarget
  actualValue?: number
  evaluationStatus?: MeasurementEvaluationStatus
  entryCount: number
  periodRef: MeasurementPeriodRef
}

function filterEntriesForPeriod(
  entries: DailyMeasurementEntry[],
  periodRef: MeasurementPeriodRef,
): DailyMeasurementEntry[] {
  const periodType = getPeriodType(periodRef)
  return entries.filter((entry) => {
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
  const entries = filterEntriesForPeriod(allEntries, periodRef)
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
