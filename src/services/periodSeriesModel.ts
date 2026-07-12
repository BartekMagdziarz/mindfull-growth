import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasurementSummary, MeasureableSubject } from '@/services/measurementProgress'
import { multiCompletionDayMet } from '@/services/measurementProgress'

export type PeriodColumnPhase = 'past' | 'current' | 'future'
export type PeriodColumnStatus = 'met' | 'missed' | 'no-data' | 'in-progress'

export interface PeriodSeriesDatumLike {
  actualValue?: number
  targetValue?: number
  entryCount: number
}

export interface PeriodNumericScale {
  min: number
  max: number
}

export interface PeriodScaleOptions {
  includeZero?: boolean
  fixedMin?: number
  fixedMax?: number
  extraValues?: number[]
}

function hasData(datum: PeriodSeriesDatumLike): boolean {
  return datum.actualValue !== undefined || datum.entryCount > 0
}

export function periodColumnStatus(
  phase: PeriodColumnPhase,
  contributionOnly: boolean,
  datum: PeriodSeriesDatumLike,
  evaluationStatus?: MeasurementSummary['evaluationStatus']
): PeriodColumnStatus {
  if (contributionOnly || phase !== 'past') return hasData(datum) ? 'in-progress' : 'no-data'
  return evaluationStatus ?? (hasData(datum) ? 'in-progress' : 'no-data')
}

export function measurementValueAggregation(subject: MeasureableSubject): 'sum' | 'average' | 'last' {
  return 'target' in subject && subject.target?.kind === 'value' ? subject.target.aggregation : 'last'
}

/** Neutral aggregate over any explicit entry slice (day, week or month fragment). */
export function computePeriodContribution(
  subject: MeasureableSubject,
  entries: DailyMeasurementEntry[]
): number | undefined {
  if (entries.length === 0) return undefined
  switch (subject.entryMode) {
    case 'completion': return entries.length
    case 'counter': return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
    case 'rating': return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0) / entries.length
    case 'multi-completion': return entries.filter((entry) => multiCompletionDayMet(subject, entry)).length
    case 'value': {
      const aggregation = measurementValueAggregation(subject)
      if (aggregation === 'sum') return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
      if (aggregation === 'average') return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0) / entries.length
      return [...entries].sort((a, b) => a.dayRef.localeCompare(b.dayRef)).at(-1)?.value ?? undefined
    }
  }
}

export function periodNumericScale(
  data: PeriodSeriesDatumLike[],
  options: PeriodScaleOptions = {}
): PeriodNumericScale {
  const values = [...(options.extraValues ?? [])]
  for (const datum of data) {
    if (datum.actualValue !== undefined) values.push(datum.actualValue)
    if (datum.targetValue !== undefined) values.push(datum.targetValue)
  }
  if (options.includeZero) values.push(0)
  let min = values.length ? Math.min(...values) : 0
  let max = values.length ? Math.max(...values) : 1
  if (options.fixedMin !== undefined) min = options.fixedMin
  if (options.fixedMax !== undefined) max = options.fixedMax
  if (min === max) max = min + 1
  return { min, max }
}
