import { summarizeMonthlyExecution } from './monthlyExecution'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasurementTarget } from '@/domain/planning'
import {
  applyMeasurementTargetCascade,
  buildMeasurementSummary,
  type MeasureableSubject,
} from '@/services/measurementProgress'
import {
  assertPeriodRef,
  getPeriodBounds,
  getPeriodType,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import { LIMITS, sourceKey, type SourceRef } from './contracts'
import { validateRef } from './access'
import { dayInZone, invalid } from './validation'
import type { HistorySnapshot } from './snapshot'

export interface ExecutionSummaryInput {
  subjects: SourceRef[]
  periodRef: string
  sourceMonthRef?: string
}
export function summarizeExecution(
  state: HistorySnapshot,
  input: ExecutionSummaryInput,
  timeZone: string
) {
  if (
    !input ||
    !Array.isArray(input.subjects) ||
    !input.subjects.length ||
    input.subjects.length > LIMITS.executionSubjects
  )
    invalid('Expected 1–10 measurement subjects')
  for (const ref of input.subjects) {
    validateRef(ref)
    if (!['habits', 'keyResults', 'trackers', 'weeklyIntentions'].includes(ref.collection))
      invalid('Expected a measurement subject')
  }
  if (typeof input.periodRef !== 'string') invalid('Expected a period reference')
  try {
    assertPeriodRef(input.periodRef)
  } catch {
    return invalid('Invalid period reference')
  }
  const periodType = getPeriodType(input.periodRef)
  if (periodType !== 'week' && periodType !== 'month')
    invalid('Only week and month periods are supported')
  if (input.sourceMonthRef !== undefined) {
    if (typeof input.sourceMonthRef !== 'string') invalid('Invalid source month')
    try {
      assertPeriodRef(input.sourceMonthRef)
    } catch {
      return invalid('Invalid source month')
    }
    if (getPeriodType(input.sourceMonthRef) !== 'month') invalid('Expected a month reference')
  }
  const period = input.periodRef as WeekRef | MonthRef
  const bounds = getPeriodBounds(period)
  const asOfDay = dayInZone(state.asOf, timeZone) as DayRef
  const endDay = bounds.end < asOfDay ? bounds.end : asOfDay
  const months =
    periodType === 'week' ? getWeekOverlappingMonths(period as WeekRef) : [period as MonthRef]
  if (input.sourceMonthRef && !months.includes(input.sourceMonthRef as MonthRef))
    invalid('Source month does not overlap the period')
  // Avoid drawing a completeness claim from an access-filtered set. The policy
  // itself determines this flag; we do not report counts of hidden records.
  const restricted =
    state.policy.excludedKinds.some(k => ['planning', 'measurement'].includes(k)) ||
    state.policy.excludedSources.some(r =>
      [
        'dailyMeasurementEntries',
        'measurementDayAssignments',
        'measurementMonthStates',
        'measurementWeekStates',
        'goalMonthStates',
      ].includes(r.collection)
    )
  const items = input.subjects.map(ref => {
    const source = state.sources.find(s => sourceKey(s.ref) === sourceKey(ref))
    const rawSubject = state.rows.get(sourceKey(ref))
    if (!source || !rawSubject) return { ref, status: 'unavailable' as const }
    const subject = rawSubject as unknown as MeasureableSubject
    if (periodType === 'month')
      return summarizeMonthlyExecution(
        state,
        source,
        subject,
        period as MonthRef,
        timeZone,
        restricted
      )
    if ((periodType === 'week' ? 'weekly' : 'monthly') !== subject.cadence) {
      return { ref, status: 'cadence-mismatch' as const, cadence: subject.cadence }
    }
    const related = state.sources.filter(s =>
      s.relatedRefs.some(r => sourceKey(r) === sourceKey(ref))
    )
    const monthStates = related
      .filter(s => s.ref.collection === 'measurementMonthStates')
      .map(s => state.rows.get(sourceKey(s.ref))!)
      .filter(row => months.includes(row.monthRef as MonthRef) && row.activityState === 'active')
    const choices = input.sourceMonthRef
      ? monthStates.filter(r => r.monthRef === input.sourceMonthRef)
      : monthStates
    const weekState = related
      .filter(s => s.ref.collection === 'measurementWeekStates')
      .map(s => state.rows.get(sourceKey(s.ref))!)
      .find(row => row.weekRef === period && !row.sourceMonthRef)
    // Boundary weeks with conflicting monthly overrides need a caller choice,
    // not an arbitrary selection of whichever row the DB returned first.
    if (
      !input.sourceMonthRef &&
      !weekState?.targetOverride &&
      new Set(choices.map(r => JSON.stringify(r.targetOverride ?? null))).size > 1
    ) {
      return {
        ref,
        status: 'ambiguous-month' as const,
        months: choices.map(r => r.monthRef as string),
      }
    }
    const effective = applyMeasurementTargetCascade(subject, period, {
      monthOverride: choices[0]?.targetOverride as MeasurementTarget | undefined,
      weekOverride: weekState?.targetOverride as MeasurementTarget | undefined,
    })
    const entries = related
      .filter(s => s.ref.collection === 'dailyMeasurementEntries')
      .map(s => state.rows.get(sourceKey(s.ref))! as unknown as DailyMeasurementEntry)
      .filter(row => row.dayRef >= bounds.start && row.dayRef <= endDay)
    const summary = buildMeasurementSummary(effective, entries, period, endDay)
    const assignments = related
      .filter(s => s.ref.collection === 'measurementDayAssignments')
      .map(s => state.rows.get(sourceKey(s.ref))!)
      .filter(
        row => typeof row.dayRef === 'string' && row.dayRef >= bounds.start && row.dayRef <= endDay
      )
    const loggedDays = new Set(entries.map(e => e.dayRef))
    const assignedDays = [...new Set(assignments.map(row => row.dayRef as string))].sort()
    const inProgress = asOfDay <= bounds.end
    const evaluation = restricted
      ? 'not-evaluated-restricted'
      : summary.evaluationStatus === 'missed'
        ? inProgress
          ? 'not-yet-met'
          : 'below-target-in-records'
        : (summary.evaluationStatus ?? 'not-targeted')
    const evidence = related.filter(s => {
      const row = state.rows.get(sourceKey(s.ref))!
      return s.ref.collection === 'dailyMeasurementEntries'
        ? entries.some(e => e.id === row.id)
        : s.ref.collection === 'measurementDayAssignments'
          ? assignments.some(a => a.id === row.id)
          : row.weekRef === period || months.includes(row.monthRef as MonthRef)
    })
    return {
      ref,
      status: 'ok' as const,
      title: source.title,
      subjectVersion: source.version,
      periodRef: period,
      entryMode: summary.entryMode,
      actualValue: summary.actualValue ?? null,
      entryCount: summary.entryCount,
      target: restricted ? null : (summary.target ?? null),
      evaluation,
      coverage: restricted ? 'access-restricted' : 'accessible-records',
      periodComplete: asOfDay > bounds.end,
      scheduledDays: assignedDays.length,
      scheduledDaysWithRecord: assignedDays.filter(day => loggedDays.has(day as DayRef)).length,
      scheduledDaysWithoutRecord: assignedDays.filter(day => !loggedDays.has(day as DayRef)).length,
      sources: evidence.slice(0, 60).map(s => ({ ref: s.ref, version: s.version })),
      sourcesTruncated: evidence.length > 60,
      note: 'Missing records are unknown, not proof of inaction. Values use recorded measurements and current subject definitions. Scheduled days are explicit assignments, not inferred targets.',
    }
  })
  return { items, periodRef: period, throughDay: endDay }
}
