/**
 * Data builders for the **monthly-slice** chart scope (consumed by the month
 * reflection grid). Sibling to {@link weeklySliceChartData} but each slot
 * represents one ISO week of the displayed month (typically 4-5 slots),
 * aggregating the per-day entries with {@link buildMeasurementSummary}.
 *
 * Slots reuse {@link TodayDaySlot} / {@link TodayCompletionSlot} unchanged.
 * `dayRef` carries the week's anchor day (start-of-week) and `label` is
 * formatted as `W{NN}` so downstream chart components display the week label
 * without needing a new slot type.
 *
 * For evaluation status:
 *   - future weeks (start > todayDayRef)               → `future`
 *   - current week (contains todayDayRef)              → `today-done` / `today-pending`
 *   - past weeks (end < todayDayRef) with met status   → `done`
 *   - past weeks with missed status                    → `missed`
 *   - past weeks with no-data                          → neutral `future` (no plan to "miss")
 *
 * The summary for the current week is clipped to `todayDayRef` so the
 * evaluation reflects week-to-date state. Bars / line values use the week's
 * aggregate (sum / average / last, depending on `entryMode + target.aggregation`).
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import { buildMeasurementSummary, type MeasureableSubject } from '@/services/measurementProgress'
import {
  type TodayCompletionSlot,
  type TodayCompletionState,
  type TodayDaySlot,
} from '@/services/todayChartData'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'

interface WeekContext {
  weekRef: WeekRef
  start: DayRef
  end: DayRef
  label: string
  isFuture: boolean
  isCurrent: boolean
  clipRef: DayRef
}

function buildWeekContexts(monthRef: MonthRef, todayDayRef: DayRef): WeekContext[] {
  const weeks = getChildPeriods(monthRef) as WeekRef[]
  return weeks.map((weekRef) => {
    const bounds = getPeriodBounds(weekRef)
    const start = bounds.start as DayRef
    const end = bounds.end as DayRef
    const num = weekRef.slice(-2)
    const isFuture = start > todayDayRef
    const isCurrent = start <= todayDayRef && todayDayRef <= end
    const clipRef = (todayDayRef < end ? todayDayRef : end) as DayRef
    return {
      weekRef,
      start,
      end,
      label: `W${num}`,
      isFuture,
      isCurrent,
      clipRef,
    }
  })
}

function resolveCompletionState(
  evaluationStatus: 'met' | 'missed' | 'no-data' | undefined,
  ctx: WeekContext,
  hasEntry: boolean,
): TodayCompletionState {
  if (ctx.isFuture) return 'future'
  if (ctx.isCurrent) {
    return evaluationStatus === 'met' || hasEntry ? 'today-done' : 'today-pending'
  }
  if (evaluationStatus === 'met') return 'done'
  if (evaluationStatus === 'missed') return 'missed'
  // No-target subjects (e.g. trackers without a count target) leave
  // `evaluationStatus` undefined. Treat any entries in a past week as a
  // success so the slot reads as filled rather than neutral-empty.
  if (evaluationStatus === undefined && hasEntry) return 'done'
  return 'future'
}

export function buildMonthlySliceCompletionSlots(
  subject: MeasureableSubject,
  rawEntries: DailyMeasurementEntry[],
  monthRef: MonthRef,
  todayDayRef: DayRef,
): TodayCompletionSlot[] {
  const contexts = buildWeekContexts(monthRef, todayDayRef)
  return contexts.map((ctx) => {
    const summary = ctx.isFuture
      ? undefined
      : buildMeasurementSummary(subject, rawEntries, ctx.weekRef, ctx.clipRef)
    const hasEntry = (summary?.entryCount ?? 0) > 0
    const state = resolveCompletionState(summary?.evaluationStatus, ctx, hasEntry)
    return {
      dayRef: ctx.start,
      label: ctx.label,
      value: summary?.entryCount ?? undefined,
      isToday: ctx.isCurrent,
      isFuture: ctx.isFuture,
      isScheduled: true,
      hasEntry,
      state,
    }
  })
}

export function buildMonthlySliceBarSlots(
  subject: MeasureableSubject,
  rawEntries: DailyMeasurementEntry[],
  monthRef: MonthRef,
  todayDayRef: DayRef,
): TodayDaySlot[] {
  const contexts = buildWeekContexts(monthRef, todayDayRef)
  return contexts.map((ctx) => {
    if (ctx.isFuture) {
      return {
        dayRef: ctx.start,
        label: ctx.label,
        value: undefined,
        isToday: false,
        isFuture: true,
        isScheduled: true,
        hasEntry: false,
      }
    }
    const summary = buildMeasurementSummary(subject, rawEntries, ctx.weekRef, ctx.clipRef)
    const hasEntry = summary.entryCount > 0
    return {
      dayRef: ctx.start,
      label: ctx.label,
      value: hasEntry ? summary.actualValue : undefined,
      isToday: ctx.isCurrent,
      isFuture: false,
      isScheduled: true,
      hasEntry,
    }
  })
}

export function buildMonthlySliceValueLineSlots(
  subject: MeasureableSubject,
  rawEntries: DailyMeasurementEntry[],
  monthRef: MonthRef,
  todayDayRef: DayRef,
): TodayDaySlot[] {
  // value-line shares the slot shape with bars; only the chart renderer
  // interprets the array differently.
  return buildMonthlySliceBarSlots(subject, rawEntries, monthRef, todayDayRef)
}
