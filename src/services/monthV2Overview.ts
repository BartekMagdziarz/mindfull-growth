/**
 * Month V2 overview — composed loader + pure view-model builder.
 *
 * The experimental month renderer (`?layout=v2`) reads everything through this
 * module instead of the wizard/AI bundles:
 *
 * - `loadMonthV2OverviewData()` composes the current sources (month planning
 *   bundle, structured reflections, weekly intentions, journal/emotion/exercise
 *   stores) with their own `ensureLoaded` cold-start hydration.
 * - `buildMonthV2OverviewViewModel()` is a pure function over that data — every
 *   aggregation rule is unit-testable without Dexie.
 *
 * Semantics contract (see ideas/html-plans/2026-07-12-month-v2-port.html §5):
 * - Week columns are the month's canonical child weeks (Mon–Sun, numbered from
 *   the year's first Monday — NOT strict ISO-8601). No custom week math here.
 * - Weekly cadence aggregates over the FULL week, including days outside the
 *   viewed month; monthly cadence contributes only in-month days per week and
 *   is never target-evaluated per week (`contributionOnly`).
 * - Only past, non-contribution weeks surface met/missed; the current and
 *   future weeks stay neutral ('in-progress' / 'no-data').
 * - Week target overrides cascade week → month → base. The bundle already
 *   applies the month override to `item.subject`, so per-week evaluation only
 *   layers the week override on top.
 * - Multi-completion is its own series: per-day met/partial/empty plus the
 *   week's MET-day count — never reduced to a plain value series.
 */
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  Priority,
  WeeklyIntention,
} from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthlyReflection, WeeklyReflection, MonthlyRatingKey } from '@/domain/reflection'
import { MONTHLY_RATING_KEYS } from '@/domain/reflection'
import type { LifeAreaKey } from '@/domain/reflectionMatrix'
import { REFLECTION_MATRIX_AREAS } from '@/domain/reflectionMatrix'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import type { MonthPlanningBundle } from '@/services/planningStateQueries'
import { getMonthPlanningBundle } from '@/services/planningStateQueries'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import type { MeasurementSummary, MeasureableSubject } from '@/services/measurementProgress'
import {
  applyMeasurementTargetOverride,
  buildMeasurementSummary,
  multiCompletionDayMet,
  multiCompletionDayPoints,
  multiCompletionEffectiveThreshold,
} from '@/services/measurementProgress'
import { buildMonthObjectItems } from '@/components/calendar/objectItems'
import { matrixFromReflection } from '@/components/calendar/stream/streamData'
import type { StreamMatrixRowVM } from '@/components/calendar/stream/streamModel'
import { listWeeklyIntentionsForMonth } from '@/services/weeklyIntentionService'
import type { MonthlyFocusConfrontation } from '@/services/monthlyFocusService'
import { getMonthlyFocusConfrontation } from '@/services/monthlyFocusService'
import { getActivePrioritiesForMonth } from '@/services/monthlyPriorityService'
import {
  addDaysToDayRef,
  getChildPeriods,
  getPeriodBounds,
  getPeriodRefsForDate,
} from '@/utils/periods'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

// ── View-model types ─────────────────────────────────────────────────────────

export type MonthV2Phase = 'past' | 'current' | 'future'
/** met/missed appear only on past, non-contribution weeks. */
export type MonthV2WeekStatus = 'met' | 'missed' | 'no-data' | 'in-progress'
export type MonthV2SectionKey = 'goals' | 'habits' | 'trackers' | 'intentions'
export type MonthV2SubjectType = 'keyResult' | 'habit' | 'tracker' | 'weeklyIntention'
export type MonthV2FocusKey = MonthV2SectionKey | 'emotions' | 'journal'

export interface MonthV2WeeklyRadarAxis {
  key: LifeAreaKey
  value: number | null
  max: 5
}

/**
 * Compact weekly-reflection projection for the Month V2 radar. Deliberately
 * excludes the Actions column: the overview compares load (requirements) with
 * end-of-week state and leaves the full 4x3 matrix to the detailed week view.
 */
export interface MonthV2WeeklyRadar {
  requirements: MonthV2WeeklyRadarAxis[]
  state: MonthV2WeeklyRadarAxis[]
}

export interface MonthV2WeekColumn {
  weekRef: WeekRef
  weekStart: DayRef
  weekEnd: DayRef
  /** Days of this week that belong to the viewed month. */
  inMonthDayRefs: DayRef[]
  /** True when the week spills into an adjacent month. */
  isBoundary: boolean
  phase: MonthV2Phase
  /** Full 4-areas × 3-groups reflection matrix; null when no weekly reflection. */
  reflectionMatrix: StreamMatrixRowVM[] | null
  /** Requirements + state only; null when the week has no rated values. */
  radar: MonthV2WeeklyRadar | null
}

export interface MonthV2DaySlot {
  dayRef: DayRef
  inMonth: boolean
  scheduled: boolean
  completed: boolean
}

export interface MonthV2MultiDaySlot {
  dayRef: DayRef
  inMonth: boolean
  /** met = daily threshold reached, partial = entry below threshold. */
  state: 'met' | 'partial' | 'empty'
  points: number
  threshold: number
}

export interface MonthV2WeekDatum {
  weekRef: WeekRef
  phase: MonthV2Phase
  /** undefined = no data → render "—", never 0. */
  actualValue?: number
  entryCount: number
  status: MonthV2WeekStatus
  /** Monthly-cadence weeks: neutral "+N" contribution, no per-week target. */
  contributionOnly: boolean
  /** Effective week target value AFTER the override cascade. */
  targetValue?: number
  hasWeekOverride: boolean
  qualifiedEntryDays?: number
  /** Intention rows: true on weeks other than the intention's home week. */
  inactive?: boolean
  /** 7 fixed Mon–Sun slots for scheduled-days displays. */
  days?: MonthV2DaySlot[]
  /** 7 fixed Mon–Sun slots for multi-completion displays. */
  multiDays?: MonthV2MultiDaySlot[]
}

