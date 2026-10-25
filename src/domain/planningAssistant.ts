import type {
  MeasurementEntryDaysCondition,
  MeasurementEntryMode,
  MeasurementTarget,
  MultiCompletionItem,
  PlanningCadence,
} from './planning'
import {
  normalizeGoalPayload,
  normalizeHabitPayload,
  normalizeKeyResultPayload,
  normalizeTrackerPayload,
  normalizeWeeklyIntentionPayload,
} from './planning'
import type { DayRef } from './period'
import {
  addDaysToDayRef,
  getPeriodBounds,
  getPeriodRefsForDate,
  isPeriodRef,
} from '@/utils/periods'

export const PLANNING_ASSISTANT_VERSION = 1
export const MAX_PLANNER_OBJECTS = 12
export const MAX_PLANNER_DAYS = 366
export type PlannerKind = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'weeklyIntention'
export interface PlannerObject {
  id: string
  kind: PlannerKind
  parentId: string
  title: string
  description: string
  selected: boolean
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: number
  operator: 'min' | 'max'
  aggregation: 'sum' | 'average' | 'last'
  ratingMin: number
  ratingMax: number
  multiItems: MultiCompletionItem[]
  dailyThreshold: number | null
  entryDays: MeasurementEntryDaysCondition | null
  startDate: string
  endDate: string
  days: number[]
  isPermanent: boolean
  successDefinition: string
  whyMatters: string
  confidenceRating: number | null
  achievabilityRationale: string
  obstacles: string
  resources: string
  priorityIds: string[]
  lifeAreaIds: string[]
}
export interface PlannerMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}
export interface PlannerReceipt {
  batchId: string
  objects: Array<{ draftId: string; id: string; kind: PlannerKind; title: string }>
}
export interface PlanningAssistantDraft {
  schemaVersion: 1
  id: string
  revision: number
  objects: PlannerObject[]
  messages: PlannerMessage[]
  suggestions: string[]
  input: string
  lockedFields: Record<string, string[]>
  includePlanning: boolean
  policyRevision: string | null
  spentUsd: number
  pendingMessageId: string | null
  receipt: PlannerReceipt | null
}
export function createPlanningAssistantDraft(): PlanningAssistantDraft {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    revision: 0,
    objects: [],
    messages: [],
    suggestions: [],
    input: '',
    lockedFields: {},
    includePlanning: false,
    policyRevision: null,
    spentUsd: 0,
    pendingMessageId: null,
    receipt: null,
  }
}
export function plannerTarget(item: PlannerObject): MeasurementTarget {
  const entryDays =
    item.entryDays && item.entryMode !== 'completion' ? { entryDays: item.entryDays } : {}
  if (item.entryMode === 'value')
    return {
      kind: 'value',
      aggregation: item.aggregation,
      operator: item.operator === 'min' ? 'gte' : 'lte',
      value: item.target,
      ...entryDays,
    }
  if (item.entryMode === 'rating')
    return {
      kind: 'rating',
      aggregation: 'average',
      operator: item.operator === 'min' ? 'gte' : 'lte',
      value: item.target,
      ...entryDays,
    }
  return { kind: 'count', operator: item.operator, value: item.target, ...entryDays }
}
export function plannerBasePayload(item: PlannerObject) {
  return {
    title: item.title.trim(),
    description: item.description.trim() || undefined,
    isActive: true,
    status: 'open' as const,
  }
}
export function plannerMeasurementPayload(item: PlannerObject) {
  return {
    ...plannerBasePayload(item),
    entryMode: item.entryMode,
    cadence: item.cadence,
    ratingScaleMin: item.entryMode === 'rating' ? item.ratingMin : undefined,
    ratingScale: item.entryMode === 'rating' ? item.ratingMax : undefined,
    multiItems: item.entryMode === 'multi-completion' ? item.multiItems : undefined,
    multiDailyThreshold:
      item.entryMode === 'multi-completion' ? (item.dailyThreshold ?? undefined) : undefined,
  }
}
export function plannerGoalPayload(item: PlannerObject) {
  return {
    ...plannerBasePayload(item),
    priorityIds: item.priorityIds,
    lifeAreaIds: item.lifeAreaIds,
    periodAssignmentMode: 'custom' as const,
    startDate: item.startDate,
    targetDate: item.endDate,
    successDefinition: item.successDefinition.trim(),
    whyMatters: item.whyMatters.trim() || undefined,
    confidenceRating: item.confidenceRating ?? undefined,
    achievabilityRationale: item.achievabilityRationale.trim() || undefined,
    obstacles: item.obstacles.trim() || undefined,
    resources: item.resources.trim() || undefined,
  }
}
export function plannerDays(item: PlannerObject): DayRef[] {
  if (
    !validPlannerDate(item.startDate) ||
    !validPlannerDate(item.endDate) ||
    item.startDate > item.endDate
  )
    return []
  const result: DayRef[] = []
  let day = item.startDate as DayRef
  while (day <= item.endDate && result.length <= MAX_PLANNER_DAYS) {
    result.push(day)
    day = addDaysToDayRef(day, 1)
  }
  return result
}
export function validPlannerDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isPeriodRef(value)
}
export function plannerObjectError(
  item: PlannerObject,
  objects: PlannerObject[]
): string | undefined {
  if (!item.title.trim()) return 'Nadaj nazwę.'
  if (
    !validPlannerDate(item.startDate) ||
    !validPlannerDate(item.endDate) ||
    item.startDate > item.endDate
  )
    return 'Sprawdź zakres dat.'
  const days = plannerDays(item)
  if (days.length > MAX_PLANNER_DAYS) return 'Zaplanuj najwyżej rok na raz.'
  if (
    item.days.some(day => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(item.days).size !== item.days.length
  )
    return 'Sprawdź dni tygodnia.'
  if (item.kind === 'keyResult') {
    const parent = objects.find(parent => parent.id === item.parentId && parent.kind === 'goal')
    if (!parent || (item.selected && !parent.selected)) return 'Wybierz cel tego rezultatu.'
    if (item.startDate < parent.startDate || item.endDate > parent.endDate)
      return 'Rezultat musi mieścić się w terminie celu.'
  } else if (item.parentId) return 'Tylko rezultat może należeć do celu.'
  if (item.kind === 'goal') {
    if (!item.successDefinition.trim()) return 'Doprecyzuj, po czym poznasz sukces.'
    if (
      !objects.some(
        child =>
          child.parentId === item.id &&
          child.kind === 'keyResult' &&
          (!item.selected || child.selected)
      )
    )
      return 'Wybierz przynajmniej jeden rezultat.'
  }
  if (item.kind === 'weeklyIntention') {
    const bounds = getPeriodBounds(getPeriodRefsForDate(item.startDate).week)
    if (item.startDate !== bounds.start || item.endDate !== bounds.end || item.cadence !== 'weekly')
      return 'Intencja obejmuje jeden tydzień, od poniedziałku do niedzieli.'
  }
  if (item.kind !== 'goal' && item.kind !== 'tracker') {
    if (!Number.isFinite(item.target)) return 'Sprawdź target.'
    if (
      ['completion', 'multi-completion'].includes(item.entryMode) &&
      item.cadence === 'weekly' &&
      item.target > 7
    )
      return 'Tydzień ma najwyżej 7 dni.'
    if (
      ['completion', 'multi-completion'].includes(item.entryMode) &&
      item.cadence === 'monthly' &&
      item.target > 31
    )
      return 'Miesiąc ma najwyżej 31 dni.'
    if (
      item.entryMode === 'rating' &&
      (item.target < item.ratingMin || item.target > item.ratingMax)
    )
      return 'Target musi mieścić się w skali.'
    if (
      item.entryDays &&
      (item.entryDays.value < 1 ||
        !Number.isInteger(item.entryDays.value) ||
        item.entryDays.value > (item.cadence === 'weekly' ? 7 : 31))
    )
      return 'Sprawdź warunek dni z wpisem.'
  }
  if (
    item.entryMode === 'rating' &&
    (!Number.isInteger(item.ratingMin) ||
      !Number.isInteger(item.ratingMax) ||
      item.ratingMin < 1 ||
      item.ratingMax <= item.ratingMin)
  )
    return 'Sprawdź zakres skali.'
  if (item.entryMode === 'multi-completion' && item.kind !== 'goal') {
    const weight = item.multiItems
      .filter(value => !value.archived)
      .reduce((sum, value) => sum + value.weight, 0)
    if (
      !weight ||
      (item.dailyThreshold !== null && (item.dailyThreshold < 1 || item.dailyThreshold > weight))
    )
      return 'Sprawdź listę i próg zaliczenia dnia.'
  }
  if (item.kind !== 'habit' && item.isPermanent) return 'Bezterminowa dostępność dotyczy nawyku.'
  try {
    const measure = plannerMeasurementPayload(item)
    if (item.kind === 'goal') normalizeGoalPayload(plannerGoalPayload(item))
    if (item.kind === 'habit')
      normalizeHabitPayload({
        ...measure,
        target: plannerTarget(item),
        priorityIds: item.priorityIds,
        lifeAreaIds: item.lifeAreaIds,
        isPermanent: item.isPermanent,
      })
    if (item.kind === 'tracker')
      normalizeTrackerPayload({
        ...measure,
        priorityIds: item.priorityIds,
        lifeAreaIds: item.lifeAreaIds,
      })
    if (item.kind === 'keyResult')
      normalizeKeyResultPayload({ ...measure, target: plannerTarget(item), goalId: item.parentId })
    if (item.kind === 'weeklyIntention')
      normalizeWeeklyIntentionPayload({
        ...measure,
        target: plannerTarget(item),
        cadence: 'weekly',
        weekRef: getPeriodRefsForDate(item.startDate).week,
        priorityIds: item.priorityIds,
      })
  } catch {
    return 'Sprawdź ustawienia pomiaru i wymagane pola.'
  }
}
export function plannerSelectionErrors(objects: PlannerObject[]): string[] {
  if (
    objects.length > MAX_PLANNER_OBJECTS ||
    new Set(objects.map(item => item.id)).size !== objects.length
  )
    return ['Szkic zawiera zbyt wiele lub powtarzające się obiekty.']
  const selected = objects.filter(item => item.selected)
  if (!selected.length) return ['Wybierz coś do planu.']
  return selected.flatMap(item => {
    const error = plannerObjectError(item, objects)
    return error ? [`${item.title || 'Bez nazwy'}: ${error}`] : []
  })
}
export function selectPlannerObject(
  objects: PlannerObject[],
  id: string,
  selected: boolean
): string | undefined {
  const item = objects.find(item => item.id === id)
  if (!item) return
  item.selected = selected
  if (item.kind === 'goal')
    for (const child of objects.filter(child => child.parentId === id)) child.selected = selected
  if (selected && item.parentId) {
    const parent = objects.find(parent => parent.id === item.parentId)
    if (parent && !parent.selected) {
      parent.selected = true
      return 'Wybrano również cel tego rezultatu.'
    }
  }
}
/** Replies are upserts. Only the user removes proposals or unlocks manual edits. */
export function mergePlannerObjects(
  current: PlannerObject[],
  incoming: PlannerObject[],
  locked: Record<string, string[]>
): PlannerObject[] {
  const result = structuredClone(current)
  for (const proposal of incoming) {
    const index = result.findIndex(item => item.id === proposal.id)
    if (index < 0) result.push(structuredClone(proposal))
    else {
      if (result[index].kind !== proposal.kind || result[index].parentId !== proposal.parentId)
        throw new Error('Nie można zmienić typu istniejącego szkicu.')
      const merged = { ...proposal }
      for (const key of locked[proposal.id] ?? [])
        if (key in merged)
          Object.assign(merged, { [key]: result[index][key as keyof PlannerObject] })
      result[index] = merged
    }
  }
  if (result.length > MAX_PLANNER_OBJECTS)
    throw new Error('W jednym szkicu zmieści się najwyżej 12 obiektów.')
  return result
}
