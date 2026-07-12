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
import type { DayRef, MonthRef, PeriodRef, WeekRef } from '@/domain/period'
import type {
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  WeeklyIntention,
} from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthlyReflection, WeeklyReflection, MonthlyRatingKey } from '@/domain/reflection'
import { MONTHLY_RATING_KEYS } from '@/domain/reflection'
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
import { addDaysToDayRef, getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import {
  buildPeriodActivity,
  type PeriodActivity,
  type PeriodActivityDay,
  type PeriodActivitySources,
} from '@/services/periodActivity'
import {
  computePeriodContribution,
  measurementValueAggregation,
  periodColumnStatus,
  periodNumericScale,
} from '@/services/periodSeriesModel'
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
  /** Scale-neutral chart key; Week V2 uses a day ref while Month V2 omits it. */
  columnRef?: PeriodRef
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

export type MonthV2ActivityDay = PeriodActivityDay
export type MonthV2Activity = PeriodActivity

export interface MonthV2Rail {
  /** null unless a monthly reflection exists with ≥1 rated axis. */
  compass: { axes: MonthV2CompassAxis[] } | null
  activity: MonthV2Activity
}

export interface MonthV2OverviewViewModel {
  monthRef: MonthRef
  todayRef: DayRef
  weeks: MonthV2WeekColumn[]
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
}

/** Raw per-source inputs for the activity mini-calendar (pure, testable). */
export type MonthV2ActivitySources = PeriodActivitySources

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Per-day journal/emotion/exercise markers for the rail mini-calendar.
 * Journal and emotion logs match by UTC day window on `createdAt`; exercise
 * completions match by exact canonical `dayRef` (they already store the local
 * day) — mirrors the stream's day cards.
 */
export function buildMonthV2Activity(
  monthRef: MonthRef,
  todayRef: DayRef,
  sources: MonthV2ActivitySources
): MonthV2Activity {
  const bounds = getPeriodBounds(monthRef)
  const dayRefs: DayRef[] = []
  for (let dayRef = bounds.start; dayRef <= bounds.end; dayRef = addDaysToDayRef(dayRef, 1)) {
    dayRefs.push(dayRef)
  }
  return buildPeriodActivity(dayRefs, todayRef, sources)
}

function buildWeekColumns(
  monthRef: MonthRef,
  todayRef: DayRef,
  weeklyReflections: WeeklyReflection[]
): MonthV2WeekColumn[] {
  const reflectionByWeek = new Map(weeklyReflections.map((r) => [r.weekRef, r]))

  return (getChildPeriods(monthRef) as WeekRef[]).map((weekRef) => {
    const bounds = getPeriodBounds(weekRef)
    const dayRefs = getChildPeriods(weekRef) as DayRef[]
    const inMonthDayRefs = dayRefs.filter(
      (dayRef) => getPeriodRefsForDate(dayRef).month === monthRef
    )

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
    }
  })
}

function numericTargetValue(subject: MeasureableSubject): number | undefined {
  return 'target' in subject ? subject.target?.value : undefined
}

function valueAggregation(subject: MeasureableSubject): 'sum' | 'average' | 'last' {
  return measurementValueAggregation(subject)
}

/**
 * Neutral status mapping: contribution weeks and the current/future weeks are
 * never judged; past evaluated weeks surface the real evaluation, past rows
 * without a target (trackers) stay neutral.
 */
