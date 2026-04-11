import type { DayRef, PeriodRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import type {
  MeasureableSubject,
  MeasurementEvaluationStatus,
  MeasurementSummary,
} from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import { containsDay, getChildPeriods, getPeriodBounds, getPeriodType } from '@/utils/periods'

export interface TodayDaySlot {
  dayRef: DayRef
  label: string
  value: number | undefined
  isToday: boolean
  isFuture: boolean
  isScheduled: boolean
  hasEntry: boolean
}

export type TodayCompletionState = 'done' | 'missed' | 'future' | 'today-pending' | 'today-done'

export interface TodayCompletionSlot extends TodayDaySlot {
  state: TodayCompletionState
}

export interface TodayAggregateData {
  currentValue: number
  targetValue: number
  scaleMax: number
  operator: 'min' | 'max' | 'gte' | 'lte'
  aggregation: 'sum' | 'average' | 'last'
  status: 'met' | 'missed' | 'in-progress'
  hoverLabel: string
}

/** Monthly counter/value-sum ring: `current / target` + status. */
export interface TodayCounterRingData {
  current: number
  target: number
  status: 'met' | 'missed' | 'in-progress'
  operator: 'min' | 'max' | 'gte' | 'lte'
}

/** Monthly value sparkline + aggregate label. */
export interface TodayValueSparklineData {
  points: TodayDaySlot[]
  hasData: boolean
  aggregate: number
  aggregationLabel: 'avg' | 'last' | 'sum'
  targetValue?: number
  entryCount: number
  status?: 'met' | 'missed' | 'in-progress'
}

/** Monthly rating smooth bar. */
export interface TodayRatingSmoothData {
  averageValue: number
  scaleMin: number
  scaleMax: number
  entryCount: number
  targetValue?: number
  targetOperator?: 'gte' | 'lte'
  status?: 'met' | 'missed' | 'in-progress'
}

/** Monthly summary number for trackers without targets. */
export interface TodaySummaryNumberData {
  value: number
  entryCount: number
  sublabelKind: 'days-logged' | 'entries' | 'total-sum'
}

function dayLabel(dayRef: DayRef, locale: string = 'en'): string {
  const date = new Date(dayRef + 'T00:00:00')
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).slice(0, 2)
}

function dayOfMonthLabel(dayRef: DayRef): string {
  return String(Number(dayRef.slice(8, 10)))
}

function filterSubjectEntries(
  rawEntries: DailyMeasurementEntry[],
  subjectType: MeasurementSubjectType,
  subjectId: string,
): DailyMeasurementEntry[] {
  if (!rawEntries) return []
  return rawEntries.filter(e => e.subjectType === subjectType && e.subjectId === subjectId)
}

function filterEntriesInPeriod(
  entries: DailyMeasurementEntry[],
  periodRef: PeriodRef,
): DailyMeasurementEntry[] {
  return entries.filter(e => containsDay(periodRef, e.dayRef))
}

function filterAssignments(
  allDayAssignments: MeasurementDayAssignment[],
  subjectType: MeasurementSubjectType,
  subjectId: string,
): MeasurementDayAssignment[] {
  if (!allDayAssignments) return []
  return allDayAssignments.filter(a => a.subjectType === subjectType && a.subjectId === subjectId)
}

function filterAssignmentsInPeriod(
  assignments: MeasurementDayAssignment[],
  periodRef: PeriodRef,
): MeasurementDayAssignment[] {
  return assignments.filter(a => containsDay(periodRef, a.dayRef))
}

function isDayFuture(dayRef: DayRef, todayDayRef: DayRef): boolean {
  return dayRef > todayDayRef
}

function isToday(dayRef: DayRef, todayDayRef: DayRef): boolean {
  return dayRef === todayDayRef
}

function entryValueForDay(
  entries: DailyMeasurementEntry[],
  dayRef: DayRef,
  entryMode: string,
): number | undefined {
  const entry = entries.find(e => e.dayRef === dayRef)
  if (!entry) return undefined
  if (entryMode === 'completion') return 1
  return entry.value ?? undefined
}

function isWeeklyPeriod(periodRef: PeriodRef): boolean {
  return getPeriodType(periodRef) === 'week'
}

function getScheduleScope(planning: MeasurementPlanningSummary): string {
  return planning.scheduleScope ?? 'unassigned'
}

/**
 * Build completion dot slots for a today-view card.
 */
