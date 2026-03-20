import type { DayRef, PeriodRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasureableSubject, MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import { containsDay, getChildPeriods, getPeriodBounds, getPeriodRefsForDate, getPeriodType } from '@/utils/periods'

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
    const dayRefs = getChildPeriods(contextPeriodRef as any) as DayRef[]
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
 * Build line chart slots for value trackers.
 */
export function buildTrackerLineSlots(
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
    const dayRefs = getChildPeriods(contextPeriodRef as any) as DayRef[]
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
