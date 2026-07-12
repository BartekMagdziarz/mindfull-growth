import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementEntryMode, PlanningCadence } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { WeeklyReflection } from '@/domain/reflection'
import type { Quadrant } from '@/domain/emotion'
import type {
  WeekMeasurementPlanningItem,
  WeekPlanningBundle,
  WeekReflectionBundle,
} from '@/services/planningStateQueries'
import { getWeekPlanningBundle, getWeekReflectionBundle } from '@/services/planningStateQueries'
import type { MeasurementSummary, MeasureableSubject } from '@/services/measurementProgress'
import {
  multiCompletionDayMet,
  multiCompletionDayPoints,
  multiCompletionEffectiveThreshold,
} from '@/services/measurementProgress'
import type { MonthV2Series, MonthV2WeekDatum } from '@/services/monthV2Overview'
import { buildPeriodActivity, type PeriodActivity } from '@/services/periodActivity'
import { computePeriodContribution, periodNumericScale } from '@/services/periodSeriesModel'
import { matrixFromReflection } from '@/components/calendar/stream/streamData'
import type { StreamMatrixRowVM } from '@/components/calendar/stream/streamModel'
import { getChildPeriods, getParentPeriod, getPeriodRefsForDate } from '@/utils/periods'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { getQuadrant } from '@/domain/emotion'

export type WeekV2Phase = 'past' | 'current' | 'future'
export type WeekV2SectionKey = 'goals' | 'habits' | 'trackers' | 'intentions'

export interface WeekV2DayColumn {
  dayRef: DayRef
  phase: WeekV2Phase
  isToday: boolean
  isBoundary: boolean
  activity: PeriodActivity['days'][number]
}

export interface WeekV2Row {
  key: string
  subjectId: string
  subjectType: MeasurementSubjectType
  title: string
  icon?: string
  parentGoal?: { id: string; title: string; icon?: string }
  cadence: PlanningCadence
  entryMode: MeasurementEntryMode
  editable: boolean
  subject: MeasureableSubject
  /** Real week verdict for weekly cadence or an explicit monthly sub-target. */
  weekSummary?: MeasurementSummary
  /** Month-to-date context for monthly cadence without a week sub-target. */
  contextSummary?: MeasurementSummary
  series: MonthV2Series
}

export interface WeekV2Group {
  key: string
  title?: string
  icon?: string
  goalId?: string
  rows: WeekV2Row[]
}

export interface WeekV2Section {
  key: WeekV2SectionKey
  objectCount: number
  rowCount: number
  coveredRows: number
  groups: WeekV2Group[]
}

export interface WeekV2Priority {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  icon?: string
  status: 'met' | 'missed' | 'in-progress' | 'no-data'
  summary?: MeasurementSummary
}

export interface WeekV2Rail {
  matrix: StreamMatrixRowVM[] | null
  activity: PeriodActivity
  topPriorities: WeekV2Priority[]
  reflectionUnlocked: boolean
}

export interface WeekV2OverviewViewModel {
  weekRef: WeekRef
  parentMonthRef: MonthRef
  todayRef: DayRef
  days: WeekV2DayColumn[]
  rail: WeekV2Rail
  sections: WeekV2Section[]
}

export interface WeekV2OverviewData {
  weekRef: WeekRef
  todayRef: DayRef
  planning: WeekPlanningBundle
  reflectionBundle: WeekReflectionBundle
  weeklyReflection: WeeklyReflection | null
  activity: PeriodActivity
}

function subjectIcon(subject: MeasureableSubject): string | undefined {
  return 'icon' in subject ? subject.icon : undefined
}

function aggregateDay(subject: MeasureableSubject, entries: DailyMeasurementEntry[]): number | undefined {
  return computePeriodContribution(subject, entries)
}

