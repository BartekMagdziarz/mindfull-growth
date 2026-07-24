import { computed, ref, type Ref, watch } from 'vue'
import type { AnnualPlan } from '@/domain/annualPlan'
import type { MonthlyReflection, WeeklyReflection } from '@/domain/reflection'
import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { Priority, WeeklyIntention } from '@/domain/planning'
import type { MeasurementDayAssignment } from '@/domain/planningState'
import type { PlanningScale, PlanningViewState } from '@/design-system/contracts'
import type { StreamDayVM, StreamMonthVM, StreamWeekVM } from '@/components/calendar/stream/streamModel'
import type { CalendarYearSummary, MonthReflectionBundle } from '@/services/calendarViewQueries'
import type { MonthPlanningBundle, WeekPlanningBundle, WeekReflectionBundle } from '@/services/planningStateQueries'
import type { MonthObjectItem, WeekObjectItem } from '@/services/reflectionDataQueries'
import { annualPlanDexieRepository } from '@/repositories/annualPlanDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { buildMonthObjectItems, buildWeekObjectItems, extractWeekIntentions } from '@/components/calendar/objectItems'
import { loadStreamMonth, loadStreamWeek, loadStreamYear } from '@/components/calendar/stream/streamData'
import { clearTrendCache } from '@/services/calendarChartData'
import { getCalendarYearSummary, getMonthReflectionBundle } from '@/services/calendarViewQueries'
import { getMonthPlanningBundle, getWeekPlanningBundle, getWeekReflectionBundle } from '@/services/planningStateQueries'
import { loadDayAssignmentsForMonths } from '@/services/reflectionDataQueries'
import { listWeeklyIntentionsForMonth } from '@/services/weeklyIntentionService'
import { classifyPlanningState, countMonthObjects, countWeekObjects, countYearObjects, totalPlanningObjects } from './viewModels'

export interface YearPlanningData {
  scale: 'year'
  summary: CalendarYearSummary
  annualPlan: AnnualPlan | null
  months: StreamMonthVM[]
  priorities: Priority[]
}

export interface MonthPlanningData {
  scale: 'month'
  planning: MonthPlanningBundle
  reflection: MonthReflectionBundle
  structuredReflection: MonthlyReflection | null
  weeks: StreamWeekVM[]
  intentions: WeeklyIntention[]
  priorities: Priority[]
  items: MonthObjectItem[]
}

export interface WeekPlanningData {
  scale: 'week'
  planning: WeekPlanningBundle
  reflection: WeekReflectionBundle
  structuredReflection: WeeklyReflection | null
  days: StreamDayVM[]
  intentions: WeeklyIntention[]
  assignments: MeasurementDayAssignment[]
  items: WeekObjectItem[]
}

export type PlanningPeriodData = YearPlanningData | MonthPlanningData | WeekPlanningData

export function usePlanningPeriodData(scale: Ref<PlanningScale>, periodRef: Ref<string>) {
  const data = ref<PlanningPeriodData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const itemCount = computed(() => {
    if (!data.value) return 0
    if (data.value.scale === 'year') return totalPlanningObjects(countYearObjects(data.value.summary))
    if (data.value.scale === 'month') return totalPlanningObjects(countMonthObjects(data.value.planning))
    return totalPlanningObjects(countWeekObjects(data.value.planning))
  })
  const state = computed<PlanningViewState>(() => classifyPlanningState(
    isLoading.value,
    error.value,
    Boolean(data.value),
    itemCount.value,
  ))

  async function load(): Promise<void> {
    if (scale.value === 'day') {
      data.value = null
      error.value = null
      return
    }

    isLoading.value = true
    error.value = null
    clearTrendCache()

    try {
      if (scale.value === 'year') {
        const yearRef = periodRef.value as YearRef
        const [summary, annualPlan, months, priorities] = await Promise.all([
          getCalendarYearSummary(yearRef),
          annualPlanDexieRepository.getByYearRef(yearRef),
          loadStreamYear(yearRef),
          priorityDexieRepository.listAll(),
        ])
        data.value = { scale: 'year', summary, annualPlan: annualPlan ?? null, months, priorities }
        return
      }

      if (scale.value === 'month') {
        const monthRef = periodRef.value as MonthRef
        const [planning, reflection, structuredReflection, weeks, intentions, priorities] = await Promise.all([
          getMonthPlanningBundle(monthRef),
          getMonthReflectionBundle(monthRef),
          structuredReflectionDexieRepository.getMonthly(monthRef),
          loadStreamMonth(monthRef),
          listWeeklyIntentionsForMonth(monthRef),
          priorityDexieRepository.listAll(),
        ])
        data.value = {
          scale: 'month',
          planning,
          reflection,
          structuredReflection: structuredReflection ?? null,
          weeks,
          intentions,
          priorities,
          items: buildMonthObjectItems(planning),
        }
        return
      }

      const weekRef = periodRef.value as WeekRef
      const [planning, reflection, structuredReflection, days] = await Promise.all([
        getWeekPlanningBundle(weekRef),
        getWeekReflectionBundle(weekRef),
        structuredReflectionDexieRepository.getWeekly(weekRef),
        loadStreamWeek(weekRef),
      ])
      const assignments = await loadDayAssignmentsForMonths(reflection.overlappingMonthRefs)
      data.value = {
        scale: 'week',
        planning,
        reflection,
        structuredReflection: structuredReflection ?? null,
        days,
        intentions: extractWeekIntentions(reflection),
        assignments,
        items: buildWeekObjectItems(reflection),
      }
    } catch (reason) {
      data.value = null
      error.value = reason instanceof Error ? reason.message : String(reason)
    } finally {
      isLoading.value = false
    }
  }

  watch([scale, periodRef], () => void load(), { immediate: true })

  return { data, error, isLoading, itemCount, load, state }
}
