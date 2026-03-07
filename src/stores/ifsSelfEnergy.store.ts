import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSSelfEnergyCheckIn,
  CreateIFSSelfEnergyPayload,
  UpdateIFSSelfEnergyPayload,
  SelfEnergyQuality,
} from '@/domain/exercises'
import { ifsSelfEnergyDexieRepository } from '@/repositories/exercisesDexieRepository'

const ALL_QUALITIES: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

export const useIFSSelfEnergyStore = defineStore('ifsSelfEnergy', () => {
  const checkIns = ref<IFSSelfEnergyCheckIn[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedCheckIns = computed(() => {
    return [...checkIns.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestCheckIn = computed(() => {
    return sortedCheckIns.value[0] ?? null
  })

  const getCheckInById = computed(() => {
    return (id: string): IFSSelfEnergyCheckIn | undefined => {
      return checkIns.value.find((c) => c.id === id)
    }
  })

  const hasEnoughForReview = computed(() => {
    return checkIns.value.length >= 14
  })

  const averageRatings = computed(() => {
    if (checkIns.value.length === 0) return null
    const totals: Record<string, number> = {}
    const counts: Record<string, number> = {}
    for (const q of ALL_QUALITIES) {
      totals[q] = 0
      counts[q] = 0
    }
    for (const checkIn of checkIns.value) {
      for (const q of ALL_QUALITIES) {
        const val = checkIn.ratings[q]
        if (val != null) {
          totals[q] += val
          counts[q]++
        }
      }
    }
    const result = {} as Record<SelfEnergyQuality, number>
    for (const q of ALL_QUALITIES) {
      result[q as SelfEnergyQuality] = counts[q] > 0 ? totals[q] / counts[q] : 0
    }
    return result
  })

  async function loadCheckIns(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      checkIns.value = await ifsSelfEnergyDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load self-energy check-ins'
      console.error('Error loading self-energy check-ins:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createCheckIn(data: CreateIFSSelfEnergyPayload): Promise<IFSSelfEnergyCheckIn> {
    error.value = null
    try {
      const checkIn = await ifsSelfEnergyDexieRepository.create(data)
      checkIns.value.push(checkIn)
      return checkIn
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create self-energy check-in'
      console.error('Error creating self-energy check-in:', err)
      throw err
    }
  }

  async function updateCheckIn(
    id: string,
    data: UpdateIFSSelfEnergyPayload,
  ): Promise<IFSSelfEnergyCheckIn> {
    error.value = null
    try {
      const updated = await ifsSelfEnergyDexieRepository.update(id, data)
      const index = checkIns.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        checkIns.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update self-energy check-in'
      console.error('Error updating self-energy check-in:', err)
      throw err
    }
  }

  async function deleteCheckIn(id: string): Promise<void> {
    error.value = null
    try {
      await ifsSelfEnergyDexieRepository.delete(id)
      checkIns.value = checkIns.value.filter((c) => c.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete self-energy check-in'
      console.error('Error deleting self-energy check-in:', err)
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
    hasEnoughForReview,
    averageRatings,
    loadCheckIns,
    createCheckIn,
    updateCheckIn,
    deleteCheckIn,
  }
})