function daySeries(
  item: WeekMeasurementPlanningItem,
  weekRef: WeekRef,
  dayRefs: DayRef[],
  rawEntries: DailyMeasurementEntry[],
  todayRef: DayRef
): MonthV2Series {
  const entries = rawEntries.filter((entry) => entry.subjectId === item.subject.id)
  const scheduled = new Set(item.planning.scheduledDayRefs)
  const hasWeekVerdict = item.subject.cadence === 'weekly' || Boolean(item.weekMeasurement)
  const threshold = item.subject.entryMode === 'multi-completion'
    ? multiCompletionEffectiveThreshold(item.subject)
    : 0

  const weeks = dayRefs.map((dayRef): MonthV2WeekDatum => {
    const dayEntries = entries.filter((entry) => entry.dayRef === dayRef)
    const actualValue = aggregateDay(item.subject, dayEntries)
    const phase: WeekV2Phase = dayRef < todayRef ? 'past' : dayRef > todayRef ? 'future' : 'current'
    const scheduledDay = scheduled.has(dayRef)
    const status = phase !== 'past'
      ? actualValue === undefined ? 'no-data' : 'in-progress'
      : actualValue !== undefined ? 'met' : scheduledDay ? 'missed' : 'no-data'
    const base: MonthV2WeekDatum = {
      weekRef,
      columnRef: dayRef,
      phase,
      actualValue,
      entryCount: dayEntries.length,
      status,
      contributionOnly: !hasWeekVerdict,
      targetValue: undefined,
      hasWeekOverride: Boolean(item.weekMeasurement),
    }
    if (item.subject.entryMode === 'completion' && scheduled.size > 0) {
      base.days = [{
        dayRef,
        inMonth: true,
        scheduled: scheduledDay,
        completed: dayEntries.length > 0,
      }]
    }
    if (item.subject.entryMode === 'multi-completion') {
      const entry = dayEntries[0]
      const points = entry ? multiCompletionDayPoints(item.subject, entry) : 0
      base.actualValue = entry ? points : undefined
      base.multiDays = [{
        dayRef,
        inMonth: true,
        state: entry ? (multiCompletionDayMet(item.subject, entry) ? 'met' : 'partial') : 'empty',
        points,
        threshold,
      }]
    }
    return base
  })

  if (item.subject.entryMode === 'multi-completion') return { kind: 'multi-completion', weeks }
  if (item.subject.entryMode === 'completion') {
    if (scheduled.size > 0) return { kind: 'scheduled-days', weeks }
    return { kind: 'completion-progress', display: 'segments', weeks }
  }
  if (item.subject.entryMode === 'rating') {
    return {
      kind: 'rating',
      weeks,
      scale: { min: item.subject.ratingScaleMin ?? 1, max: item.subject.ratingScale ?? 10 },
    }
  }
  const isLine = item.subject.entryMode === 'value' &&
    (!('target' in item.subject) || item.subject.target?.kind !== 'value' || item.subject.target.aggregation !== 'sum')
  if (isLine) return { kind: 'line', aggregation: 'last', weeks, scale: periodNumericScale(weeks) }
  return { kind: 'bars', weeks, scale: periodNumericScale(weeks, { includeZero: true }) }
}

function buildRow(
  item: WeekMeasurementPlanningItem,
  weekRef: WeekRef,
  dayRefs: DayRef[],
  rawEntries: DailyMeasurementEntry[],
  todayRef: DayRef,
  goalMap: Map<string, { id: string; title: string; icon?: string }>
): WeekV2Row {
  const parentGoal = item.subjectType === 'keyResult' && 'goalId' in item.subject
    ? goalMap.get(item.subject.goalId)
    : undefined
  const weekSummary = item.subject.cadence === 'weekly' ? item.measurement : item.weekMeasurement
  return {
    key: `${item.subjectType}:${item.subject.id}`,
    subjectId: item.subject.id,
    subjectType: item.subjectType,
    title: item.subject.title,
    icon: subjectIcon(item.subject) ?? parentGoal?.icon,
    parentGoal,
    cadence: item.subject.cadence,
    entryMode: item.subject.entryMode,
    editable: item.subject.status === 'open',
    subject: item.subject,
    weekSummary,
    contextSummary: item.subject.cadence === 'monthly' && !item.weekMeasurement ? item.measurement : undefined,
    series: daySeries(item, weekRef, dayRefs, rawEntries, todayRef),
  }
}

function buildSections(rows: WeekV2Row[]): WeekV2Section[] {
  const sectionRows: Record<WeekV2SectionKey, WeekV2Row[]> = {
    goals: rows.filter((row) => row.subjectType === 'keyResult'),
    habits: rows.filter((row) => row.subjectType === 'habit'),
    trackers: rows.filter((row) => row.subjectType === 'tracker'),
    intentions: rows.filter((row) => row.subjectType === 'weeklyIntention'),
  }
  return (Object.keys(sectionRows) as WeekV2SectionKey[]).map((key) => {
    const selected = sectionRows[key]
    let groups: WeekV2Group[]
    if (key === 'goals') {
      const grouped = new Map<string, WeekV2Group>()
      for (const row of selected) {
        const groupKey = row.parentGoal ? `goal:${row.parentGoal.id}` : 'goal:unlinked'
        const group = grouped.get(groupKey) ?? {
          key: groupKey,
          title: row.parentGoal?.title,
          icon: row.parentGoal?.icon,
          goalId: row.parentGoal?.id,
          rows: [],
        }
        group.rows.push(row)
        grouped.set(groupKey, group)
      }
      groups = [...grouped.values()]
    } else {
      groups = [{ key, rows: selected }]
    }
    return {
      key,
      objectCount: key === 'goals' ? groups.length : selected.length,
      rowCount: selected.length,
      coveredRows: selected.filter((row) => row.series.weeks.some((datum) => datum.entryCount > 0)).length,
      groups,
    }
  })
}