const weekStatus = periodColumnStatus
const computeContribution = computePeriodContribution
const numericScale = periodNumericScale

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
  const entriesByDay = new Map(input.entries.map((entry) => [entry.dayRef, entry]))
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
      const allowedDays = new Set(
        column.inMonthDayRefs.filter((dayRef) => dayRef <= todayRef)
      )
      const weekEntries = input.entries.filter((entry) => allowedDays.has(entry.dayRef))
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
      datum.days = (getChildPeriods(column.weekRef) as DayRef[]).map((dayRef) => ({
        dayRef,
        inMonth: column.inMonthDayRefs.includes(dayRef),
        scheduled: scheduledSet.has(dayRef),
        completed: entriesByDay.has(dayRef),
      }))
    }

    if (isMulti) {
      datum.multiDays = (getChildPeriods(column.weekRef) as DayRef[]).map((dayRef) => {
        const entry = entriesByDay.get(dayRef)
        const points = entry ? multiCompletionDayPoints(input.subject, entry) : 0
        return {
          dayRef,
          inMonth: column.inMonthDayRefs.includes(dayRef),
          state: entry ? (multiCompletionDayMet(input.subject, entry) ? 'met' : 'partial') : 'empty',
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
  const entries = rawEntries.filter((entry) => entry.subjectId === subject.id)
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
  const entries = rawEntries.filter((entry) => entry.subjectId === intention.id)

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
  return row.series.weeks.some((week) => week.entryCount > 0)
}

function buildSection(
  key: MonthV2SectionKey,
  groups: MonthV2Group[],
  objectCount?: number
): MonthV2Section {
  const rows = groups.flatMap((group) => group.rows)
  return {
    key,
    objectCount: objectCount ?? rows.length,
    rowCount: rows.length,
    coveredRows: rows.filter(rowIsCovered).length,
    groups: groups.filter((group) => group.rows.length > 0),
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
  for (const item of sorted.filter((item) => item.subjectType === 'keyResult')) {
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

  const habitRows = sorted.filter((item) => item.subjectType === 'habit').map(toRow)
  const trackerRows = sorted.filter((item) => item.subjectType === 'tracker').map(toRow)

  const intentionRows = [...intentions]
    .sort(
      (a, b) => a.weekRef.localeCompare(b.weekRef) || a.title.localeCompare(b.title)
    )
    .map((intention) => rowFromIntention(intention, columns, rawEntries, todayRef))

  return [
    buildSection('goals', goalGroupList, goalGroups.size),
    buildSection('habits', [{ key: 'habits', rows: habitRows }]),
    buildSection('trackers', [{ key: 'trackers', rows: trackerRows }]),
    buildSection('intentions', [{ key: 'intentions', rows: intentionRows }]),
  ]
}

function buildCompass(
  reflection: MonthlyReflection | null
): { axes: MonthV2CompassAxis[] } | null {
  if (!reflection) return null
  const axes = MONTHLY_RATING_KEYS.map((key) => ({
    key,
    value: reflection[key],
    max: 5 as const,
  }))
  return axes.some((axis) => axis.value !== null) ? { axes } : null
}

// ── Entry points ─────────────────────────────────────────────────────────────

export function buildMonthV2OverviewViewModel(data: MonthV2OverviewData): MonthV2OverviewViewModel {
  const weeks = buildWeekColumns(data.monthRef, data.todayRef, data.weeklyReflections)

  return {
    monthRef: data.monthRef,
    todayRef: data.todayRef,
    weeks,
    rail: {
      compass: buildCompass(data.monthlyReflection),
      activity: data.activity,
    },
    sections: buildSections(
      data.objectItems,
      data.weeklyIntentions,
      weeks,
      data.planning.rawEntries,
      data.todayRef
    ),
  }
}

export async function loadMonthV2OverviewData(monthRef: MonthRef): Promise<MonthV2OverviewData> {
  const todayRef = getPeriodRefsForDate(new Date()).day

  const structuredReflectionStore = useStructuredReflectionStore()
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const exerciseCompletionsStore = useExerciseCompletionsStore()

  const [planning, weeklyIntentions] = await Promise.all([
    getMonthPlanningBundle(monthRef),
    listWeeklyIntentionsForMonth(monthRef),
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
    .map((weekRef) => structuredReflectionStore.getWeeklyByRef(weekRef))
    .filter((reflection): reflection is WeeklyReflection => Boolean(reflection))

  const activity = buildMonthV2Activity(monthRef, todayRef, {
    journalCreatedAts: journalStore.sortedEntries.map((entry) => entry.createdAt),
    emotionLogs: emotionLogStore.sortedLogs.map((log) => ({
      createdAt: log.createdAt,
      quadrants: log.emotionIds.flatMap((emotionId) => {
        const emotion = emotionStore.getEmotionById(emotionId)
        return emotion ? [getQuadrant(emotion)] : []
      }),
    })),
    exerciseDayRefs: exerciseCompletionsStore.completions.map((completion) => completion.dayRef),
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
  }
}
