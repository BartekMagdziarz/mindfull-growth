import type { DayRef, MonthRef, PeriodRef, PeriodRefsForDate } from '@/domain/period'
import type { Goal, Initiative } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  InitiativePlanState,
  MeasurementSubjectType,
  TodayHiddenSubjectType,
} from '@/domain/planningState'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { type MeasureableSubject, type MeasurementSummary } from '@/services/measurementProgress'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { loadPlanningCached } from '@/services/planningQueryCache'
import {
  getWeekPlanningBundle,
  type MeasurementPlanningSummary,
  type WeekInitiativePlanningItem,
  type WeekMeasurementPlanningItem,
} from '@/services/planningStateQueries'
import { getPeriodRefsForDate } from '@/utils/periods'

export type TodaySectionId = 'scheduled' | 'week' | 'month'

export interface TodayMeasurementItem {
  kind: 'measurement'
  key: string
  panelType: MeasurementSubjectType
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  planning: MeasurementPlanningSummary
  measurement: MeasurementSummary
  todayEntry?: DailyMeasurementEntry
  goalTitle?: string
  contextPeriodRef: PeriodRef
  sourceMonthRef?: MonthRef
  sectionId: TodaySectionId
  isScheduledToday: boolean
  canHide: boolean
  canReschedule: boolean
  canDelete: boolean
}

export interface TodayInitiativeItem {
  kind: 'initiative'
  key: string
  panelType: 'initiative'
  initiative: Initiative
  planState: InitiativePlanState
  goalTitle?: string
  contextPeriodRef: PeriodRef
  sectionId: TodaySectionId
  isScheduledToday: boolean
  canHide: boolean
  canReschedule: boolean
  canDelete: boolean
}

export type TodayItem = TodayMeasurementItem | TodayInitiativeItem

export interface TodayViewBundle {
  dayRef: DayRef
  refs: PeriodRefsForDate
  sections: Record<TodaySectionId, TodayItem[]>
  hiddenItems: TodayItem[]
}

const todayViewBundleCache = new Map<
  string,
  { revision: number; value: TodayViewBundle | Promise<TodayViewBundle> }
>()

function buildMeasurementKey(subjectType: MeasurementSubjectType, subjectId: string): string {
  return `${subjectType}:${subjectId}`
}

function buildInitiativeKey(initiativeId: string): string {
  return `initiative:${initiativeId}`
}

function sectionRank(sectionId: TodaySectionId): number {
  switch (sectionId) {
    case 'scheduled':
      return 0
    case 'week':
      return 1
    case 'month':
      return 2
  }
}

function classifyMeasurementItem(
  item: WeekMeasurementPlanningItem,
  dayRef: DayRef
): TodaySectionId | undefined {
  if (item.planning.scheduledDayRefs.includes(dayRef)) {
    return 'scheduled'
  }

  switch (item.planning.scheduleScope) {
    case 'whole-week':
      return 'week'
    case 'whole-month':
      return 'month'
    case 'unassigned':
      return item.subject.cadence === 'weekly' ? 'week' : 'month'
    default:
      return undefined
  }
}

function classifyInitiativeItem(
  item: WeekInitiativePlanningItem,
  dayRef: DayRef,
  refs: PeriodRefsForDate
): TodaySectionId | undefined {
  if (item.planState.dayRef === dayRef) {
    return 'scheduled'
  }

  if (item.planState.weekRef === refs.week) {
    return 'week'
  }

  if (item.planState.monthRef === refs.month) {
    return 'month'
  }

  return undefined
}

function buildGoalMap(goals: Goal[]): Map<string, Goal> {
  return new Map(goals.map(goal => [goal.id, goal]))
}

function buildTodayEntryMap(
  entries: DailyMeasurementEntry[],
  dayRef: DayRef
): Map<string, DailyMeasurementEntry> {
  return new Map(
    entries
      .filter(entry => entry.dayRef === dayRef)
      .map(entry => [buildMeasurementKey(entry.subjectType, entry.subjectId), entry] as const)
  )
}

function buildHiddenKeySet(
  dayRef: DayRef,
  hiddenStates: Array<{ dayRef: DayRef; subjectType: TodayHiddenSubjectType; subjectId: string }>
): Set<string> {
  return new Set(
    hiddenStates
      .filter(state => state.dayRef === dayRef)
      .map(state => `${state.subjectType}:${state.subjectId}`)
  )
}

function chooseMeasurementItem(
  existing: TodayMeasurementItem | undefined,
  candidate: TodayMeasurementItem,
  currentMonthRef: MonthRef
): TodayMeasurementItem {
  if (!existing) {
    return candidate
  }

  const existingRank = sectionRank(existing.sectionId)
  const candidateRank = sectionRank(candidate.sectionId)
  if (candidateRank < existingRank) {
    return candidate
  }
  if (candidateRank > existingRank) {
    return existing
  }

  const existingMatchesCurrentMonth = existing.sourceMonthRef === currentMonthRef
  const candidateMatchesCurrentMonth = candidate.sourceMonthRef === currentMonthRef
  if (candidateMatchesCurrentMonth && !existingMatchesCurrentMonth) {
    return candidate
  }
  if (existingMatchesCurrentMonth && !candidateMatchesCurrentMonth) {
    return existing
  }

  return existing
}

