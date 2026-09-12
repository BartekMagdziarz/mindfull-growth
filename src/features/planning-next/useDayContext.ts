import { computed, ref, watch, type Ref } from 'vue'
import type { DayRef } from '@/domain/period'
import type { Priority } from '@/domain/planning'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { getDayMarkers, OVERDUE_REACH_DAYS, type DayMarker } from '@/services/dayUpcomingQueries'
import { getActivePrioritiesForMonth } from '@/services/monthlyPriorityService'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

const UPCOMING_HORIZON_DAYS = 21
const MARKER_REACH_DAYS = 42

/**
 * Context for the day's right column: month-focus priorities (the compass
 * directions), dated markers for the mini calendar and the "Najbliżej" list.
 * Everything is relative to the real today except the marker reach, which
 * follows the viewed day so the calendar always has its dots.
 */
export function useDayContext(dayRef: Ref<DayRef>) {
  const todayRef = computed(() => getPeriodRefsForDate(new Date()).day)
  const focusPriorities = ref<Priority[]>([])
  const markers = ref<DayMarker[]>([])
  const isLoading = ref(false)

  /** Overdue + recently done markers behind today, due ones up to the horizon ahead. */
  const upcoming = computed(() => {
    const start = addDaysToDayRef(todayRef.value, -OVERDUE_REACH_DAYS)
    const end = addDaysToDayRef(todayRef.value, UPCOMING_HORIZON_DAYS)
    return markers.value.filter(marker => marker.dayRef >= start && marker.dayRef <= end)
  })

  async function load(): Promise<void> {
    isLoading.value = true
    try {
      const refs = getPeriodRefsForDate(dayRef.value)
      const rangeStart = [addDaysToDayRef(dayRef.value, -MARKER_REACH_DAYS), addDaysToDayRef(todayRef.value, -OVERDUE_REACH_DAYS)].sort()[0]
      const rangeEnd = [addDaysToDayRef(dayRef.value, MARKER_REACH_DAYS), addDaysToDayRef(todayRef.value, UPCOMING_HORIZON_DAYS)].sort().at(-1)!
      const [monthPlan, activePriorities, loadedMarkers] = await Promise.all([
        periodPlanDexieRepository.getMonthPlan(refs.month),
        getActivePrioritiesForMonth(refs.month),
        getDayMarkers({ start: rangeStart, end: rangeEnd }, todayRef.value),
      ])
      const picked = (monthPlan?.topPriorityIds ?? [])
        .map(id => activePriorities.find(priority => priority.id === id))
        .filter((priority): priority is Priority => Boolean(priority))
      focusPriorities.value = (picked.length ? picked : activePriorities).slice(0, 3)
      markers.value = loadedMarkers
    } finally {
      isLoading.value = false
    }
  }

  watch(dayRef, () => void load(), { immediate: true })

  return { todayRef, focusPriorities, markers, upcoming, isLoading, reload: load }
}
