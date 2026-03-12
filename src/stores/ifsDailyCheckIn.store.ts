import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSDailyCheckIn,
  CreateIFSDailyCheckInPayload,
  UpdateIFSDailyCheckInPayload,
} from '@/domain/exercises'
import { ifsDailyCheckInDexieRepository } from '@/repositories/exercisesDexieRepository'
import { filterItemsByPeriod, getPeriodRefsForDate } from '@/utils/periods'

export const useIFSDailyCheckInStore = defineStore('ifsDailyCheckIn', () => {
  const checkIns = ref<IFSDailyCheckIn[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedCheckIns = computed(() => {
    return [...checkIns.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestCheckIn = computed(() => {
    return sortedCheckIns.value[0] ?? null
  })

  const getCheckInById = computed(() => {
    return (id: string): IFSDailyCheckIn | undefined => {
      return checkIns.value.find((c) => c.id === id)
    }
  })

  const currentWeekCheckIns = computed(() => {
    const currentWeek = getPeriodRefsForDate(new Date()).week
    return filterItemsByPeriod(checkIns.value, currentWeek, (checkIn) => {
      return getPeriodRefsForDate(checkIn.createdAt).day
    })
  })

  const weeklyCheckInCount = computed(() => {
    return currentWeekCheckIns.value.length
  })

  async function loadCheckIns(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      checkIns.value = await ifsDailyCheckInDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load daily check-ins'
      console.error('Error loading daily check-ins:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createCheckIn(data: CreateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn> {
    error.value = null
    try {
      const checkIn = await ifsDailyCheckInDexieRepository.create(data)
      checkIns.value.push(checkIn)
      return checkIn
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create daily check-in'
      console.error('Error creating daily check-in:', err)
      throw err
    }
  }

  async function updateCheckIn(id: string, data: UpdateIFSDailyCheckInPayload): Promise<IFSDailyCheckIn> {
    error.value = null
    try {
      const updated = await ifsDailyCheckInDexieRepository.update(id, data)
      const index = checkIns.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        checkIns.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update daily check-in'
      console.error('Error updating daily check-in:', err)
      throw err
    }
  }

  async function deleteCheckIn(id: string): Promise<void> {
    error.value = null
    try {
      await ifsDailyCheckInDexieRepository.delete(id)
      checkIns.value = checkIns.value.filter((c) => c.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete daily check-in'
      console.error('Error deleting daily check-in:', err)
      throw err
    }
  }

  return {
    checkIns,
    isLoading,
    error,
    sortedCheckIns,
    latestCheckIn,
    getCheckInById,
    currentWeekCheckIns,
    weeklyCheckInCount,
    loadCheckIns,
    createCheckIn,
    updateCheckIn,
    deleteCheckIn,
  }
})