function priorityStatus(summary: MeasurementSummary | undefined, todayRef: DayRef, weekRef: WeekRef): WeekV2Priority['status'] {
  if (!summary || summary.entryCount === 0) return 'no-data'
  if (getChildPeriods(weekRef).at(-1)! >= todayRef && summary.evaluationStatus !== 'met') return 'in-progress'
  return summary.evaluationStatus ?? 'in-progress'
}

export function buildWeekV2OverviewViewModel(data: WeekV2OverviewData): WeekV2OverviewViewModel {
  const dayRefs = getChildPeriods(data.weekRef) as DayRef[]
  const parentMonthRef = getParentPeriod(data.weekRef) as MonthRef
  const goalMap = new Map(
    data.reflectionBundle.relevant.goalItems.map(({ goal }) => [goal.id, goal])
  )
  // Boundary weeks can carry one monthly-cadence item per overlapping month.
  // The week belongs to the month containing its Monday, so keep that source.
  const itemByKey = new Map<string, WeekMeasurementPlanningItem>()
  for (const item of data.planning.relevant.measurementItems) {
    const key = `${item.subjectType}:${item.subject.id}`
    const current = itemByKey.get(key)
    if (!current || item.sourceMonthRef === parentMonthRef) itemByKey.set(key, item)
  }
  const rows = [...itemByKey.values()].map((item) =>
    buildRow(item, data.weekRef, dayRefs, data.planning.rawEntries, data.todayRef, goalMap)
  )
  const rowMap = new Map(rows.map((row) => [row.key, row]))
  const priorities = (data.planning.weekPlan?.topPriorities ?? []).map((priority) => {
    const key = `${priority.subjectType}:${priority.subjectId}`
    const row = rowMap.get(key)
    const summary = row?.weekSummary ?? row?.contextSummary
    return {
      key,
      subjectType: priority.subjectType,
      subjectId: priority.subjectId,
      title: row?.title ?? priority.subjectId,
      icon: row?.icon,
      status: priorityStatus(summary, data.todayRef, data.weekRef),
      summary,
    }
  })
  return {
    weekRef: data.weekRef,
    parentMonthRef,
    todayRef: data.todayRef,
    days: dayRefs.map((dayRef, index) => ({
      dayRef,
      phase: dayRef < data.todayRef ? 'past' : dayRef > data.todayRef ? 'future' : 'current',
      isToday: dayRef === data.todayRef,
      isBoundary: getPeriodRefsForDate(dayRef).month !== parentMonthRef,
      activity: data.activity.days[index]!,
    })),
    rail: {
      matrix: data.weeklyReflection ? matrixFromReflection(data.weeklyReflection) : null,
      activity: data.activity,
      topPriorities: priorities,
      reflectionUnlocked: data.todayRef >= dayRefs[5]!,
    },
    sections: buildSections(rows),
  }
}

export async function loadWeekV2OverviewData(weekRef: WeekRef): Promise<WeekV2OverviewData> {
  const todayRef = getPeriodRefsForDate(new Date()).day
  const structuredReflectionStore = useStructuredReflectionStore()
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const exerciseCompletionsStore = useExerciseCompletionsStore()
  const [planning, reflectionBundle] = await Promise.all([
    getWeekPlanningBundle(weekRef, todayRef),
    getWeekReflectionBundle(weekRef, todayRef),
    structuredReflectionStore.weeklyReflections.length === 0 && !structuredReflectionStore.isLoading
      ? structuredReflectionStore.loadAll()
      : Promise.resolve(),
    journalStore.ensureLoaded(),
    emotionLogStore.ensureLoaded(),
    emotionStore.isLoaded ? Promise.resolve() : emotionStore.loadEmotions(),
    exerciseCompletionsStore.ensureLoaded(),
  ])
  const dayRefs = getChildPeriods(weekRef) as DayRef[]
  const activity = buildPeriodActivity(dayRefs, todayRef, {
    journalCreatedAts: journalStore.sortedEntries.map((entry) => entry.createdAt),
    emotionLogs: emotionLogStore.sortedLogs.map((log) => ({
      createdAt: log.createdAt,
      quadrants: log.emotionIds.flatMap((emotionId): Quadrant[] => {
        const emotion = emotionStore.getEmotionById(emotionId)
        return emotion ? [getQuadrant(emotion)] : []
      }),
    })),
    exerciseDayRefs: exerciseCompletionsStore.completions.map((completion) => completion.dayRef),
  })
  return {
    weekRef,
    todayRef,
    planning,
    reflectionBundle,
    weeklyReflection: structuredReflectionStore.getWeeklyByRef(weekRef) ?? null,
    activity,
  }
}
