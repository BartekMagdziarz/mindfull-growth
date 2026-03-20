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
      weeklyReflections.value.find((r) => r.weekRef === weekRef)
  })

  const getMonthlyByRef = computed(() => {
    return (monthRef: MonthRef): MonthlyReflection | undefined =>
      monthlyReflections.value.find((r) => r.monthRef === monthRef)
  })

  async function loadAll(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const [weekly, monthly] = await Promise.all([
        structuredReflectionDexieRepository.listWeekly(),
        structuredReflectionDexieRepository.listMonthly(),
      ])
      weeklyReflections.value = weekly
      monthlyReflections.value = monthly
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load reflections'
      console.error('Error loading structured reflections:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function upsertWeekly(
    data: CreateWeeklyReflectionPayload | UpdateWeeklyReflectionPayload
  ): Promise<WeeklyReflection> {
    error.value = null
    try {
      const result = await structuredReflectionDexieRepository.upsertWeekly(data)
      const index = weeklyReflections.value.findIndex((r) => r.weekRef === result.weekRef)
      if (index !== -1) {
        weeklyReflections.value[index] = result
      } else {
        weeklyReflections.value.push(result)
      }
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save weekly reflection'
      console.error('Error upserting weekly reflection:', err)
      throw err
    }
  }

  async function upsertMonthly(
    data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload
  ): Promise<MonthlyReflection> {
    error.value = null
    try {
      const result = await structuredReflectionDexieRepository.upsertMonthly(data)
      const index = monthlyReflections.value.findIndex((r) => r.monthRef === result.monthRef)
      if (index !== -1) {
        monthlyReflections.value[index] = result
      } else {
        monthlyReflections.value.push(result)
      }
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save monthly reflection'
      console.error('Error upserting monthly reflection:', err)
      throw err
    }
  }

  async function deleteWeekly(weekRef: WeekRef): Promise<void> {
    error.value = null
    try {
      await structuredReflectionDexieRepository.deleteWeekly(weekRef)
      weeklyReflections.value = weeklyReflections.value.filter((r) => r.weekRef !== weekRef)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete weekly reflection'
      console.error('Error deleting weekly reflection:', err)
      throw err
    }
  }

  async function deleteMonthly(monthRef: MonthRef): Promise<void> {
    error.value = null
    try {
      await structuredReflectionDexieRepository.deleteMonthly(monthRef)
      monthlyReflections.value = monthlyReflections.value.filter((r) => r.monthRef !== monthRef)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete monthly reflection'
      console.error('Error deleting monthly reflection:', err)
      throw err
    }
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
  }
})
