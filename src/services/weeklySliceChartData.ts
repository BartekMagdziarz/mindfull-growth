/**
 * Data builders for the **weekly-slice** chart scope (currently consumed by
 * the weekly reflection grid). Sibling to {@link todayChartData} — uses its
 * slot builders for the chart body but routes completion-dots through a
 * scope-aware dispatcher:
 *
 *   1. {@link buildWeeklySliceCompletionSlots} — three paths:
 *      - `specific-days`: delegate to {@link buildCompletionSlots}; render
 *        only the days actually scheduled this week. Past+no-entry on a
 *        scheduled day is `missed` (red).
 *      - weekly cadence + count target (whole-week / unassigned): delegate
 *        to {@link buildCompletionSlots}; N slots equal to the target with
 *        the done entries at the front, mid-week unfilled slots stay
 *        neutral, end-of-week unfilled slots turn `missed`.
 *      - everything else (monthly cadence without specific-days, weekly
 *        trackers without target): always 7 Mon–Sun slots. Past days
 *        without an entry stay neutral — no per-day weekly plan exists, and
 *        any monthly deficit is surfaced via the footer below the chart.
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
import type { MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import { buildMeasurementSummary, type MeasureableSubject } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildCompletionSlots,
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
 * Build completion-dot slots for the weekly-slice chart. Dispatches to one of
 * three paths based on schedule scope and cadence — see the file header for
 * the routing table.
 *
 * Red (`missed`) is reserved for two situations only:
 *   1. a scheduled day in the past with no entry (specific-days scope), or
 *   2. an unfilled target slot after the week has ended (whole-week +
 *      weekly-cadence count target).
 * Past days that simply weren't part of any plan stay neutral (`future`-style
 * empty dot) — they're not misses.
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
  const scope = planning.scheduleScope ?? 'unassigned'
  const target = (subject as { target?: MeasurementTarget }).target

  // Specific-days: only the days actually scheduled this week become slots;
  // buildCompletionSlots already gives the correct `missed`/`done` semantics.
  if (scope === 'specific-days') {
    return buildCompletionSlots(
      subject,
      subjectType,
      rawEntries,
      allDayAssignments,
      planning,
      weekRef,
      todayDayRef,
      locale,
    )
  }

  // Weekly cadence with a count target → target-count slots. Done entries fill
  // from the front with their day labels; mid-week unfilled slots are
  // today-pending / future; end-of-week unfilled slots become `missed`. All of
  // that already lives inside buildCompletionSlots / buildTargetCountSlots.
  if (subject.cadence === 'weekly' && target?.kind === 'count') {
    return buildCompletionSlots(
      subject,
      subjectType,
      rawEntries,
      allDayAssignments,
      planning,
      weekRef,
      todayDayRef,
      locale,
    )
  }

  // Monthly cadence without specific-days, or weekly trackers without a
  // target: render 7 Mon–Sun slots so the tile shows the week's distribution,
  // but keep past-no-entry neutral — there's no per-day weekly plan to "miss".
  // Any deficit against a monthly target surfaces via the MonthlyContextFooter
  // below the chart.
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
    state: resolveNeutralCompletionState(slot.hasEntry, slot.isToday),
  }))
}

function resolveNeutralCompletionState(
  hasEntry: boolean,
  today: boolean,
): TodayCompletionState {
  if (today) return hasEntry ? 'today-done' : 'today-pending'
  if (hasEntry) return 'done'
  return 'future'
}

/**
 * Build the monthly-progress footer data shown beneath the weekly chart on
 * each tile. Returns `undefined` for weekly-cadence subjects — those have no
 * additional month context to surface.
 *
 * For week boundaries that straddle two months we currently use the month
 * containing the **start** of the week. A future enhancement could surface
 * progress for both overlapping months side-by-side.
 *
 * `asOfDayRef`, when provided, scopes the monthly aggregate to entries
 * recorded on or before that day so the footer reflects month-to-date from
 * the perspective of the displayed week — not the entire month's totals.
 */
export function buildMonthlyContextFooter(
  subject: MeasureableSubject,
  rawEntries: DailyMeasurementEntry[],
  weekRef: WeekRef,
  asOfDayRef?: DayRef,
): MonthlyContextFooterData | undefined {
  if (subject.cadence !== 'monthly') return undefined

  const weekStart = getPeriodBounds(weekRef).start as DayRef
  const monthRef = getPeriodRefsForDate(weekStart).month
  const summary = buildMeasurementSummary(subject, rawEntries, monthRef, asOfDayRef)
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