export interface MonthV2NumericScale {
  min: number
  max: number
}

export type MonthV2Series =
  | {
      kind: 'monthly-contribution'
      display: 'count' | 'scheduled-days' | 'bars' | 'line' | 'rating' | 'multi'
      weeks: MonthV2WeekDatum[]
      scale?: MonthV2NumericScale
    }
  | { kind: 'completion-progress'; display: 'segments' | 'bullet'; weeks: MonthV2WeekDatum[] }
  | { kind: 'multi-completion'; weeks: MonthV2WeekDatum[] }
  | { kind: 'scheduled-days'; weeks: MonthV2WeekDatum[] }
  | { kind: 'bars'; weeks: MonthV2WeekDatum[]; scale: MonthV2NumericScale }
  | {
      kind: 'line'
      aggregation: 'average' | 'last'
      weeks: MonthV2WeekDatum[]
      scale: MonthV2NumericScale
    }
  | { kind: 'rating'; weeks: MonthV2WeekDatum[]; scale: MonthV2NumericScale }

export interface MonthV2Row {
  key: string
  subjectId: string
  subjectType: MonthV2SubjectType
  title: string
  icon?: string
  parentGoal?: { id: string; title: string; icon?: string }
  cadence: PlanningCadence
  entryMode: MeasurementEntryMode
  /** Open objects only — the planner refuses closed/retired ones. */
  editable: boolean
  /** Intentions: the single week the intention lives in. */
  homeWeekRef?: WeekRef
  /** Whole-month aggregate/evaluation (monthly cadence: THE month result). */
  monthSummary?: MeasurementSummary
  /** The bundle subject (month override already applied) — for chips/scales. */
  subject: MeasureableSubject
  series: MonthV2Series
}

export interface MonthV2Group {
  key: string
  title?: string
  icon?: string
  goalId?: string
  rows: MonthV2Row[]
}

export interface MonthV2Section {
  key: MonthV2SectionKey
  /** goals: linked goals with rows; other sections: rowCount. */
  objectCount: number
  rowCount: number
  /** Rows with at least one entry this month (neutral coverage, not a verdict). */
  coveredRows: number
  groups: MonthV2Group[]
}

export interface MonthV2CompassAxis {
  key: MonthlyRatingKey
  value: number | null
  max: 5
}

export interface MonthV2ActivityDay {
  dayRef: DayRef
  weekdayIndex: number
  isToday: boolean
  isFuture: boolean
  journalWritten: boolean
  /** Number of entries, not merely a day-with-entry flag. */
  journalCount: number
  emotionCount: number
  quadrantCounts: Record<Quadrant, number>
  exerciseCount: number
}

export interface MonthV2Activity {
  days: MonthV2ActivityDay[]
  totals: { emotionSessions: number; journalEntries: number; exercises: number }
}

export interface MonthV2Rail {
  /** null unless a monthly reflection exists with ≥1 rated axis. */
  compass: { axes: MonthV2CompassAxis[] } | null
  activity: MonthV2Activity
}

export interface MonthV2Priority {
  id: string
  title: string
  icon?: string
  /** Child weeks in which a weekly top pick served this priority. */
  focusWeekRefs: WeekRef[]
  /** Distinct weekly-focus objects linked to the priority. */
  focusObjectCount: number
}

export type MonthV2CategoryMetric = 'attainment' | 'coverage'

export interface MonthV2CategoryAggregate {
  key: MonthV2FocusKey
  /** Stable i18n key; components resolve it through `t()`. */
  label: string
  icon: string
  /** Tells the UI whether met/total means target attainment or active-day/row coverage. */
  metric: MonthV2CategoryMetric
  met: number
  total: number
  percentage?: number
}

export interface MonthV2FocusWeekSummary {
  weekRef: WeekRef
  /** Sessions/entries in the in-month slice of this child week. */
  count: number
  activeDayCount: number
  /** Optional target-attainment roll-up (used by weekly intentions). */
  met?: number
  total?: number
  /** Icons of the objects represented by this week (used by intentions). */
  icons?: string[]
  /** Reflection narrative for progressive disclosure. */
  text?: string
  /** Present only for the emotions focus row. */
  quadrantCounts?: Record<Quadrant, number>
}

export interface MonthV2FocusRow {
  key: string
  title?: string
  icon?: string
  subjectId?: string
  subjectType?: MonthV2SubjectType
  parentGoal?: { id: string; title: string; icon?: string }
  priorityIds: string[]
  monthValue?: number
  targetValue?: number
  entryCount?: number
  status?: MeasurementSummary['evaluationStatus']
  text?: string
  /** Existing measurement-series contract, reused by object focus sections. */
  series?: MonthV2Series
  /** Custom per-week summaries used by intentions, emotions, and journal. */
  weeks?: MonthV2FocusWeekSummary[]
  /** Month-wide quadrant distribution used by the emotions focus row. */
  quadrantCounts?: Record<Quadrant, number>
}

export interface MonthV2FocusSection {
  key: MonthV2FocusKey
  rows: MonthV2FocusRow[]
}

export interface MonthV2OverviewViewModel {
  monthRef: MonthRef
  todayRef: DayRef
  /** Always five axes in canonical order; values are null until reflected. */
  monthAxes: MonthV2CompassAxis[]
  weeks: MonthV2WeekColumn[]
  priorities: MonthV2Priority[]
  categories: Record<MonthV2FocusKey, MonthV2CategoryAggregate>
  focusSections: Record<MonthV2FocusKey, MonthV2FocusSection>
  rail: MonthV2Rail
  sections: MonthV2Section[]
}

// ── Loader data ──────────────────────────────────────────────────────────────

export interface MonthV2OverviewData {
  monthRef: MonthRef
  todayRef: DayRef
  planning: MonthPlanningBundle
  objectItems: MonthObjectItem[]
  monthlyReflection: MonthlyReflection | null
  weeklyReflections: WeeklyReflection[]
  weeklyIntentions: WeeklyIntention[]
  activity: MonthV2Activity
  /** Selected month priorities, already resolved in MonthPlan order. */
  topPriorities?: Priority[]
  /** Weekly top-pick roll-up for the selected month priorities. */
  priorityFocus?: MonthlyFocusConfrontation
}

