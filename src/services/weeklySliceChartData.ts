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
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import {
  buildMeasurementSummary,
  multiCompletionActiveItems,
  multiCompletionDayMet,
  multiCompletionDayPoints,
  multiCompletionEffectiveThreshold,
  type MeasureableSubject,
  type MeasurementSummary,
} from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildDailyBarSlots,
  type TodayCompletionSlot,
  type TodayCompletionState,
  type TodayDaySlot,
} from '@/services/todayChartData'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

export type MonthlyContextFooterVariant =
  | 'count-progress'
  | 'value-progress'
  | 'avg-marker'
  | 'value-label'

export type MonthlyContextAggregationLabel = 'sum' | 'avg' | 'last' | 'days'

/**
 * Compact target + performance data for the ContextChip shown beside an object
 * tile's title (weekly + monthly scale). Period-agnostic — the current value is
 * whatever period-scoped {@link MeasurementSummary} it was built from.
 */
export interface ContextChipData {
  variant: MonthlyContextFooterVariant
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
  /** Total entry count in the period. */
  entryCount: number
  /** Entry-days condition readout — set only when the target defines `entryDays`. */
  entryDays?: {
    current: number
    target: number
    operator: 'min' | 'max'
  }
}

export interface MonthlyContextFooterData extends ContextChipData {
  /** The month this progress refers to (always start-month for boundary weeks). */
  monthRef: MonthRef
}

/**
 * Build completion-dot slots for the weekly-slice chart. Always renders 7
 * Mon–Sun day-circles; the per-day appearance encodes state:
 *   - `done` / `today-done`  — an entry exists on that day
 *   - `today-pending`        — today, no entry, but loggable
 *   - `future`               — a scheduled (specific-days) day still upcoming
 *   - `missed`               — a scheduled (specific-days) PAST day, no entry
 *   - `not-assigned`         — a day with no plan and no entry (faint)
 *
 * Count targets ("do X N times per week, ANY day") don't map onto 7 fixed days,
 * so the target and any deficit are surfaced by the ContextChip beside the tile
 * title — NOT by reddening individual weekdays. Unscheduled empty days stay
 * neutral (`not-assigned`); only scheduled past days without an entry are red.
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
  const isSpecificDays = (planning.scheduleScope ?? 'unassigned') === 'specific-days'
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
    state: resolveWeekdayCompletionState(slot, isSpecificDays),
  }))
}

/** One row of the multi-completion stack grid (a checkable item). */
export interface MultiCompletionStackRow {
  id: string
  label: string
  icon?: string
  archived: boolean
}

export interface MultiCompletionStackSlot extends TodayCompletionSlot {
  checkedIds: string[]
  points: number
  /** Daily threshold reached — drives the underline color (met vs partial). */
  met: boolean
}

export interface MultiCompletionStackData {
  /** Active items in stored order + archived items checked somewhere this week. */
  rows: MultiCompletionStackRow[]
  slots: MultiCompletionStackSlot[]
  threshold: number
}

/**
 * Build the 7-column item-stack grid for a multi-completion subject. Row set
 * is identical across all columns so the grid lines up: active items in
 * stored order, plus any archived items still referenced by one of the week's
 * entries (history keeps rendering). Day-level scheduling states reuse
 * {@link resolveWeekdayCompletionState}; `met`/`points` add the multi layer.
 */
export function buildMultiCompletionStackData(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  rawEntries: DailyMeasurementEntry[],
  allDayAssignments: MeasurementDayAssignment[],
  planning: MeasurementPlanningSummary,
  weekRef: WeekRef,
  todayDayRef: DayRef,
  locale: string,
): MultiCompletionStackData {
  const baseSlots = buildWeeklySliceCompletionSlots(
    subject,
    subjectType,
    rawEntries,
    allDayAssignments,
    planning,
    weekRef,
    todayDayRef,
    locale,
  )

  const entryByDay = new Map(
    rawEntries
      .filter((entry) => entry.subjectType === subjectType && entry.subjectId === subject.id)
      .map((entry) => [entry.dayRef, entry] as const),
  )

  const slots: MultiCompletionStackSlot[] = baseSlots.map((slot) => {
    const entry = entryByDay.get(slot.dayRef)
    return {
      ...slot,
      checkedIds: entry?.checkedItemIds ?? [],
      points: entry ? multiCompletionDayPoints(subject, entry) : 0,
      met: entry ? multiCompletionDayMet(subject, entry) : false,
    }
  })

  const checkedThisWeek = new Set(slots.flatMap((slot) => slot.checkedIds))
  const rows: MultiCompletionStackRow[] = [
    ...multiCompletionActiveItems(subject).map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      archived: false,
    })),
    ...(subject.multiItems ?? [])
      .filter((item) => item.archived && checkedThisWeek.has(item.id))
      .map((item) => ({ id: item.id, label: item.label, icon: item.icon, archived: true })),
  ]

  return { rows, slots, threshold: multiCompletionEffectiveThreshold(subject) }
}

