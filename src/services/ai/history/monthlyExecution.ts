import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasurementTarget } from '@/domain/planning'
import {
  applyMeasurementTargetCascade,
  buildMeasurementSummary,
  type MeasureableSubject,
} from '@/services/measurementProgress'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'
import { sourceKey, type HistorySource } from './contracts'
import { dayInZone } from './validation'
import type { HistorySnapshot } from './snapshot'

/** Uses accessible snapshot rows only. No narrative inference or synthetic measurements. */
export function summarizeMonthlyExecution(
  state: HistorySnapshot,
  source: HistorySource,
  subject: MeasureableSubject,
  month: MonthRef,
  timeZone: string,
  restricted: boolean
) {
  const bounds = getPeriodBounds(month)
  const today = dayInZone(state.asOf, timeZone) as DayRef
  const end = bounds.end < today ? bounds.end : today
  const related = state.sources.filter(s =>
    s.relatedRefs.some(r => sourceKey(r) === sourceKey(source.ref))
  )
  const rows = (collection: string) =>
    related.filter(s => s.ref.collection === collection).map(s => state.rows.get(sourceKey(s.ref))!)
  const entries = rows('dailyMeasurementEntries').filter(
    r => typeof r.dayRef === 'string' && r.dayRef >= bounds.start && r.dayRef <= end
  ) as unknown as DailyMeasurementEntry[]
  const assignments = rows('measurementDayAssignments').filter(
    r => typeof r.dayRef === 'string' && r.dayRef >= bounds.start && r.dayRef <= end
  )
  const monthStates = rows('measurementMonthStates').filter(r => r.monthRef === month)
  const weekStates = rows('measurementWeekStates')
  const monthState = monthStates[0]
  const weeks = getChildPeriods(month)
  const periods = subject.cadence === 'weekly' ? weeks : [month]
  const rawSubject = state.rows.get(sourceKey(source.ref))!
  const goalRef = source.relatedRefs.find(r => r.collection === 'goals')
  const goal = goalRef ? state.rows.get(sourceKey(goalRef)) : undefined
  const goalStates = goalRef
    ? state.sources.filter(
        s =>
          s.ref.collection === 'goalMonthStates' &&
          s.relatedRefs.some(r => sourceKey(r) === sourceKey(goalRef)) &&
          state.rows.get(sourceKey(s.ref))?.monthRef === month
      )
    : []
  const goalPaused = goalStates.some(
    s => state.rows.get(sourceKey(s.ref))?.activityState === 'paused'
  )
  const savedBefore = (row: Record<string, unknown>, day: DayRef) =>
    typeof row.updatedAt === 'string' &&
    dayInZone(row.updatedAt, timeZone) <= day &&
    typeof row.createdAt === 'string' &&
    dayInZone(row.createdAt, timeZone) <= day
  const fullPeriods = periods.map(period => {
    const pb = getPeriodBounds(period)
    const boundary = pb.start < bounds.start || pb.end > bounds.end
    const inProgress = pb.start <= today && today <= pb.end
    const future = pb.start > today
    const selectedWeeks = weekStates.filter(
      r => r.weekRef === period && (!r.sourceMonthRef || r.sourceMonthRef === month)
    )
    const globalWeeks = selectedWeeks.filter(r => !r.sourceMonthRef)
    const applicableWeeks = globalWeeks.length ? globalWeeks : selectedWeeks
    const weekState = subject.cadence === 'weekly' ? applicableWeeks[0] : undefined
    const monthlyPauses =
      subject.cadence === 'monthly' &&
      weekStates.some(
        r =>
          weeks.includes(r.weekRef as WeekRef) &&
          (!r.sourceMonthRef || r.sourceMonthRef === month) &&
          r.activityState === 'paused'
      )
    const effective = applyMeasurementTargetCascade(subject, period, {
      monthOverride: monthState?.targetOverride as MeasurementTarget | undefined,
      weekOverride: weekState?.targetOverride as MeasurementTarget | undefined,
    })
    // Entries were clipped to the calendar month first. Boundary values never include adjacent months.
    const summary = buildMeasurementSummary(effective, entries, period, end)
    const partialLifetime =
      dayInZone(subject.createdAt, timeZone) > pb.start ||
      (typeof goal?.startDate === 'string' && goal.startDate > pb.start)
    const active =
      weekState?.activityState === 'active' ||
      monthState?.activityState === 'active' ||
      (source.ref.collection === 'weeklyIntentions' && rawSubject.weekRef === period)
    const paused =
      goalPaused ||
      monthState?.activityState === 'paused' ||
      weekState?.activityState === 'paused' ||
      monthlyPauses
    const historicalSettingsKnown =
      savedBefore(rawSubject, pb.start) &&
      goalStates.every(s => savedBefore(state.rows.get(sourceKey(s.ref))!, pb.start)) &&
      (!monthState || savedBefore(monthState, pb.start)) &&
      (!weekState || savedBefore(weekState, pb.start)) &&
      (!goal || savedBefore(goal, pb.start)) &&
      subject.isActive !== false &&
      (!('status' in subject) || subject.status === 'open') &&
      (!goal || (goal.status === 'open' && goal.isActive !== false))
    const reason = restricted
      ? 'access-restricted'
      : source.ref.collection === 'weeklyIntentions' && rawSubject.weekRef !== period
        ? 'outside-intention-week'
        : boundary
          ? 'boundary-period'
          : future
            ? 'future-period'
            : inProgress
              ? 'in-progress'
              : partialLifetime
                ? 'partial-lifetime'
                : monthStates.length > 1 || applicableWeeks.length > 1 || goalStates.length > 1
                  ? 'ambiguous-settings'
                  : paused
                    ? 'inactive-or-paused'
                    : !active
                      ? 'activity-unknown'
                      : !historicalSettingsKnown
                        ? 'historical-settings-unknown'
                        : !summary.target
                          ? 'not-targeted'
                          : summary.evaluationStatus === 'no-data'
                            ? 'no-records'
                            : 'eligible'
    const comparison = restricted
      ? 'not-evaluated-restricted'
      : summary.evaluationStatus === 'missed'
        ? 'below-target-in-records'
        : (summary.evaluationStatus ?? 'not-targeted')
    return {
      periodRef: period,
      from: pb.start < bounds.start ? bounds.start : pb.start,
      to:
        end < (pb.start < bounds.start ? bounds.start : pb.start)
          ? null
          : pb.end > end
            ? end
            : pb.end,
      boundary,
      inProgress,
      future,
      eligible: reason === 'eligible',
      reason,
      entryCount: summary.entryCount,
      actualValue: summary.actualValue ?? null,
      target: restricted ? null : (summary.target ?? null),
      comparison,
      evaluation: reason === 'eligible' ? comparison : 'not-evaluated',
      targetBasis: historicalSettingsKnown ? 'saved-before-period' : 'current-definition-only',
    }
  })
  // A weekly threshold is not a monthly threshold. This aggregate describes recorded values only.
  const calendarSubject =
    subject.cadence === 'monthly'
      ? applyMeasurementTargetCascade(subject, month, {
          monthOverride: monthState?.targetOverride as MeasurementTarget | undefined,
        })
      : subject
  const calendar = buildMeasurementSummary(calendarSubject, entries, month, end)
  const eligible = fullPeriods.filter(p => p.eligible)
  const evidence = related.filter(s => {
    const row = state.rows.get(sourceKey(s.ref))!
    return s.ref.collection === 'dailyMeasurementEntries'
      ? entries.some(e => e.id === row.id)
      : s.ref.collection === 'measurementDayAssignments'
        ? assignments.some(a => a.id === row.id)
        : s.ref.collection === 'measurementMonthStates'
          ? row.monthRef === month
          : s.ref.collection === 'measurementWeekStates'
            ? weeks.includes(row.weekRef as WeekRef) &&
              (!row.sourceMonthRef || row.sourceMonthRef === month)
            : false
  })
  const goalSource = goalRef && state.sources.find(s => sourceKey(s.ref) === sourceKey(goalRef))
  if (goalSource) evidence.push(goalSource)
  evidence.push(...goalStates)
  const scheduled = [...new Set(assignments.map(r => r.dayRef as string))]
  const logged = new Set(entries.map(e => e.dayRef as string))
  return {
    ref: source.ref,
    status: 'ok' as const,
    title: source.title,
    subjectVersion: source.version,
    periodRef: month,
    cadence: subject.cadence,
    entryMode: subject.entryMode,
    actualValue: calendar.actualValue ?? null,
    entryCount: calendar.entryCount,
    calendarMeasurements: {
      from: bounds.start,
      throughDay: end < bounds.start ? null : end,
      actualValue: calendar.actualValue ?? null,
      entryCount: calendar.entryCount,
      basis: 'recorded-days-in-month-current-definition',
    },
    target: subject.cadence === 'monthly' ? (fullPeriods[0]?.target ?? null) : null,
    evaluation:
      subject.cadence === 'monthly' ? fullPeriods[0]?.evaluation : 'see-qualified-periods',
    qualifiedPeriods: {
      met: eligible.filter(p => p.evaluation === 'met').length,
      evaluated: eligible.length,
      rule: 'Only closed periods wholly inside the month, active for the period with settings saved by its start, a target and at least one recorded measurement. Missing logs are unknown. This is achievement in records, not proof of all activity.',
    },
    periods: fullPeriods,
    coverage: restricted ? 'access-restricted' : 'accessible-records',
    periodComplete: today > bounds.end,
    scheduledDays: scheduled.length,
    scheduledDaysWithRecord: scheduled.filter(d => logged.has(d)).length,
    scheduledDaysWithoutRecord: scheduled.filter(d => !logged.has(d)).length,
    sources: evidence.slice(0, 100).map(s => ({ ref: s.ref, version: s.version })),
    sourcesTruncated: evidence.length > 100,
    note: 'Current definitions may not reconstruct historical thresholds, weights, cadence or retirement dates. Non-eligible comparisons are illustrative only, never historical achievements. Missing records are unknown; narratives are separate and cannot increment measurements. Partial weeks are not prorated or counted twice.',
  }
}