/** Raw per-source inputs for the activity mini-calendar (pure, testable). */
export interface MonthV2ActivitySources {
  journalCreatedAts: string[]
  emotionLogs: Array<{ createdAt: string; quadrants: Quadrant[] }>
  exerciseDayRefs: DayRef[]
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

const MONTH_V2_TIME_ZONE = 'Europe/Warsaw'
const monthV2DayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MONTH_V2_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function emptyQuadrantCounts(): Record<Quadrant, number> {
  return {
    'high-energy-high-pleasantness': 0,
    'high-energy-low-pleasantness': 0,
    'low-energy-high-pleasantness': 0,
    'low-energy-low-pleasantness': 0,
  }
}

/**
 * Convert a persisted timestamp to the user's local canonical day. Journal and
 * emotion records store instants, while the calendar is organised by local
 * days; slicing the ISO string would mis-bucket records around midnight.
 */
export function localDayRefFromTimestamp(createdAt: string): DayRef | null {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(
    monthV2DayFormatter
      .formatToParts(date)
      .filter(part => part.type === 'year' || part.type === 'month' || part.type === 'day')
      .map(part => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}` as DayRef
}

/**
 * Per-day journal/emotion/exercise markers for the rail mini-calendar.
 * Journal and emotion instants are bucketed to the user's local `DayRef`;
 * exercise completions already store an exact canonical local day.
 */
export function buildMonthV2Activity(
  monthRef: MonthRef,
  todayRef: DayRef,
  sources: MonthV2ActivitySources
): MonthV2Activity {
  const bounds = getPeriodBounds(monthRef)
  const days: MonthV2ActivityDay[] = []
  const journalCountByDay = new Map<DayRef, number>()
  const emotionLogsByDay = new Map<DayRef, MonthV2ActivitySources['emotionLogs']>()

  for (const createdAt of sources.journalCreatedAts) {
    const dayRef = localDayRefFromTimestamp(createdAt)
    if (!dayRef) continue
    journalCountByDay.set(dayRef, (journalCountByDay.get(dayRef) ?? 0) + 1)
  }

  for (const log of sources.emotionLogs) {
    const dayRef = localDayRefFromTimestamp(log.createdAt)
    if (!dayRef) continue
    const bucket = emotionLogsByDay.get(dayRef) ?? []
    bucket.push(log)
    emotionLogsByDay.set(dayRef, bucket)
  }

  for (let dayRef = bounds.start; dayRef <= bounds.end; dayRef = addDaysToDayRef(dayRef, 1)) {
    const isFuture = dayRef > todayRef
    const dayLogs = isFuture ? [] : (emotionLogsByDay.get(dayRef) ?? [])
    const journalCount = isFuture ? 0 : (journalCountByDay.get(dayRef) ?? 0)
    const quadrantCounts = emptyQuadrantCounts()
    for (const log of dayLogs) {
      for (const quadrant of log.quadrants) {
        quadrantCounts[quadrant]++
      }
    }

    days.push({
      dayRef,
      weekdayIndex: weekdayIndexOf(dayRef),
      isToday: dayRef === todayRef,
      isFuture,
      journalWritten: journalCount > 0,
      journalCount,
      emotionCount: dayLogs.length,
      quadrantCounts,
      exerciseCount: isFuture ? 0 : sources.exerciseDayRefs.filter(ref => ref === dayRef).length,
    })
  }

  return {
    days,
    totals: {
      emotionSessions: days.reduce((sum, day) => sum + day.emotionCount, 0),
      journalEntries: days.reduce((sum, day) => sum + day.journalCount, 0),
      exercises: days.reduce((sum, day) => sum + day.exerciseCount, 0),
    },
  }
}

/** 0 = Monday … 6 = Sunday, from the canonical day ref. */
function weekdayIndexOf(dayRef: DayRef): number {
  const date = new Date(`${dayRef}T12:00:00.000Z`)
  return (date.getUTCDay() + 6) % 7
}

function buildWeeklyRadar(reflection: WeeklyReflection | undefined): MonthV2WeeklyRadar | null {
  if (!reflection) return null

  const requirements = REFLECTION_MATRIX_AREAS.map(area => ({
    key: area.key,
    value: reflection[area.fields.demands] as number | null,
    max: 5 as const,
  }))
  const state = REFLECTION_MATRIX_AREAS.map(area => ({
    key: area.key,
    value: reflection[area.fields.state] as number | null,
    max: 5 as const,
  }))

  return [...requirements, ...state].some(axis => axis.value !== null)
    ? { requirements, state }
    : null
}

function buildWeekColumns(
  monthRef: MonthRef,
  todayRef: DayRef,
  weeklyReflections: WeeklyReflection[]
): MonthV2WeekColumn[] {
  const reflectionByWeek = new Map(weeklyReflections.map(r => [r.weekRef, r]))

  return (getChildPeriods(monthRef) as WeekRef[]).map(weekRef => {
    const bounds = getPeriodBounds(weekRef)
    const dayRefs = getChildPeriods(weekRef) as DayRef[]
    const inMonthDayRefs = dayRefs.filter(dayRef => getPeriodRefsForDate(dayRef).month === monthRef)

    const visibleStart = inMonthDayRefs[0] ?? bounds.start
    const visibleEnd = inMonthDayRefs.at(-1) ?? bounds.end
    const phase: MonthV2Phase =
      visibleEnd < todayRef ? 'past' : visibleStart > todayRef ? 'future' : 'current'

    const reflection = reflectionByWeek.get(weekRef)
    return {
      weekRef,
      weekStart: bounds.start,
      weekEnd: bounds.end,
      inMonthDayRefs,
      isBoundary: inMonthDayRefs.length < dayRefs.length,
      phase,
      reflectionMatrix: reflection ? matrixFromReflection(reflection) : null,
      radar: buildWeeklyRadar(reflection),
    }
  })
}

function numericTargetValue(subject: MeasureableSubject): number | undefined {
  return 'target' in subject ? subject.target?.value : undefined
}

function valueAggregation(subject: MeasureableSubject): 'sum' | 'average' | 'last' {
  return 'target' in subject && subject.target?.kind === 'value'
    ? subject.target.aggregation
    : 'last'
}

function hasData(datum: { actualValue?: number; entryCount: number }): boolean {
  return datum.actualValue !== undefined || datum.entryCount > 0
}

/**
 * Neutral status mapping: contribution weeks and the current/future weeks are
 * never judged; past evaluated weeks surface the real evaluation, past rows
 * without a target (trackers) stay neutral.
 */
function weekStatus(
  phase: MonthV2Phase,
  contributionOnly: boolean,
  datum: { actualValue?: number; entryCount: number },
  evaluationStatus?: MeasurementSummary['evaluationStatus']
): MonthV2WeekStatus {
  if (contributionOnly || phase !== 'past') {
    return hasData(datum) ? 'in-progress' : 'no-data'
  }
  return evaluationStatus ?? (hasData(datum) ? 'in-progress' : 'no-data')
}

/** Neutral raw aggregate over an arbitrary slice of a subject's entries. */
function computeContribution(
  subject: MeasureableSubject,
  entries: DailyMeasurementEntry[]
): number | undefined {
  if (entries.length === 0) return undefined
  switch (subject.entryMode) {
    case 'completion':
      return entries.length
    case 'counter':
      return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
    case 'value': {
      switch (valueAggregation(subject)) {
        case 'sum':
          return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0)
        case 'average':
          return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0) / entries.length
        case 'last':
          return (
            [...entries].sort((a, b) => a.dayRef.localeCompare(b.dayRef)).at(-1)?.value ?? undefined
          )
      }
      break
    }
    case 'rating':
      return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0) / entries.length
    case 'multi-completion':
      return entries.filter(entry => multiCompletionDayMet(subject, entry)).length
  }
}

interface ScaleOptions {
  includeZero?: boolean
  fixedMin?: number
  fixedMax?: number
  extraValues?: number[]
}

function numericScale(weeks: MonthV2WeekDatum[], options: ScaleOptions = {}): MonthV2NumericScale {
  const values: number[] = [...(options.extraValues ?? [])]
  for (const week of weeks) {
    if (week.actualValue !== undefined) values.push(week.actualValue)
    if (week.targetValue !== undefined) values.push(week.targetValue)
  }
  if (options.includeZero) values.push(0)

  let min = values.length > 0 ? Math.min(...values) : 0
  let max = values.length > 0 ? Math.max(...values) : 1
  if (options.fixedMin !== undefined) min = options.fixedMin
  if (options.fixedMax !== undefined) max = options.fixedMax
  if (min === max) max = min + 1
  return { min, max }
}

// ── Series building ──────────────────────────────────────────────────────────

interface SeriesInput {
  subject: MeasureableSubject
  cadence: PlanningCadence
  entryMode: MeasurementEntryMode
  scheduledDayRefs: DayRef[]
  hasSpecificDays: boolean
  weekOverrides: Partial<Record<WeekRef, MeasurementTarget>>
  entries: DailyMeasurementEntry[]
  /** Intentions: only this week carries data, the others render inactive. */
  homeWeekRef?: WeekRef
}

function buildSeriesWeeks(input: SeriesInput, columns: MonthV2WeekColumn[], todayRef: DayRef) {
  const entriesByDay = new Map(input.entries.map(entry => [entry.dayRef, entry]))
  const scheduledSet = new Set(input.scheduledDayRefs)
  const isMulti = input.entryMode === 'multi-completion'
  const threshold = isMulti ? multiCompletionEffectiveThreshold(input.subject) : 0

  return columns.map((column): MonthV2WeekDatum => {
    if (input.homeWeekRef && column.weekRef !== input.homeWeekRef) {
      return {
        weekRef: column.weekRef,
        phase: column.phase,
        entryCount: 0,
        status: 'no-data',
        contributionOnly: false,
        hasWeekOverride: false,
        inactive: true,
      }
    }

    const weekOverride = input.weekOverrides[column.weekRef]
    const contributionOnly = input.cadence === 'monthly'
    let datum: MonthV2WeekDatum

    if (contributionOnly) {
      const allowedDays = new Set(column.inMonthDayRefs.filter(dayRef => dayRef <= todayRef))
      const weekEntries = input.entries.filter(entry => allowedDays.has(entry.dayRef))
      const actualValue = computeContribution(input.subject, weekEntries)
      const base = { actualValue, entryCount: weekEntries.length }
      datum = {
        weekRef: column.weekRef,
        phase: column.phase,
        actualValue,
        entryCount: weekEntries.length,
        status: weekStatus(column.phase, true, base),
        contributionOnly: true,
        // Monthly cadence: the target belongs to the month, never to a week —
        // a week sub-target only surfaces via hasWeekOverride styling.
        targetValue: undefined,
        hasWeekOverride: weekOverride !== undefined,
      }
    } else {
      const effectiveSubject = applyMeasurementTargetOverride(input.subject, weekOverride)
      const summary = buildMeasurementSummary(
        effectiveSubject,
        input.entries,
        column.weekRef,
        todayRef
      )
      datum = {
        weekRef: column.weekRef,
        phase: column.phase,
        actualValue: summary.actualValue,
        entryCount: summary.entryCount,
        status: weekStatus(column.phase, false, summary, summary.evaluationStatus),
        contributionOnly: false,
        targetValue: numericTargetValue(effectiveSubject),
        hasWeekOverride: weekOverride !== undefined,
        qualifiedEntryDays: summary.qualifiedEntryDays,
      }
    }

    const needsDaySlots = input.entryMode === 'completion' && input.hasSpecificDays
    if (needsDaySlots) {
      datum.days = (getChildPeriods(column.weekRef) as DayRef[]).map(dayRef => ({
        dayRef,
        inMonth: column.inMonthDayRefs.includes(dayRef),
        scheduled: scheduledSet.has(dayRef),
        completed: entriesByDay.has(dayRef),
      }))
    }

    if (isMulti) {
      datum.multiDays = (getChildPeriods(column.weekRef) as DayRef[]).map(dayRef => {
        const entry = entriesByDay.get(dayRef)
        const points = entry ? multiCompletionDayPoints(input.subject, entry) : 0
        return {
          dayRef,
          inMonth: column.inMonthDayRefs.includes(dayRef),
          state: entry
            ? multiCompletionDayMet(input.subject, entry)
              ? 'met'
              : 'partial'
            : 'empty',
          points,
          threshold,
        }
      })
    }

    return datum
  })
}

function buildSeries(
  input: SeriesInput,
  columns: MonthV2WeekColumn[],
  todayRef: DayRef
): MonthV2Series {
  const weeks = buildSeriesWeeks(input, columns, todayRef)
  const { subject, entryMode, cadence } = input

  const ratingScale = () =>
    numericScale(weeks, {
      fixedMin: subject.ratingScaleMin ?? 1,
      fixedMax: subject.ratingScale ?? 10,
    })

  if (cadence === 'monthly') {
    const display =
      entryMode === 'multi-completion'
        ? 'multi'
        : entryMode === 'completion'
          ? input.hasSpecificDays
            ? 'scheduled-days'
            : 'count'
          : entryMode === 'counter'
            ? 'bars'
            : entryMode === 'rating'
              ? 'rating'
              : valueAggregation(subject) === 'sum'
                ? 'bars'
                : 'line'

    const scale =
      display === 'bars'
        ? numericScale(weeks, { includeZero: true })
        : display === 'line'
          ? numericScale(weeks)
          : display === 'rating'
            ? ratingScale()
            : undefined

    return { kind: 'monthly-contribution', display, weeks, scale }
  }

  if (entryMode === 'multi-completion') {
    return { kind: 'multi-completion', weeks }
  }

  if (entryMode === 'completion') {
    if (input.hasSpecificDays) {
      return { kind: 'scheduled-days', weeks }
    }
    const targetValue = numericTargetValue(subject)
    const display =
      targetValue !== undefined && targetValue > 0 && targetValue <= 7 ? 'segments' : 'bullet'
    return { kind: 'completion-progress', display, weeks }
  }

  if (entryMode === 'counter') {
    return { kind: 'bars', weeks, scale: numericScale(weeks, { includeZero: true }) }
  }

  if (entryMode === 'rating') {
    return { kind: 'rating', weeks, scale: ratingScale() }
  }

  const aggregation = valueAggregation(subject)
  if (aggregation === 'sum') {
    return { kind: 'bars', weeks, scale: numericScale(weeks, { includeZero: true }) }
  }
  return { kind: 'line', aggregation, weeks, scale: numericScale(weeks) }
}

// ── Sections ─────────────────────────────────────────────────────────────────

function isEditable(subject: MeasureableSubject): boolean {
  return subject.status === 'open'
}

function rowFromObjectItem(
  item: MonthObjectItem,
  columns: MonthV2WeekColumn[],
  rawEntries: DailyMeasurementEntry[],
  todayRef: DayRef
): MonthV2Row {
  const subject = item.subject
  const entries = rawEntries.filter(entry => entry.subjectId === subject.id)
  const hasSpecificDays =
    item.planning.scheduleScope === 'specific-days' || item.planning.scheduledDayRefs.length > 0

  return {
    key: item.key,
    subjectId: subject.id,
    subjectType: item.subjectType as MonthV2SubjectType,
    title: subject.title,
    icon: ('icon' in subject ? subject.icon : undefined) ?? item.parentGoalIcon,
    parentGoal: item.parentGoalId
      ? { id: item.parentGoalId, title: item.parentGoalTitle ?? '', icon: item.parentGoalIcon }
      : undefined,
    cadence: subject.cadence,
    entryMode: subject.entryMode,
    editable: isEditable(subject),
    monthSummary: item.measurement,
    subject,
    series: buildSeries(
      {
        subject,
        cadence: subject.cadence,
        entryMode: subject.entryMode,
        scheduledDayRefs: item.planning.scheduledDayRefs,
        hasSpecificDays,
        weekOverrides: item.weekTargetOverrides ?? {},
        entries,
      },
      columns,
      todayRef
    ),
  }
}

function rowFromIntention(
  intention: WeeklyIntention,
  columns: MonthV2WeekColumn[],
  rawEntries: DailyMeasurementEntry[],
  todayRef: DayRef
): MonthV2Row {
  const entries = rawEntries.filter(entry => entry.subjectId === intention.id)

  return {
    key: `weeklyIntention:${intention.id}`,
    subjectId: intention.id,
    subjectType: 'weeklyIntention',
    title: intention.title,
    icon: intention.icon,
    cadence: 'weekly',
    entryMode: intention.entryMode,
    // Intentions are created/edited in the weekly ritual, never in the month planner.
    editable: false,
    homeWeekRef: intention.weekRef,
    monthSummary: buildMeasurementSummary(intention, entries, intention.weekRef, todayRef),
    subject: intention,
    series: buildSeries(
      {
        subject: intention,
        cadence: 'weekly',
        entryMode: intention.entryMode,
        scheduledDayRefs: [],
        hasSpecificDays: false,
        weekOverrides: {},
        entries,
        homeWeekRef: intention.weekRef,
      },
      columns,
      todayRef
    ),
  }
}

function rowIsCovered(row: MonthV2Row): boolean {
  return row.series.weeks.some(week => week.entryCount > 0)
}

function buildSection(
  key: MonthV2SectionKey,
  groups: MonthV2Group[],
  objectCount?: number
): MonthV2Section {
  const rows = groups.flatMap(group => group.rows)
  return {
    key,
    objectCount: objectCount ?? rows.length,
    rowCount: rows.length,
    coveredRows: rows.filter(rowIsCovered).length,
    groups: groups.filter(group => group.rows.length > 0),
  }
}

function buildSections(
  objectItems: MonthObjectItem[],
  intentions: WeeklyIntention[],
  columns: MonthV2WeekColumn[],
  rawEntries: DailyMeasurementEntry[],
  todayRef: DayRef
): MonthV2Section[] {
  const sorted = [...objectItems].sort((a, b) => a.sortOrder - b.sortOrder)
  const toRow = (item: MonthObjectItem) => rowFromObjectItem(item, columns, rawEntries, todayRef)

  // Goals: one group per parent goal (bundle order), orphan KRs go last.
  const goalGroups = new Map<string, MonthV2Group>()
  const orphanRows: MonthV2Row[] = []
  for (const item of sorted.filter(item => item.subjectType === 'keyResult')) {
    const row = toRow(item)
    if (!item.parentGoalId) {
      orphanRows.push(row)
      continue
    }
    const group = goalGroups.get(item.parentGoalId) ?? {
      key: `goal:${item.parentGoalId}`,
      title: item.parentGoalTitle,
      icon: item.parentGoalIcon,
      goalId: item.parentGoalId,
      rows: [],
    }
    group.rows.push(row)
    goalGroups.set(item.parentGoalId, group)
  }
  const goalGroupList: MonthV2Group[] = [...goalGroups.values()]
  if (orphanRows.length > 0) {
    goalGroupList.push({ key: 'goal:unlinked', rows: orphanRows })
  }

  const habitRows = sorted.filter(item => item.subjectType === 'habit').map(toRow)
  const trackerRows = sorted.filter(item => item.subjectType === 'tracker').map(toRow)

  // Intentions live in exactly one week each — grouping them per week keeps
  // the section compact and gives the single active cell its context.
  const intentionGroups: MonthV2Group[] = columns.flatMap(column => {
    const rows = intentions
      .filter(intention => intention.weekRef === column.weekRef)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(intention => rowFromIntention(intention, columns, rawEntries, todayRef))
    return rows.length > 0 ? [{ key: `week:${column.weekRef}`, rows }] : []
  })

  return [
    buildSection('goals', goalGroupList, goalGroups.size),
    buildSection('habits', [{ key: 'habits', rows: habitRows }]),
    buildSection('trackers', [{ key: 'trackers', rows: trackerRows }]),
    buildSection('intentions', intentionGroups),
  ]
}

const FOCUS_META: Record<MonthV2FocusKey, { label: string; icon: string }> = {
  goals: { label: 'planning.calendar.sections.goals', icon: 'flag' },
  habits: { label: 'planning.calendar.sections.habits', icon: 'loop' },
  trackers: { label: 'planning.calendar.sections.trackers', icon: 'monitoring' },
  intentions: {
    label: 'planning.calendar.monthV2.sections.intentions',
    icon: 'edit_calendar',
  },
  emotions: { label: 'planning.calendar.wellness.emotions', icon: 'mood' },
  journal: { label: 'planning.calendar.wellness.journal', icon: 'menu_book' },
}

function percentage(met: number, total: number): number | undefined {
  return total > 0 ? Math.round((met / total) * 100) : undefined
}

function rowsOf(section: MonthV2Section | undefined): MonthV2Row[] {
  return section?.groups.flatMap(group => group.rows) ?? []
}

function attainmentCategory(
  key: 'goals' | 'habits',
  section: MonthV2Section | undefined
): MonthV2CategoryAggregate {
  const evaluated = rowsOf(section).filter(row => {
    const status = row.monthSummary?.evaluationStatus
    return status === 'met' || status === 'missed'
  })
  const met = evaluated.filter(row => row.monthSummary?.evaluationStatus === 'met').length
  const total = evaluated.length
  return {
    key,
    ...FOCUS_META[key],
    metric: 'attainment',
    met,
    total,
    percentage: percentage(met, total),
  }
}

function coverageCategory(
  key: 'trackers',
  section: MonthV2Section | undefined
): MonthV2CategoryAggregate {
  const met = section?.coveredRows ?? 0
  const total = section?.rowCount ?? 0
  return {
    key,
    ...FOCUS_META[key],
    metric: 'coverage',
    met,
    total,
    percentage: percentage(met, total),
  }
}

function intentionAttainmentCategory(
  section: MonthV2Section | undefined
): MonthV2CategoryAggregate {
  const rows = rowsOf(section)
  const met = rows.filter(row => row.monthSummary?.evaluationStatus === 'met').length
  const total = rows.length
  return {
    key: 'intentions',
    ...FOCUS_META.intentions,
    metric: 'attainment',
    met,
    total,
    percentage: percentage(met, total),
  }
}

function wellnessCoverageCategory(
  key: 'emotions' | 'journal',
  activity: MonthV2Activity
): MonthV2CategoryAggregate {
  const elapsedDays = activity.days.filter(day => !day.isFuture)
  const met = elapsedDays.filter(day =>
    key === 'emotions' ? day.emotionCount > 0 : day.journalCount > 0
  ).length
  const total = elapsedDays.length
  return {
    key,
    ...FOCUS_META[key],
    metric: 'coverage',
    met,
    total,
    percentage: percentage(met, total),
  }
}

function buildCategories(
  sections: MonthV2Section[],
  activity: MonthV2Activity
): Record<MonthV2FocusKey, MonthV2CategoryAggregate> {
  const byKey = new Map(sections.map(section => [section.key, section]))
  return {
    goals: attainmentCategory('goals', byKey.get('goals')),
    habits: attainmentCategory('habits', byKey.get('habits')),
    trackers: coverageCategory('trackers', byKey.get('trackers')),
    intentions: intentionAttainmentCategory(byKey.get('intentions')),
    emotions: wellnessCoverageCategory('emotions', activity),
    journal: wellnessCoverageCategory('journal', activity),
  }
}

function priorityIdsForRow(row: MonthV2Row, goalPriorityIds: Map<string, string[]>): string[] {
  const ids = row.parentGoal
    ? (goalPriorityIds.get(row.parentGoal.id) ?? [])
    : 'priorityIds' in row.subject
      ? row.subject.priorityIds
      : []
  return [...new Set(ids)]
}

function focusRowFromObjectRow(
  row: MonthV2Row,
  goalPriorityIds: Map<string, string[]>
): MonthV2FocusRow {
  return {
    key: row.key,
    title: row.title,
    icon: row.icon,
    subjectId: row.subjectId,
    subjectType: row.subjectType,
    parentGoal: row.parentGoal,
    priorityIds: priorityIdsForRow(row, goalPriorityIds),
    monthValue: row.monthSummary?.actualValue,
    targetValue: numericTargetValue(row.subject),
    entryCount: row.monthSummary?.entryCount,
    status: row.monthSummary?.evaluationStatus,
    series: row.series,
  }
}

function activityWeekSummaries(
  key: 'emotions' | 'journal',
  weeks: MonthV2WeekColumn[],
  activity: MonthV2Activity
): MonthV2FocusWeekSummary[] {
  const activityByDay = new Map(activity.days.map(day => [day.dayRef, day]))
  return weeks.map(week => {
    const days = week.inMonthDayRefs.flatMap(dayRef => {
      const day = activityByDay.get(dayRef)
      return day ? [day] : []
    })
    const count = days.reduce(
      (sum, day) => sum + (key === 'emotions' ? day.emotionCount : day.journalCount),
      0
    )
    const activeDayCount = days.filter(day =>
      key === 'emotions' ? day.emotionCount > 0 : day.journalCount > 0
    ).length
    if (key === 'journal') return { weekRef: week.weekRef, count, activeDayCount }

    const quadrantCounts = emptyQuadrantCounts()
    for (const day of days) {
      for (const quadrant of Object.keys(quadrantCounts) as Quadrant[]) {
        quadrantCounts[quadrant] += day.quadrantCounts[quadrant]
      }
    }
    return { weekRef: week.weekRef, count, activeDayCount, quadrantCounts }
  })
}

function intentionFocusSection(
  section: MonthV2Section | undefined,
  weeks: MonthV2WeekColumn[],
  goalPriorityIds: Map<string, string[]>
): MonthV2FocusSection {
  const rows = rowsOf(section)
  const met = rows.filter(row => row.monthSummary?.evaluationStatus === 'met').length
  const priorityIds = [...new Set(rows.flatMap(row => priorityIdsForRow(row, goalPriorityIds)))]

  return {
    key: 'intentions',
    rows: [
      {
        key: 'intentions:month',
        icon: FOCUS_META.intentions.icon,
        priorityIds,
        monthValue: met,
        targetValue: rows.length,
        entryCount: rows.reduce((sum, row) => sum + (row.monthSummary?.entryCount ?? 0), 0),
        weeks: weeks.map(week => {
          const weekRows = rows.filter(row => row.homeWeekRef === week.weekRef)
          const weekMet = weekRows.filter(
            row => row.monthSummary?.evaluationStatus === 'met'
          ).length
          return {
            weekRef: week.weekRef,
            count: weekRows.length,
            activeDayCount: weekRows.filter(row => (row.monthSummary?.entryCount ?? 0) > 0).length,
            met: weekMet,
            total: weekRows.length,
            icons: weekRows.map(row => row.icon ?? FOCUS_META.intentions.icon),
          }
        }),
      },
    ],
  }
}

function reflectionText(
  reflection: Pick<
    MonthlyReflection | WeeklyReflection,
    'aiSummary' | 'freeformReflection' | 'promptResponses'
  >
): string | undefined {
  const aiSummary = reflection.aiSummary.trim()
  if (aiSummary) return aiSummary
  const freeform = reflection.freeformReflection.trim()
  if (freeform) return freeform
  const promptText = Object.values(reflection.promptResponses)
    .map(value => value.trim())
    .filter(Boolean)
    .join('\n')
  return promptText || undefined
}

function reflectionWeekSummaries(
  weeks: MonthV2WeekColumn[],
  weeklyReflections: WeeklyReflection[]
): MonthV2FocusWeekSummary[] {
  const reflectionByWeek = new Map(
    weeklyReflections.map(reflection => [reflection.weekRef, reflection])
  )
  return weeks.map(week => {
    const reflection = reflectionByWeek.get(week.weekRef)
    return {
      weekRef: week.weekRef,
      count: reflection ? 1 : 0,
      activeDayCount: reflection ? 1 : 0,
      icons: reflection ? ['rate_review'] : [],
      text: reflection ? reflectionText(reflection) : undefined,
    }
  })
}

function buildFocusSections(
  sections: MonthV2Section[],
  planning: MonthPlanningBundle,
  weeks: MonthV2WeekColumn[],
  activity: MonthV2Activity,
  monthlyReflection: MonthlyReflection | null,
  weeklyReflections: WeeklyReflection[]
): Record<MonthV2FocusKey, MonthV2FocusSection> {
  const byKey = new Map(sections.map(section => [section.key, section]))
  const goalPriorityIds = new Map(
    planning.goalItems.map(item => [item.goal.id, item.goal.priorityIds ?? []])
  )
  const objectSection = (key: MonthV2SectionKey): MonthV2FocusSection => ({
    key,
    rows: rowsOf(byKey.get(key)).map(row => focusRowFromObjectRow(row, goalPriorityIds)),
  })

  const emotionQuadrants = emptyQuadrantCounts()
  for (const day of activity.days) {
    for (const quadrant of Object.keys(emotionQuadrants) as Quadrant[]) {
      emotionQuadrants[quadrant] += day.quadrantCounts[quadrant]
    }
  }
  const journalReflectionWeeks = reflectionWeekSummaries(weeks, weeklyReflections)

  return {
    goals: objectSection('goals'),
    habits: objectSection('habits'),
    trackers: objectSection('trackers'),
    intentions: intentionFocusSection(byKey.get('intentions'), weeks, goalPriorityIds),
    emotions: {
      key: 'emotions',
      rows: [
        {
          key: 'emotions:month',
          icon: FOCUS_META.emotions.icon,
          priorityIds: [],
          monthValue: activity.totals.emotionSessions,
          entryCount: activity.totals.emotionSessions,
          weeks: activityWeekSummaries('emotions', weeks, activity),
          quadrantCounts: emotionQuadrants,
        },
      ],
    },
    journal: {
      key: 'journal',
      rows: [
        {
          key: 'journal:daily',
          icon: FOCUS_META.journal.icon,
          priorityIds: [],
          monthValue: activity.totals.journalEntries,
          entryCount: activity.totals.journalEntries,
          weeks: activityWeekSummaries('journal', weeks, activity),
        },
        {
          key: 'journal:reflections',
          icon: 'rate_review',
          priorityIds: [],
          monthValue: monthlyReflection ? 1 : 0,
          entryCount:
            (monthlyReflection ? 1 : 0) +
            journalReflectionWeeks.filter(week => week.count > 0).length,
          text: monthlyReflection ? reflectionText(monthlyReflection) : undefined,
          weeks: journalReflectionWeeks,
        },
      ],
    },
  }
}

function buildPriorities(data: MonthV2OverviewData): MonthV2Priority[] {
  const focusByPriority = new Map(
    (data.priorityFocus?.perPriority ?? []).map(focus => [focus.priorityId, focus])
  )
  return (data.topPriorities ?? []).map(priority => {
    const focus = focusByPriority.get(priority.id)
    return {
      id: priority.id,
      title: priority.title,
      icon: priority.icon,
      focusWeekRefs: focus?.focusWeekRefs ?? [],
      focusObjectCount: focus?.objects.length ?? 0,
    }
  })
}

function buildMonthAxes(reflection: MonthlyReflection | null): MonthV2CompassAxis[] {
  return MONTHLY_RATING_KEYS.map(key => ({
    key,
    value: reflection?.[key] ?? null,
    max: 5 as const,
  }))
}

function buildCompass(axes: MonthV2CompassAxis[]): { axes: MonthV2CompassAxis[] } | null {
  return axes.some(axis => axis.value !== null) ? { axes } : null
}

// ── Entry points ─────────────────────────────────────────────────────────────

export function buildMonthV2OverviewViewModel(data: MonthV2OverviewData): MonthV2OverviewViewModel {
  const weeks = buildWeekColumns(data.monthRef, data.todayRef, data.weeklyReflections)
  const monthAxes = buildMonthAxes(data.monthlyReflection)
  const sections = buildSections(
    data.objectItems,
    data.weeklyIntentions,
    weeks,
    data.planning.rawEntries,
    data.todayRef
  )

  return {
    monthRef: data.monthRef,
    todayRef: data.todayRef,
    monthAxes,
    weeks,
    priorities: buildPriorities(data),
    categories: buildCategories(sections, data.activity),
    focusSections: buildFocusSections(
      sections,
      data.planning,
      weeks,
      data.activity,
      data.monthlyReflection,
      data.weeklyReflections
    ),
    rail: {
      compass: buildCompass(monthAxes),
      activity: data.activity,
    },
    sections,
  }
}

export async function loadMonthV2OverviewData(monthRef: MonthRef): Promise<MonthV2OverviewData> {
  const todayRef = getPeriodRefsForDate(new Date()).day

  const structuredReflectionStore = useStructuredReflectionStore()
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const exerciseCompletionsStore = useExerciseCompletionsStore()

  const [planning, weeklyIntentions, activePriorities] = await Promise.all([
    getMonthPlanningBundle(monthRef),
    listWeeklyIntentionsForMonth(monthRef),
    getActivePrioritiesForMonth(monthRef),
    structuredReflectionStore.weeklyReflections.length === 0 &&
    structuredReflectionStore.monthlyReflections.length === 0 &&
    !structuredReflectionStore.isLoading
      ? structuredReflectionStore.loadAll()
      : Promise.resolve(),
    journalStore.ensureLoaded(),
    emotionLogStore.ensureLoaded(),
    emotionStore.isLoaded ? Promise.resolve() : emotionStore.loadEmotions(),
    exerciseCompletionsStore.ensureLoaded(),
  ])

  const weekRefs = getChildPeriods(monthRef) as WeekRef[]
  const weeklyReflections = weekRefs
    .map(weekRef => structuredReflectionStore.getWeeklyByRef(weekRef))
    .filter((reflection): reflection is WeeklyReflection => Boolean(reflection))

  const priorityById = new Map(activePriorities.map(priority => [priority.id, priority]))
  const topPriorities = (planning.monthPlan?.topPriorityIds ?? []).flatMap(priorityId => {
    const priority = priorityById.get(priorityId)
    return priority ? [priority] : []
  })
  const priorityFocus =
    topPriorities.length > 0
      ? await getMonthlyFocusConfrontation(
          monthRef,
          topPriorities.map(priority => priority.id)
        )
      : undefined

  const activity = buildMonthV2Activity(monthRef, todayRef, {
    journalCreatedAts: journalStore.sortedEntries.map(entry => entry.createdAt),
    emotionLogs: emotionLogStore.sortedLogs.map(log => ({
      createdAt: log.createdAt,
      quadrants: log.emotionIds.flatMap(emotionId => {
        const emotion = emotionStore.getEmotionById(emotionId)
        return emotion ? [getQuadrant(emotion)] : []
      }),
    })),
    exerciseDayRefs: exerciseCompletionsStore.completions.map(completion => completion.dayRef),
  })

  return {
    monthRef,
    todayRef,
    planning,
    objectItems: buildMonthObjectItems(planning),
    monthlyReflection: structuredReflectionStore.getMonthlyByRef(monthRef) ?? null,
    weeklyReflections,
    weeklyIntentions,
    activity,
    topPriorities,
    priorityFocus,
  }
}
