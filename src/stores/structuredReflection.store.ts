import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WeeklyReflection,
  MonthlyReflection,
  CreateWeeklyReflectionPayload,
  UpdateWeeklyReflectionPayload,
  CreateMonthlyReflectionPayload,
  UpdateMonthlyReflectionPayload,
} from '@/domain/reflection'
import type { MonthRef, WeekRef } from '@/domain/period'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'

export const useStructuredReflectionStore = defineStore('structuredReflection', () => {
  const sessionScope = createStoreSessionScope()
  const weeklyReflections = ref<WeeklyReflection[]>([])
  const monthlyReflections = ref<MonthlyReflection[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedWeekly = computed(() =>
    [...weeklyReflections.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  const sortedMonthly = computed(() =>
    [...monthlyReflections.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

  const getWeeklyByRef = computed(() => {
    return (weekRef: WeekRef): WeeklyReflection | undefined =>
      weeklyReflections.value.find(r => r.weekRef === weekRef)
  })

  const getMonthlyByRef = computed(() => {
    return (monthRef: MonthRef): MonthlyReflection | undefined =>
      monthlyReflections.value.find(r => r.monthRef === monthRef)
  })

  async function loadAll(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        const [weekly, monthly] = await operation.wait(
          Promise.all([
            structuredReflectionDexieRepository.listWeekly(),
            structuredReflectionDexieRepository.listMonthly(),
          ])
        )
        weeklyReflections.value = weekly
        monthlyReflections.value = monthly
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load reflections'
        console.error('Error loading structured reflections:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function upsertWeekly(
    data: CreateWeeklyReflectionPayload | UpdateWeeklyReflectionPayload
  ): Promise<WeeklyReflection> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const result = await operation.wait(structuredReflectionDexieRepository.upsertWeekly(data))
      const index = weeklyReflections.value.findIndex(r => r.weekRef === result.weekRef)
      if (index !== -1) {
        weeklyReflections.value[index] = result
      } else {
        weeklyReflections.value.push(result)
      }
      return result
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to save weekly reflection'
      console.error('Error upserting weekly reflection:', err)
      throw err
    }
  }

  async function upsertMonthly(
    data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload
  ): Promise<MonthlyReflection> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const result = await operation.wait(structuredReflectionDexieRepository.upsertMonthly(data))
      const index = monthlyReflections.value.findIndex(r => r.monthRef === result.monthRef)
      if (index !== -1) {
        monthlyReflections.value[index] = result
      } else {
        monthlyReflections.value.push(result)
      }
      return result
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to save monthly reflection'
      console.error('Error upserting monthly reflection:', err)
      throw err
    }
  }

  async function deleteWeekly(weekRef: WeekRef): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(structuredReflectionDexieRepository.deleteWeekly(weekRef))
        weeklyReflections.value = weeklyReflections.value.filter(r => r.weekRef !== weekRef)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete weekly reflection'
        console.error('Error deleting weekly reflection:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function deleteMonthly(monthRef: MonthRef): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(structuredReflectionDexieRepository.deleteMonthly(monthRef))
        monthlyReflections.value = monthlyReflections.value.filter(r => r.monthRef !== monthRef)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete monthly reflection'
        console.error('Error deleting monthly reflection:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory reflections. Called on user logout/login by
   * `appStateReset` so user B does not see user A's weekly/monthly
   * reflections before the next `loadAll()` re-fetches from the new DB.
   */
  function reset(): void {
    sessionScope.reset()
    weeklyReflections.value = []
    monthlyReflections.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    weeklyReflections,
    monthlyReflections,
    isLoading,
    error,
    sortedWeekly,
    sortedMonthly,
    getWeeklyByRef,
    getMonthlyByRef,
    loadAll,
    upsertWeekly,
    upsertMonthly,
    deleteWeekly,
    deleteMonthly,
    reset,
  }
})
