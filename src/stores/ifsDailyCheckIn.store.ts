import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  IFSDailyCheckIn,
  CreateIFSDailyCheckInPayload,
  UpdateIFSDailyCheckInPayload,
} from '@/domain/exercises'
import { ifsDailyCheckInDexieRepository } from '@/repositories/exercisesDexieRepository'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSDailyCheckInStore = defineStore('ifsDailyCheckIn', () => {
  const checkIns = useExerciseCollection<
    IFSDailyCheckIn,
    CreateIFSDailyCheckInPayload,
    UpdateIFSDailyCheckInPayload
  >({
    repository: ifsDailyCheckInDexieRepository,
    label: 'daily check-in',
    scope: 'ifsDailyCheckInStore',
    completionSlug: 'daily-ifs-checkin',
  })

  /**
   * Check-ins from the last 7 days (today included). A rolling window, not
   * the calendar week — the weekly AI summary used to be reachable only on
   * a day when every day of the current week already had a check-in.
   */
  const currentWeekCheckIns = computed(() => {
    const todayRef = getPeriodRefsForDate(new Date()).day
    const fromRef = addDaysToDayRef(todayRef, -6)
    return checkIns.items.value.filter(checkIn => {
      const day = getPeriodRefsForDate(checkIn.createdAt).day
      return day >= fromRef && day <= todayRef
    })
  })

  const weeklyCheckInCount = computed(() => currentWeekCheckIns.value.length)

  const WEEKLY_SUMMARY_THRESHOLD = 5
  const hasEnoughForWeeklySummary = computed(
    () => weeklyCheckInCount.value >= WEEKLY_SUMMARY_THRESHOLD
  )
  const checkInsNeededForWeeklySummary = computed(() =>
    Math.max(0, WEEKLY_SUMMARY_THRESHOLD - weeklyCheckInCount.value)
  )

  return {
    checkIns: checkIns.items,
    isLoading: checkIns.isLoading,
    error: checkIns.error,
    sortedCheckIns: checkIns.sorted,
    latestCheckIn: checkIns.latest,
    getCheckInById: checkIns.getById,
    currentWeekCheckIns,
    weeklyCheckInCount,
    hasEnoughForWeeklySummary,
    checkInsNeededForWeeklySummary,
    loadCheckIns: checkIns.loadAll,
    createCheckIn: checkIns.create,
    updateCheckIn: checkIns.update,
    deleteCheckIn: checkIns.remove,
    reset: checkIns.reset,
  }
})