function chooseInitiativeItem(
  existing: TodayInitiativeItem | undefined,
  candidate: TodayInitiativeItem
): TodayInitiativeItem {
  if (!existing) {
    return candidate
  }

  return sectionRank(candidate.sectionId) < sectionRank(existing.sectionId) ? candidate : existing
}

function sortTodayItems<T extends TodayItem>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTitle = left.kind === 'initiative' ? left.initiative.title : left.subject.title
    const rightTitle = right.kind === 'initiative' ? right.initiative.title : right.subject.title
    return leftTitle.localeCompare(rightTitle)
  })
}

function buildMeasurementRecord(
  item: WeekMeasurementPlanningItem,
  goalMap: Map<string, Goal>,
  todayEntry: DailyMeasurementEntry | undefined,
  sectionId: TodaySectionId
): TodayMeasurementItem {
  const goalTitle = 'goalId' in item.subject ? goalMap.get(item.subject.goalId)?.title : undefined

  return {
    kind: 'measurement',
    key: buildMeasurementKey(item.subjectType, item.subject.id),
    panelType: item.subjectType,
    subjectType: item.subjectType,
    subject: item.subject,
    planning: item.planning,
    measurement: item.measurement,
    todayEntry,
    goalTitle,
    contextPeriodRef: item.measurement.periodRef,
    sourceMonthRef: item.sourceMonthRef,
    sectionId,
    isScheduledToday: sectionId === 'scheduled',
    canHide: sectionId !== 'scheduled',
    canReschedule: sectionId === 'scheduled',
    canDelete: sectionId === 'scheduled',
  }
}

function buildInitiativeRecord(
  item: WeekInitiativePlanningItem,
  goalMap: Map<string, Goal>,
  sectionId: TodaySectionId,
  refs: PeriodRefsForDate
): TodayInitiativeItem {
  const contextPeriodRef =
    item.planState.weekRef ??
    item.planState.monthRef ??
    (sectionId === 'month' ? refs.month : refs.week)

  return {
    kind: 'initiative',
    key: buildInitiativeKey(item.initiative.id),
    panelType: 'initiative',
    initiative: item.initiative,
    planState: item.planState,
    goalTitle: item.initiative.goalId ? goalMap.get(item.initiative.goalId)?.title : undefined,
    contextPeriodRef,
    sectionId,
    isScheduledToday: sectionId === 'scheduled',
    canHide: sectionId !== 'scheduled',
    canReschedule: sectionId === 'scheduled',
    canDelete: sectionId === 'scheduled',
  }
}

export async function getTodayViewBundleForDay(dayRef: DayRef): Promise<TodayViewBundle> {
  return loadPlanningCached(todayViewBundleCache, dayRef, async () => {
    const refs = getPeriodRefsForDate(dayRef)
    const [weekPlanning, allEntries, hiddenStates, objects] = await Promise.all([
      getWeekPlanningBundle(refs.week),
      planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(dayRef, dayRef),
      planningStateDexieRepository.listTodayHiddenStatesForDay(dayRef),
      loadPlanningCoreObjects(),
    ])

    const goalMap = buildGoalMap(objects.goals)
    const todayEntries = buildTodayEntryMap(allEntries, dayRef)
    const hiddenKeys = buildHiddenKeySet(dayRef, hiddenStates)
    const measurementItems = new Map<string, TodayMeasurementItem>()
    const initiativeItems = new Map<string, TodayInitiativeItem>()

    for (const item of weekPlanning.relevant.measurementItems) {
      const sectionId = classifyMeasurementItem(item, dayRef)
      if (!sectionId) {
        continue
      }

      const key = buildMeasurementKey(item.subjectType, item.subject.id)
      const record = buildMeasurementRecord(item, goalMap, todayEntries.get(key), sectionId)
      measurementItems.set(
        key,
        chooseMeasurementItem(measurementItems.get(key), record, refs.month),
      )
    }

    for (const item of weekPlanning.relevant.initiativeItems) {
      const sectionId = classifyInitiativeItem(item, dayRef, refs)
      if (!sectionId) {
        continue
      }

      const key = buildInitiativeKey(item.initiative.id)
      const record = buildInitiativeRecord(item, goalMap, sectionId, refs)
      initiativeItems.set(key, chooseInitiativeItem(initiativeItems.get(key), record))
    }

    const sections: Record<TodaySectionId, TodayItem[]> = {
      scheduled: [],
      week: [],
      month: [],
    }
    const hiddenItems: TodayItem[] = []

    for (const item of [...measurementItems.values(), ...initiativeItems.values()]) {
      if (item.canHide && hiddenKeys.has(item.key)) {
        hiddenItems.push(item)
        continue
      }

      sections[item.sectionId].push(item)
    }

    return {
      dayRef,
      refs,
      sections: {
        scheduled: sortTodayItems(sections.scheduled),
        week: sortTodayItems(sections.week),
        month: sortTodayItems(sections.month),
      },
      hiddenItems: sortTodayItems(hiddenItems),
    }
  })
}

export async function getTodayViewBundle(): Promise<TodayViewBundle> {
  const { day } = getPeriodRefsForDate(new Date(Date.now()))
  return getTodayViewBundleForDay(day)
}