function resolveWeekdayCompletionState(
  slot: TodayDaySlot,
  isSpecificDays: boolean,
): TodayCompletionState {
  if (slot.hasEntry) return slot.isToday ? 'today-done' : 'done'
  if (slot.isToday) {
    // Today is "expected" (loggable) for any-day count/tracker objects, or for a
    // scheduled day under specific-days planning; otherwise it's just unplanned.
    return !isSpecificDays || slot.isScheduled ? 'today-pending' : 'not-assigned'
  }
  // A scheduled day (specific-days) that's empty: upcoming → future, past → missed.
  if (isSpecificDays && slot.isScheduled) {
    return slot.isFuture ? 'future' : 'missed'
  }
  // Any other empty day (unscheduled, or any-day objects): neutral placeholder.
  return 'not-assigned'
}

/**
 * Build compact target + performance data (the ContextChip) from a
 * period-scoped {@link MeasurementSummary}. Period-agnostic: the caller supplies
 * the summary for whatever period is relevant (this week for weekly-cadence,
 * this month for monthly-cadence). When `suppressTarget` is set — e.g. a
 * weekly-cadence object shown at month scale, where a per-week target isn't
 * comparable to a monthly aggregate — the chip shows a bare aggregate instead
 * of an "X / target" comparison.
 */
export function buildContextChipData(
  subject: MeasureableSubject,
  summary: MeasurementSummary,
  suppressTarget = false,
): ContextChipData {
  // Prefer the summary's target — it is the one the summary was evaluated
  // against (incl. week sub-targets), while subject.target may be only
  // month-effective. Legacy callers always build the summary from the same
  // subject they pass here, so for them this is a no-op.
  const target = suppressTarget
    ? undefined
    : summary.target ?? ('target' in subject ? subject.target : undefined)
  const chip = buildBaseContextChipData(subject, target, summary)

  const entryDaysCondition = target?.entryDays
  if (entryDaysCondition && summary.qualifiedEntryDays !== undefined) {
    chip.entryDays = {
      current: summary.qualifiedEntryDays,
      target: entryDaysCondition.value,
      operator: entryDaysCondition.operator,
    }
  }

  return chip
}

function buildBaseContextChipData(
  subject: MeasureableSubject,
  target: MeasurementSummary['target'],
  summary: MeasurementSummary,
): ContextChipData {
  const current = summary.actualValue ?? 0
  const entryCount = summary.entryCount
  const status = mapStatus(summary.evaluationStatus)

  switch (subject.entryMode) {
    case 'completion':
      if (target?.kind === 'count') {
        return { variant: 'count-progress', current: entryCount, target: target.value, status, targetOperator: target.operator, entryCount }
      }
      return { variant: 'value-label', current: entryCount, aggregationLabel: 'days', entryCount }

    case 'counter':
      if (target?.kind === 'count') {
        return { variant: 'count-progress', current, target: target.value, status, targetOperator: target.operator, entryCount }
      }
      return { variant: 'value-label', current, aggregationLabel: 'sum', entryCount }

    case 'value':
      if (target?.kind === 'value' && target.aggregation === 'sum') {
        return { variant: 'value-progress', current, target: target.value, status, targetOperator: target.operator, entryCount }
      }
      if (target?.kind === 'value') {
        return {
          variant: 'value-label',
          current,
          target: target.value,
          status,
          targetOperator: target.operator,
          aggregationLabel: target.aggregation === 'average' ? 'avg' : 'last',
          entryCount,
        }
      }
      return { variant: 'value-label', current, aggregationLabel: 'last', entryCount }

    case 'multi-completion':
      // `current` (actualValue) is the number of MET days — unlike completion
      // it can be lower than entryCount because partial days don't count.
      if (target?.kind === 'count') {
        return { variant: 'count-progress', current, target: target.value, status, targetOperator: target.operator, entryCount }
      }
      return { variant: 'value-label', current, aggregationLabel: 'days', entryCount }

    case 'rating':
      if (target?.kind === 'rating') {
        return {
          variant: 'avg-marker',
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
      return { variant: 'value-label', current, aggregationLabel: 'avg', entryCount }
  }
}

/**
 * Month-scoped context data for **monthly-cadence** objects — keyed by the month
 * containing the start of the displayed week. Returns `undefined` for
 * weekly-cadence subjects. `asOfDayRef` scopes the aggregate to month-to-date as
 * of that day. Thin wrapper over {@link buildContextChipData}.
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
  return { ...buildContextChipData(subject, summary), monthRef }
}

function mapStatus(
  evaluationStatus: 'met' | 'missed' | 'no-data' | undefined,
): 'met' | 'missed' | 'in-progress' {
  if (evaluationStatus === 'met') return 'met'
  if (evaluationStatus === 'missed') return 'missed'
  return 'in-progress'
}