export function buildCompletionSlots(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  rawEntries: DailyMeasurementEntry[],
  allDayAssignments: MeasurementDayAssignment[],
  planning: MeasurementPlanningSummary,
  contextPeriodRef: PeriodRef,
  todayDayRef: DayRef,
): TodayCompletionSlot[] {
  const entries = filterEntriesInPeriod(
    filterSubjectEntries(rawEntries, subjectType, subject.id),
    contextPeriodRef,
  )
  const entryDaySet = new Set(entries.map(e => e.dayRef))
  const scope = getScheduleScope(planning)

  if (scope === 'specific-days') {
    // One slot per scheduled day in the period
    const assignments = filterAssignmentsInPeriod(
      filterAssignments(allDayAssignments, subjectType, subject.id),
      contextPeriodRef,
    )
    const scheduledDays = [...new Set(assignments.map(a => a.dayRef))].sort()

    return scheduledDays.map(day => {
      const hasEntry = entryDaySet.has(day)
      const future = isDayFuture(day, todayDayRef)
      const today = isToday(day, todayDayRef)
      const isWeekly = isWeeklyPeriod(contextPeriodRef)

      return {
        dayRef: day,
        label: isWeekly ? dayLabel(day) : dayOfMonthLabel(day),
        value: hasEntry ? 1 : undefined,
        isToday: today,
        isFuture: future,
        isScheduled: true,
        hasEntry,
        state: resolveCompletionState(hasEntry, today, future),
      }
    })
  }

  // Whole-period or unassigned: target-count slots
  const target = 'target' in subject ? subject.target : undefined
  const targetCount = target?.kind === 'count' ? target.value : undefined

  if (targetCount !== undefined) {
    return buildTargetCountSlots(entries, targetCount, contextPeriodRef, todayDayRef)
  }

  // Tracker (no target): one slot per entry day + today placeholder
  return buildTrackerCompletionSlots(entries, contextPeriodRef, todayDayRef)
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

function buildTargetCountSlots(
  entries: DailyMeasurementEntry[],
  targetCount: number,
  contextPeriodRef: PeriodRef,
  todayDayRef: DayRef,
): TodayCompletionSlot[] {
  const isWeekly = isWeeklyPeriod(contextPeriodRef)
  const sortedEntries = [...entries].sort((a, b) => a.dayRef.localeCompare(b.dayRef))
  const doneCount = sortedEntries.length
  const totalSlots = Math.max(targetCount, doneCount)
  const slots: TodayCompletionSlot[] = []

  // Map first N entries to done slots
  for (let i = 0; i < doneCount; i++) {
    const day = sortedEntries[i].dayRef
    const today = isToday(day, todayDayRef)
    slots.push({
      dayRef: day,
      label: isWeekly ? dayLabel(day) : dayOfMonthLabel(day),
      value: 1,
      isToday: today,
      isFuture: false,
      isScheduled: false,
      hasEntry: true,
      state: today ? 'today-done' : 'done',
    })
  }

  // Remaining slots: today-pending + future
  const { end } = getPeriodBounds(contextPeriodRef)
  const periodEnded = todayDayRef > end
  let todaySlotAdded = slots.some(s => s.isToday)

  for (let i = doneCount; i < totalSlots; i++) {
    if (!todaySlotAdded && !periodEnded) {
      todaySlotAdded = true
      slots.push({
        dayRef: todayDayRef,
        label: isWeekly ? dayLabel(todayDayRef) : dayOfMonthLabel(todayDayRef),
        value: undefined,
        isToday: true,
        isFuture: false,
        isScheduled: false,
        hasEntry: false,
        state: 'today-pending',
      })
    } else {
      // Placeholder future slot
      slots.push({
        dayRef: '' as DayRef,
        label: '',
        value: undefined,
        isToday: false,
        isFuture: true,
        isScheduled: false,
        hasEntry: false,
        state: periodEnded ? 'missed' : 'future',
      })
    }
  }

  // Always ensure today has a slot so the user can record beyond the target.
  // When all target slots are filled by past entries, this appends an extra
  // today-pending dot — visually communicating "target met, you can still do more."
  if (!todaySlotAdded && !periodEnded && containsDay(contextPeriodRef, todayDayRef)) {
    slots.push({
      dayRef: todayDayRef,
      label: isWeekly ? dayLabel(todayDayRef) : dayOfMonthLabel(todayDayRef),
      value: undefined,
      isToday: true,
      isFuture: false,
      isScheduled: false,
      hasEntry: false,
      state: 'today-pending',
    })
  }

  return slots
}

function buildTrackerCompletionSlots(
  entries: DailyMeasurementEntry[],
  contextPeriodRef: PeriodRef,
  todayDayRef: DayRef,
): TodayCompletionSlot[] {
  const isWeekly = isWeeklyPeriod(contextPeriodRef)
  const sorted = [...entries].sort((a, b) => a.dayRef.localeCompare(b.dayRef))
  const slots: TodayCompletionSlot[] = sorted.map(entry => {
    const today = isToday(entry.dayRef, todayDayRef)
    return {
      dayRef: entry.dayRef,
      label: isWeekly ? dayLabel(entry.dayRef) : dayOfMonthLabel(entry.dayRef),
      value: 1,
      isToday: today,
      isFuture: false,
      isScheduled: false,
      hasEntry: true,
      state: today ? 'today-done' : 'done',
    }
  })

  // Add today placeholder if no entry today
  if (!sorted.some(e => e.dayRef === todayDayRef) && containsDay(contextPeriodRef, todayDayRef)) {
    slots.push({
      dayRef: todayDayRef,
      label: isWeekly ? dayLabel(todayDayRef) : dayOfMonthLabel(todayDayRef),
      value: undefined,
      isToday: true,
      isFuture: false,
      isScheduled: false,
      hasEntry: false,
      state: 'today-pending',
    })
  }

  return slots
}

/**
 * Build daily bar chart slots for counter/value/rating items.
 */
export function buildDailyBarSlots(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  rawEntries: DailyMeasurementEntry[],
  allDayAssignments: MeasurementDayAssignment[],
  planning: MeasurementPlanningSummary,
  contextPeriodRef: PeriodRef,
  todayDayRef: DayRef,
): TodayDaySlot[] {
  const entries = filterEntriesInPeriod(
    filterSubjectEntries(rawEntries, subjectType, subject.id),
    contextPeriodRef,
  )
  const scope = getScheduleScope(planning)

  if (isWeeklyPeriod(contextPeriodRef)) {
    // Weekly: always 7 slots (Mon-Sun)
    const dayRefs = getChildPeriods(contextPeriodRef as any) as unknown as DayRef[]
    return dayRefs.map(day => ({
      dayRef: day,
      label: dayLabel(day),
      value: entryValueForDay(entries, day, subject.entryMode),
      isToday: isToday(day, todayDayRef),
      isFuture: isDayFuture(day, todayDayRef),
      isScheduled: scope === 'specific-days' && planning.scheduledDayRefs.includes(day),
      hasEntry: entries.some(e => e.dayRef === day),
    }))
  }

  // Monthly
  if (scope === 'specific-days') {
    // Slots for each scheduled day in the month
    const assignments = filterAssignmentsInPeriod(
      filterAssignments(allDayAssignments, subjectType, subject.id),
      contextPeriodRef,
    )
    const scheduledDays = [...new Set(assignments.map(a => a.dayRef))].sort()

    return scheduledDays.map(day => ({
      dayRef: day,
      label: dayOfMonthLabel(day),
      value: entryValueForDay(entries, day, subject.entryMode),
      isToday: isToday(day, todayDayRef),
      isFuture: isDayFuture(day, todayDayRef),
      isScheduled: true,
      hasEntry: entries.some(e => e.dayRef === day),
    }))
  }

  // Monthly whole-month or unassigned: entry days + today
  const entryDays = new Set(entries.map(e => e.dayRef))
  if (containsDay(contextPeriodRef, todayDayRef)) {
    entryDays.add(todayDayRef)
  }
  const days = [...entryDays].sort()

  return days.map(day => ({
    dayRef: day,
    label: dayOfMonthLabel(day),
    value: entryValueForDay(entries, day, subject.entryMode),
    isToday: isToday(day, todayDayRef),
    isFuture: isDayFuture(day, todayDayRef),
    isScheduled: false,
    hasEntry: entries.some(e => e.dayRef === day),
  }))
}

/**
 * Filter slots to scheduled-only when any of them are scheduled. When no slot
 * has `isScheduled: true` (e.g. a weekly tracker without specific-days
 * scheduling), return the full row unchanged — trackers and non-scheduled
 * habits still need every day rendered.
 *
 * TODO (Epic 10): Story 4 and Story 7 can lift this helper into
 * `DailyBarsChart`, `CompletionDots`, and the line chart so specific-days
 * filtering is uniform across all Today visualizations.
 */
export function filterToScheduledSlots<T extends { isScheduled: boolean }>(
  slots: T[],
): T[] {
  if (!slots.some(s => s.isScheduled)) return slots
  return slots.filter(s => s.isScheduled)
}

/**
 * Build line chart slots for value measurements.
 */
export function buildValueLineSlots(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  rawEntries: DailyMeasurementEntry[],
  contextPeriodRef: PeriodRef,
  todayDayRef: DayRef,
): TodayDaySlot[] {
  const entries = filterEntriesInPeriod(
    filterSubjectEntries(rawEntries, subjectType, subject.id),
    contextPeriodRef,
  )

  if (isWeeklyPeriod(contextPeriodRef)) {
    // Weekly: 7 slots, undefined for missing days
    const dayRefs = getChildPeriods(contextPeriodRef as any) as unknown as DayRef[]
    return dayRefs.map(day => ({
      dayRef: day,
      label: dayLabel(day),
      value: entryValueForDay(entries, day, subject.entryMode),
      isToday: isToday(day, todayDayRef),
      isFuture: isDayFuture(day, todayDayRef),
      isScheduled: false,
      hasEntry: entries.some(e => e.dayRef === day),
    }))
  }

  // Monthly: slots for days with entries only
  const sorted = [...entries].sort((a, b) => a.dayRef.localeCompare(b.dayRef))
  return sorted.map(entry => ({
    dayRef: entry.dayRef,
    label: dayOfMonthLabel(entry.dayRef),
    value: entry.value ?? undefined,
    isToday: isToday(entry.dayRef, todayDayRef),
    isFuture: false,
    isScheduled: false,
    hasEntry: true,
  }))
}

/**
 * Build aggregate progress data for items with targets.
 */
export function buildAggregateData(
  subject: MeasureableSubject,
  measurement: MeasurementSummary,
): TodayAggregateData | undefined {
  const target = 'target' in subject ? subject.target : undefined
  if (!target) return undefined
  if (subject.entryMode === 'completion') return undefined

  const currentValue = measurement.actualValue ?? 0
  const targetValue = target.value

  let operator: TodayAggregateData['operator']
  let aggregation: TodayAggregateData['aggregation']

  switch (target.kind) {
    case 'count':
      operator = target.operator
      aggregation = 'sum'
      break
    case 'value':
      operator = target.operator
      aggregation = target.aggregation
      break
    case 'rating':
      operator = target.operator
      aggregation = 'average'
      break
  }

  const scaleMax = computeScaleMax(currentValue, targetValue, target)

  let status: TodayAggregateData['status']
  if (measurement.evaluationStatus === 'met') {
    status = 'met'
  } else if (measurement.evaluationStatus === 'missed') {
    status = 'missed'
  } else {
    status = 'in-progress'
  }

  const hoverLabel = formatHoverLabel(currentValue, targetValue, operator, aggregation)

  return {
    currentValue,
    targetValue,
    scaleMax,
    operator,
    aggregation,
    status,
    hoverLabel,
  }
}

function computeScaleMax(
  currentValue: number,
  targetValue: number,
  target: MeasurementTarget,
): number {
  if (target.kind === 'rating') {
    return Math.max(currentValue, targetValue, 5)
  }

  return Math.max(currentValue, targetValue, 1)
}

function formatOperatorSymbol(operator: TodayAggregateData['operator']): string {
  switch (operator) {
    case 'min': return '>='
    case 'max': return '<='
    case 'gte': return '>='
    case 'lte': return '<='
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function formatHoverLabel(
  currentValue: number,
  targetValue: number,
  operator: TodayAggregateData['operator'],
  aggregation: TodayAggregateData['aggregation'],
): string {
  const prefix = aggregation === 'average' ? 'avg: ' : aggregation === 'last' ? 'last: ' : ''
  const opSymbol = formatOperatorSymbol(operator)
  return `${prefix}${formatNumber(currentValue)} / target: ${opSymbol}${formatNumber(targetValue)}`
}

/**
 * Map the persisted evaluation status to the render-time status used by the
 * summary primitives. `no-data` and `undefined` both collapse to `in-progress`
 * so empty months show the neutral rendering instead of a "missed" error color.
 */
function mapStatus(
  evaluationStatus: MeasurementEvaluationStatus | undefined,
): 'met' | 'missed' | 'in-progress' {
  if (evaluationStatus === 'met') return 'met'
  if (evaluationStatus === 'missed') return 'missed'
  return 'in-progress'
}

/**
 * Build ring data for monthly counter habits/KRs with count targets and
 * monthly value habits/KRs with value-sum targets. Returns `undefined` when
 * the shape doesn't match — callers should guard with `if (!data) return`.
 */
export function buildCounterRingData(
  subject: MeasureableSubject,
  measurement: MeasurementSummary,
): TodayCounterRingData | undefined {
  if (!('target' in subject) || !subject.target) return undefined
  const { target } = subject
  const isCountTarget = target.kind === 'count'
  const isValueSumTarget = target.kind === 'value' && target.aggregation === 'sum'
  if (!isCountTarget && !isValueSumTarget) return undefined

  return {
    current: measurement.actualValue ?? 0,
    target: target.value,
    status: mapStatus(measurement.evaluationStatus),
    operator: target.operator,
  }
}

/**
 * Build sparkline + aggregate label data for monthly value items (habits with
 * avg/last aggregation, trackers without targets). Always returns a value —
 * empty months collapse to `hasData: false` which the component renders as
 * "—".
 *
 * Reuses `buildValueLineSlots` to produce the point array so the filtering and
 * monthly entry-day logic stays in one place.
 */
export function buildValueSparklineData(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  rawEntries: DailyMeasurementEntry[],
  contextPeriodRef: PeriodRef,
  todayDayRef: DayRef,
  measurement: MeasurementSummary,
): TodayValueSparklineData {
  const points = buildValueLineSlots(
    subject,
    subjectType,
    rawEntries,
    contextPeriodRef,
    todayDayRef,
  )
  const target = 'target' in subject ? subject.target : undefined
  const hasData = measurement.entryCount > 0
  const aggregate = measurement.actualValue ?? 0

  let aggregationLabel: 'avg' | 'last' | 'sum' = 'last'
  if (target?.kind === 'value') {
    aggregationLabel =
      target.aggregation === 'sum'
        ? 'sum'
        : target.aggregation === 'average'
          ? 'avg'
          : 'last'
  }

  return {
    points,
    hasData,
    aggregate,
    aggregationLabel,
    targetValue: target?.kind === 'value' ? target.value : undefined,
    entryCount: measurement.entryCount,
    status: target ? mapStatus(measurement.evaluationStatus) : undefined,
  }
}

/**
 * Build smooth-fill bar data for monthly rating items. Scale is hardcoded to
 * 1..10 to match `RatingSegmentedBars` default — when the domain adds a scale
 * field, both components lift it together.
 */
export function buildRatingSmoothData(
  subject: MeasureableSubject,
  measurement: MeasurementSummary,
): TodayRatingSmoothData {
  const target = 'target' in subject ? subject.target : undefined
  const hasRatingTarget = target?.kind === 'rating'
  return {
    averageValue: measurement.actualValue ?? 0,
    scaleMin: 1,
    scaleMax: 10,
    entryCount: measurement.entryCount,
    targetValue: hasRatingTarget ? target.value : undefined,
    targetOperator: hasRatingTarget ? target.operator : undefined,
    status: hasRatingTarget ? mapStatus(measurement.evaluationStatus) : undefined,
  }
}

/**
 * Build summary-number data for monthly trackers without targets.
 *
 * Only two entryModes reach this builder per the routing tree:
 * - `completion` tracker → "N days logged" (value = entryCount)
 * - `counter` tracker → "N total" (value = actualValue, which is the sum for
 *   counter entries per `computeActualValue` in measurementProgress.ts)
 *
 * `rawEntries`, `subjectType`, and `contextPeriodRef` are accepted for
 * symmetry with `buildValueSparklineData` and to leave room for future
 * variants (e.g. per-subject filtering reuse) even though they're unused
 * today.
 */
export function buildSummaryNumberData(
  subject: MeasureableSubject,
  _subjectType: MeasurementSubjectType,
  _rawEntries: DailyMeasurementEntry[],
  _contextPeriodRef: PeriodRef,
  measurement: MeasurementSummary,
): TodaySummaryNumberData {
  if (subject.entryMode === 'completion') {
    return {
      value: measurement.entryCount,
      entryCount: measurement.entryCount,
      sublabelKind: 'days-logged',
    }
  }
  // counter — actualValue is the sum for counter entries
  return {
    value: measurement.actualValue ?? 0,
    entryCount: measurement.entryCount,
    sublabelKind: 'total-sum',
  }
}
