/**
 * Data builders for the **weekly-slice** chart scope (currently consumed by
 * the weekly reflection grid). Sibling to {@link todayChartData} — uses its
 * slot builders for the chart body but adds:
 *
 *   1. {@link buildWeeklySliceCompletionSlots} — always 7 day-slots, even for
 *      monthly-cadence completion habits whose target would otherwise spawn
 *      N slots (e.g. "Meditation 15x/month" must render Mon–Sun, not 15 dots).
 *   2. {@link buildMonthlyContextFooter} — month-scope progress data shown as
 *      a thin footer beneath the weekly chart, ONLY for monthly-cadence
 *      objects.
 *
 * Why not use ScalableSparkline / MeasurementSparkline from the calendar
 * system: the calendar's chart pipeline uses different primitives, a separate
 * scale toggle, and aspect ratios tuned for month/year overviews. The weekly
 * reflection grid needs tile-sized charts that match the Today view 1:1, so
 * we reuse the Today chart components instead. A future cross-view
 * consolidation pass can unify these once both code paths stabilise.
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import { buildMeasurementSummary, type MeasureableSubject } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildDailyBarSlots,
  type TodayCompletionSlot,
  type TodayCompletionState,
} from '@/services/todayChartData'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

export type MonthlyContextFooterVariant =
  | 'count-progress'
  | 'value-progress'
  | 'avg-marker'
  | 'value-label'

export type MonthlyContextAggregationLabel = 'sum' | 'avg' | 'last' | 'days'

export interface MonthlyContextFooterData {
  variant: MonthlyContextFooterVariant
  /** The month this progress refers to (always start-month for boundary weeks). */
  monthRef: MonthRef
  /** Sum / average / last / completion-count, depending on entryMode. */
  current: number
  /** Optional target value (count or value or rating). */
  target?: number
  /** Direction of the comparison vs. target — drives status semantics. */
  targetOperator?: 'gte' | 'lte' | 'min' | 'max'
  /** Evaluation status (only set when there's a target). */
  status?: 'met' | 'missed' | 'in-progress'
  /** Rating scale lower bound — required by `avg-marker`. */
  scaleMin?: number
  /** Rating scale upper bound — required by `avg-marker`. */
  scaleMax?: number
  /** Aggregation label for `value-label` rendering. */
  aggregationLabel?: MonthlyContextAggregationLabel
  /** Total entry count in the month — useful for "Σ … (N entries)" labels. */
  entryCount: number
}

/**
 * Build the 7 day-slots (Mon–Sun) for the weekly-slice completion-dots chart.
 *
 * Delegates to {@link buildDailyBarSlots} which already produces exactly 7
 * slots for any weekly contextPeriodRef regardless of the subject's cadence —
 * so a monthly-cadence "Meditation 15x/month" habit also renders 7 dots when
 * sliced into a single week. The slot's completion state is then derived
 * from `hasEntry`/`isToday`/`isFuture` using the same semantics as the Today
 * view's CompletionDots.
 */
export function buildWeeklySliceCompletionSlots(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  rawEntries: DailyMeasurementEntry[],
  allDayAssignments: MeasurementDayAssignment[],
  planning: MeasurementPlanningSummary,
  weekRef: WeekRef,
  todayDayRef: DayRef,
  locale: string,
): TodayCompletionSlot[] {
  const slots = buildDailyBarSlots(
    subject,
    subjectType,
    rawEntries,
    allDayAssignments,
    planning,
    weekRef,
    todayDayRef,
    locale,
  )
  return slots.map((slot) => ({
    ...slot,
    state: resolveCompletionState(slot.hasEntry, slot.isToday, slot.isFuture),
  }))
}

function resolveCompletionState(
  hasEntry: boolean,
  today: boolean,
  future: boolean,
): TodayCompletionState {
  if (today) return hasEntry ? 'today-done' : 'today-pending'
  if (future) return 'future'
  return hasEntry ? 'done' : 'missed'
}

/**
 * Build the monthly-progress footer data shown beneath the weekly chart on
 * each tile. Returns `undefined` for weekly-cadence subjects — those have no
 * additional month context to surface.
 *
 * For week boundaries that straddle two months we currently use the month
 * containing the **start** of the week. A future enhancement could surface
 * progress for both overlapping months side-by-side.
 */
export function buildMonthlyContextFooter(
  subject: MeasureableSubject,
  rawEntries: DailyMeasurementEntry[],
  weekRef: WeekRef,
): MonthlyContextFooterData | undefined {
  if (subject.cadence !== 'monthly') return undefined

  const weekStart = getPeriodBounds(weekRef).start as DayRef
  const monthRef = getPeriodRefsForDate(weekStart).month
  const summary = buildMeasurementSummary(subject, rawEntries, monthRef)
  const target = 'target' in subject ? subject.target : undefined
  const current = summary.actualValue ?? 0
  const entryCount = summary.entryCount
  const status = mapStatus(summary.evaluationStatus)

  switch (subject.entryMode) {
    case 'completion':
      if (target?.kind === 'count') {
        return {
          variant: 'count-progress',
          monthRef,
          current: entryCount,
          target: target.value,
          status,
          targetOperator: target.operator,
          entryCount,
        }
      }
      return {
        variant: 'value-label',
        monthRef,
        current: entryCount,
        aggregationLabel: 'days',
        entryCount,
      }

    case 'counter':
      if (target?.kind === 'count') {
        return {
          variant: 'count-progress',
          monthRef,
          current,
          target: target.value,
          status,
          targetOperator: target.operator,
          entryCount,
        }
      }
      return {
        variant: 'value-label',
        monthRef,
        current,
        aggregationLabel: 'sum',
        entryCount,
      }

    case 'value':
      if (target?.kind === 'value' && target.aggregation === 'sum') {
        return {
          variant: 'value-progress',
          monthRef,
          current,
          target: target.value,
          status,
          targetOperator: target.operator,
          entryCount,
        }
      }
      if (target?.kind === 'value') {
        return {
          variant: 'value-label',
          monthRef,
          current,
          target: target.value,
          status,
          targetOperator: target.operator,
          aggregationLabel: target.aggregation === 'average' ? 'avg' : 'last',
          entryCount,
        }
      }
      return {
        variant: 'value-label',
        monthRef,
        current,
        aggregationLabel: 'last',
        entryCount,
      }

    case 'rating':
      if (target?.kind === 'rating') {
        return {
          variant: 'avg-marker',
          monthRef,
          current,
          target: target.value,
          status,
          targetOperator: target.operator,
          scaleMin: subject.ratingScaleMin ?? 1,
          scaleMax: subject.ratingScale ?? 10,
          aggregationLabel: 'avg',
          entryCount,
        }
      }
      return {
        variant: 'value-label',
        monthRef,
        current,
        aggregationLabel: 'avg',
        entryCount,
      }
  }
}

function mapStatus(
  evaluationStatus: 'met' | 'missed' | 'no-data' | undefined,
): 'met' | 'missed' | 'in-progress' {
  if (evaluationStatus === 'met') return 'met'
  if (evaluationStatus === 'missed') return 'missed'
  return 'in-progress'
}
